/**
 * @fileoverview Comment controller module for handling post comments and replies
 * @module controllers/commentController
 */

const Comment = require('../models/comment');
const Post = require('../models/post');
const Like = require('../models/like');

/**
 * Creates a new comment on a post with optional parent comment for replies
 * @async
 * @function createComment
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.postId - ID of the post to comment on
 * @param {Object} req.body - Request body
 * @param {string} req.body.content - Content of the comment
 * @param {string} [req.body.parentCommentId] - ID of parent comment if this is a reply
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with created comment data
 * @throws {404} When post or parent comment is not found
 * @throws {400} When trying to reply to nested comments (only one level allowed)
 * @throws {500} When internal server error occurs
 * @description Creates comments with one-level nesting support and automatic author population
 */
const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;
    const userId = req.user.userId;
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Simple one-level nesting check
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      if (parentComment.parentComment) {
        return res.status(400).json({ message: 'Cannot reply to nested comments' });
      }
    }
    
    const comment = new Comment({
      content,
      post: postId,
      author: userId,
      parentComment: parentCommentId || null
    });
    
    await comment.save();
    await comment.populate('author', 'name');
    
    res.status(201).json({ comment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Deletes a comment and all its replies, along with associated likes
 * @async
 * @function deleteComment
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.commentId - ID of the comment to delete
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with deletion confirmation
 * @throws {404} When comment is not found
 * @throws {403} When user is not authorized to delete the comment (not the author)
 * @throws {500} When internal server error occurs
 * @description Cascades deletion to all replies and associated likes, with author authorization check
 */
const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.userId;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user is the author
    if (comment.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Delete all replies to this comment
    await Comment.deleteMany({ parentComment: commentId });

    // Delete associated likes
    await Like.deleteMany({ targetType: 'Comment', targetId: commentId });

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createComment,
  deleteComment
};