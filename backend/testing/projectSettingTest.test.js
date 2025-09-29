const request = require('supertest');
const app = require('../app');
const mockingoose = require('mockingoose');
const jwt = require('jsonwebtoken');
const Project = require('../models/project');
const Task = require('../models/tasks');
const InviteLink = require('../models/inviteLink');
const User = require('../models/user');

/**
 * @fileoverview Jest setup for project settings and deletion routes tests using mockingoose.
 */

const mockUserId = '507f1f77bcf86cd799439011';
const mockProjectId = '507f1f77bcf86cd799439012';
const mockTaskId = '507f1f77bcf86cd799439013';
const mockMemberId = '507f1f77bcf86cd799439014';
const mockRoleId = '507f1f77bcf86cd799439015';

// Helper function to create mock JWT token
const createMockToken = (userId = mockUserId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'testsecret');
};

beforeEach(() => {
  mockingoose.resetAll();
  jest.restoreAllMocks();
});

describe('Test updating project details', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`
  };

  test('Successfully updates project details', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ],
      save: jest.fn().mockResolvedValue({
        _id: mockProjectId,
        projectName: 'Updated Project Name',
        projectDescription: 'Updated project description',
        projectMembers: [
          {
            user: { toString: () => mockUserId },
            role: { _id: mockRoleId, roleName: 'administrator' }
          }
        ]
      })
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/details`)
      .set(validHeaders)
      .send({
        projectName: 'Updated Project Name',
        projectDescription: 'Updated project description'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Project details updated successfully');
    expect(res.body.project).toMatchObject({
      projectName: 'Updated Project Name',
      projectDescription: 'Updated project description'
    });
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById with populate to return null (project not found)
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(null)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/details`)
      .set(validHeaders)
      .send({
        projectName: 'Updated Project Name',
        projectDescription: 'Updated project description'
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when user is not an administrator', async () => {
    // Mock Project.findById with populate to return project where user is NOT an administrator
    const mockProject = {
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'viewer' } // User is viewer, not administrator
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/details`)
      .set(validHeaders)
      .send({
        projectName: 'Updated Project Name',
        projectDescription: 'Updated project description'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Only project administrators can update project details');
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ],
      save: jest.fn().mockRejectedValue(new Error('Database error')) // Database error on save
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/details`)
      .set(validHeaders)
      .send({
        projectName: 'Updated Project Name',
        projectDescription: 'Updated project description'
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });

  test('Updates only project name when only name is provided', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ],
      save: jest.fn().mockResolvedValue({
        _id: mockProjectId,
        projectName: 'Updated Project Name',
        projectDescription: 'Test project description', // Description unchanged
        projectMembers: [
          {
            user: { toString: () => mockUserId },
            role: { _id: mockRoleId, roleName: 'administrator' }
          }
        ]
      })
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/details`)
      .set(validHeaders)
      .send({
        projectName: 'Updated Project Name'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Project details updated successfully');
    expect(res.body.project.projectName).toBe('Updated Project Name');
  });

  test('Updates only project description when only description is provided', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ],
      save: jest.fn().mockResolvedValue({
        _id: mockProjectId,
        projectName: 'Test Project', // Name unchanged
        projectDescription: 'Updated project description',
        projectMembers: [
          {
            user: { toString: () => mockUserId },
            role: { _id: mockRoleId, roleName: 'administrator' }
          }
        ]
      })
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/details`)
      .set(validHeaders)
      .send({
        projectDescription: 'Updated project description'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Project details updated successfully');
    expect(res.body.project.projectDescription).toBe('Updated project description');
  });
});

describe('Test updating project settings', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`
  };

  test('Successfully updates project settings', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true
      },
      save: jest.fn().mockResolvedValue({
        _id: mockProjectId,
        projectMembers: [
          {
            user: { toString: () => mockUserId },
            role: { _id: mockRoleId, roleName: 'administrator' }
          }
        ],
        settings: {
          joinByLinkEnabled: false,
          pdfGenerationEnabled: false
        }
      })
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock InviteLink.deleteMany for when joinByLinkEnabled is set to false
    mockingoose(InviteLink).toReturn({ deletedCount: 1 }, 'deleteMany');

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/settings`)
      .set(validHeaders)
      .send({
        settings: {
          joinByLinkEnabled: false,
          pdfGenerationEnabled: false
        }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Project settings updated successfully');
    expect(res.body.project.settings).toMatchObject({
      joinByLinkEnabled: false,
      pdfGenerationEnabled: false
    });
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById with populate to return null (project not found)
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(null)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/settings`)
      .set(validHeaders)
      .send({
        settings: {
          joinByLinkEnabled: false
        }
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when user is not an administrator', async () => {
    // Mock Project.findById with populate to return project where user is NOT an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'viewer' } // User is viewer, not administrator
        }
      ],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true
      },
      save: jest.fn().mockResolvedValue(true)
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/settings`)
      .set(validHeaders)
      .send({
        settings: {
          joinByLinkEnabled: false
        }
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Only project administrators can update project settings');
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true
      },
      save: jest.fn().mockRejectedValue(new Error('Database error')) // Database error on save
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/settings`)
      .set(validHeaders)
      .send({
        settings: {
          joinByLinkEnabled: false
        }
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });

  test('Updates only joinByLinkEnabled when only that setting is provided', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true
      },
      save: jest.fn().mockResolvedValue({
        _id: mockProjectId,
        projectMembers: [
          {
            user: { toString: () => mockUserId },
            role: { _id: mockRoleId, roleName: 'administrator' }
          }
        ],
        settings: {
          joinByLinkEnabled: false,
          pdfGenerationEnabled: true // Unchanged
        }
      })
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock InviteLink.deleteMany for when joinByLinkEnabled is set to false
    mockingoose(InviteLink).toReturn({ deletedCount: 1 }, 'deleteMany');

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/settings`)
      .set(validHeaders)
      .send({
        settings: {
          joinByLinkEnabled: false
        }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Project settings updated successfully');
    expect(res.body.project.settings.joinByLinkEnabled).toBe(false);
    expect(res.body.project.settings.pdfGenerationEnabled).toBe(true);
  });

  test('Updates only pdfGenerationEnabled when only that setting is provided', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true
      },
      save: jest.fn().mockResolvedValue({
        _id: mockProjectId,
        projectMembers: [
          {
            user: { toString: () => mockUserId },
            role: { _id: mockRoleId, roleName: 'administrator' }
          }
        ],
        settings: {
          joinByLinkEnabled: true, // Unchanged
          pdfGenerationEnabled: false
        }
      })
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/settings`)
      .set(validHeaders)
      .send({
        settings: {
          pdfGenerationEnabled: false
        }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Project settings updated successfully');
    expect(res.body.project.settings.joinByLinkEnabled).toBe(true);
    expect(res.body.project.settings.pdfGenerationEnabled).toBe(false);
  });
});

describe('Test deleting project', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`
  };

  test('Successfully deletes project', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        },
        {
          user: { toString: () => mockMemberId },
          role: { _id: mockRoleId, roleName: 'viewer' }
        }
      ],
      projectTasks: [mockTaskId]
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Task.deleteMany to return success
    mockingoose(Task).toReturn({ deletedCount: 1 }, 'deleteMany');

    // Mock InviteLink.deleteMany to return success
    mockingoose(InviteLink).toReturn({ deletedCount: 1 }, 'deleteMany');

    // Mock User.updateMany to return success
    mockingoose(User).toReturn({ modifiedCount: 2 }, 'updateMany');

    // Mock Project.findByIdAndDelete to return success
    mockingoose(Project).toReturn({ _id: mockProjectId }, 'findByIdAndDelete');

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Project deleted successfully');
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById with populate to return null (project not found)
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(null)
    }));

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when user is not an administrator', async () => {
    // Mock Project.findById with populate to return project where user is NOT an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'viewer' } // User is viewer, not administrator
        }
      ],
      projectTasks: [mockTaskId]
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Only project administrators can delete projects');
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: { toString: () => mockUserId },
          role: { _id: mockRoleId, roleName: 'administrator' }
        }
      ],
      projectTasks: [mockTaskId]
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject)
    }));

    // Mock Task.deleteMany to throw an error
    mockingoose(Task).toReturn(new Error('Database error'), 'deleteMany');

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });

  test('Fails when user is not authenticated', async () => {
    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}`);

    expect(res.statusCode).toBe(401);
  });

  test('Fails when project ID is invalid', async () => {
    const res = await request(app)
      .delete('/api/projects/invalid-project-id')
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
  });
});
