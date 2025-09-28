const request = require('supertest');
const mockingoose = require('mockingoose');
const Project = require('../models/project');
const jwt = require('jsonwebtoken');

// Mock only the Puppeteer part of pdfService
const PDFService = require('../services/pdfService');

const app = require('../app');

/**
 * @fileoverview Jest setup for project summary export route tests using mockingoose.
 */

const mockUserId = '507f1f77bcf86cd799439011';
const mockProjectId = '507f1f77bcf86cd799439012';
const mockMemberId = '507f1f77bcf86cd799439014';

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
      user: mockUserId,
      role: 'administrator'
    },
    {
      user: mockMemberId,
      role: 'developer'
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

beforeEach(() => {
  mockingoose.resetAll();
  jest.restoreAllMocks();
  
  // Mock the PDF generation part (Puppeteer) while keeping the service logic
  jest.spyOn(PDFService.prototype, 'generatePDFFromHTML').mockResolvedValue(Buffer.from('mock-pdf-content'));
});

describe('Test exporting project summary', () => {
  const validHeaders = {
    Cookie: `token=${createMockToken()}`
  };

  test('Successfully exports project summary as PDF', async () => {
    const mockProject = createMockProject({
      projectMembers: [
        {
          user: mockUserId, // For controller authorization check - should be string ID
          role: 'administrator'
        }
      ]
    });

    // For pdfService.fetchProjectData, we need a populated version
    const mockPopulatedProject = createMockProject({
      projectOwner: {
        _id: mockUserId,
        name: 'Test Owner',
        email: 'owner@test.com'
      },
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          role: {
            _id: 'role1',
            roleName: 'administrator'
          }
        }
      ],
      projectTasks: []
    });

    // Mock Project.findById for controller's access check (first call)
    // Mock Project.findById for pdfService.fetchProjectData (second call with populate)
    jest.spyOn(Project, 'findById')
      .mockResolvedValueOnce(mockProject) // Controller call
      .mockImplementationOnce(() => ({    // pdfService call with populate chain
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
              populate: jest.fn().mockResolvedValue(mockPopulatedProject)
            }))
          }))
        }))
      }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('project-summary-Test-Project.pdf');
    // Note: We can't easily test PDF buffer content without mocking puppeteer
    // but we can verify the response format and headers
  });

  test('Fails when project is not found', async () => {
    // Mock Project.findById to return null
    jest.spyOn(Project, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Project not found');
  });

  test('Fails when user is not a project member', async () => {
    const mockProject = createMockProject({
      projectMembers: [
        {
          user: 'different-user-id',
          role: 'administrator'
        }
      ]
    });

    // Mock Project.findById to return a project where user is not a member
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Access denied: You are not authorized to export this project summary');
  });

  test('Fails when user is not authenticated', async () => {
    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`);

    expect(res.statusCode).toBe(401);
  });

  test('Fails when project ID is invalid', async () => {
    const res = await request(app)
      .get('/api/projects/invalid-project-id/export-summary')
      .set(validHeaders);

    expect(res.statusCode).toBe(404);
  });

  test('Fails when PDF generation throws an error', async () => {
    const mockProject = createMockProject({
      projectMembers: [
        {
          user: mockUserId, // For controller authorization check
          role: 'administrator'
        }
      ]
    });

    const mockPopulatedProject = createMockProject({
      projectOwner: {
        _id: mockUserId,
        name: 'Test Owner',
        email: 'owner@test.com'
      },
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          role: {
            _id: 'role1',
            roleName: 'administrator'
          }
        }
      ],
      projectTasks: []
    });

    // Mock Project.findById calls
    jest.spyOn(Project, 'findById')
      .mockResolvedValueOnce(mockProject) // Controller call
      .mockImplementationOnce(() => ({    // pdfService call with populate chain
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
              populate: jest.fn().mockResolvedValue(mockPopulatedProject)
            }))
          }))
        }))
      }));

    // Override the PDF generation mock to throw an error for this test
    jest.spyOn(PDFService.prototype, 'generatePDFFromHTML').mockRejectedValue(new Error('PDF generation failed'));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Failed to generate project summary PDF');
    expect(res.body.error).toBe('PDF generation failed');
  });

  test('Fails when project has no members', async () => {
    const mockProject = createMockProject({
      projectMembers: []
    });

    // Mock Project.findById to return a project with no members
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Access denied: You are not authorized to export this project summary');
  });

  test('Fails when project members array is malformed', async () => {
    const mockProject = createMockProject({
      projectMembers: [
        {
          // Missing user field
          role: 'administrator'
        }
      ]
    });

    // Mock Project.findById to return a project with malformed members
    jest.spyOn(Project, 'findById').mockResolvedValue(mockProject);

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Access denied: You are not authorized to export this project summary');
  });

  test('Successfully exports project with special characters in name', async () => {
    const mockProject = createMockProject({
      projectName: 'Test Project with Spaces & Special Chars!',
      projectMembers: [
        {
          user: mockUserId, // For controller authorization check
          role: 'administrator'
        }
      ]
    });

    const mockPopulatedProject = createMockProject({
      projectName: 'Test Project with Spaces & Special Chars!',
      projectOwner: {
        _id: mockUserId,
        name: 'Test Owner',
        email: 'owner@test.com'
      },
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          role: {
            _id: 'role1',
            roleName: 'administrator'
          }
        }
      ],
      projectTasks: []
    });

    // Mock Project.findById calls
    jest.spyOn(Project, 'findById')
      .mockResolvedValueOnce(mockProject) // Controller call
      .mockImplementationOnce(() => ({    // pdfService call with populate chain
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
              populate: jest.fn().mockResolvedValue(mockPopulatedProject)
            }))
          }))
        }))
      }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('project-summary-Test-Project-with-Spaces---Special-Chars-.pdf');
  });

  test('Successfully exports project with missing/incomplete user data', async () => {
    const mockProject = createMockProject({
      projectMembers: [
        {
          user: mockUserId, // For controller authorization check
          role: 'administrator'
        }
      ]
    });

    // Create a populated project with missing/incomplete data to test edge cases
    const mockPopulatedProject = createMockProject({
      projectOwner: {
        _id: mockUserId,
        name: 'Test Owner',
        email: 'owner@test.com'
      },
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          role: {
            _id: 'role1',
            roleName: 'administrator'
          }
        },
        {
          user: null, // Missing user data - should use fallback values
          role: {
            _id: 'role2',
            roleName: 'developer'
          }
        },
        {
          user: {
            _id: 'user3',
            name: null, // Missing name
            email: null // Missing email
          },
          role: null // Missing role
        }
      ],
      projectTasks: []
    });

    // Mock Project.findById calls
    jest.spyOn(Project, 'findById')
      .mockResolvedValueOnce(mockProject) // Controller call
      .mockImplementationOnce(() => ({    // pdfService call with populate chain
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
              populate: jest.fn().mockResolvedValue(mockPopulatedProject)
            }))
          }))
        }))
      }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  test('Successfully exports project with various task statuses and deadlines', async () => {
    const mockProject = createMockProject({
      projectMembers: [
        {
          user: mockUserId, // For controller authorization check
          role: 'administrator'
        }
      ]
    });

    const currentDate = new Date();
    const pastDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const futureDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Create a populated project with various task scenarios
    const mockPopulatedProject = createMockProject({
      projectOwner: {
        _id: mockUserId,
        name: 'Test Owner',
        email: 'owner@test.com'
      },
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          role: {
            _id: 'role1',
            roleName: 'administrator'
          }
        },
        {
          user: {
            _id: mockMemberId,
            name: 'Member User',
            email: 'member@example.com'
          },
          role: {
            _id: 'role2',
            roleName: 'developer'
          }
        }
      ],
      projectTasks: [
        {
          _id: 'task1',
          taskName: 'Completed Task',
          taskDescription: 'A completed task',
          taskDeadline: pastDate,
          taskProgress: 'Completed',
          taskCreator: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          taskAssignee: {
            _id: mockMemberId,
            name: 'Member User',
            email: 'member@example.com'
          },
          createdAt: new Date(pastDate.getTime() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: pastDate // Completed on time
        },
        {
          _id: 'task2',
          taskName: 'Overdue Task',
          taskDescription: 'An overdue task',
          taskDeadline: pastDate,
          taskProgress: 'In Progress',
          taskCreator: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          taskAssignee: {
            _id: mockMemberId,
            name: 'Member User',
            email: 'member@example.com'
          },
          createdAt: new Date(pastDate.getTime() - 3 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(pastDate.getTime() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          _id: 'task3',
          taskName: 'Late Completion Task',
          taskDescription: 'A task completed after deadline',
          taskDeadline: pastDate,
          taskProgress: 'Completed',
          taskCreator: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          taskAssignee: {
            _id: mockMemberId,
            name: 'Member User',
            email: 'member@example.com'
          },
          createdAt: new Date(pastDate.getTime() - 3 * 24 * 60 * 60 * 1000),
          updatedAt: currentDate // Completed late
        },
        {
          _id: 'task4',
          taskName: 'Unassigned Task',
          taskDescription: 'A task with no assignee',
          taskDeadline: futureDate,
          taskProgress: 'To Do',
          taskCreator: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          taskAssignee: null, // No assignee
          createdAt: currentDate,
          updatedAt: currentDate
        },
        {
          _id: 'task5',
          taskName: 'Task with Missing Creator',
          taskDescription: 'A task with missing creator data',
          taskDeadline: futureDate,
          taskProgress: 'In Progress',
          taskCreator: null, // No creator
          taskAssignee: {
            _id: mockMemberId,
            name: 'Member User',
            email: 'member@example.com'
          },
          createdAt: currentDate,
          updatedAt: null // No update date
        }
      ]
    });

    // Mock Project.findById calls
    jest.spyOn(Project, 'findById')
      .mockResolvedValueOnce(mockProject) // Controller call
      .mockImplementationOnce(() => ({    // pdfService call with populate chain
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
              populate: jest.fn().mockResolvedValue(mockPopulatedProject)
            }))
          }))
        }))
      }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  test('Successfully exports project with no tasks', async () => {
    const mockProject = createMockProject({
      projectMembers: [
        {
          user: mockUserId, // For controller authorization check
          role: 'administrator'
        }
      ]
    });

    // Create a populated project with no tasks to test zero-division edge cases
    const mockPopulatedProject = createMockProject({
      projectOwner: {
        _id: mockUserId,
        name: 'Test Owner',
        email: 'owner@test.com'
      },
      projectMembers: [
        {
          user: {
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com'
          },
          role: {
            _id: 'role1',
            roleName: 'administrator'
          }
        }
      ],
      projectTasks: [] // No tasks - tests zero-division branches
    });

    // Mock Project.findById calls
    jest.spyOn(Project, 'findById')
      .mockResolvedValueOnce(mockProject) // Controller call
      .mockImplementationOnce(() => ({    // pdfService call with populate chain
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockImplementation(() => ({
            populate: jest.fn().mockImplementation(() => ({
              populate: jest.fn().mockResolvedValue(mockPopulatedProject)
            }))
          }))
        }))
      }));

    const res = await request(app)
      .get(`/api/projects/${mockProjectId}/export-summary`)
      .set(validHeaders);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });
});
