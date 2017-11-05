import express from 'express'
import bodyParser from 'body-parser'
import { generateRestSchema } from '@n1ru4l/graphql-schema-generator-rest'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import gql from 'graphql-tag'
import fetch from 'node-fetch'

const typeDefs = gql`
  enum Tag {
    hot
    nice
    trendy
  }

  type User {
    id: ID
    firstName: String
    lastName: String
    messages: [Message]
      @rest(
        method: "GET"
        route: "http://localhost:3999/users/:userId/messages"
        provides: { userId: "id" }
      )
  }

  type Message {
    id: ID
    authorId: ID
    body: String
    tag: Tag
    author: User
      @rest(
        method: "GET"
        route: "http://localhost:3999/users/:authorId"
        provides: { authorId: "authorId" }
      )
  }

  type Query {
    user(userId: ID!): User
      @rest(method: "GET", route: "http://localhost:3999/users/:userId")
    users: [User] @rest(method: "GET", route: "http://localhost:3999/users")
    messages(authorId: ID, tag: Tag): [Message]
      @rest(
        method: "GET"
        route: "http://localhost:3999/messages"
        query: { authorId: "authorId", tag: "tag" }
      )
  }
`

const schema = generateRestSchema({
  typeDefs,
  fetcher: fetch,
})

const PORT = 4000

const app = express()

app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))
app.use(
  '/graphiql',
  graphiqlExpress({
    endpointURL: `/graphql`,
    query: `
query users {
  users {
    id
    firstName
    lastName
    messages {
      id
      body
      tag
    }
  }
}

query messagesFiltered {
  messages(tag: hot)  {
    id
    body
    tag
  }
}

query userById($userId: ID!) {
  user(userId: $userId) {
    id
    firstName
    lastName
    messages {
      body
    }
  }
}

`,
    variables: { userId: `1` },
  }),
)

app.listen(PORT)
