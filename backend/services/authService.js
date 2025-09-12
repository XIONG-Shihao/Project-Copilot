/**
 * @fileoverview Authentication service module containing user authentication and profile management logic
 * @module services/authService
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * Changes a user's password with current password verification
 * @async
 * @function changePassword
 * @param {string} userId - ID of the user changing password
 * @param {string} currentPassword - User's current password for verification
 * @param {string} newPassword - New password to set
 * @returns {Promise<Object>} Success message object
 * @throws {Error} When current password is incorrect
 * @throws {Error} When new password doesn't meet strength requirements
 * @description Validates current password, checks new password strength, and updates with hashed password
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  // obtain the user's current password
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error('Current password is incorrect');
  }
  // update the password on mongodb
  checkPasswordStrength(newPassword);
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  return { message: 'Password updated successfully'};
}


/**
 * Validates password strength according to security requirements
 * @function checkPasswordStrength
 * @param {string} password - Password to validate
 * @throws {Error} When password doesn't meet requirements (8+ chars, 1 uppercase, 1 special char)
 * @description Enforces password policy with minimum length, uppercase letter, and special character requirements
 */
function checkPasswordStrength(password) {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()<>?":{}|.,';_+-=]/.test(password);

  if (!(hasMinLength && hasUpperCase && hasSpecialChar)) {
    throw new Error(
      'Password must have at least 8 characters, 1 uppercase letter and 1 special character'
    );
  }
}

/**
 * Validates email format using regex pattern
 * @function checkValidEmail
 * @param {string} email - Email address to validate
 * @throws {Error} When email format is invalid
 * @description Checks for basic email structure with @ symbol and domain
 */
function checkValidEmail(email) {
  // Basic email validation: checks for text before/after @ and a domain
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Provided Email is not valid');
  }
}

/**
 * Registers a new user with validation and JWT token generation
 * @async
 * @function registerUser
 * @param {Object} userData - User registration data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @param {string} userData.password - User's password
 * @returns {Promise<Object>} Object containing user data and JWT token
 * @throws {Error} When password doesn't meet strength requirements
 * @throws {Error} When email format is invalid
 * @throws {Error} When email is already registered
 * @description Creates new user account with password hashing and automatic token generation
 */
async function registerUser({ name, email, password }) {
  checkPasswordStrength(password);

  checkValidEmail(email);

  const existing = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
  if (existing) {
    throw new Error('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ name, email, password: hashedPassword });

  const savedUser = await newUser.save();
  
  // Generate token after successful registration
  const token = jwt.sign(
    { userId: savedUser._id, email: savedUser.email },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );

  return { user: savedUser, token };
}

/**
 * Authenticates user credentials and generates JWT token
 * @async
 * @function loginUser
 * @param {Object} credentials - User login credentials
 * @param {string} credentials.email - User's email address
 * @param {string} credentials.password - User's password
 * @returns {Promise<Object>} Object containing JWT token and user data
 * @throws {Error} When email or password is missing
 * @throws {Error} When credentials are invalid (generic message for security)
 * @description Performs case-insensitive email lookup, password verification, and token generation
 */
async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new Error('An email and password are required to login');
  }

  // Case-insensitive email search using regex. Emails are not case-sensitive, so user
  // Should be able to enter Alice or alice and it still be valid.

  const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
  if (!user) {
    throw new Error('Invalid Email or Password'); // For security reasons, dont show that user exists/doesnt exist
  }

  const passwordCheck = await bcrypt.compare(password, user.password); //Compare hashed password with plaintext
  if (!passwordCheck) {
    throw new Error('Invalid Email or Password');
  }

  // Generate token after password passes
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '48h' }
  );

  return { token, user };
}

/**
 * Retrieves user profile with populated project information
 * @async
 * @function getUserProfile
 * @param {string} userId - ID of the user to fetch profile for
 * @returns {Promise<Object>} User document with populated projects and member details
 * @throws {Error} When user is not found
 * @description Fetches user data with nested population of projects and project members
 */
async function getUserProfile(userId) {
  const user = await User.findById(userId)
    .populate({
      path: 'userProjects',
      select: 'projectName projectDescrption projectMembers',
      populate: {
        path: 'projectMembers.user',
        select: 'name email'
      }
    });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
}

/**
 * Updates user profile information with field validation
 * @async
 * @function updateProfile
 * @param {string} userId - ID of the user to update
 * @param {Object} updates - Object containing fields to update
 * @param {string} [updates.name] - New user name
 * @param {string} [updates.email] - New user email address
 * @returns {Promise<Object>} Success message and updated user data
 * @throws {Error} When invalid fields are provided for update
 * @throws {Error} When user is not found
 * @throws {Error} When new email format is invalid
 * @description Updates allowed profile fields with validation and returns sanitized user data
 */
async function updateProfile(userId, updates) {
  const allowedUpdates = ['name', 'email'];
  const keys = Object.keys(updates);

  const isValidOperation = keys.every(key => allowedUpdates.includes(key));
  if (!isValidOperation) {
    throw new Error('Invalid fields in update. Only name and email can be updated.');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (updates.name) {
    user.name = updates.name;
  }

  if (updates.email) {
    checkValidEmail(updates.email);
    user.email = updates.email;
  }

  await user.save();

  return {
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  };
}


module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  changePassword,
  updateProfile
};
