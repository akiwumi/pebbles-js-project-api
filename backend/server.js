const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const User = require('./models/User')
const Thought = require('./models/Thought')

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const allowMemoryFallback = process.env.NODE_ENV !== 'production'

const defaultAllowedOrigins = ['http://localhost:5173', 'http://localhost:4173']

function parseConfiguredOrigins(value) {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .map((origin) => origin.replace(/\/+$/, ''))
    .filter(Boolean)
}

const allowedOrigins = Array.from(new Set([
  ...defaultAllowedOrigins,
  ...parseConfiguredOrigins(process.env.CORS_ORIGIN),
]))

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
      callback(null, true)
      return
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`))
  },
  credentials: true,
}))
app.use(express.json())

const dbState = { mode: 'memory' }

const memoryStore = {
  users: new Map(),
  thoughts: new Map(),
}

function normalizeId(value) {
  if (value === null || value === undefined) {
    return value
  }

  return typeof value === 'string' ? value : value.toString()
}

function sanitizeUser(user) {
  if (!user) {
    return null
  }

  const plain = typeof user.toJSON === 'function' ? user.toJSON() : { ...user }

  return {
    _id: normalizeId(plain._id),
    name: plain.name,
    email: plain.email,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  }
}

function formatThought(thought) {
  if (!thought) {
    return null
  }

  const plain = typeof thought.toJSON === 'function' ? thought.toJSON() : { ...thought }
  const author = plain.author && typeof plain.author === 'object'
    ? {
      _id: normalizeId(plain.author._id),
      name: plain.author.name,
      email: plain.author.email,
    }
    : null

  return {
    _id: normalizeId(plain._id),
    text: plain.text,
    author,
    likes: Number(plain.likes || 0),
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  }
}

function validateThoughtText(text) {
  const trimmed = typeof text === 'string' ? text.trim() : ''

  if (!trimmed) {
    return 'Thoughts cannot be empty.'
  }

  if (trimmed.length < 3) {
    return 'Thoughts must be at least 3 characters long.'
  }

  if (trimmed.length > 140) {
    return 'Thoughts cannot be longer than 140 characters.'
  }

  return null
}

function createToken(user) {
  return jwt.sign(
    {
      sub: normalizeId(user._id),
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function extractBearerToken(header = '') {
  if (!header.startsWith('Bearer ')) {
    return null
  }

  return header.slice(7)
}

async function authMiddleware(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    const payload = jwt.verify(token, JWT_SECRET)
    const userId = payload.sub
    let user

    if (dbState.mode === 'mongo') {
      user = await User.findById(userId)
    } else {
      user = memoryStore.users.get(userId) || null
    }

    if (!user) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    req.user = sanitizeUser(user)
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

function seedMemoryStore() {
  if (memoryStore.users.size > 0) {
    return
  }

  const demoUser = {
    _id: 'demo-user-1',
    name: 'Pebbles Demo',
    email: 'demo@example.com',
    password: bcrypt.hashSync('password123', 10),
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  }

  const secondUser = {
    _id: 'demo-user-2',
    name: 'Alex Rivers',
    email: 'alex@example.com',
    password: bcrypt.hashSync('password123', 10),
    createdAt: new Date(Date.now() - 72000000),
    updatedAt: new Date(Date.now() - 72000000),
  }

  const thoughts = [
    {
      _id: 'thought-1',
      text: 'Small steps still count when you are building something real.',
      authorId: secondUser._id,
      likes: 2,
      createdAt: new Date(Date.now() - 1800000),
      updatedAt: new Date(Date.now() - 1800000),
    },
    {
      _id: 'thought-2',
      text: 'A clean loading state makes an app feel much more trustworthy.',
      authorId: demoUser._id,
      likes: 1,
      createdAt: new Date(Date.now() - 600000),
      updatedAt: new Date(Date.now() - 600000),
    },
  ]

  memoryStore.users.set(demoUser._id, demoUser)
  memoryStore.users.set(secondUser._id, secondUser)
  thoughts.forEach((thought) => memoryStore.thoughts.set(thought._id, thought))
}

async function connectDatabase() {
  const mongoUri = process.env.MONGO_URI

  if (!mongoUri) {
    if (!allowMemoryFallback) {
      throw new Error('MONGO_URI is required in production.')
    }

    seedMemoryStore()
    return
  }

  try {
    await mongoose.connect(mongoUri)
    dbState.mode = 'mongo'
    console.log('Connected to MongoDB')
  } catch (error) {
    if (!allowMemoryFallback) {
      throw error
    }

    console.warn('MongoDB unavailable, using in-memory fallback instead.')
    seedMemoryStore()
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, mode: dbState.mode })
})

app.post('/auth/register', async (req, res) => {
  try {
    const name = (req.body.name || '').trim()
    const email = (req.body.email || '').trim().toLowerCase()
    const password = req.body.password || ''

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' })
    }

    let existingUser

    if (dbState.mode === 'mongo') {
      existingUser = await User.findOne({ email })
    } else {
      existingUser = Array.from(memoryStore.users.values()).find((user) => user.email === email) || null
    }

    if (existingUser) {
      return res.status(409).json({ message: 'An account with that email already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    let createdUser

    if (dbState.mode === 'mongo') {
      createdUser = await User.create({ name, email, password: hashedPassword })
    } else {
      createdUser = {
        _id: `user-${Date.now()}`,
        name,
        email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      memoryStore.users.set(createdUser._id, createdUser)
    }

    const user = sanitizeUser(createdUser)

    return res.status(201).json({
      token: createToken(user),
      user,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to register right now.' })
  }
})

app.post('/auth/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase()
    const password = req.body.password || ''

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    let user

    if (dbState.mode === 'mongo') {
      user = await User.findOne({ email }).select('+password')
    } else {
      user = Array.from(memoryStore.users.values()).find((entry) => entry.email === email) || null
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const passwordMatches = await bcrypt.compare(password, user.password)

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    const safeUser = sanitizeUser(user)

    return res.json({
      token: createToken(safeUser),
      user: safeUser,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to log in right now.' })
  }
})

app.get('/thoughts', async (_req, res) => {
  try {
    let thoughts

    if (dbState.mode === 'mongo') {
      thoughts = await Thought.find()
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .limit(50)
    } else {
      thoughts = Array.from(memoryStore.thoughts.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50)
        .map((thought) => ({
          ...thought,
          author: memoryStore.users.get(thought.authorId) || null,
        }))
    }

    return res.json({ thoughts: thoughts.map(formatThought) })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load thoughts right now.' })
  }
})

app.post('/thoughts', authMiddleware, async (req, res) => {
  try {
    const message = validateThoughtText(req.body.text)

    if (message) {
      return res.status(400).json({ message })
    }

    const text = req.body.text.trim()
    let thought

    if (dbState.mode === 'mongo') {
      thought = await Thought.create({
        text,
        author: req.user._id,
      })
      thought = await Thought.findById(thought._id).populate('author', 'name email')
    } else {
      thought = {
        _id: `thought-${Date.now()}`,
        text,
        authorId: req.user._id,
        likes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: memoryStore.users.get(req.user._id) || null,
      }
      memoryStore.thoughts.set(thought._id, {
        _id: thought._id,
        text: thought.text,
        authorId: req.user._id,
        likes: 0,
        createdAt: thought.createdAt,
        updatedAt: thought.updatedAt,
      })
    }

    return res.status(201).json({ thought: formatThought(thought) })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to create a thought right now.' })
  }
})

app.put('/thoughts/:thoughtId', authMiddleware, async (req, res) => {
  try {
    const message = validateThoughtText(req.body.text)

    if (message) {
      return res.status(400).json({ message })
    }

    const text = req.body.text.trim()
    const { thoughtId } = req.params
    let thought

    if (dbState.mode === 'mongo') {
      thought = await Thought.findById(thoughtId)

      if (!thought) {
        return res.status(404).json({ message: 'Thought not found.' })
      }

      if (normalizeId(thought.author) !== req.user._id) {
        return res.status(403).json({ message: 'You can only edit your own thoughts.' })
      }

      thought.text = text
      await thought.save()
      thought = await Thought.findById(thoughtId).populate('author', 'name email')
    } else {
      const existingThought = memoryStore.thoughts.get(thoughtId)

      if (!existingThought) {
        return res.status(404).json({ message: 'Thought not found.' })
      }

      if (existingThought.authorId !== req.user._id) {
        return res.status(403).json({ message: 'You can only edit your own thoughts.' })
      }

      existingThought.text = text
      existingThought.updatedAt = new Date()
      thought = {
        ...existingThought,
        author: memoryStore.users.get(existingThought.authorId) || null,
      }
    }

    return res.json({ thought: formatThought(thought) })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to update this thought right now.' })
  }
})

app.delete('/thoughts/:thoughtId', authMiddleware, async (req, res) => {
  try {
    const { thoughtId } = req.params

    if (dbState.mode === 'mongo') {
      const thought = await Thought.findById(thoughtId)

      if (!thought) {
        return res.status(404).json({ message: 'Thought not found.' })
      }

      if (normalizeId(thought.author) !== req.user._id) {
        return res.status(403).json({ message: 'You can only delete your own thoughts.' })
      }

      await Thought.findByIdAndDelete(thoughtId)
    } else {
      const thought = memoryStore.thoughts.get(thoughtId)

      if (!thought) {
        return res.status(404).json({ message: 'Thought not found.' })
      }

      if (thought.authorId !== req.user._id) {
        return res.status(403).json({ message: 'You can only delete your own thoughts.' })
      }

      memoryStore.thoughts.delete(thoughtId)
    }

    return res.status(204).send()
  } catch (error) {
    return res.status(500).json({ message: 'Unable to delete this thought right now.' })
  }
})

app.post('/thoughts/:thoughtId/like', async (req, res) => {
  try {
    const { thoughtId } = req.params
    let thought

    if (dbState.mode === 'mongo') {
      thought = await Thought.findByIdAndUpdate(
        thoughtId,
        { $inc: { likes: 1 } },
        { new: true }
      ).populate('author', 'name email')
    } else {
      const existingThought = memoryStore.thoughts.get(thoughtId)

      if (!existingThought) {
        thought = null
      } else {
        existingThought.likes += 1
        existingThought.updatedAt = new Date()
        thought = {
          ...existingThought,
          author: memoryStore.users.get(existingThought.authorId) || null,
        }
      }
    }

    if (!thought) {
      return res.status(404).json({ message: 'Thought not found.' })
    }

    return res.json({ thought: formatThought(thought) })
  } catch (error) {
    return res.status(500).json({ message: 'Unable to like this thought right now.' })
  }
})

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Server failed to start', error)
    process.exit(1)
  })
