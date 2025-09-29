const request = require('supertest');
const app = require('../app');
const mockingoose = require('mockingoose');
const User = require('../models/user');
const Role = require('../models/roles');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


/**
 * @fileoverview Jest setup for authentication tests using mockingoose.
 */

beforeEach(() => {
  mockingoose.resetAll();
  jest.restoreAllMocks(); // restore any mocks on bcrypt
});

describe('Test logging in', () => {
  test('login with invalid account (user not found)', async () => {
    mockingoose(User).toReturn(null, 'findOne'); // No user found
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'fake@example.com', password: 'wrongpassword' });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid Email or Password');
  });

  test('login with correct email but wrong password', async () => {
    // Mock user found with hashed password
    mockingoose(User).toReturn({
      _id: '507f1f77bcf86cd799439012',
      email: 'alice@unsw.edu.au',
      password: '$2b$10$fakehashedpasswordvalue', // bcrypt hashed fake pwd
      name: 'Alice Johnson'
    }, 'findOne');

    // bcrypt.compare returns false simulating wrong password
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'alice@unsw.edu.au', password: 'invalidPassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid Email or Password');
  });

  test('login with no email or password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: '', password: '' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('An email and password are required to login');
  });

  test('login with incorrect email but correct password (user not found)', async () => {
    mockingoose(User).toReturn(null, 'findOne'); // user not found

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'alice@unsw', password: 'Password123!' });

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Invalid Email or Password');
  });

  test('login with correct email and password', async () => {
    // Mock user found with hashed password
    mockingoose(User).toReturn({
      _id: '507f1f77bcf86cd799439011',
      email: 'alice@unsw.edu.au',
      password: '$2b$10$fakehashedpasswordvalue', // bcrypt hashed fake pwd
      name: 'Alice Johnson'
    }, 'findOne');

    // bcrypt.compare returns true simulating correct password
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const res = await request(app)
      .post('/api/login')
      .send({ email: 'alice@unsw.edu.au', password: 'Password123!' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });
});

describe('Test creation of a user', () => {
  test('Fails with missing required fields', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ name: '', email: '', password: '' });
        
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/required/i);
  });

  test('Fails with invalid email format', async () => {
    // Simulate mongoose validation error for email
    mockingoose(User).toReturn(new Error('Validation failed: email is invalid'), 'save');

    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Bob Smith', email: 'invalid-email', password: 'Password123!' });
        
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/email/i);
  });

  test('Fails with weak password', async () => {
    // Simulate mongoose validation error or custom password check failure
    mockingoose(User).toReturn(new Error('Validation failed: password too weak'), 'save');

    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Bob Smith', email: 'bob@example.com', password: 'weak' });
        
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/password/i);
  });

  test('Fails when user already exists', async () => {
    // Simulate existing user found
    mockingoose(User).toReturn({
      _id: '507f1f77bcf86cd799439011',
      email: 'alice@unsw.edu.au',
      name: 'Alice Johnson'
    }, 'findOne');

    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Alice Johnson', email: 'alice@unsw.edu.au', password: 'Password123!' });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toEqual('Email already registered');
  });

  test('Successfully creates a new user', async () => {
    // Simulate no existing user
    mockingoose(User).toReturn(null, 'findOne');

    // Simulate successful user save
    mockingoose(User).toReturn({
      _id: '507f1f77bcf86cd799439012',
      name: 'New account',
      email: 'test@email.com'
    }, 'save');

    // Simulate Role fetching if applicable
    mockingoose(Role).toReturn([{ name: 'user' }], 'find');

    const res = await request(app)
      .post('/api/register')
      .send({ name: 'New account', email: 'test@email.com', password: 'Password123!' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toMatchObject({
      id: expect.any(String),
      name: 'New account',
      email: 'test@email.com'
    });
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'].some(cookie => cookie.startsWith('token='))).toBe(true);
  });
});

describe('Test user logging out', () => {
  test('User logs out successfully', async () => {
    const res = await request(app)
      .post('/api/logout')
      .set('Cookie', 'token=fakeToken');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Logout successful' });

    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader.some(header => header.includes('token=;'))).toBe(true);
  });
});

describe('Test user profile functionality', () => {
  const mockUserId = '507f1f77bcf86cd799439012';

  test('User is not found', async () => {
    const mockToken = jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET || 'testsecret');
    
    // Mock Mongoose to return null for findById
    mockingoose(User).toReturn(null, 'findById');
    
    const res = await request(app)
      .get('/api/profile')
      .set('Cookie', `token=${mockToken}`);
      
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'User not found' });
  });

  test('User is found and profile is returned', async () => {
    const mockToken = jwt.sign(
      { userId: mockUserId, email: 'test@email.com'}, 
      process.env.JWT_SECRET || 'testsecret'
    );
    
    // Mock user data with populated userProjects
    const mockUser = {
      _id: mockUserId,
      name: 'New account',
      email: 'test@email.com',
      userProjects: [
        {
          _id: '507f1f77bcf86cd799439013',
          projectName: 'Project A',
          projectDescription: 'Some project description',
          projectMembers: [
            { 
              _id: '507f1f77bcf86cd799439014',
              user: { 
                _id: '507f1f77bcf86cd799439015',
                name: 'Alice', 
                email: 'alice@email.com' 
              } 
            },
            { 
              _id: '507f1f77bcf86cd799439016',
              user: { 
                _id: '507f1f77bcf86cd799439017',
                name: 'Bob', 
                email: 'bob@email.com' 
              } 
            }
          ]
        }
      ]
    };
    
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockUser)
    }));
    
    const res = await request(app)
      .get('/api/profile')
      .set('Cookie', `token=${mockToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(expect.objectContaining({
      _id: mockUserId,
      name: 'New account',
      email: 'test@email.com',
      userProjects: expect.any(Array)
    }));
    
    // Test the userProjects array structure
    expect(res.body.user.userProjects).toHaveLength(1);
    expect(res.body.user.userProjects[0]).toEqual(expect.objectContaining({
      projectName: 'Project A',
      projectDescription: 'Some project description',
      projectMembers: expect.any(Array)
    }));
    
    // Test the projectMembers array
    expect(res.body.user.userProjects[0].projectMembers).toHaveLength(2);
    expect(res.body.user.userProjects[0].projectMembers[0].user.name).toBe('Alice');
    expect(res.body.user.userProjects[0].projectMembers[0].user.email).toBe('alice@email.com');
    expect(res.body.user.userProjects[0].projectMembers[1].user.name).toBe('Bob');
    expect(res.body.user.userProjects[0].projectMembers[1].user.email).toBe('bob@email.com');
  });
});

describe('Test password change functionality', () => {
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockToken = jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET || 'testsecret');

  const validHeaders = {
    Cookie: `token=${mockToken}`
  };

    

  test('Fails when current or new password is missing', async () => {
    const res = await request(app)
      .post('/api/changePassword')
      .set(validHeaders)
      .send({ currentPassword: '', newPassword: 'newPass123' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Current and new passwords are required' });
  });

  test('Fails when current password is incorrect', async () => {
    // bcrypt.compare returns false to simulate wrong password
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const mockUser = {
      _id: mockUserId,
      name: 'Alice',
      email: 'test@example.com',
      password: await bcrypt.hash('correctPassword123', 10),
      save: jest.fn()
    };

    jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/changePassword')
      .set(validHeaders)
      .send({
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Current password is incorrect' });
  });

  test('Successfully changes the password', async () => {
    // bcrypt.compare returns true to simulate correct current password
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedNewPassword123');

    const mockUser = {
      _id: mockUserId,
      name: 'Alice',
      email: 'test@example.com',
      password: 'hashedOldPassword',
      save: jest.fn().mockResolvedValue(true)
    };

    jest.spyOn(User, 'findById').mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/changePassword')
      .set(validHeaders)
      .send({
        currentPassword: 'correctOldPassword',
        newPassword: 'newPassword123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'Password updated successfully' });
    expect(mockUser.save).toHaveBeenCalled();
  });
});

describe('PUT /api/updateProfile', () => {
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockToken = jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET || 'testsecret');

  const validHeaders = {
    Cookie: `token=${mockToken}`
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Successfully updates name and email', async () => {
    const fakeUser = {
      _id: mockUserId,
      name: 'Old Name',
      email: 'old@example.com',
      save: jest.fn().mockResolvedValue(),
    };

    jest.spyOn(User, 'findById').mockResolvedValue(fakeUser);

    const res = await request(app)
      .put('/api/profile')
      .set(validHeaders)
      .send({
        name: 'New Name',
        email: 'new@example.com'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Profile updated successfully');
    expect(fakeUser.name).toBe('New Name');
    expect(fakeUser.email).toBe('new@example.com');
    expect(fakeUser.save).toHaveBeenCalled();
  });

  test('Rejects invalid fields in body', async () => {
    const fakeUser = {
      _id: mockUserId,
      name: 'Old Name',
      email: 'old@example.com',
      password: 'Password123!',
      save: jest.fn().mockResolvedValue(),
    };

    jest.spyOn(User, 'findById').mockResolvedValue(fakeUser);

    const res = await request(app)
      .put('/api/profile')
      .set(validHeaders)
      .send({
        password: 'shouldFail123!'
      });
    expect(res.body).toEqual({ message: 'Invalid fields in update. Only name and email can be updated.'});

    expect(res.statusCode).toBe(400);
  });

  test('Returns 400 if user not found (Bad request)', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .put('/api/profile')
      .set(validHeaders)
      .send({ name: 'New Name' });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: 'User not found' });
  });

  test('Rejects invalid email format', async () => {
    const fakeUser = {
      _id: mockUserId,
      name: 'Old Name',
      email: 'old@example.com',
      save: jest.fn(),
    };

    jest.spyOn(User, 'findById').mockResolvedValue(fakeUser);

    const res = await request(app)
      .put('/api/profile')
      .set(validHeaders)
      .send({ email: 'notanemail' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: 'Provided Email is not valid'});
  });

  test('verifyToken middleware rejects request without token', async () => {
    const res = await request(app)
      .get('/api/profile'); // no cookie set

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Access denied. No token provided.' });
  });

  test('verifyToken middleware rejects request with invalid token', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Cookie', 'token=invalid.jwt.token');

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Invalid token.' });
  });
});