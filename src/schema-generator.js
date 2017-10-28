import gql from 'graphql-tag'
import { makeExecutableSchema } from 'graphql-tools'

const createPropResolver = prop => x => x[prop]

const getRestDirective = field =>
  field.directives.find(directive => directive.name.value === `rest`)

const getRoute = restDirective => {
  const arg = restDirective.arguments.find(
    arg => arg.kind === `Argument` && arg.name.value === `route`,
  )
  if (!arg || arg.value.kind !== `StringValue`) return undefined
  return arg.value.value
}

const getProvideMappings = (restDirective, objectTypeDefinition) => {
  const arg = restDirective.arguments.find(
    arg => arg.kind === `Argument` && arg.name.value === `provides`,
  )
  if (!arg) return []
  if (arg.value.kind !== `ObjectValue`)
    throw new Error(`Provides params must be an object.`)

  return arg.value.fields.map(field => {
    const parentField = objectTypeDefinition.fields.find(
      parentField => parentField.name.value === field.value.value,
    )
    if (!parentField) throw new Error(`Missing field '${field.name.value}'`)
    return {
      parentField: parentField.name.value,
      routeParam: field.name.value,
    }
  })
}

const getArgumentMappings = (restDirective, args) => {
  return args.map(arg => ({
    argName: arg.name.value,
    routeParam: arg.name.value,
  }))
}

const parseParams = url =>
  url
    .split('/')
    .filter(part => part.charAt(0) === ':')
    .map(part => part.substr(1))

const getProvidesValues = (providesMappings, parentObject) =>
  providesMappings.map(({ parentField, routeParam }) => ({
    name: routeParam,
    value: parentObject[parentField],
  }))

const getArgumentsValues = (argumentMappings, args) =>
  argumentMappings.map(({ argName, routeParam }) => ({
    name: routeParam,
    value: args[argName],
  }))

const checkRequiredParams = (requiredParams, params) =>
  requiredParams.forEach(requiredParam => {
    const param = params.find(param => param.name === requiredParam)
    if (!param) throw new Error(`Missing param '${requiredParam}'`)
  })

const generateRouteWithParams = (route, params) =>
  params.reduce(
    (route, param) => route.replace(`:${param.name}`, param.value),
    route,
  )

const createFieldResolver = (field, objectTypeDefinition) => {
  const { arguments: args, name: { value: fieldName } } = field
  const restDirective = getRestDirective(field)
  if (!restDirective) return { [fieldName]: createPropResolver(fieldName) }
  const route = getRoute(restDirective)
  if (!route) throw new Error(`Missing route argument.`)

  const requiredParams = parseParams(route)
  const providesMappings = getProvideMappings(
    restDirective,
    objectTypeDefinition,
  )
  const argumentMappings = getArgumentMappings(restDirective, args)

  const resolver = (parentObject, args) => {
    const params = [
      ...getProvidesValues(providesMappings, parentObject),
      ...getArgumentsValues(argumentMappings, args),
    ]
    checkRequiredParams(requiredParams, params)
    const generatedRoute = generateRouteWithParams(route, params)

    return fetch(generatedRoute, { method: 'GET' }).then(response => {
      if (!response.ok) return undefined
      return response.json()
    })
  }

  return { [fieldName]: resolver }
}

const createObjectTypeResolver = objectTypeDefinition => {
  const { fields, name: { value: typeName } } = objectTypeDefinition

  const fieldResolvers = fields.map(field =>
    createFieldResolver(field, objectTypeDefinition),
  )
  return { [typeName]: Object.assign({}, ...fieldResolvers) }
}

export const createResolvers = schemaAST => {
  const { definitions } = schemaAST
  const objectTypeDefinitions = definitions.filter(
    definition => definition.kind === `ObjectTypeDefinition`,
  )

  const resolverParts = objectTypeDefinitions.map(createObjectTypeResolver)
  return Object.assign({}, ...resolverParts)
}

export const generateRestSchema = ({ typeDefs }) => {
  const schemaAST = gql`${typeDefs}`
  const resolvers = createResolvers(schemaAST)
  return makeExecutableSchema({ typeDefs, resolvers })
}
