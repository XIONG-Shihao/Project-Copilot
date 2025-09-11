const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  // Comment content
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Relationships
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Simple one-level nesting
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  
  // Simple engagement
  likesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Simple indexes
commentSchema.index({ post: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);