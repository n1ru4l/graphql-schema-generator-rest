import express from 'express'
import bodyParser from 'body-parser'
import morgan from 'morgan'
import faker from 'faker'
import { times, random } from 'lodash'

// Generate some fake data

const users = new Map(
  times(100, () => ({
    id: faker.random.uuid(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    login: faker.internet.userName(),
  })).map(user => [user.id, user]),
)

const getRandomMapEntry = map =>
  Array.from(map.values())[random(0, map.size - 1)]

const tags = [`hot`, `nice`, `trendy`]
const getRandomTag = () => tags[random(0, tags.length - 1)]

const messages = new Map(
  times(users.size * 10, () => ({
    id: faker.random.uuid(),
    body: faker.lorem.sentences(),
    tag: getRandomTag(),
    authorId: getRandomMapEntry(users).id,
  })).map(message => [message.id, message]),
)

const createFilter = query => obj =>
  Object.entries(query).every(([key, value]) => obj[key] === value)

const app = express()
app.use(bodyParser.json())
app.use(morgan('tiny'))

app.get(`/users`, (request, response) => {
  response.json(Array.from(users.values()))
})

app.get(`/users/:userId`, (request, response) => {
  const { userId } = request.params
  const user = users.get(userId)
  if (user) return response.json(user)
  response.status(400)
  response.json({ error: `User with id '${userId}' not found.` })
})

app.get(`/users/:userId/messages`, (request, response) => {
  const user = users.get(request.params.userId)
  if (!user) return response.json([])
  const filteredMessages = Array.from(messages.values()).filter(
    message => message.authorId === user.id,
  )
  response.json(filteredMessages)
})

app.get(`/messages`, (request, response) => {
  response.json(
    Array.from(messages.values()).filter(createFilter(request.query)),
  )
})

app.get(`/messages/:messageId`, (request, response) => {
  const { messageId } = request.params
  const message = messages.get(messageId)
  if (message) return response.json(message)
  response.status(400)
  response.json({ error: `Message with id '${messageId}' not found.` })
})

const PORT = 3999

app.listen(PORT)
