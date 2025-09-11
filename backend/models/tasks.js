const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    taskName: { type: String, required: true },
    taskDescription: { type: String },
    taskDeadline: { type: Date, default: Date.now, required: true },
    taskCreator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    taskAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    taskProgress: {
      type: String,
      enum: ['To Do', 'In Progress', 'Completed'],
      default: 'To Do',
      required: true
    },
    progressHistory: [
      {
        progress: {
          type: String,
          enum: ['To Do', 'In Progress', 'Completed']
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true // adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('Task', taskSchema);
