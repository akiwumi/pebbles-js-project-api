const mongoose = require('mongoose')

const thoughtSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 140,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
})

module.exports = mongoose.model('Thought', thoughtSchema)
