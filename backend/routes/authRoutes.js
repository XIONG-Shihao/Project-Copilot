const express = require('express');
const { registerUser, loginUser, logoutUser, getUserProfile, changePassword, updateProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/profile', verifyToken, getUserProfile);
router.post('/changePassword', verifyToken, changePassword);
router.put('/profile', verifyToken, updateProfile);

module.exports = router;
