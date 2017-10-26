# Experimental Apollo Rest Link Implementation

This is just me experimenting with GraphQL AST stuff.

If you have ideas or want to contribute feel free to open issues or pull requests 😊

# Example Query

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

# Usage

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

# Tests

```shell
yarn test
```
