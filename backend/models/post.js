const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  // Basic post information
  title: { 
    type: String, 
    required: true,
    maxlength: 200
  },
  content: { 
    type: String, 
    required: true,
    maxlength: 2000
  },
  
  // Post type enum
  postType: {
    type: String,
    enum: ['Feedback', 'Announcement', 'Discussion'],
    required: true
  },
  
  // Author and project relationship
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  
  // Task mentions/tagging
  mentionedTasks: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    mentionText: String
  }],
  
  // Simple image attachment (stored as Base64 string)
  image: {
    data: String, // Base64 encoded image data
    contentType: String // MIME type (e.g., 'image/jpeg', 'image/png')
  },
  
  // Simple engagement
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Simple indexes
postSchema.index({ project: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);