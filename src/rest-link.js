import { ApolloLink, Observable } from "apollo-link";

const getRestDirective = field =>
  field.directives.find(directive => directive.name.value === "rest");

const findRestDirectiveFields = selectionSet =>
  selectionSet.selections.filter(getRestDirective);

const getTypeName = directive => {
  const arg = directive.arguments.find(
    arg => arg.kind === "Argument" && arg.name.value === "type"
  );
  if (!arg || arg.value.kind !== "StringValue") return undefined;
  return arg.value.value;
};

const getRoute = directive => {
  const arg = directive.arguments.find(
    arg => arg.kind === "Argument" && arg.name.value === "route"
  );
  if (!arg || arg.value.kind !== "StringValue") return undefined;
  return arg.value.value;
};

const parseParams = url =>
  url
    .split("/")
    .filter(part => part.charAt(0) === ":")
    .map(part => part.substr(1));

const getParams = (directive, variables) => {
  const arg = directive.arguments.find(
    arg => arg.kind === "Argument" && arg.name.value === "params"
  );
  if (!arg) return {};
  if (arg.value.kind !== "ObjectValue")
    throw new Error("Argument params must be an object.");

  const params = {};
  return arg.value.fields.map(field => {
    let value = field.value.value;
    if (field.value.kind === "Variable") {
      value = variables[field.name.value];
      if (!value) throw new Error(`Missing variable '${field.name.value}'`);
    }

    return {
      name: field.name.value,
      value
    };
  });
};

const checkRequiredParams = (requiredParams, params) =>
  requiredParams.forEach(requiredParam => {
    const param = params.find(param => param.name === requiredParam);
    if (!param) throw new Error(`Missing param '${requiredParam}'`);
  });

const generateRouteWithParams = (route, params) =>
  params.reduce(
    (route, param) => route.replace(`:${param.name}`, param.value),
    route
  );

export const createRestLink = ({ fetcher } = {}) => {
  if (!fetcher) fetcher = fetch;

  return new ApolloLink(operation => {
    return new Observable(observer => {
      const queryDefinition = operation.query.definitions[0];
      const { variableDefinitions } = queryDefinition;
      const { variables } = operation;
      // console.log(JSON.stringify(variables, 0, 2));

      const fieldsWithRestDirective = findRestDirectiveFields(
        queryDefinition.selectionSet
      );

      const fetchTasks = fieldsWithRestDirective.map(field => {
        const directive = getRestDirective(field);
        const typeName = getTypeName(directive);
        if (!typeName) throw new Error("Missing type argument.");
        const route = getRoute(directive);
        if (!route) throw new Error("Missing route argument.");
        const requiredParams = parseParams(route);

        const params = getParams(directive, variables);
        checkRequiredParams(requiredParams, params);

        const routeWithParams = generateRouteWithParams(route, params);

        return {
          name: field.name.value,
          typeName,
          route: routeWithParams
        };
      });

      Promise.all(
        fetchTasks.map(task =>
          fetcher(task.route, { method: "GET" })
            .then(result => result.json())
            .then(json => ({
              [task.name]: { ...json, __typename: task.typeName }
            }))
        )
      )
        .then(results => Object.assign({}, ...results))
        .then(composedResult => {
          observer.next(composedResult);
          observer.complete();
        });
    });
  });
};
