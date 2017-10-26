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

const getProvides = (directive, resultObject) => {
  const arg = directive.arguments.find(
    arg => arg.kind === "Argument" && arg.name.value === "provides"
  );
  if (!arg) return [];
  if (arg.value.kind !== "ObjectValue")
    throw new Error("Argument params must be an object.");

  return arg.value.fields.map(field => {
    const name = field.name.value;
    const objectPropertyName = field.value.value;
    const value = resultObject[objectPropertyName];
    if (!value) throw new Error(`Missing field '${field.name.value}'`);

    return {
      name,
      value
    };
  });
};

const getParams = (directive, variables) => {
  const arg = directive.arguments.find(
    arg => arg.kind === "Argument" && arg.name.value === "params"
  );
  if (!arg) return [];
  if (arg.value.kind !== "ObjectValue")
    throw new Error("Argument params must be an object.");

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

const hasSelectionSet = field => !!field.selectionSet;

const processSelectionSet = (selectionSet, fetcher, variables, resultObject) =>
  new Promise((resolve, reject) => {
    const fieldsWithRestDirective = findRestDirectiveFields(selectionSet);

    let fetchTasks = undefined;
    try {
      fetchTasks = fieldsWithRestDirective.map(field => {
        const directive = getRestDirective(field);
        const typeName = getTypeName(directive);
        if (!typeName) throw new Error("Missing type argument.");
        const route = getRoute(directive);
        if (!route) throw new Error("Missing route argument.");
        const requiredParams = parseParams(route);

        const params = [
          ...getParams(directive, variables),
          ...getProvides(directive, resultObject)
        ];
        checkRequiredParams(requiredParams, params);

        const routeWithParams = generateRouteWithParams(route, params);

        return {
          name: field.name.value,
          typeName,
          route: routeWithParams
        };
      });
    } catch (err) {
      reject(err);
      return;
    }

    Promise.all(
      fetchTasks.map(task =>
        fetcher(task.route, { method: "GET" })
          .then(result => result.json())
          .then(json => ({
            [task.name]: Array.isArray(json)
              ? json.map(obj => ({ ...obj, __typename: task.typeName }))
              : { ...json, __typename: task.typeName }
          }))
      )
    )
      .then(results => Object.assign({}, ...results))
      .then(result => {
        Object.assign(resultObject, result);
        const subRestFields = selectionSet.selections.filter(
          field => field.selectionSet
        );
        Promise.all(
          subRestFields.map(field =>
            processSelectionSet(
              field.selectionSet,
              fetcher,
              variables,
              resultObject[field.name.value]
            )
          )
        )
          .then(fields => {
            resolve(result);
          })
          .catch(reject);
      });
  });

export const createRestLink = ({ fetcher } = {}) => {
  if (!fetcher) fetcher = fetch;

  return new ApolloLink(operation => {
    return new Observable(observer => {
      const queryDefinition = operation.query.definitions[0];
      const { variableDefinitions, selectionSet } = queryDefinition;
      const { variables } = operation;

      processSelectionSet(selectionSet, fetcher, variables, {})
        .then(result => {
          observer.next(result);
          observer.complete();
        })
        .catch(err => {
          observer.error(err);
        });
    });
  });
};
