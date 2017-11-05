import express from 'express'
import bodyParser from 'body-parser'
import { generateRestSchema } from '@n1ru4l/graphql-schema-generator-rest'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import gql from 'graphql-tag'
import fetch from 'node-fetch'

const typeDefs = gql`
  type ExchangeRates {
    currency: String
    rates: [ExchangeRate]
  }

  type ExchangeRate {
    currency: String
    rate: String
  }

  type Query {
    rates(currency: String!): ExchangeRates
      @rest(
        method: "GET"
        route: "https://api.coinbase.com/v2/exchange-rates"
        mapper: "RateMapper"
        query: { currency: "currency" }
      )
  }
`

const mappers = {
  RateMapper: payload => {
    const { data: { currency, rates } } = payload
    return {
      currency,
      rates: Object.entries(rates).map(([currency, rate]) => ({
        currency,
        rate,
      })),
    }
  },
}

const schema = generateRestSchema({
  typeDefs,
  mappers,
  fetcher: fetch,
})

const PORT = 3000

const app = express()

app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))
app.use('/graphiql', graphiqlExpress({ endpointURL: `/graphql` }))

app.listen(PORT)
