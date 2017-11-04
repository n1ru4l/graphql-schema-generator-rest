# Rest GraphQL Schema Generator

[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![CircleCI](https://circleci.com/gh/n1ru4l/graphql-schema-generator-rest.svg?style=svg)](https://circleci.com/gh/n1ru4l/apollo-link-rest)

This package provides the functionality of generating a GraphQL schema from type definitions annotated with `@rest` directives.

## Install

```shell
yarn add @n1ru4l/graphql-schema-generator-rest
```

## Usage

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

## Recipies

### apollo-link

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

### express

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

## Tests

```shell
yarn test
```

## Contribute

### Checkout project

For contributions please fork this repository.

```bash
git clone https://github.com/<your-login>/graphql-schema-generator-rest.git
cd graphql-schema-generator-rest
yarn install
```

### Commiting Changes

Please use `yarn cm` for commiting changes to git.
