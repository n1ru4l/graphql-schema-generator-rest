import { createSchemaLink } from '../schema-link'
import { generateRestSchema } from '../schema-generator'
import gql from 'graphql-tag'
import { execute, makePromise } from 'apollo-link'
import fetchMock from 'fetch-mock'

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
    user(id: ID!): User @rest(route: "/users/:id")
  }
`

describe(`General`, async () => {
  afterEach(() => {
    fetchMock.restore()
  })
  it(`Can query`, async () => {
    expect.assertions(1)
    fetchMock.get('/users/2', {
      id: '2',
      login: 'Jochen',
    })

    fetchMock.get('/users/2/friends', [
      {
        id: '1',
        login: 'Peter',
      },
      {
        id: '3',
        login: 'Joachim',
      },
    ])
    const schema = generateRestSchema({ typeDefs })
    const link = createSchemaLink({ schema })

    const query = gql`
      query user {
        user(id: "2") {
          __typename
          id
          login
          friends {
            id
            login
          }
        }
      }
    `

    const data = await makePromise(
      execute(link, {
        operationName: 'user',
        query: query,
      }),
    )

    expect(data).toEqual({
      data: {
        user: {
          __typename: 'User',
          id: '2',
          login: 'Jochen',
          friends: [
            {
              id: `1`,
              login: `Peter`,
            },
            {
              id: `3`,
              login: `Joachim`,
            },
          ],
        },
      },
    })
  })
})
