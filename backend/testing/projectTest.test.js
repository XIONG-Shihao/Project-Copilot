const request = require('supertest');
const app = require('../app');
const mockingoose = require('mockingoose');
const Project = require('../models/project');
const Role = require('../models/roles');
const User = require('../models/user');
const jwt = require('jsonwebtoken');

/**
 * @fileoverview Jest setup for project routes tests using mockingoose.
 */

const mockUserId = '507f1f77bcf86cd799439011';
const mockProjectId = '507f1f77bcf86cd799439012';
const mockRoleId = '507f1f77bcf86cd799439013';

// Helper function to create mock JWT token
const createMockToken = (userId = mockUserId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'testsecret');
};

// Helper function to create mock project data
const createMockProject = (overrides = {}) => ({
  _id: mockProjectId,
  projectName: 'Test Project',
  projectDescription: 'Test project description',
  projectOwner: mockUserId,
  projectMembers: [
    {
      user: {
        _id: mockUserId,
        name: 'Test User',
        email: 'test@example.com'
      },
      role: {
        _id: mockRoleId,
        roleName: 'administrator'
      }
    }
  ],
  projectTasks: [],
  settings: {
    joinByLinkEnabled: true,
    pdfGenerationEnabled: true
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// Helper function to create mock user data
const createMockUser = (overrides = {}) => ({
  _id: mockUserId,
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedPassword',
  userProjects: [mockProjectId],
  ...overrides
});

beforeEach(() => {
  mockingoose.resetAll();
  jest.restoreAllMocks();
});

describe('POST /api/projects/create', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`
  };

  test('Successfully creates a new project', async () => {
    // Mock Role.findOne to return administrator role
    const mockAdminRole = {
      _id: mockRoleId,
      roleName: 'administrator'
    };
    mockingoose(Role).toReturn(mockAdminRole, 'findOne');

    // Mock Project.save to return the created project
    const mockProject = createMockProject();
    mockingoose(Project).toReturn(mockProject, 'save');

    // Mock User.findByIdAndUpdate to return success
    mockingoose(User).toReturn({ modifiedCount: 1 }, 'findByIdAndUpdate');

    // Mock Project.findById to return the populated project directly
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProject)
      }))
    }));

    const res = await request(app)
      .post('/api/projects/create')
      .set(validHeaders)
      .send({
        projectName: 'Test Project',
        projectDescription: 'Test project description'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Project created successfully');
    expect(res.body.project).toMatchObject({
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectMembers: expect.any(Array)
    });
  });

  test('Fails when project name is missing', async () => {
    const res = await request(app)
      .post('/api/projects/create')
      .set(validHeaders)
      .send({
        projectDescription: 'Test project description'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Project name and description are required');
  });

  test('Fails when project description is missing', async () => {
    const res = await request(app)
      .post('/api/projects/create')
      .set(validHeaders)
      .send({
        projectName: 'Test Project'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Project name and description are required');
  });

  test('Fails when both project name and description are missing', async () => {
    const res = await request(app)
      .post('/api/projects/create')
      .set(validHeaders)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Project name and description are required');
  });

  test('Fails when administrator role is not found', async () => {
    // Mock Role.findOne to return null (role not found)
    mockingoose(Role).toReturn(null, 'findOne');

    const res = await request(app)
      .post('/api/projects/create')
      .set(validHeaders)
      .send({
        projectName: 'Test Project',
        projectDescription: 'Test project description'
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Administrator role not found');
  });

  test('Fails when project creation throws an error', async () => {
    // Mock Role.findOne to return administrator role
    const mockAdminRole = {
      _id: mockRoleId,
      roleName: 'administrator'
    };
    mockingoose(Role).toReturn(mockAdminRole, 'findOne');

    // Mock Project.save to throw error
    mockingoose(Project).toReturn(new Error('Database error'), 'save');

    const res = await request(app)
      .post('/api/projects/create')
      .set(validHeaders)
      .send({
        projectName: 'Test Project',
        projectDescription: 'Test project description'
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});

describe('GET /api/projects/user-projects', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`
  };

  test('Successfully retrieves user projects', async () => {
    const mockUser = createMockUser({
      userProjects: [
        createMockProject({ _id: 'project1', projectName: 'Project 1' }),
        createMockProject({ _id: 'project2', projectName: 'Project 2' })
      ]
    });

    // Mock User.findById with populate to return user with populated projects
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockUser)
    }));

    const res = await request(app)
      .get('/api/projects/user-projects')
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.projects).toHaveLength(2);
    expect(res.body.projects[0]).toMatchObject({
      _id: 'project1',
      projectName: 'Project 1',
      projectDescription: 'Test project description',
      projectMembers: expect.any(Array)
    });
    expect(res.body.projects[1]).toMatchObject({
      _id: 'project2',
      projectName: 'Project 2',
      projectDescription: 'Test project description',
      projectMembers: expect.any(Array)
    });
  });

  test('Returns empty array when user has no projects', async () => {
    const mockUser = createMockUser({
      userProjects: []
    });

    // Mock User.findById with populate to return user with no projects
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockUser)
    }));

    const res = await request(app)
      .get('/api/projects/user-projects')
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.projects).toHaveLength(0);
  });

  test('Fails when database throws an error', async () => {
    // Mock User.findById to throw an error
    jest.spyOn(User, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockRejectedValue(new Error('Database error'))
    }));

    const res = await request(app)
      .get('/api/projects/user-projects')
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});

describe('GET /api/projects/:projectId', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`
  };

  test('Successfully retrieves project by ID when user is a member', async () => {
    const mockProject = createMockProject({
      projectTasks: [
        {
          _id: 'task1',
          taskName: 'Test Task',
          taskDescription: 'Test task description',
          taskDeadline: new Date(),
          taskCreator: { _id: mockUserId, name: 'Test User', email: 'test@example.com' },
          taskAssignee: { _id: mockUserId, name: 'Test User', email: 'test@example.com' },
          taskProgress: 50
        }
      ]
    });

    // Mock Project.findById with complex populate chain
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockResolvedValue(mockProject)
        }))
      }))
    }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      members: expect.any(Array),
      tasks: expect.any(Array),
      settings: expect.objectContaining({
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true
      })
    });
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0].user.name).toBe('Test User');
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].taskName).toBe('Test Task');
  });

  test('Returns 404 when project is not found', async () => {
    // Mock Project.findById to return null
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockResolvedValue(null)
        }))
      }))
    }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });

  test('Returns 403 when user is not a project member', async () => {
    const mockProject = createMockProject({
      projectMembers: [
        {
          user: {
            _id: 'differentUserId',
            name: 'Different User',
            email: 'different@example.com'
          },
          role: {
            _id: mockRoleId,
            roleName: 'administrator'
          }
        }
      ]
    });

    // Mock Project.findById to return project where user is not a member
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockResolvedValue(mockProject)
        }))
      }))
    }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Access denied: not a project member.');
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById to throw an error at the third populate call
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockRejectedValue(new Error('Database error'))
        }))
      }))
    }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });

  test('Handles project with no tasks', async () => {
    const mockProject = createMockProject({
      projectTasks: []
    });

    // Mock Project.findById to return project with no tasks
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockResolvedValue(mockProject)
        }))
      }))
    }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.tasks).toHaveLength(0);
  });
});
