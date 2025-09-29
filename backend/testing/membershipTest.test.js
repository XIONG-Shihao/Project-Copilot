const request = require('supertest');
const app = require('../app');
const mockingoose = require('mockingoose');
const jwt = require('jsonwebtoken');
const Project = require('../models/project');
const Role = require('../models/roles');
const InviteLink = require('../models/inviteLink');
const User = require('../models/user');

/**
 * @fileoverview Jest setup for membership management routes tests using mockingoose.
 */

const mockUserId = '507f1f77bcf86cd799439011';
const mockProjectId = '507f1f77bcf86cd799439012';
const mockMemberId = '507f1f77bcf86cd799439014';
const mockInviteToken = 'abc123def456ghi789';

// Helper function to create mock JWT token
const createMockToken = (userId = mockUserId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'testsecret');
};

// Helper function to create mock invite link data
const createMockInviteLink = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439016',
  projectId: mockProjectId,
  token: mockInviteToken,
  createdBy: mockUserId,
  createdAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  mockingoose.resetAll();
  jest.restoreAllMocks();
});

describe('Test invite link generation', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully generates invite link', async () => {
    // Mock Project.findById with populate to return project with user as administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: 'role123', roleName: 'administrator' },
        },
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Role.findById to return administrator role
    const mockRole = {
      _id: 'role123',
      roleName: 'administrator',
    };
    jest.spyOn(Role, 'findById').mockResolvedValue(mockRole);

    // Mock InviteLink.findOne to return null (no existing invite link)
    mockingoose(InviteLink).toReturn(null, 'findOne');

    // Mock InviteLink.save to return the created invite link
    const mockInviteLink = createMockInviteLink();
    mockingoose(InviteLink).toReturn(mockInviteLink, 'save');

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/invite`)
      .set(validHeaders);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Invite link generated successfully');
    expect(res.body.inviteLink).toMatchObject({
      token: mockInviteToken,
    });
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById with populate to return null (project not found)
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(null),
    }));

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/invite`)
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when user is not a project member', async () => {
    // Mock Project.findById with populate to return project where user is NOT a member
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        // User is NOT in the projectMembers array
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/invite`)
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('You are not a member of this project');
  });

  test('Fails when user is not an administrator', async () => {
    // Mock Project.findById with populate to return project with user as member but not administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: 'role123', roleName: 'viewer' }, // User is viewer, not administrator
        },
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Role.findById to return viewer role (not administrator)
    const mockRole = {
      _id: 'role123',
      roleName: 'viewer',
    };
    jest.spyOn(Role, 'findById').mockResolvedValue(mockRole);

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/invite`)
      .set(validHeaders);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe(
      'Only project administrators can generate invite links'
    );
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById with populate to return project with user as administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: 'role123', roleName: 'administrator' },
        },
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Role.findById to return administrator role
    const mockRole = {
      _id: 'role123',
      roleName: 'administrator',
    };
    jest.spyOn(Role, 'findById').mockResolvedValue(mockRole);

    // Mock InviteLink.findOne to return null (no existing invite link)
    mockingoose(InviteLink).toReturn(null, 'findOne');

    // Mock InviteLink.save to throw an error
    mockingoose(InviteLink).toReturn(new Error('Database error'), 'save');

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/invite`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});

describe('Test joining project via invite', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully joins project via invite', async () => {
    // Mock InviteLink.findOne to return the invite link
    const mockInviteLink = createMockInviteLink();
    mockingoose(InviteLink).toReturn(mockInviteLink, 'findOne');

    // Mock Project.findById to return project where user is NOT already a member
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        // User is not in the projectMembers array initially
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Role.findOne to return viewer role
    const mockViewerRole = {
      _id: 'viewerRoleId',
      roleName: 'viewer',
    };
    mockingoose(Role).toReturn(mockViewerRole, 'findOne');

    // Mock User.findByIdAndUpdate to return success
    mockingoose(User).toReturn({ modifiedCount: 1 }, 'findByIdAndUpdate');

    const res = await request(app)
      .post('/api/projects/join')
      .set(validHeaders)
      .send({
        token: mockInviteToken,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Successfully joined project');
    expect(res.body.project).toMatchObject({
      projectId: mockProjectId,
    });
  });

  test('Fails when token is missing', async () => {
    const res = await request(app)
      .post('/api/projects/join')
      .set(validHeaders)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invite token is required');
  });

  test('Fails when invite link is invalid or expired', async () => {
    // Mock InviteLink.findOne to return null (invalid/expired invite link)
    mockingoose(InviteLink).toReturn(null, 'findOne');

    const res = await request(app)
      .post('/api/projects/join')
      .set(validHeaders)
      .send({
        token: 'invalid-token',
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Invalid or expired invite link');
  });

  test('Fails when project is not found', async () => {
    // Mock InviteLink.findOne to return the invite link
    const mockInviteLink = createMockInviteLink();
    mockingoose(InviteLink).toReturn(mockInviteLink, 'findOne');

    // Mock Project.findById to return null (project not found)
    jest.spyOn(Project, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .post('/api/projects/join')
      .set(validHeaders)
      .send({
        token: mockInviteToken,
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when role is not found', async () => {
    // Mock InviteLink.findOne to return the invite link
    const mockInviteLink = createMockInviteLink();
    mockingoose(InviteLink).toReturn(mockInviteLink, 'findOne');

    // Mock Project.findById to return project where user is NOT already a member
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Role.findOne to return null (role not found)
    mockingoose(Role).toReturn(null, 'findOne');

    const res = await request(app)
      .post('/api/projects/join')
      .set(validHeaders)
      .send({
        token: mockInviteToken,
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Role not found');
  });

  test('Fails when user is already a member', async () => {
    // Mock InviteLink.findOne to return the invite link
    const mockInviteLink = createMockInviteLink();
    mockingoose(InviteLink).toReturn(mockInviteLink, 'findOne');

    // Mock Project.findById to return project where user is ALREADY a member
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: mockUserId, // User is already in the projectMembers array
          role: 'someRoleId',
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    const res = await request(app)
      .post('/api/projects/join')
      .set(validHeaders)
      .send({
        token: mockInviteToken,
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe('You are already a member of this project');
  });
});

describe('Test getting project details from invite', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully retrieves project details from invite', async () => {
    // Mock InviteLink.findOne with populate to return populated invite link
    const mockInviteLinkWithPopulate = {
      _id: '507f1f77bcf86cd799439016',
      projectId: {
        _id: mockProjectId,
        projectName: 'Test Project',
        projectDescription: 'Test project description',
      },
      token: mockInviteToken,
      createdBy: {
        _id: mockUserId,
        name: 'Test User',
        email: 'test@example.com',
      },
      createdAt: new Date(),
    };

    jest.spyOn(InviteLink, 'findOne').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockInviteLinkWithPopulate),
      })),
    }));

    const res = await request(app)
      .get(`/api/projects/invite/details?token=${mockInviteToken}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Project details retrieved successfully');
    expect(res.body.project).toMatchObject({
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      invitedBy: 'Test User',
    });
  });

  test('Fails when token is missing', async () => {
    const res = await request(app)
      .get('/api/projects/invite/details')
      .set(validHeaders);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invite token is required');
  });

  test('Fails when invite link is invalid or expired', async () => {
    // Mock InviteLink.findOne with populate chain to return null (invalid/expired invite link)
    jest.spyOn(InviteLink, 'findOne').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(null),
      })),
    }));

    const res = await request(app)
      .get('/api/projects/invite/details?token=invalid-token')
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Invalid or expired invite link');
  });

  test('Fails when project is not found', async () => {
    // Mock InviteLink.findOne with populate to return invite link but with null projectId
    const mockInviteLinkWithNullProject = {
      _id: '507f1f77bcf86cd799439016',
      projectId: null, // Project not found/deleted
      token: mockInviteToken,
      createdBy: {
        _id: mockUserId,
        name: 'Test User',
        email: 'test@example.com',
      },
      createdAt: new Date(),
    };

    jest.spyOn(InviteLink, 'findOne').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockInviteLinkWithNullProject),
      })),
    }));

    const res = await request(app)
      .get(`/api/projects/invite/details?token=${mockInviteToken}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });
});

describe('Test removing member from project', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully removes member from project', async () => {
    // Mock Project.findById with populate to return project with requester as admin and target as member
    const mockProject = {
      _id: mockProjectId,
      projectOwner: 'someOtherUserId', // Not the target user
      projectMembers: [
        {
          user: { _id: { toString: () => mockUserId } }, // Requester (admin)
          role: { _id: 'adminRoleId', roleName: 'administrator' },
        },
        {
          user: { _id: { toString: () => mockMemberId } }, // Target member to remove
          role: { _id: 'viewerRoleId', roleName: 'viewer' },
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProject),
      })),
    }));

    // Mock User.findByIdAndUpdate to return success
    mockingoose(User).toReturn({ modifiedCount: 1 }, 'findByIdAndUpdate');

    const res = await request(app)
      .post('/api/projects/remove-member')
      .set(validHeaders)
      .send({
        projectId: mockProjectId,
        targetUserId: mockMemberId,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Member removed successfully');
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById with populate to return null (project not found)
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(null),
      })),
    }));

    const res = await request(app)
      .post('/api/projects/remove-member')
      .set(validHeaders)
      .send({
        projectId: mockProjectId,
        targetUserId: mockMemberId,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Project not found');
  });

  test('Fails when user is not an administrator', async () => {
    // Mock Project.findById with populate to return project where requester is NOT an admin
    const mockProject = {
      _id: mockProjectId,
      projectOwner: 'someOtherUserId',
      projectMembers: [
        {
          user: { _id: { toString: () => mockUserId } }, // Requester (viewer, not admin)
          role: { _id: 'viewerRoleId', roleName: 'viewer' },
        },
        {
          user: { _id: { toString: () => mockMemberId } }, // Target member
          role: { _id: 'viewerRoleId', roleName: 'viewer' },
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProject),
      })),
    }));

    const res = await request(app)
      .post('/api/projects/remove-member')
      .set(validHeaders)
      .send({
        projectId: mockProjectId,
        targetUserId: mockMemberId,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      'Only project administrators can remove members'
    );
  });

  test('Fails when target user is not part of project', async () => {
    // Mock Project.findById with populate to return project where target user is NOT a member
    const mockProject = {
      _id: mockProjectId,
      projectOwner: 'someOtherUserId',
      projectMembers: [
        {
          user: { _id: { toString: () => mockUserId } }, // Requester (admin)
          role: { _id: 'adminRoleId', roleName: 'administrator' },
        },
        // Target user (mockMemberId) is NOT in the projectMembers array
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProject),
      })),
    }));

    const res = await request(app)
      .post('/api/projects/remove-member')
      .set(validHeaders)
      .send({
        projectId: mockProjectId,
        targetUserId: mockMemberId,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('User is not part of this project');
  });

  test('Fails when trying to remove project owner', async () => {
    // Mock Project.findById with populate to return project where target user IS the project owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { toString: () => mockUserId }, // Target user IS the project owner
      projectMembers: [
        {
          user: { _id: { toString: () => mockUserId } }, // Requester (admin and also owner)
          role: { _id: 'adminRoleId', roleName: 'administrator' },
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProject),
      })),
    }));

    const res = await request(app)
      .post('/api/projects/remove-member')
      .set(validHeaders)
      .send({
        projectId: mockProjectId,
        targetUserId: mockUserId,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Cannot remove the project owner');
  });

  test('Fails when trying to remove last administrator', async () => {
    // Mock Project.findById with populate to return project with only ONE administrator (the target)
    // The requester needs to be an admin to pass authorization, but can't be the only admin
    // So we need a scenario where requester is admin, target is admin, but there's only 1 admin total
    // This means requester and target must be the same person, but that would be "removing yourself"
    // Let me create a different scenario: requester is project owner (has removal rights) and target is the only admin
    const mockProject = {
      _id: mockProjectId,
      projectOwner: 'someOtherUserId', // Not the requester or target
      projectMembers: [
        {
          user: { _id: { toString: () => mockUserId } }, // Requester/Target (the ONLY admin - adminCount will be 1)
          role: { _id: 'adminRoleId', roleName: 'administrator' },
        },
        {
          user: { _id: { toString: () => mockMemberId } }, // Another member (viewer)
          role: { _id: 'viewerRoleId', roleName: 'viewer' },
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProject),
      })),
    }));

    const res = await request(app)
      .post('/api/projects/remove-member')
      .set(validHeaders)
      .send({
        projectId: mockProjectId,
        targetUserId: mockUserId, // Trying to remove self (the only admin)
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(
      'Cannot remove the last administrator from the project'
    );
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById with populate to return project with requester as admin and target as member
    const mockProject = {
      _id: mockProjectId,
      projectOwner: 'someOtherUserId',
      projectMembers: [
        {
          user: { _id: { toString: () => mockUserId } }, // Requester (admin)
          role: { _id: 'adminRoleId', roleName: 'administrator' },
        },
        {
          user: { _id: { toString: () => mockMemberId } }, // Target member to remove
          role: { _id: 'viewerRoleId', roleName: 'viewer' },
        },
      ],
      save: jest.fn().mockRejectedValue(new Error('Database error')), // Database error on save
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProject),
      })),
    }));

    const res = await request(app)
      .post('/api/projects/remove-member')
      .set(validHeaders)
      .send({
        projectId: mockProjectId,
        targetUserId: mockMemberId,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Database error');
  });
});

describe('Test leaving project', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully leaves project', async () => {
    // Mock Project.findById with populate to return project where user is a member (not owner, not last admin)
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { toString: () => 'someOtherUserId' }, // User is NOT the project owner
      projectMembers: [
        {
          user: { toString: () => mockUserId }, // User leaving the project
          role: 'viewerRoleId',
        },
        {
          user: { toString: () => 'adminUserId' }, // Another admin (so user is not the last admin)
          role: 'adminRoleId',
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Role.findById to return viewer role
    const mockRole = {
      _id: 'viewerRoleId',
      roleName: 'viewer',
    };
    jest.spyOn(Role, 'findById').mockResolvedValue(mockRole);

    // Mock User.findByIdAndUpdate to return success
    mockingoose(User).toReturn({ modifiedCount: 1 }, 'findByIdAndUpdate');

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/leave`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Successfully left the project');
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById with populate to return null (project not found)
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(null),
    }));

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/leave`)
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when user is not a member of the project', async () => {
    // Mock Project.findById with populate to return project where user is NOT a member
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { toString: () => 'someOtherUserId' },
      projectMembers: [
        // User is NOT in the projectMembers array
        {
          user: { toString: () => 'someOtherMemberId' },
          role: 'viewerRoleId',
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/leave`)
      .set(validHeaders);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('You are not a member of this project');
  });

  test('Fails when project owner tries to leave', async () => {
    // Mock Project.findById with populate to return project where user IS the project owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { toString: () => mockUserId }, // User IS the project owner
      projectMembers: [
        {
          user: { toString: () => mockUserId }, // User is also in members
          role: 'adminRoleId',
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/leave`)
      .set(validHeaders);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      'Project owner cannot leave the project. Transfer ownership or delete the project instead.'
    );
  });

  test('Fails when last administrator tries to leave', async () => {
    // Mock Project.findById with populate to return project where user is the ONLY administrator
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { toString: () => 'someOtherUserId' }, // User is NOT the project owner
      projectMembers: [
        {
          user: { toString: () => mockUserId }, // User is the only admin
          role: 'adminRoleId',
        },
        {
          user: { toString: () => 'someOtherMemberId' }, // Another member (viewer)
          role: 'viewerRoleId',
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Role.findById to return administrator role
    const mockRole = {
      _id: 'adminRoleId',
      roleName: 'administrator',
    };
    jest.spyOn(Role, 'findById').mockResolvedValue(mockRole);

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/leave`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe(
      'You are the last administrator and cannot leave the project. Please delete the project or assign another member as administrator first.'
    );
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById with populate to return project where user is a member
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { toString: () => 'someOtherUserId' },
      projectMembers: [
        {
          user: { toString: () => mockUserId }, // User leaving the project
          role: 'viewerRoleId',
        },
        {
          user: { toString: () => 'adminUserId' }, // Another admin
          role: 'adminRoleId',
        },
      ],
      save: jest.fn().mockRejectedValue(new Error('Database error')), // Database error on save
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Role.findById to return viewer role
    const mockRole = {
      _id: 'viewerRoleId',
      roleName: 'viewer',
    };
    jest.spyOn(Role, 'findById').mockResolvedValue(mockRole);

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/leave`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});

describe('Test disabling project invite links', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully disables project invite links', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: 'adminRoleId', roleName: 'administrator' },
        },
      ],
      settings: {
        joinByLinkEnabled: true,
      },
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock InviteLink.deleteMany to return success
    mockingoose(InviteLink).toReturn({ deletedCount: 1 }, 'deleteMany');

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/disable-invite-links`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Project invite links disabled successfully');
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById with populate to return null (project not found)
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(null),
    }));

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/disable-invite-links`)
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
          user: mockUserId,
          role: { _id: 'viewerRoleId', roleName: 'viewer' }, // User is viewer, not administrator
        },
      ],
      settings: {
        joinByLinkEnabled: true,
      },
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/disable-invite-links`)
      .set(validHeaders);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe(
      'Only project administrators can manage invite links'
    );
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById with populate to return project where user is an administrator
    const mockProject = {
      _id: mockProjectId,
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: 'adminRoleId', roleName: 'administrator' },
        },
      ],
      settings: {
        joinByLinkEnabled: true,
      },
      save: jest.fn().mockRejectedValue(new Error('Database error')), // Database error on save
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock InviteLink.deleteMany to return success (but project.save will fail)
    mockingoose(InviteLink).toReturn({ deletedCount: 1 }, 'deleteMany');

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/disable-invite-links`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });

  test('Successfully removes an administrator when multiple admins exist', async () => {
    const validHeaders = { Cookie: `token=${createMockToken()}` };

    const otherAdminId = '507f1f77bcf86cd799439099';
    const mockProject = {
      _id: mockProjectId,
      projectOwner: 'ownerId',
      projectMembers: [
        // Requester is admin
        {
          user: { _id: { toString: () => mockUserId } },
          role: { roleName: 'administrator' },
        },
        // Target is admin too
        {
          user: { _id: { toString: () => mockMemberId } },
          role: { roleName: 'administrator' },
        },
        // Another admin ensures more than one admin remains after removal
        {
          user: { _id: { toString: () => otherAdminId } },
          role: { roleName: 'administrator' },
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProject),
      })),
    }));

    mockingoose(User).toReturn({ modifiedCount: 1 }, 'findByIdAndUpdate');

    const res = await request(app)
      .post('/api/projects/remove-member')
      .set(validHeaders)
      .send({ projectId: mockProjectId, targetUserId: mockMemberId });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Member removed successfully');
    expect(mockProject.save).toHaveBeenCalled();
  });
});
