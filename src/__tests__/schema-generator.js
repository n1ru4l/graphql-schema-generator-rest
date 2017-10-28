import { generateRestSchema } from '../schema-generator'
import fetchMock from 'fetch-mock'
import { graphql } from 'graphql'

const typeDefs = `
  type User {
    id: ID!
    login: String!
    friends: [User]!
      @rest(
        route: "/users/:userId/friends"
        provides: { userId: "id" }
      )
  }

  type Query {
    user(id: ID!): User @rest(route: "/users/:id")
  }

  type Mutation {
    incrementCounter: Int @rest(
      route: "/increment-counter"
      method: "POST"
    )
    setCounter(value: Int!): Int @rest(
      route: "/increment-counter"
      method: "POST"
      body: { counter: "value" }
    )
  }
`

describe(`General`, () => {
  afterEach(() => {
    fetchMock.restore()
  })
  it(`Can generate resolvers`, async () => {
    expect.assertions(1)

    fetchMock.get('/users/1', {
      id: '1',
      login: 'Peter',
    })

    const schema = generateRestSchema({ typeDefs })

    const query = `
      query user {
        user(id: "1") {
          id
          login
        }
      }
    `
    const result = await graphql(schema, query)
    expect(result).toEqual({
      data: {
        user: {
          id: '1',
          login: 'Peter',
        },
      },
    })
  })

  it(`Can generate nested resolvers`, async () => {
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
    expect(result).toEqual({
      data: {
        user: {
          id: '2',
          login: 'Jochen',
          friends: [
            {
              id: '1',
              login: 'Peter',
            },
            {
              id: '3',
              login: 'Joachim',
            },
          ],
        },
      },
    })
  })

  it(`throws if there is a incorrect provides mapping`, async () => {
    const typeDefs = `
      type User {
        id: ID!
        login: String!
        friends: [User]!
          @rest(
            route: "/users/:userId/friends"
            provides: { userId: "id1" } # map id from parent object to :userId route param
          )
      }
  
      type Query {
        user(id: ID!): User @rest(route: "/users/:id")
      }
    `

    expect(() => {
      generateRestSchema({ typeDefs })
    }).toThrow(`Missing field 'userId'`)
  })

  it(`handles a method param on the @rest directive`, async () => {
    expect.assertions(1)

    fetchMock.post('/increment-counter', `1`)

    const schema = generateRestSchema({ typeDefs })
    const mutation = `
      mutation incrementCounter {
        incrementCounter
      }
    `

    const result = await graphql(schema, mutation)
    expect(result).toEqual({
      data: {
        incrementCounter: 1,
      },
    })
  })

  it(`handles a post request with params`, async () => {
    expect.assertions(2)

    fetchMock.post('/increment-counter', (url, opts) => {
      const data = JSON.parse(opts.body)
      expect(data).toEqual({
        counter: 10,
      })

      return JSON.stringify(10)
    })

    const schema = generateRestSchema({ typeDefs })
    const mutation = `
      mutation setCounter {
        setCounter(value: 10)
      }
    `

    const data = await graphql(schema, mutation)
    expect(data).toEqual({
      data: {
        setCounter: 10,
      },
    })
  })
})
