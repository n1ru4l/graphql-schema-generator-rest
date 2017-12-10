import { generateRestSchema } from '../schema-generator'
import fetchMock from 'fetch-mock'
import { graphql } from 'graphql'
import gql from 'graphql-tag'

const typeDefs = gql`
  type User {
    id: ID!
    login: String!
    friends: [User]!
      @rest(route: "/users/:userId/friends", provides: { userId: "id" })
  }

  type Query {
    user(id: ID!): User @rest(route: "/users/:id")
    color(id: ID!): Color
      @rest(route: "/color/:id", responseMapper: "ColorMapper")
    colors(first: Int!, after: ID): [Color]!
      @rest(route: "/colors", query: { first: "first", after: "after" })
  }

  type Color {
    id: ID!
    name: String!
  }

  input ColorInput {
    name: String!
  }

  type Mutation {
    incrementCounter: Int @rest(route: "/increment-counter", method: "POST")
    setCounter(value: Int!): Int
      @rest(
        route: "/increment-counter"
        method: "POST"
        body: { counter: "value" }
      )
    createColor(input: ColorInput!): Color
      @rest(route: "/colors", method: "POST", body: { input: "input" })
  }
`

const responseMappers = {
  ColorMapper: payload => payload.data,
}

const createRestSchema = (opts = {}) =>
  generateRestSchema({ typeDefs, responseMappers, ...opts })

describe(`General`, () => {
  it(`Can generate resolvers`, async () => {
    expect.assertions(1)

    const fetcher = fetchMock.sandbox().get('/users/1', {
      id: '1',
      login: 'Peter',
    })

    const schema = createRestSchema({ fetcher })

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

    const fetcher = fetchMock
      .sandbox()
      .get('/users/2', {
        id: '2',
        login: 'Jochen',
      })
      .get('/users/2/friends', [
        {
          id: '1',
          login: 'Peter',
        },
        {
          id: '3',
          login: 'Joachim',
        },
      ])

    const schema = createRestSchema({ fetcher })

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
    const fetcher = fetchMock.sandbox()

    const typeDefs = gql`
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
      generateRestSchema({ typeDefs, fetcher })
    }).toThrow(`Missing field 'userId'`)
  })

  it(`handles a method param on the @rest directive`, async () => {
    expect.assertions(1)

    const fetcher = fetchMock.sandbox().post('/increment-counter', `1`)

    const schema = createRestSchema({ fetcher })
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

    const fetcher = fetchMock
      .sandbox()
      .post('/increment-counter', (url, opts) => {
        const data = JSON.parse(opts.body)
        expect(data).toEqual({
          counter: 10,
        })

        return JSON.stringify(10)
      })

    const schema = createRestSchema({ fetcher })
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

  it(`supports a mutation with an input type`, async () => {
    expect.assertions(2)

    const fetcher = fetchMock.sandbox().post('/colors', (url, opts) => {
      const data = opts.body && JSON.parse(opts.body)
      expect(data).toEqual({
        input: {
          name: 'yellow',
        },
      })

      return JSON.stringify({
        id: 'yellow',
        name: 'yellow',
      })
    })

    const schema = createRestSchema({ fetcher })

    const mutation = `
      mutation CreateColor($input: ColorInput!) {
        createColor(input: $input) {
          id
          name
        }
      }
    `
    const variables = {
      input: {
        name: 'yellow',
      },
    }

    const data = await graphql(
      schema,
      mutation,
      undefined,
      undefined,
      variables,
    )

    expect(data).toEqual({
      data: {
        createColor: {
          id: 'yellow',
          name: 'yellow',
        },
      },
    })
  })

  it(`supports a response mapper`, async () => {
    expect.assertions(1)

    const fetcher = fetchMock.sandbox().get(`/color/red`, {
      data: {
        id: 'red',
        name: 'red',
      },
    })

    const schema = createRestSchema({ fetcher })
    const query = `
      query color {
        color(id: "red") {
          id
          name
        }
      }
    `

    const data = await graphql(schema, query)
    expect(data).toEqual({
      data: {
        color: {
          id: `red`,
          name: `red`,
        },
      },
    })
  })

  it(`supports query params`, async () => {
    expect.assertions(1)

    const fetcher = fetchMock.sandbox().get(`/colors?first=2`, [
      {
        id: `red`,
        name: `red`,
      },
      {
        id: `blue`,
        name: `blue`,
      },
    ])

    const schema = createRestSchema({ fetcher })
    const query = `
      query colors {
        colors(first: 2) {
          id
          name
        }
      }
    `

    const data = await graphql(schema, query)
    expect(data).toEqual({
      data: {
        colors: [
          {
            id: `red`,
            name: `red`,
          },
          {
            id: `blue`,
            name: `blue`,
          },
        ],
      },
    })
  })
})
