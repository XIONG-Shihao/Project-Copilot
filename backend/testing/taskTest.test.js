const request = require('supertest');
const app = require('../app');
const mockingoose = require('mockingoose');
const Project = require('../models/project');
const Task = require('../models/tasks');
const jwt = require('jsonwebtoken');

/**
 * @fileoverview Jest setup for task routes tests using mockingoose.
 */

const mockUserId = '507f1f77bcf86cd799439011';
const mockProjectId = '507f1f77bcf86cd799439012';
const mockTaskId = '507f1f77bcf86cd799439013';
const mockRoleId = '507f1f77bcf86cd799439014';

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
  ...overrides,
});

beforeEach(() => {
  mockingoose.resetAll();
  jest.restoreAllMocks();
});

describe('Test task creation', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully creates a new task', async () => {
    const mockTask = createMockTask();

    // Create a mock project with proper structure for createTask function
    const mockProject = {
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectOwner: mockUserId,
      projectMembers: [
        {
          user: mockUserId, // String ID, not object
          role: {
            _id: mockRoleId,
            roleName: 'administrator', // Not viewer, so can create tasks
          },
        },
      ],
      projectTasks: [mockTaskId],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock Project.findById with populate to return project with populated members
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Task.save to return the created task
    mockingoose(Task).toReturn(mockTask, 'save');

    // Mock Project.findByIdAndUpdate to return success
    mockingoose(Project).toReturn({ modifiedCount: 1 }, 'findByIdAndUpdate');

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/task`)
      .set(validHeaders)
      .send({
        taskName: 'Test Task',
        taskDescription: 'Test task description',
        taskDeadline: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Task created successfully');
    expect(res.body.task).toMatchObject({
      _id: mockTaskId,
      taskName: 'Test Task',
      taskDescription: 'Test task description',
      taskProgress: 'To Do',
    });
  });

  test('Fails when task name is missing', async () => {
    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/task`)
      .set(validHeaders)
      .send({
        taskDescription: 'Test task description',
        taskDeadline: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Task name required!');
  });

  test('Fails when task description is missing', async () => {
    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/task`)
      .set(validHeaders)
      .send({
        taskName: 'Test Task',
        taskDeadline: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Task description required!');
  });

  test('Fails when task deadline is missing', async () => {
    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/task`)
      .set(validHeaders)
      .send({
        taskName: 'Test Task',
        taskDescription: 'Test task description',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Task deadline required!');
  });

  test('Fails when deadline is in the past', async () => {
    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/task`)
      .set(validHeaders)
      .send({
        taskName: 'Test Task',
        taskDescription: 'Test task description',
        taskDeadline: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Task deadline cannot be in the past!');
  });

  test('Fails when deadline has invalid format', async () => {
    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/task`)
      .set(validHeaders)
      .send({
        taskName: 'Test Task',
        taskDescription: 'Test task description',
        taskDeadline: 'invalid-date',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid date format for deadline!');
  });

  test('Fails when user is not a project member', async () => {
    // Create a mock project where the user is not a member
    const mockProject = {
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectOwner: 'differentUserId',
      projectMembers: [
        {
          user: 'differentUserId', // Different user, not the current user
          role: {
            _id: mockRoleId,
            roleName: 'administrator',
          },
        },
      ],
      projectTasks: [mockTaskId],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock Project.findById with populate to return project where user is not a member
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/task`)
      .set(validHeaders)
      .send({
        taskName: 'Test Task',
        taskDescription: 'Test task description',
        taskDeadline: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('You are not a member of this project');
  });

  test('Fails when viewer tries to create task', async () => {
    // Create a mock project where the user is a viewer (not authorized to create tasks)
    const mockProject = {
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectOwner: 'differentUserId',
      projectMembers: [
        {
          user: mockUserId, // Current user
          role: {
            _id: mockRoleId,
            roleName: 'viewer', // Viewer role, not authorized to create tasks
          },
        },
      ],
      projectTasks: [mockTaskId],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock Project.findById with populate to return project where user is a viewer
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/task`)
      .set(validHeaders)
      .send({
        taskName: 'Test Task',
        taskDescription: 'Test task description',
        taskDeadline: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Viewers are not authorized to create tasks');
  });

  test('Fails when database throws an error', async () => {
    // Create a mock project with proper structure
    const mockProject = {
      _id: mockProjectId,
      projectName: 'Test Project',
      projectDescription: 'Test project description',
      projectOwner: mockUserId,
      projectMembers: [
        {
          user: mockUserId,
          role: {
            _id: mockRoleId,
            roleName: 'administrator',
          },
        },
      ],
      projectTasks: [mockTaskId],
      settings: {
        joinByLinkEnabled: true,
        pdfGenerationEnabled: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock Project.findById with populate to return project
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Task.save to throw error
    mockingoose(Task).toReturn(new Error('Database error'), 'save');

    const res = await request(app)
      .post(`/api/projects/${mockProjectId}/task`)
      .set(validHeaders)
      .send({
        taskName: 'Test Task',
        taskDescription: 'Test task description',
        taskDeadline: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});

describe('Test task deletion', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully deletes a task', async () => {
    // Mock Project.findById to return a project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectTasks: [{ equals: (id) => id.toString() === mockTaskId }], // Task exists in project with equals method
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task where user is creator
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === mockUserId },
    };
    jest.spyOn(Task, 'findById').mockResolvedValue(mockTask);

    // Mock Project.updateOne to return success
    mockingoose(Project).toReturn({ modifiedCount: 1 }, 'updateOne');

    // Mock Task.deleteOne to return success
    mockingoose(Task).toReturn({ deletedCount: 1 }, 'deleteOne');

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task deleted successfully');
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById to return null
    mockingoose(Project).toReturn(null, 'findById');

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when task is not found in project', async () => {
    // Mock Project.findById to return project with no tasks
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectTasks: [], // No tasks in project
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Task not found in this project');
  });

  test('Fails when user is not authorized to delete task', async () => {
    // Mock Project.findById to return a project where user is NOT owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === 'differentUserId' }, // Different user is owner
      projectTasks: [{ equals: (id) => id.toString() === mockTaskId }], // Task exists in project
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task where user is NOT creator
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === 'differentUserId' }, // Different user is creator
    };
    jest.spyOn(Task, 'findById').mockResolvedValue(mockTask);

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('You are not authorized to delete this task');
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById to return a project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectTasks: [{ equals: (id) => id.toString() === mockTaskId }], // Task exists in project
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task where user is creator
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === mockUserId },
    };
    jest.spyOn(Task, 'findById').mockResolvedValue(mockTask);

    // Mock Project.updateOne to throw error
    mockingoose(Project).toReturn(new Error('Database error'), 'updateOne');

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});

describe('Test task update', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully updates task name', async () => {
    // Mock Project.findById to return a project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: mockRoleId, roleName: 'administrator' },
        },
      ],
      projectTasks: [mockTaskId],
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === mockUserId },
    };
    const saveMock = jest
      .fn()
      .mockResolvedValue({ ...mockTask, taskName: 'Updated Task Name' });
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders)
      .send({
        taskName: 'Updated Task Name',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task updated successfully');
    expect(res.body.task.taskName).toBe('Updated Task Name');
  });

  test('Successfully updates task description', async () => {
    // Mock Project.findById to return a project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: mockRoleId, roleName: 'administrator' },
        },
      ],
      projectTasks: [mockTaskId],
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === mockUserId },
    };
    const saveMock = jest.fn().mockResolvedValue({
      ...mockTask,
      taskDescription: 'Updated description',
    });
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders)
      .send({
        taskDescription: 'Updated description',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task updated successfully');
    expect(res.body.task.taskDescription).toBe('Updated description');
  });

  test('Successfully updates task deadline', async () => {
    const newDeadline = new Date(Date.now() + 172800000); // 2 days from now

    // Mock Project.findById to return a project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: mockRoleId, roleName: 'administrator' },
        },
      ],
      projectTasks: [mockTaskId],
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === mockUserId },
    };
    const saveMock = jest
      .fn()
      .mockResolvedValue({ ...mockTask, taskDeadline: newDeadline });
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders)
      .send({
        taskDeadline: newDeadline.toISOString(),
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task updated successfully');
  });

  test('Successfully updates task progress', async () => {
    // Mock Project.findById to return a project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: mockRoleId, roleName: 'administrator' },
        },
      ],
      projectTasks: [mockTaskId],
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === mockUserId },
    };
    const saveMock = jest
      .fn()
      .mockResolvedValue({ ...mockTask, taskProgress: 'In Progress' });
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders)
      .send({
        taskProgress: 'In Progress',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task updated successfully');
    expect(res.body.task.taskProgress).toBe('In Progress');
  });

  test('Successfully updates multiple fields', async () => {
    // Mock Project.findById to return a project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: mockRoleId, roleName: 'administrator' },
        },
      ],
      projectTasks: [mockTaskId],
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === mockUserId },
    };
    const saveMock = jest.fn().mockResolvedValue({
      ...mockTask,
      taskName: 'Updated Name',
      taskDescription: 'Updated description',
      taskProgress: 'Completed',
    });
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders)
      .send({
        taskName: 'Updated Name',
        taskDescription: 'Updated description',
        taskProgress: 'Completed',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task updated successfully');
    expect(res.body.task.taskName).toBe('Updated Name');
    expect(res.body.task.taskDescription).toBe('Updated description');
    expect(res.body.task.taskProgress).toBe('Completed');
  });

  test('Fails when no fields are provided to update', async () => {
    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      'At least one field (name, description, deadline, or status) must be provided to update.'
    );
  });

  test('Fails when user is not authorized to update task', async () => {
    // Mock Project.findById to return a project where user is NOT owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === 'differentUserId' }, // Different user is owner
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: mockRoleId, roleName: 'administrator' },
        },
      ],
      projectTasks: [mockTaskId],
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task where user is NOT creator
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === 'differentUserId' }, // Different user is creator
    };
    jest.spyOn(Task, 'findById').mockResolvedValue(mockTask);

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders)
      .send({
        taskName: 'Updated Name',
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('You are not authorized to update this task');
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById to return a project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        {
          user: mockUserId,
          role: { _id: mockRoleId, roleName: 'administrator' },
        },
      ],
      projectTasks: [mockTaskId],
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === mockUserId },
    };
    const saveMock = jest.fn().mockRejectedValue(new Error('Database error'));
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders)
      .send({
        taskName: 'Updated Name',
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});

describe('Test updating task progress', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`,
  };

  test('Successfully updates task progress', async () => {
    // Mock Project.findById with populate to return project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskAssignee: null, // No assignee, so only project owner can update
    };
    const saveMock = jest.fn().mockResolvedValue({
      ...mockTask,
      taskProgress: 'In Progress',
      progressHistory: [
        {
          progress: 'In Progress',
          updatedBy: mockUserId,
          timestamp: new Date(),
        },
      ],
    });
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/progress`)
      .set(validHeaders)
      .send({
        newProg: 'In Progress',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task progress updated successfully');
    expect(res.body.task.taskProgress).toBe('In Progress');
  });

  test('Successfully updates task progress to completed', async () => {
    // Mock Project.findById with populate to return project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskAssignee: null, // No assignee, so only project owner can update
    };
    const saveMock = jest.fn().mockResolvedValue({
      ...mockTask,
      taskProgress: 'Completed',
      progressHistory: [
        {
          progress: 'Completed',
          updatedBy: mockUserId,
          timestamp: new Date(),
        },
      ],
    });
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/progress`)
      .set(validHeaders)
      .send({
        newProg: 'Completed',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Task progress updated successfully');
    expect(res.body.task.taskProgress).toBe('Completed');
  });

  test('Fails when newProg is missing', async () => {
    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/progress`)
      .set(validHeaders)
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('New progress value is required.');
  });

  test('Fails when newProg is undefined', async () => {
    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/progress`)
      .set(validHeaders)
      .send({
        newProg: undefined,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('New progress value is required.');
  });

  test('Fails when user is not authorized to update progress', async () => {
    // Mock Project.findById with populate to return project where user is NOT owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === 'differentUserId' }, // Different user is owner
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Task.findById to return the task where user is NOT assignee
    const mockTask = {
      ...createMockTask(),
      taskAssignee: { equals: (id) => id === 'differentUserId' }, // Different user is assignee
    };
    jest.spyOn(Task, 'findById').mockResolvedValue(mockTask);

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/progress`)
      .set(validHeaders)
      .send({
        newProg: 'In Progress',
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe(
      'Only the project owner or assigned member can update task progress'
    );
  });

  test('Fails when database throws an error', async () => {
    // Mock Project.findById with populate to return project where user is owner
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com',
          },
        },
      ],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Mock Task.findById to return the task
    const mockTask = {
      ...createMockTask(),
      taskAssignee: null, // No assignee, so only project owner can update
    };
    const saveMock = jest.fn().mockRejectedValue(new Error('Database error'));
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue({ ...mockTask, save: saveMock });

    const res = await request(app)
      .put(`/api/projects/${mockProjectId}/task/${mockTaskId}/progress`)
      .set(validHeaders)
      .send({
        newProg: 'In Progress',
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Database error');
  });
});

describe('Test task assignment', () => {
  const validHeaders = { Cookie: `token=${createMockToken()}` };
  const memberId = '507f1f77bcf86cd799439099';

  test('Fails to assign task to non-member', async () => {
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId }, // requester is owner
      projectMembers: [], // no members, so memberId is not present
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Task exists
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue(createMockTask({ _id: mockTaskId }));

    const res = await request(app)
      .put(
        `/api/projects/${mockProjectId}/task/${mockTaskId}/assign/${memberId}`
      )
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Member is not part of this project');
  });

  test('Fails to assign task when requester is not project owner', async () => {
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === 'someone-else' }, // not the requester
      projectMembers: [{ user: { _id: { equals: (id) => id === memberId } } }],
    };
    jest.spyOn(Project, 'findById').mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(mockProject),
    }));

    // Task exists
    jest
      .spyOn(Task, 'findById')
      .mockResolvedValue(createMockTask({ _id: mockTaskId }));

    const res = await request(app)
      .put(
        `/api/projects/${mockProjectId}/task/${mockTaskId}/assign/${memberId}`
      )
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('You are not authorized to update this task');
  });
});

describe('Task deletion edge paths', () => {
  const validHeaders = { Cookie: `token=${createMockToken()}` };

  test('Delete fails when task was not removed from project (modifiedCount = 0)', async () => {
    const mockProject = {
      _id: mockProjectId,
      projectOwner: { equals: (id) => id === mockUserId },
      projectTasks: [{ equals: (id) => id.toString() === mockTaskId }],
    };
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    const mockTask = {
      ...createMockTask(),
      taskCreator: { equals: (id) => id === mockUserId },
    };
    jest.spyOn(Task, 'findById').mockResolvedValue(mockTask);

    // $pull did not modify anything
    mockingoose(Project).toReturn({ modifiedCount: 0 }, 'updateOne');

    const res = await request(app)
      .delete(`/api/projects/${mockProjectId}/task/${mockTaskId}`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Task was not removed from project');
  });
});
