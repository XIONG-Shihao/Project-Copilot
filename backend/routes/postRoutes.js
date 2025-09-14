const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const { verifyToken } = require('../middleware/auth');

// Simple post routes
router.get('/project/:projectId/posts', verifyToken, postController.getProjectPosts);
router.post('/project/:projectId/posts', verifyToken, postController.createPost);
router.get('/posts/:postId', verifyToken, postController.getPost);
router.put('/posts/:postId', verifyToken, postController.updatePost);
router.delete('/posts/:postId', verifyToken, postController.deletePost);
router.post('/posts/:postId/like', verifyToken, postController.togglePostLike);

// Simple comment routes
router.post('/posts/:postId/comments', verifyToken, commentController.createComment);
router.delete('/comments/:commentId', verifyToken, commentController.deleteComment);

module.exports = router;