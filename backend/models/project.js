const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  projectDescription: { type: String, required: true },
  // Array of project members with user and their role
  projectOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectMembers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
      },
      role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: false,
      },
    },
  ],
  // List of projectTasks
  projectTasks: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: false },
  ],
  // List of project posts
  projectPosts: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: false },
  ],
  // Project settings
  settings: {
    joinByLinkEnabled: { type: Boolean, default: true },
    pdfGenerationEnabled: { type: Boolean, default: true },
  },
}, {
  timestamps: true // adds createdAt and updatedAt
});

module.exports = mongoose.model('Project', projectSchema);
