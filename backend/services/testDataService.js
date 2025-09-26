const User = require('../models/user');
const Project = require('../models/project');
const Task = require('../models/tasks');
const Role = require('../models/roles');

async function seedTestData() {
  try {
    // Check if test data already exists
    const existingProject = await Project.findOne({ projectName: { $regex: /^Test Project/ } });
    if (existingProject) {
      return;
    }

    // Get existing roles (they should already be seeded)
    const roles = await Promise.all([
      Role.findOne({ roleName: 'administrator' }),
      Role.findOne({ roleName: 'developer' }),
      Role.findOne({ roleName: 'viewer' })
    ]);

    // Verify all roles exist
    if (!roles[0] || !roles[1] || !roles[2]) {
      throw new Error('Required roles not found. Test data seeding skipped.');
    }

    // Create test users
    const users = await User.insertMany([
      {
        name: 'Alice Johnson',
        email: 'alice@unsw.edu.au',
        password: '$2b$10$5MgmQseYhYPvIOY9FlGOL.6s9oiE3LKNmRThiWU/yXNi4H6yjOEQC',
        userProjects: []
      },
      {
        name: 'Bob Wilson',
        email: 'bob@unsw.edu.au',
        password: '$2b$10$5MgmQseYhYPvIOY9FlGOL.6s9oiE3LKNmRThiWU/yXNi4H6yjOEQC',
        userProjects: []
      },
      {
        name: 'Carol Davis',
        email: 'carol@unsw.edu.au',
        password: '$2b$10$5MgmQseYhYPvIOY9FlGOL.6s9oiE3LKNmRThiWU/yXNi4H6yjOEQC',
        userProjects: []
      },
      {
        name: 'David Chen',
        email: 'david@unsw.edu.au',
        password: '$2b$10$5MgmQseYhYPvIOY9FlGOL.6s9oiE3LKNmRThiWU/yXNi4H6yjOEQC',
        userProjects: []
      },
      {
        name: 'Emma Thompson',
        email: 'emma@unsw.edu.au',
        password: '$2b$10$5MgmQseYhYPvIOY9FlGOL.6s9oiE3LKNmRThiWU/yXNi4H6yjOEQC',
        userProjects: []
      }
    ]);

    // Create project with realistic timeline (started 6 weeks ago)
    const projectStartDate = new Date();
    projectStartDate.setDate(projectStartDate.getDate() - 42); // 6 weeks ago

    const project = new Project({
      projectName: 'Test Project - Student Management System',
      projectDescription: 'A comprehensive web application for managing student enrollments, course schedules, and academic records. This project demonstrates full-stack development skills including database design, API development, user authentication, and responsive frontend design.',
      projectOwner: users[0]._id,
      projectMembers: [
        { user: users[0]._id, role: roles[0]._id }, // Alice - Administrator
        { user: users[1]._id, role: roles[1]._id }, // Bob - Developer
        { user: users[2]._id, role: roles[1]._id }, // Carol - Developer
        { user: users[3]._id, role: roles[2]._id }, // David - Viewer
        { user: users[4]._id, role: roles[1]._id }  // Emma - Developer
      ],
      projectTasks: [],
      createdAt: projectStartDate,
      updatedAt: new Date()
    });

    await project.save();

    // Helper function to create task dates
    const getTaskDate = (weeksAgo, daysOffset = 0) => {
      const date = new Date();
      date.setDate(date.getDate() - (weeksAgo * 7) + daysOffset);
      return date;
    };

    // Create diverse tasks with different scenarios
    const tasks = [];
    const currentDate = new Date();

    // Week 1 tasks (6 weeks ago)
    tasks.push(
      {
        taskName: 'Test Task 1 - Project Planning & Requirements',
        taskDescription: 'Define project scope, gather requirements, and create project timeline',
        taskDeadline: getTaskDate(6, 3),
        taskCreator: users[0]._id, // Alice (Administrator)
        taskAssignee: users[0]._id,
        taskProgress: 'Completed',
        createdAt: getTaskDate(6),
        updatedAt: getTaskDate(6, 2) // Completed on time
      },
      {
        taskName: 'Test Task 2 - Database Schema Design',
        taskDescription: 'Design and implement the database schema for the student management system',
        taskDeadline: getTaskDate(5, 5),
        taskCreator: users[0]._id, // Alice (Administrator)
        taskAssignee: users[1]._id, // Bob (Developer)
        taskProgress: 'Completed',
        createdAt: getTaskDate(6),
        updatedAt: getTaskDate(5, 7) // Completed 2 days late
      }
    );

    // Week 2 tasks (5 weeks ago)
    tasks.push(
      {
        taskName: 'Test Task 3 - UI/UX Wireframes',
        taskDescription: 'Create wireframes and mockups for the user interface',
        taskDeadline: getTaskDate(4, 6),
        taskCreator: users[0]._id, // Alice (Administrator)
        taskAssignee: users[2]._id, // Carol (Developer)
        taskProgress: 'Completed',
        createdAt: getTaskDate(5),
        updatedAt: getTaskDate(4, 5) // Completed on time
      },
      {
        taskName: 'Test Task 4 - User Authentication API',
        taskDescription: 'Implement JWT-based authentication system',
        taskDeadline: getTaskDate(4, 2),
        taskCreator: users[1]._id, // Bob (Developer)
        taskAssignee: users[1]._id,
        taskProgress: 'Completed',
        createdAt: getTaskDate(5),
        updatedAt: getTaskDate(4, 1) // Completed on time
      }
    );

    // Week 3 tasks (4 weeks ago)
    tasks.push(
      {
        taskName: 'Test Task 5 - Student Registration Frontend',
        taskDescription: 'Build the student registration form and validation',
        taskDeadline: getTaskDate(3, 4),
        taskCreator: users[0]._id, // Alice (Administrator)
        taskAssignee: users[2]._id, // Carol (Developer)
        taskProgress: 'Completed',
        createdAt: getTaskDate(4),
        updatedAt: getTaskDate(3, 3) // Completed on time
      },
      {
        taskName: 'Test Task 6 - Course Management Backend',
        taskDescription: 'Implement CRUD operations for course management',
        taskDeadline: getTaskDate(3, 1),
        taskCreator: users[1]._id, // Bob (Developer)
        taskAssignee: users[1]._id,
        taskProgress: 'Completed',
        createdAt: getTaskDate(4),
        updatedAt: getTaskDate(2, 6) // Completed 2 days late
      }
    );

    // Week 4 tasks (3 weeks ago)
    tasks.push(
      {
        taskName: 'Test Task 7 - Dashboard UI Components',
        taskDescription: 'Create reusable UI components for the dashboard',
        taskDeadline: getTaskDate(2, 5),
        taskCreator: users[2]._id, // Carol (Developer)
        taskAssignee: users[4]._id, // Emma (Developer)
        taskProgress: 'Completed',
        createdAt: getTaskDate(3),
        updatedAt: getTaskDate(2, 4) // Completed on time
      },
      {
        taskName: 'Test Task 8 - Grade Management System',
        taskDescription: 'Implement grade calculation and reporting features',
        taskDeadline: getTaskDate(2, 2),
        taskCreator: users[0]._id, // Alice (Administrator)
        taskAssignee: users[1]._id, // Bob (Developer)
        taskProgress: 'In Progress', // Still in progress, overdue
        createdAt: getTaskDate(3),
        updatedAt: getTaskDate(2)
      }
    );

    // Week 5 tasks (2 weeks ago)
    tasks.push(
      {
        taskName: 'Test Task 9 - Search & Filter Functionality',
        taskDescription: 'Add search and filtering capabilities to student lists',
        taskDeadline: getTaskDate(1, 3),
        taskCreator: users[2]._id, // Carol (Developer)
        taskAssignee: users[2]._id,
        taskProgress: 'Completed',
        createdAt: getTaskDate(2),
        updatedAt: getTaskDate(1, 2) // Completed on time
      },
      {
        taskName: 'Test Task 10 - Email Notification System',
        taskDescription: 'Implement automated email notifications for important events',
        taskDeadline: getTaskDate(1, 1),
        taskCreator: users[0]._id, // Alice (Administrator)
        taskAssignee: users[1]._id, // Bob (Developer)
        taskProgress: 'To Do', // Not started, overdue
        createdAt: getTaskDate(2),
        updatedAt: getTaskDate(2)
      }
    );

    // Week 6 tasks (1 week ago)
    tasks.push(
      {
        taskName: 'Test Task 11 - Mobile Responsive Design',
        taskDescription: 'Ensure the application works well on mobile devices',
        taskDeadline: getTaskDate(0, 2),
        taskCreator: users[4]._id, // Emma (Developer)
        taskAssignee: users[4]._id,
        taskProgress: 'In Progress',
        createdAt: getTaskDate(1),
        updatedAt: getTaskDate(1)
      },
      {
        taskName: 'Test Task 12 - Data Export Features',
        taskDescription: 'Add CSV and PDF export functionality for reports',
        taskDeadline: getTaskDate(-1, 1), // Due tomorrow
        taskCreator: users[0]._id, // Alice (Administrator)
        taskAssignee: users[2]._id, // Carol (Developer)
        taskProgress: 'In Progress',
        createdAt: getTaskDate(1),
        updatedAt: getTaskDate(0, -1)
      }
    );

    // Current week tasks
    tasks.push(
      {
        taskName: 'Test Task 13 - Unit Testing Suite',
        taskDescription: 'Write comprehensive unit tests for backend APIs',
        taskDeadline: getTaskDate(-1, 5), // Due in 5 days
        taskCreator: users[1]._id, // Bob (Developer)
        taskAssignee: users[1]._id,
        taskProgress: 'To Do',
        createdAt: getTaskDate(0, -2),
        updatedAt: getTaskDate(0, -2)
      },
      {
        taskName: 'Test Task 14 - Performance Optimization',
        taskDescription: 'Optimize database queries and frontend performance',
        taskDeadline: getTaskDate(-2, 3), // Due next week
        taskCreator: users[0]._id, // Alice (Administrator)
        taskAssignee: users[4]._id, // Emma (Developer)
        taskProgress: 'To Do',
        createdAt: getTaskDate(0, -1),
        updatedAt: getTaskDate(0, -1)
      },
      {
        taskName: 'Test Task 15 - Security Audit',
        taskDescription: 'Conduct security review and implement security best practices',
        taskDeadline: getTaskDate(-2, 1), // Due next week
        taskCreator: users[0]._id, // Alice (Administrator)
        taskAssignee: users[1]._id, // Bob (Developer)
        taskProgress: 'To Do',
        createdAt: currentDate,
        updatedAt: currentDate
      }
    );

    // Insert all tasks
    const insertedTasks = await Task.insertMany(tasks);

    // Update project with task IDs
    project.projectTasks = insertedTasks.map(task => task._id);
    await project.save();

    // Update user projects
    for (const user of users) {
      user.userProjects = [project._id];
      await user.save();
    }

    // eslint-disable-next-line no-console
    console.log('Test data seeded successfully!');
    // eslint-disable-next-line no-console
    console.log(`Project ID: ${project._id}`);
    // eslint-disable-next-line no-console
    console.log(`Created ${users.length} users, ${insertedTasks.length} tasks`);

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error seeding test data:', error);
  }
}

module.exports = { seedTestData };
