/**
 * @fileoverview Post controller module for handling project posts, likes, and task mentions
 * @module controllers/postController
 */

const Post = require('../models/post');
const Comment = require('../models/comment');
const Like = require('../models/like');
const Project = require('../models/project');
const Task = require('../models/tasks');

/**
 * Helper function to extract task mentions from post content
 * @function extractTaskMentions
 * @param {string} content - Post content to scan for task mentions
 * @param {Array<Object>} projectTasks - Array of project tasks to match against
 * @returns {Array<Object>} Array of mention objects with task ID and mention text
 * @description Parses content for @mentions and matches them to project tasks using normalized task names
 */
const extractTaskMentions = (content, projectTasks) => {
  const mentions = [];
  const seenTaskIds = new Set(); // Track seen task IDs to avoid duplicates
  const mentionRegex = /@(\w+)/g;
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionText = match[1];
    
    // Updated to match frontend logic: remove all special characters, not just spaces
    const task = projectTasks.find(task => 
      task.taskName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === mentionText.toLowerCase()
    );
    
    if (task && !seenTaskIds.has(task._id.toString())) {
      seenTaskIds.add(task._id.toString());
      mentions.push({
        task: task._id,
        mentionText: match[0]
      });
    }
  }
  
  return mentions;
};



/**
 * Retrieves all posts for a specific project with like and comment information
 * @async
 * @function getProjectPosts
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to get posts for
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with array of posts including like/comment counts
 * @throws {500} When internal server error occurs
 * @description Fetches posts sorted by creation date with populated author, task mentions, and engagement data
 */
const getProjectPosts = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.userId;
    
    const posts = await Post.find({ project: projectId })
      .populate('author', 'name')
      .populate('mentionedTasks.task', 'taskName')
      .sort({ createdAt: -1 });
    
    // Add like and comment information for each post
    const postsWithLikes = await Promise.all(posts.map(async (post) => {
      const likesCount = await Like.getLikeCount('Post', post._id);
      const userHasLiked = await Like.hasUserLiked(userId, 'Post', post._id);
      
      // Get comment count for this post
      const commentsCount = await Comment.countDocuments({ post: post._id });
      
      return {
        ...post.toObject(),
        likesCount,
        userHasLiked,
        commentsCount
      };
    }));
    
    res.json({ posts: postsWithLikes });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Creates a new post in a project with task mentions and optional image
 * @async
 * @function createPost
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.projectId - ID of the project to create post in
 * @param {Object} req.body - Request body
 * @param {string} req.body.title - Title of the post
 * @param {string} req.body.content - Content of the post
 * @param {string} req.body.postType - Type/category of the post
 * @param {string} [req.body.imageData] - Base64 encoded image data
 * @param {string} [req.body.imageType] - MIME type of the image
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with created post data
 * @throws {404} When project is not found
 * @throws {500} When internal server error occurs
 * @description Creates post with automatic task mention extraction and image handling
 */
const createPost = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, content, postType, imageData, imageType } = req.body;
    const userId = req.user.userId;
    
    // Get project tasks for mentions
    const project = await Project.findById(projectId).populate('projectTasks');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const mentionedTasks = extractTaskMentions(content, project.projectTasks);
    
    // Handle image data if present (Base64)
    let imageObj = null;
    if (imageData && imageType) {
      imageObj = {
        data: imageData, // Base64 string
        contentType: imageType // MIME type
      };
    }
    
    const post = new Post({
      title,
      content,
      postType,
      author: userId,
      project: projectId,
      mentionedTasks,
      image: imageObj
    });
    
    await post.save();
    await post.populate('author', 'name');
    await post.populate('mentionedTasks.task', 'taskName');
    
    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Retrieves a specific post with all its comments
 * @async
 * @function getPost
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.postId - ID of the post to retrieve
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with post data and associated comments
 * @throws {404} When post is not found
 * @throws {500} When internal server error occurs
 * @description Fetches post with populated author and task mentions, plus all comments sorted chronologically
 */
const getPost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId)
      .populate('author', 'name')
      .populate('mentionedTasks.task', 'taskName');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const comments = await Comment.find({ post: postId })
      .populate('author', 'name')
      .sort({ createdAt: 1 });
    
    res.json({ post, comments });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Toggles like status on a post (like/unlike)
 * @async
 * @function togglePostLike
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.postId - ID of the post to toggle like on
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with like action and updated counts
 * @throws {404} When post is not found
 * @throws {500} When internal server error occurs
 * @description Adds or removes like from post and returns updated like information
 */
const togglePostLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const result = await Like.toggleLike(userId, 'Post', postId, post.project);
    
    // Get updated like information
    const likesCount = await Like.getLikeCount('Post', postId);
    const userHasLiked = await Like.hasUserLiked(userId, 'Post', postId);
    
    res.json({ 
      action: result.action,
      likesCount,
      userHasLiked
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Updates an existing post with new content, image, or metadata
 * @async
 * @function updatePost
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.postId - ID of the post to update
 * @param {Object} req.body - Request body
 * @param {string} [req.body.title] - Updated title
 * @param {string} [req.body.content] - Updated content
 * @param {string} [req.body.postType] - Updated post type
 * @param {string} [req.body.imageData] - Base64 encoded image data
 * @param {string} [req.body.imageType] - MIME type of the image
 * @param {boolean} [req.body.removeImage] - Flag to remove existing image
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with updated post data
 * @throws {404} When post is not found
 * @throws {403} When user is not authorized to edit the post (not the author)
 * @throws {500} When internal server error occurs
 * @description Updates post fields and re-extracts task mentions from new content with author authorization
 */
const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, postType, imageData, imageType, removeImage } = req.body;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author
    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    // Update post fields
    post.title = title || post.title;
    post.content = content || post.content;
    post.postType = postType || post.postType;
    post.updatedAt = new Date();

    // Handle image operations
    if (removeImage) {
      // Remove image if removeImage flag is set
      post.image = undefined;
    } else if (imageData && imageType) {
      // Update image if new image data is provided
      post.image = {
        data: imageData, // Base64 string
        contentType: imageType // MIME type
      };
    }

    // Extract task mentions from new content
    if (content) {
      const projectTasks = await Task.find({ project: post.project });
      post.mentionedTasks = extractTaskMentions(content, projectTasks);
    }

    await post.save();

    // Populate for response
    await post.populate('author', 'name');
    await post.populate('mentionedTasks.task', 'taskName');

    res.json({ post });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Deletes a post and all associated comments and likes
 * @async
 * @function deletePost
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} req.params.postId - ID of the post to delete
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with deletion confirmation
 * @throws {404} When post is not found
 * @throws {403} When user is not authorized to delete the post (not the author)
 * @throws {500} When internal server error occurs
 * @description Cascades deletion to all comments and likes with author authorization check
 */
const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author
    if (post.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    // Delete associated comments and likes
    await Comment.deleteMany({ post: postId });
    await Like.deleteMany({ targetType: 'Post', targetId: postId });

    // Delete the post
    await Post.findByIdAndDelete(postId);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getProjectPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
  togglePostLike
};