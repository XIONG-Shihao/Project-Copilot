const request = require('supertest');
const app = require('../app');
const mockingoose = require('mockingoose');
const Project = require('../models/project');
const Task = require('../models/tasks');
const Role = require('../models/roles');
const jwt = require('jsonwebtoken');

/**
 * @fileoverview Jest setup for member management routes tests using mockingoose.
 */

const mockUserId = '507f1f77bcf86cd799439011';
const mockProjectId = '507f1f77bcf86cd799439012';
const mockTaskId = '507f1f77bcf86cd799439013';
const mockMemberId = '507f1f77bcf86cd799439014';
const mockRoleId = '507f1f77bcf86cd799439015';
const mockOtherRoleId = '507f1f77bcf86cd799439016';
const mockThirdRoleId = '507f1f77bcf86cd799439017';

// Helper function to create mock JWT token
const createMockToken = (userId = mockUserId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'testsecret');
};

// Helper function to create mock task data
const createMockTask = (overrides = {}) => ({
  _id: mockTaskId,
  taskName: 'Test Task',
  taskDescription: 'Test task description',
  taskDeadline: new Date(Date.now() + 86400000), // Tomorrow
  taskCreator: mockUserId,
  taskAssignee: null,
  taskProgress: 'To Do',
  progressHistory: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

beforeEach(() => {
  mockingoose.resetAll();
  jest.restoreAllMocks();
});

describe('Test role assignment', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`
  };

  test('Successfully assigns administrator role', async () => {
    // Mock Project.findById with populate to return project where user is administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: mockRoleId // Administrator role ID
        },
        {
          user: { toString: () => mockMemberId },
          role: mockOtherRoleId // Current role (will be changed)
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Role.findById for requesting user's role check
    const mockAdminRole = { _id: mockRoleId, roleName: 'administrator' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockAdminRole);

    // Mock Role.findById for target member's current role check
    const mockCurrentRole = { _id: mockOtherRoleId, roleName: 'developer' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockCurrentRole);

    // Mock Role.findOne for finding the new role
    jest.spyOn(Role, 'findOne').mockResolvedValueOnce(mockAdminRole);

    // Mock final Project.findById with populate for return value
    const mockUpdatedProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { _id: mockUserId, name: 'Test User', email: 'test@example.com' },
          role: { _id: mockRoleId, roleName: 'administrator' }
        },
        {
          user: { _id: mockMemberId, name: 'Member User', email: 'member@example.com' },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ]
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockUpdatedProject)
      }))
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockMemberId}/role`)
      .set(validHeaders)
      .send({
        role: 'administrator'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Role assigned successfully');
    expect(res.body.project).toMatchObject({
      _id: mockProjectId,
      projectMembers: expect.any(Array)
    });
  });

  test('Successfully assigns developer role', async () => {
    // Mock Project.findById with populate to return project where user is administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: mockRoleId // Administrator role ID
        },
        {
          user: { toString: () => mockMemberId },
          role: mockOtherRoleId // Current role (will be changed)
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Role.findById for requesting user's role check
    const mockAdminRole = { _id: mockRoleId, roleName: 'administrator' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockAdminRole);

    // Mock Role.findById for target member's current role check
    const mockCurrentRole = { _id: mockOtherRoleId, roleName: 'viewer' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockCurrentRole);

    // Mock Role.findOne for finding the new role
    const mockDeveloperRole = { _id: mockOtherRoleId, roleName: 'developer' };
    jest.spyOn(Role, 'findOne').mockResolvedValueOnce(mockDeveloperRole);

    // Mock final Project.findById with populate for return value
    const mockUpdatedProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { _id: mockUserId, name: 'Test User', email: 'test@example.com' },
          role: { _id: mockRoleId, roleName: 'administrator' }
        },
        {
          user: { _id: mockMemberId, name: 'Member User', email: 'member@example.com' },
          role: { _id: mockOtherRoleId, roleName: 'developer' }
        }
      ]
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockUpdatedProject)
      }))
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockMemberId}/role`)
      .set(validHeaders)
      .send({
        role: 'developer'
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Role assigned successfully');
  });

  test('Successfully assigns viewer role', async () => {
    // Mock Project.findById with populate to return project where user is administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: mockRoleId // Administrator role ID
        },
        {
          user: { toString: () => mockMemberId },
          role: mockOtherRoleId // Current role (will be changed)
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Role.findById for requesting user's role check
    const mockAdminRole = { _id: mockRoleId, roleName: 'administrator' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockAdminRole);

    // Mock Role.findById for target member's current role check
    const mockCurrentRole = { _id: mockOtherRoleId, roleName: 'developer' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockCurrentRole);

    // Mock Role.findOne for finding the new role
    const mockViewerRole = { _id: mockThirdRoleId, roleName: 'viewer' };
    jest.spyOn(Role, 'findOne').mockResolvedValueOnce(mockViewerRole);

    // Mock final Project.findById with populate for return value
    const mockUpdatedProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { _id: mockUserId, name: 'Test User', email: 'test@example.com' },
          role: { _id: mockRoleId, roleName: 'administrator' }
        },
        {
          user: { _id: mockMemberId, name: 'Member User', email: 'member@example.com' },
          role: { _id: mockThirdRoleId, roleName: 'viewer' }
        }
      ]
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockUpdatedProject)
      }))
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockMemberId}/role`)
      .set(validHeaders)
      .send({
        role: 'viewer'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Role assigned successfully');
  });

  test('Fails when role is missing', async () => {
    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockMemberId}/role`)
      .set(validHeaders)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid role.');
  });

  test('Fails when role is invalid', async () => {
    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockMemberId}/role`)
      .set(validHeaders)
      .send({
        role: 'invalid_role'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid role.');
  });

  test('Fails when user is not authorized to assign roles', async () => {
    // Mock Project.findById with populate to return project where user is NOT an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: mockOtherRoleId // NOT administrator role ID
        },
        {
          user: { toString: () => mockMemberId },
          role: mockThirdRoleId // Current role
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Role.findById for requesting user's role check - return non-admin role
    const mockViewerRole = { _id: mockOtherRoleId, roleName: 'viewer' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockViewerRole);

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockMemberId}/role`)
      .set(validHeaders)
      .send({
        role: 'developer'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Only administrators can assign roles');
  });

  test('Fails when member is not found', async () => {
    // Mock Project.findById with populate to return project where target member doesn't exist
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: mockRoleId // Administrator role ID
        }
        // No member with mockMemberId
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Role.findById for requesting user's role check
    const mockAdminRole = { _id: mockRoleId, roleName: 'administrator' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockAdminRole);

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockMemberId}/role`)
      .set(validHeaders)
      .send({
        role: 'developer'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Member not found');
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById with populate to return null (project not found)
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockResolvedValue(null)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockMemberId}/role`)
      .set(validHeaders)
      .send({
        role: 'developer'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when role is not found', async () => {
    // Mock Project.findById with populate to return project where user is administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: mockRoleId // Administrator role ID
        },
        {
          user: { toString: () => mockMemberId },
          role: mockOtherRoleId // Current role
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Role.findById for requesting user's role check
    const mockAdminRole = { _id: mockRoleId, roleName: 'administrator' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockAdminRole);

    // Mock Role.findById for target member's current role check
    const mockCurrentRole = { _id: mockOtherRoleId, roleName: 'developer' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockCurrentRole);

    // Mock Role.findOne for finding the new role - return null (role not found)
    jest.spyOn(Role, 'findOne').mockResolvedValueOnce(null);

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockMemberId}/role`)
      .set(validHeaders)
      .send({
        role: 'developer'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Role not found');
  });

  test('Fails when trying to demote last administrator', async () => {
    // Mock Project.findById with populate to return project where the requesting user is the ONLY administrator
    // and they're trying to demote themselves (using mockUserId as both requester and target)
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { equals: (id) => id.toString() === mockRoleId } // Administrator role ID (requesting user - the ONLY admin)
        },
        {
          user: { toString: () => mockMemberId },
          role: { equals: (id) => id.toString() === mockOtherRoleId } // Non-admin role (viewer/developer)
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Project, 'findById').mockImplementationOnce(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Role.findById for requesting user's role check
    const mockAdminRole = { _id: mockRoleId, roleName: 'administrator' };
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockAdminRole);

    // Mock Role.findById for target member's current role check
    jest.spyOn(Role, 'findById').mockResolvedValueOnce(mockAdminRole);

    // Mock Role.findOne for finding admin role to count administrators
    jest.spyOn(Role, 'findOne').mockResolvedValueOnce(mockAdminRole);

    // Mock Role.findOne for finding the new role (developer) - but this should never be reached
    // because the test should fail at the admin count check
    const mockDeveloperRole = { _id: mockOtherRoleId, roleName: 'developer' };
    jest.spyOn(Role, 'findOne').mockResolvedValueOnce(mockDeveloperRole);

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/members/${mockUserId}/role`)
      .set(validHeaders)
      .send({
        role: 'developer'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('There must be at least one administrator');
  });
});

describe('Test task assignment', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`
  };

  test('Successfully assigns task to member', async () => {
    // Mock Project.findById with populate to return project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        { user: { _id: { equals: (id) => id === mockUserId }, name: 'Test User', email: 'test@example.com' } },
        { user: { _id: { equals: (id) => id === mockMemberId }, name: 'Member User', email: 'member@example.com' } }
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskAssignee: null, // Initially unassigned
    };
    const saveMock = jest.fn().mockResolvedValue({ ...mockTask, taskAssignee: mockMemberId });
    
    // Mock the first Task.findById call (for getting the task)
    const mockTaskWithSave = { ...mockTask, save: saveMock };
    
    // Mock the second Task.findById call (for getting populated task)
    const mockPopulatedTask = {
      ...createMockTask(),
      taskAssignee: {
        _id: mockMemberId,
        name: 'Member User',
        email: 'member@example.com'
      }
    };
    
    jest.spyOn(Task, 'findById')
      .mockResolvedValueOnce(mockTaskWithSave) // First call
      .mockImplementationOnce(() => ({ // Second call with populate
        populate: jest.fn().mockResolvedValue(mockPopulatedTask)
      }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/assign/${mockMemberId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task assigned successfully');
    expect(res.body.task).toMatchObject({
      _id: mockTaskId,
      taskAssignee: expect.objectContaining({
        _id: mockMemberId,
        name: 'Member User',
        email: 'member@example.com'
      })
    });
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById to return null (project not found)
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(null)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/assign/${mockMemberId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when task is not found', async () => {
    // Mock Project.findById with populate to return project
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        { user: { _id: { equals: (id) => id === mockUserId }, name: 'Test User', email: 'test@example.com' } },
        { user: { _id: { equals: (id) => id === mockMemberId }, name: 'Member User', email: 'member@example.com' } }
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Task.findById to return null (task not found)
    jest.spyOn(Task, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/assign/${mockMemberId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Task not found');
  });

  test('Fails when member is not part of project', async () => {
    // Mock Project.findById with populate to return project where member is NOT included
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        { user: { _id: { equals: (id) => id === mockUserId }, name: 'Test User', email: 'test@example.com' } }
        // mockMemberId is NOT in the projectMembers array
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskAssignee: null,
    };
    jest.spyOn(Task, 'findById').mockResolvedValue({ ...mockTask, save: jest.fn() });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/assign/${mockMemberId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Member is not part of this project');
  });

  test('Fails when user is not authorized to assign tasks', async () => {
    // Mock Project.findById with populate to return project where user is NOT the owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id !== mockUserId }, // User is NOT the owner
      projectMembers: [
        { user: { _id: { equals: (id) => id === mockUserId }, name: 'Test User', email: 'test@example.com' } },
        { user: { _id: { equals: (id) => id === mockMemberId }, name: 'Member User', email: 'member@example.com' } }
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskAssignee: null,
    };
    jest.spyOn(Task, 'findById').mockResolvedValue({ ...mockTask, save: jest.fn() });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/assign/${mockMemberId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('You are not authorized to update this task');
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById with populate to return project
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        { user: { _id: { equals: (id) => id === mockUserId }, name: 'Test User', email: 'test@example.com' } },
        { user: { _id: { equals: (id) => id === mockMemberId }, name: 'Member User', email: 'member@example.com' } }
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Task.findById to return the task, but save() throws an error
    const mockTask = {
      ...createMockTask(),
      taskAssignee: null,
    };
    const saveMock = jest.fn().mockRejectedValue(new Error('Database error'));
    jest.spyOn(Task, 'findById').mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/assign/${mockMemberId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});
