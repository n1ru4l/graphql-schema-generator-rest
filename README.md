# Rest GraphQL Schema Generator

[![CircleCI](https://circleci.com/gh/n1ru4l/apollo-link-rest.svg?style=svg)](https://circleci.com/gh/n1ru4l/apollo-link-rest)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

## Install

```shell
yarn add @n1ru4l/graphql-schema-generator-rest
```

## Rest Schema Generator

Generate an executable Schema from GraphQL type definitions annotated with `@rest` directives. 

### Type Definitions

```graphql
type User {
  id: ID!
  login: String!
  friends: [User]!
    @rest(
      route: "/users/:userId/friends"
      provides: { userId: "id" } # map id from parent object to :userId route param
    )
}

type Query {
  user(id: ID!): User @rest(route: "/users/:id")
}
```

### Creating a schema

```javascript
import { generateRestSchema } from '@n1ru4l/graphql-schema-generator-rest'
import { graphql } from 'graphql'
import gql from 'graphql-tag'
import fetch from 'node-fetch'

const typeDefs = gql`
  type User {
    id: ID!
    login: String!
    friends: [User]!
      @rest(
        route: "/users/:userId/friends"
        provides: { userId: "id" } # map id from parent object to :userId route param
      )
  }

  type Query {
    user(id: ID!): User @rest(route: "/users/:id")
  }
`

const schema = generateRestSchema({
  typeDefs,
  fetcher: fetch,
})

const query = `
  query user {
    user(id: "2") {
      id
      login
      friends {
        id
        login
      }
    }
  }
`

graphql(schema, query)
  .then(console.log)
  .catch(console.log)
```

### Recipies

#### apollo-link

```javascript
import { generateRestSchema } from '@n1ru4l/graphql-schema-generator-rest'
import { Observable, ApolloLink } from 'apollo-link'
import { graphql, print } from 'graphql'
import gql from 'graphql-tag'
import fetch from 'node-fetch'

const typeDefs = gql`
  type User {
    id: ID!
    login: String!
    friends: [User]!
      @rest(
        route: "/users/:userId/friends"
        provides: { userId: "id" } # map id from parent object to :userId route param
      )
  }

  type Query {
    user(id: ID!): User @rest(route: "/users/:id")
  }
`

const schema = generateRestSchema({
  typeDefs,
  fetcher: fetch,
})

const link = new ApolloLink(operation =>
  new Observable(observer => {
    const { query, variables, operationName } = operation
    graphql(mergedSchema, print(query), {}, {}, variables, operationName)
      .then(result => {
          observer.next(result)
          observer.complete(result)
        })
        .catch(e => observer.error(e))
  })
)

const query = gql`
  query user {
    user(id: "2") {
      id
      login
      friends {
        id
        login
      }
    }
  }
`

makePromise(execute(link, { operationName: `userProfile`, query }))
  .then(console.log)
  .catch(console.log)
```

#### express

```javascript
import express from 'express'
import bodyParser from 'body-parser'
import { generateRestSchema } from '@n1ru4l/graphql-schema-generator-rest'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import gql from 'graphql-tag'
import fetch from 'node-fetch'

const typeDefs = gql`
  type User {
    id: ID!
    login: String!
    friends: [User]!
      @rest(
        route: "/users/:userId/friends"
        provides: { userId: "id" } # map id from parent object to :userId route param
      )
  }

  type Query {
    user(id: ID!): User @rest(route: "/users/:id")
  }
`

const schema = generateRestSchema({
  typeDefs,
  fetcher: fetch,
})

const PORT = 3000

const app = express()

app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))
app.listen(PORT)
```

# Tests

```shell
yarn test
```
