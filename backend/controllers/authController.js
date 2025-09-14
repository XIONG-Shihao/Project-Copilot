/**
 * @fileoverview Authentication controller module for handling user authentication operations
 * @module controllers/authController
 */

const authService = require('../services/authService');

/**
 * Registers a new user in the system
 * @async
 * @function registerUser
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - User's full name
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with user data and success message
 * @throws {400} When name, email, or password is missing
 * @throws {400} When email format is invalid
 * @throws {400} When password doesn't meet security requirements
 * @throws {409} When email is already registered
 * @throws {500} When internal server error occurs
 * @description Creates a new user account, validates input data, and sets authentication cookie
 */
async function registerUser(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, Email and password are required' });
  }

  try {
    const { user, token } = await authService.registerUser({ name, email, password });
    
    // Set the JWT token cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: 'lax', // More permissive for development
      maxAge: 48 * 60 * 60 * 1000, // 48hr, adjust if needed
    });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    if (err.message === 'Email already registered') {
      res.status(409).json({ message: err.message });
    } else if (err.message === 'Provided Email is not valid') {
      res.status(400).json({ message: err.message });
    } else if (err.message === 'Password must have at least 8 characters, 1 uppercase letter and 1 special character') {
      res.status(400).json({ message: err.message });
    } else {
      res.status(500).json({ message: err.message });
    }
  }
}

/**
 * Authenticates a user and creates a login session
 * @async
 * @function loginUser
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {boolean} [req.body.rememberMe] - Whether to extend session duration
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with user data and success message
 * @throws {400} When email or password is missing
 * @throws {401} When credentials are invalid
 * @throws {500} When internal server error occurs
 * @description Validates user credentials, creates JWT token, and sets authentication cookie with configurable expiration
 */
async function loginUser(req, res) {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'An email and password are required to login' });
  }

  try {
    const { token, user } = await authService.loginUser({ email, password });
    
    // Set cookie expiration based on "Remember me" option
    // Default: 48 hours; With "Remember me": 30 days
    const cookieMaxAge = rememberMe 
      ? 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
      : 48 * 60 * 60 * 1000;     // 48 hours in milliseconds
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to false for development
      sameSite: 'lax', // More permissive for development
      maxAge: cookieMaxAge
    });
    
    res.status(200).json({ 
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    if (err.message === 'Invalid Email or Password') {
      return res.status(401).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Logs out the current user by clearing authentication cookie
 * @function logoutUser
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {void} JSON response with logout success message
 * @description Clears the authentication cookie and terminates the user session
 */
function logoutUser(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false, // Set to false for development
    sameSite: 'lax', // More permissive for development
  });
  res.status(200).json({ message: 'Logout successful' });
}

/**
 * Retrieves the current user's profile information
 * @async
 * @function getUserProfile
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with user profile data
 * @throws {404} When user is not found
 * @throws {500} When internal server error occurs
 * @description Fetches and returns the authenticated user's profile information
 */
async function getUserProfile(req, res) {
  try {
    const user = await authService.getUserProfile(req.user.userId);
    res.status(200).json({ user });
  } catch (err) {
    if (err.message === 'User not found') {
      res.status(404).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

/**
 * Changes the password for the authenticated user
 * @async
 * @function changePassword
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.currentPassword - User's current password
 * @param {string} req.body.newPassword - User's new password
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with success message
 * @throws {400} When current or new password is missing
 * @throws {400} When current password is incorrect or new password doesn't meet requirements
 * @description Updates the user's password after validating the current password and new password requirements
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required' });
  }

  try {
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json({ message: result.message });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

/**
 * Updates the authenticated user's profile information
 * @async
 * @function updateProfile
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing profile updates
 * @param {string} [req.body.name] - Updated user name
 * @param {string} [req.body.email] - Updated user email
 * @param {Object} req.user - User object from authentication middleware
 * @param {string} req.user.userId - ID of the authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with success message and updated user data
 * @throws {400} When invalid fields are provided in update
 * @throws {400} When email format is invalid or already exists
 * @throws {404} When user is not found
 * @description Updates allowed user profile fields (name and email only) with validation
 */
async function updateProfile(req, res) {
  const updates = req.body;
  const userId = req.user.userId;

  try {
    const result = await authService.updateProfile(userId, updates);
    res.status(200).json({ message: result.message, user: result.user });
  } catch (err) {
    if (err.message === 'User not found') {
      res.status(404).json({ message: err.message });
    } else if (err.message === 'Invalid fields in update. Only name and email can be updated.') {
      res.status(400).json({ message: err.message });
    } else {
      res.status(400).json({ message: err.message });
    }
  }
}

module.exports = { registerUser, loginUser, logoutUser, getUserProfile, changePassword, updateProfile };