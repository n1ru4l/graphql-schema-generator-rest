# Experimental Apollo Rest Link Implementation

This is just me experimenting with GraphQL AST stuff.

If you have ideas or want to contribute feel free to open issues or pull requests 😊

## Rest Link

This implementation uses query directives and maps them to rest endpoints.
At the moment there is only support for queries which are mapped to GET requests

### Example Query

```graphql
query userProfile($id: ID!) {
  userProfile(id: $id) @rest(type: "User", route: "/users/:id", params: { id: $id }) {
    id
    login
    friends @rest(
      type: "User"
      route: "/users/:userId/friends"
      provides: { userId: "id" } # map id from parent object to :userId route param
    ) {
      id
      login
    }
  }
}
```

### Usage

```javascript
import gql from 'graphql-tag'
import { execute, makePromise } from 'apollo-link'
import fetch from 'node-fetch'
import { createRestLink } from 'apollo-rest-link'

const link = createRestLink({ fetcher: fetch })

const query = gql`
  query userProfile($id: ID!) {
    userProfile(id: $id) @rest(type: "User", route: "/users/:id", params: { id: $id }) {
      id
      login
      friends @rest(
        type: "User"
        route: "/users/:userId/friends"
        provides: { userId: "id" } # map id from parent object to :userId route param
      ) {
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

## Rest Schema Generator

Generate an executable Schema from typeDefs annotated with `@rest` directives
 This can be used by apollo-server or a future apollo-rest-link that will follow soon :)

### Example Schema

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
  user(id: ID!): User @rest(route: "/users/:id", params: { id: "id" })
}
```

### Usage

```javascript
import { generateSchema } from 'apollo-rest-link'
import { graphql } from 'graphql'

const typeDefs = `
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
    user(id: ID!): User @rest(route: "/users/:id", params: { id: "id" })
  }
`

const schema = generateSchema({ typeDefs })

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
const result = await graphql(schema, query)
```

# Tests

```shell
yarn test
```
