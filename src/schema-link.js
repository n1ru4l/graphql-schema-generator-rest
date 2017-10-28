import { graphql } from 'graphql'
import { ApolloLink, Observable } from 'apollo-link'
import { print } from 'graphql/language/printer'

export const createSchemaLink = ({ schema }) =>
  new ApolloLink(
    operation =>
      new Observable(observer => {
        const { operationName, variables, query } = operation

        graphql(
          schema,
          print(query),
          {},
          {},
          variables,
          operationName,
        ).then(result => {
          observer.next(result)
          observer.complete()
        })
      }),
  )
