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

const getMethod = restDirective => {
  const arg = restDirective.arguments.find(
    arg => arg.kind === `Argument` && arg.name.value === `method`,
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
    throw new Error(`Provides argument must be an object.`)

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

const getBodyMappings = (restDirective, args) => {
  const arg = restDirective.arguments.find(
    arg => arg.kind === `Argument` && arg.name.value === `body`,
  )
  if (!arg) return []
  if (arg.value.kind !== `ObjectValue`)
    throw new Error(`Body argument must be an object.`)
  return arg.value.fields.map(field => {
    const argumentName = field.value.value
    const bodyName = field.name.value
    const argumentField = args.find(arg => arg.name.value === argumentName)
    if (!argumentField) throw new Error(`Missing argument '${argumentName}'`)
    return {
      paramField: argumentName,
      bodyField: bodyName,
    }
  })
}

const getQueryMappings = (restDirective, args) => {
  const arg = restDirective.arguments.find(
    arg => arg.kind === `Argument` && arg.name.value === `query`,
  )
  if (!arg) return []
  if (arg.value.kind !== `ObjectValue`)
    throw new Error(`Query argument must be an object.`)
  return arg.value.fields.map(field => {
    const paramName = field.value.value
    const bodyName = field.name.value
    const paramField = args.find(arg => arg.name.value === paramName)
    if (!paramField) throw new Error(`Missing argument '${paramName}'`)
    return {
      paramName,
      queryField: bodyName,
    }
  })
}

const getQueryValues = (queryMappings, params) =>
  queryMappings.reduce((acc, { queryField, paramName }) => {
    const param = params.find(param => param.name === paramName)

    if (param && param.value !== undefined) {
      acc.push({ queryField, queryValue: param.value })
    }
    return acc
  }, [])

const getMapper = (restDirective, argName, mappers) => {
  const arg = restDirective.arguments.find(
    arg => arg.kind === `Argument` && arg.name.value === argName,
  )
  if (!arg) return _ => _
  const mapper = mappers[arg.value.value]
  if (!mapper) throw new Error(`Missing ${argName} '${arg.value.value}'.`)
  return mapper
}

const parseParams = url =>
  (url.match(/:([a-zA-Z0-9]+)/g) || []).map(part => part.substr(1))

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

const getBodyValues = (bodyMappings, params) =>
  Object.assign(
    {},
    ...bodyMappings.map(({ paramField, bodyField }) => ({
      [bodyField]: params.find(param => param.name === paramField).value,
    })),
  )

const checkRequiredParams = (requiredParams, params) =>
  requiredParams.forEach(requiredParam => {
    const param = params.find(param => param.name === requiredParam)
    if (!param) throw new Error(`Missing param '${requiredParam}'`)
  })

const generateQueryString = queryValues =>
  queryValues
    .map(
      ({ queryField, queryValue }) =>
        queryField + '=' + encodeURIComponent(queryValue),
    )
    .join('&')

const generateRouteWithParams = (route, params) =>
  params.reduce(
    (route, param) =>
      typeof param.value !== `object`
        ? route.replace(`:${param.name}`, param.value)
        : route,
    route,
  )

const createFieldResolver = (
  field,
  objectTypeDefinition,
  fetcher,
  { queryMappers = {}, requestMappers = {}, responseMappers = {} },
) => {
  const { arguments: args, name: { value: fieldName } } = field
  const restDirective = getRestDirective(field)
  if (!restDirective) return { [fieldName]: createPropResolver(fieldName) }
  const route = getRoute(restDirective)
  if (!route) throw new Error(`Missing route argument.`)
  const method = getMethod(restDirective) || `GET`

  const requiredParams = parseParams(route)
  const providesMappings = getProvideMappings(
    restDirective,
    objectTypeDefinition,
  )
  const argumentMappings = getArgumentMappings(restDirective, args)
  const bodyMappings = getBodyMappings(restDirective, args)
  const queryMappings = getQueryMappings(restDirective, args)
  const queryMapper = getMapper(restDirective, `queryMapper`, queryMappers)
  const requestMapper = getMapper(
    restDirective,
    `requestMapper`,
    requestMappers,
  )
  const responseMapper = getMapper(
    restDirective,
    `responseMapper`,
    responseMappers,
  )

  if (method === `GET` && bodyMappings.length)
    throw new Error(
      `Resolver with method 'GET' should not have any body mappings.`,
    )

  const resolver = (parentObject, args) => {
    const params = [
      ...getProvidesValues(providesMappings, parentObject),
      ...getArgumentsValues(argumentMappings, args),
    ]
    checkRequiredParams(requiredParams, params)
    let generatedRoute = generateRouteWithParams(route, params)
    const queryValues = queryMapper(getQueryValues(queryMappings, params))
    const queryString = generateQueryString(queryValues)
    if (queryString.length) {
      generatedRoute = `${generatedRoute}?${queryString}`
    }

    let body = undefined
    if (bodyMappings.length) {
      body = JSON.stringify(requestMapper(getBodyValues(bodyMappings, params)))
    }

    return fetcher(generatedRoute, {
      method,
      body,
    })
      .then(response => (response.ok ? response.json() : null))
      .then(data => (data ? responseMapper(data) : data))
  }

  return { [fieldName]: resolver }
}

const createObjectTypeResolver = (objectTypeDefinition, fetcher, mappers) => {
  const { fields, name: { value: typeName } } = objectTypeDefinition

  const fieldResolvers = fields.map(field =>
    createFieldResolver(field, objectTypeDefinition, fetcher, mappers),
  )
  return { [typeName]: Object.assign({}, ...fieldResolvers) }
}

export const createResolvers = ({ typeDefs, fetcher, ...mappers }) => {
  const { definitions } = typeDefs
  const objectTypeDefinitions = definitions.filter(
    definition => definition.kind === `ObjectTypeDefinition`,
  )

  const resolverParts = objectTypeDefinitions.map(objectTypeDefinition =>
    createObjectTypeResolver(objectTypeDefinition, fetcher, mappers),
  )
  return Object.assign({}, ...resolverParts)
}

export const generateRestSchema = ({ typeDefs, fetcher, ...mappers }) => {
  if (!fetcher) fetcher = fetch

  const resolvers = createResolvers({ typeDefs, fetcher, ...mappers })
  return makeExecutableSchema({ typeDefs, resolvers })
}
