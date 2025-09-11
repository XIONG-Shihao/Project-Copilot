const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  // User who liked
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // What was liked (polymorphic relationship)
  targetType: {
    type: String,
    enum: ['Post', 'Comment'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  
  // For analytics and activity tracking
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  }
}, {
  timestamps: true
});

// Compound indexes to ensure uniqueness and performance
likeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
likeSchema.index({ targetType: 1, targetId: 1 });
likeSchema.index({ project: 1, createdAt: -1 });
likeSchema.index({ user: 1, createdAt: -1 });

// Static method to toggle like
likeSchema.statics.toggleLike = async function(userId, targetType, targetId, projectId) {
  const existingLike = await this.findOne({
    user: userId,
    targetType: targetType,
    targetId: targetId
  });
  
  if (existingLike) {
    // Remove like
    await existingLike.deleteOne();
    return { action: 'unliked', like: null };
  } else {
    // Add like
    const newLike = await this.create({
      user: userId,
      targetType: targetType,
      targetId: targetId,
      project: projectId
    });
    return { action: 'liked', like: newLike };
  }
};

// Static method to get like count for a target
likeSchema.statics.getLikeCount = async function(targetType, targetId) {
  return await this.countDocuments({
    targetType: targetType,
    targetId: targetId
  });
};

// Static method to check if user has liked a target
likeSchema.statics.hasUserLiked = async function(userId, targetType, targetId) {
  const like = await this.findOne({
    user: userId,
    targetType: targetType,
    targetId: targetId
  });
  return !!like;
};

module.exports = mongoose.model('Like', likeSchema);