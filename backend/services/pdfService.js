/**
 * @fileoverview PDF generation service module for creating project summary reports
 * @module services/pdfService
 */

const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const Project = require('../models/project');

/**
 * Service class for generating PDF reports from project data
 * @class PDFService
 * @description Handles PDF generation using Puppeteer and Handlebars templating for project summaries
 */
class PDFService {
  /**
   * Initializes PDFService and registers Handlebars helpers
   * @constructor
   * @description Sets up template helpers for PDF generation
   */
  constructor() {
    this.registerHandlebarsHelpers();
  }

  /**
   * Registers custom Handlebars helpers for template rendering
   * @method registerHandlebarsHelpers
   * @description Adds equality and comparison helpers for conditional rendering in templates
   */
  registerHandlebarsHelpers() {
    // Helper for equality comparison
    handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });

    // Helper for greater than comparison
    handlebars.registerHelper('gt', function(a, b) {
      return a > b;
    });
  }

  /**
   * Generates a comprehensive PDF summary report for a project
   * @async
   * @method generateProjectSummaryPDF
   * @param {string} projectId - ID of the project to generate report for
   * @returns {Promise<Buffer>} PDF buffer containing the project summary
   * @throws {Error} When project data cannot be fetched or PDF generation fails
   * @description Orchestrates the complete PDF generation process from data fetching to final PDF output
   */
  async generateProjectSummaryPDF(projectId) {
    const project = await this.fetchProjectData(projectId);
    const summaryData = this.generateSummaryData(project);
    const htmlContent = await this.generateHTMLContent(summaryData);
    
    return await this.generatePDFFromHTML(htmlContent);
  }

  /**
   * Fetches comprehensive project data with all necessary database populations
   * @async
   * @method fetchProjectData
   * @param {string} projectId - ID of the project to fetch data for
   * @returns {Promise<Object>} Fully populated project object with owner, members, roles, and tasks
   * @throws {Error} When project is not found or database query fails
   * @description Retrieves project with nested population of related entities for complete reporting data
   */
  async fetchProjectData(projectId) {
    const project = await Project.findById(projectId)
      .populate('projectOwner', 'name email')
      .populate('projectMembers.user', 'name email')
      .populate('projectMembers.role', 'roleName')
      .populate({
        path: 'projectTasks',
        select: 'taskName taskDescription taskDeadline taskCreator taskAssignee taskProgress createdAt updatedAt',
        populate: [
          { path: 'taskCreator', select: 'name email' },
          { path: 'taskAssignee', select: 'name email' }
        ]
      });

    if (!project) {
      throw new Error('Project not found');
    }

    return project;
  }

  /**
   * Converts HTML content to PDF using Puppeteer
   * @async
   * @method generatePDFFromHTML
   * @param {string} htmlContent - HTML content to convert to PDF
   * @returns {Promise<Buffer>} PDF buffer
   * @throws {Error} When browser launch or PDF generation fails
   * @description Uses headless Chrome via Puppeteer to render HTML as PDF with A4 format and margins
   */
  async generatePDFFromHTML(htmlContent) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      return await page.pdf({
        format: 'A4',
        margin: { top: '1in', right: '0.75in', bottom: '1in', left: '0.75in' },
        printBackground: true
      });
    } catch (error) {
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate summary data from project
   * @param {Object} project - The populated project object
   * @returns {Object} Summary data
   */
  /**
   * Generates comprehensive summary data from project information
   * @method generateSummaryData
   * @param {Object} project - Populated project object from database
   * @returns {Object} Structured summary data for PDF template
   * @description Processes raw project data into formatted summary with statistics, timelines, and analysis
   */
  generateSummaryData(project) {
    const currentDate = new Date();
    const creationDate = project.createdAt;

    return {
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      timeline: this.formatTimeline(creationDate, currentDate),
      teamMembers: this.getTeamMembersWithRoles(project),
      totalTasks: project.projectTasks.length,
      taskDistribution: this.calculateTaskDistribution(project.projectTasks, project.projectMembers),
      tasksByStatus: this.getTasksByStatus(project.projectTasks),
      taskCompletionStats: this.calculateTaskCompletionStats(project.projectTasks),
      missedDeadlines: this.getMissedDeadlineTasks(project.projectTasks),
      workloadAnalysis: this.calculateWorkloadAnalysis(project.projectTasks, project.projectMembers),
      activityTimeline: this.generateActivityTimeline(project.projectTasks, creationDate, currentDate),
      generatedDate: this.formatAustralianDate(currentDate)
    };
  }

  /**
   * Get team members with their roles, including project owner
   * @param {Object} project - Project object
   * @returns {Array} Team members with roles
   */
  /**
   * Extracts and formats team member information with their roles
   * @method getTeamMembersWithRoles
   * @param {Object} project - Project object with populated members
   * @returns {Array<Object>} Array of member objects with name, email, and role information
   * @description Formats project members for display in PDF report
   */
  getTeamMembersWithRoles(project) {
    const teamMembers = project.projectMembers.map(member => ({
      name: member.user?.name || 'Unknown User',
      email: member.user?.email || 'Unknown Email',
      role: member.role?.roleName || 'No Role Assigned'
    }));

    return teamMembers;
  }

  /**
   * Format date in Australian timezone
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatAustralianDate(date) {
    return date.toLocaleDateString('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Calculate task distribution among team members
   * @param {Array} tasks - Project tasks
   * @param {Array} members - Project members
   * @returns {Array} Task distribution data
   */
  /**
   * Calculates task distribution statistics across team members
   * @method calculateTaskDistribution
   * @param {Array<Object>} tasks - Array of project tasks
   * @param {Array<Object>} members - Array of project members
   * @returns {Object} Task distribution data with assigned/unassigned counts and member statistics
   * @description Analyzes how tasks are distributed among team members for workload reporting
   */
  calculateTaskDistribution(tasks, members) {
    // Initialise distribution for all members
    const distribution = {};
    members.forEach(member => {
      if (member.user) {
        distribution[member.user._id.toString()] = {
          name: member.user.name,
          assigned: 0,
          created: 0,
          completed: 0
        };
      }
    });

    // Count tasks for each member
    tasks.forEach(task => {
      const assigneeId = task.taskAssignee?._id.toString();
      const creatorId = task.taskCreator?._id.toString();

      // Tasks assigned to member
      if (assigneeId && distribution[assigneeId]) {
        distribution[assigneeId].assigned++;
        if (task.taskProgress === 'Completed') {
          distribution[assigneeId].completed++;
        }
      }

      // Tasks created by member
      if (creatorId && distribution[creatorId]) {
        distribution[creatorId].created++;
      }
    });

    return Object.values(distribution);
  }

  /**
   * Get tasks grouped by status
   * @param {Array} tasks - Project tasks
   * @returns {Object} Tasks grouped by status
   */
  getTasksByStatus(tasks) {
    const statusGroups = { 'To Do': 0, 'In Progress': 0, 'Completed': 0 };
    
    tasks.forEach(task => {
      if (task.taskProgress in statusGroups) {
        statusGroups[task.taskProgress]++;
      }
    });

    return statusGroups;
  }

  /**
   * Calculate task completion statistics
   * @param {Array} tasks - Project tasks
   * @returns {Object} Completion statistics
   */
  /**
   * Calculates task completion statistics and percentages
   * @method calculateTaskCompletionStats
   * @param {Array<Object>} tasks - Array of project tasks
   * @returns {Object} Completion statistics with counts and percentages for each status
   * @description Analyzes task completion rates for project progress reporting
   */
  calculateTaskCompletionStats(tasks) {
    const currentDate = new Date();
    const stats = { onTime: 0, late: 0, incomplete: 0, totalCompleted: 0 };

    tasks.forEach(task => {
      const deadline = new Date(task.taskDeadline);
      
      if (task.taskProgress === 'Completed') {
        stats.totalCompleted++;
        const completionDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt);
        
        if (completionDate <= deadline) {
          stats.onTime++;
        } else {
          stats.late++;
        }
      } else if (currentDate > deadline) {
        stats.incomplete++; // Past deadline and not completed
      }
    });

    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? ((stats.totalCompleted / totalTasks) * 100).toFixed(1) : 0;
    const onTimeRate = stats.totalCompleted > 0 ? ((stats.onTime / stats.totalCompleted) * 100).toFixed(1) : 0;

    return { ...stats, completionRate, onTimeRate, totalTasks };
  }

  /**
   * Get tasks that missed their deadlines (both overdue and late completions)
   * @param {Array} tasks - Project tasks
   * @returns {Array} Tasks that missed deadlines
   */
  /**
   * Identifies tasks that have missed their deadlines
   * @method getMissedDeadlineTasks
   * @param {Array<Object>} tasks - Array of project tasks with deadlines
   * @returns {Array<Object>} Array of overdue tasks with formatted deadline information
   * @description Filters and formats tasks that are past due for deadline tracking
   */
  getMissedDeadlineTasks(tasks) {
    const currentDate = new Date();
    const missedTasks = [];

    tasks.forEach(task => {
      const deadline = new Date(task.taskDeadline);
      const isOverdue = currentDate > deadline && task.taskProgress !== 'Completed';
      const isLateCompletion = task.taskProgress === 'Completed' &&
                              task.updatedAt &&
                              new Date(task.updatedAt) > deadline;

      if (isOverdue || isLateCompletion) {
        const relevantDate = isLateCompletion ? new Date(task.updatedAt) : currentDate;
        const daysLate = Math.ceil((relevantDate - deadline) / (1000 * 60 * 60 * 24));
        
        missedTasks.push({
          taskName: task.taskName,
          deadline: deadline.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney' }),
          assignee: task.taskAssignee?.name || 'Unassigned',
          status: task.taskProgress,
          daysOverdue: daysLate,
          type: isOverdue ? 'Overdue' : 'Late Completion'
        });
      }
    });

    return missedTasks.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  /**
   * Calculate workload analysis for team members
   * @param {Array} tasks - Project tasks
   * @param {Array} members - Project members
   * @returns {Array} Workload analysis
   */
  calculateWorkloadAnalysis(tasks, members) {
    // Initialise workload for all members
    const workload = {};
    members.forEach(member => {
      if (member.user) {
        workload[member.user._id.toString()] = {
          name: member.user.name,
          totalTasks: 0,
          completedTasks: 0,
          overdueTasks: 0,
          lateTasks: 0
        };
      }
    });

    const currentDate = new Date();

    // Calculate workload metrics
    tasks.forEach(task => {
      const assigneeId = task.taskAssignee?._id.toString();
      if (!assigneeId || !workload[assigneeId]) return;

      const member = workload[assigneeId];
      member.totalTasks++;
      
      const deadline = new Date(task.taskDeadline);
      
      if (task.taskProgress === 'Completed') {
        member.completedTasks++;
        
        // Check if task was completed late
        const completionDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt);
        if (completionDate > deadline) {
          member.lateTasks++;
        }
      } else if (currentDate > deadline) {
        // Task is overdue (not completed and past deadline)
        member.overdueTasks++;
      }
    });

    // Calculate completion rates and sort by total tasks
    return Object.values(workload)
      .map(member => ({
        ...member,
        completionRate: member.totalTasks > 0 
          ? ((member.completedTasks / member.totalTasks) * 100).toFixed(1)
          : 0
      }))
      .sort((a, b) => b.totalTasks - a.totalTasks);
  }

  /**
   * Generate activity timeline data
   * @param {Array} tasks - Project tasks
   * @param {Date} startDate - Project start date
   * @param {Date} endDate - Current date
   * @returns {Array} Activity timeline
   */
  /**
   * Generates a weekly activity timeline showing task creation patterns
   * @method generateActivityTimeline
   * @param {Array<Object>} tasks - Array of project tasks
   * @param {Date} startDate - Timeline start date
   * @param {Date} endDate - Timeline end date
   * @returns {Array<Object>} Weekly activity data with task counts and date ranges
   * @description Creates timeline visualization data for project activity tracking
   */
  generateActivityTimeline(tasks, startDate, endDate) {
    const timeline = [];
    const dayMs = 1000 * 60 * 60 * 24;
    const totalDays = Math.ceil((endDate - startDate) / dayMs);
    const weeksToShow = Math.min(12, Math.ceil(totalDays / 7)); // Show max 12 weeks

    for (let week = 0; week < weeksToShow; week++) {
      const weekStart = new Date(startDate.getTime() + (week * 7 * dayMs));
      const weekEnd = new Date(weekStart.getTime() + (7 * dayMs));
      
      const { tasksCreated, tasksCompleted } = this.countTasksInWeek(tasks, weekStart, weekEnd);

      timeline.push({
        week: `Week ${week + 1}`,
        period: this.formatWeekPeriod(weekStart, weekEnd),
        tasksCreated,
        tasksCompleted,
        activity: tasksCreated + tasksCompleted
      });
    }

    return timeline;
  }

  /**
   * Count tasks created and completed in a specific week
   * @param {Array} tasks - Project tasks
   * @param {Date} weekStart - Start of the week
   * @param {Date} weekEnd - End of the week
   * @returns {Object} Count of tasks created and completed
   */
  countTasksInWeek(tasks, weekStart, weekEnd) {
    let tasksCreated = 0;
    let tasksCompleted = 0;

    tasks.forEach(task => {
      // Count tasks created in this week
      const createdAt = task.createdAt ? new Date(task.createdAt) : new Date(task.taskDeadline);
      if (createdAt >= weekStart && createdAt < weekEnd) {
        tasksCreated++;
      }

      // Count tasks completed in this week
      if (task.taskProgress === 'Completed') {
        const completionDate = task.updatedAt ? new Date(task.updatedAt) : new Date(task.createdAt);
        if (completionDate >= weekStart && completionDate < weekEnd) {
          tasksCompleted++;
        }
      }
    });

    return { tasksCreated, tasksCompleted };
  }

  /**
   * Format week period for display
   * @param {Date} weekStart - Start of the week
   * @param {Date} weekEnd - End of the week
   * @returns {string} Formatted week period
   */
  formatWeekPeriod(weekStart, weekEnd) {
    const options = { timeZone: 'Australia/Sydney', month: 'short', day: 'numeric' };
    return `${weekStart.toLocaleDateString('en-AU', options)} - ${weekEnd.toLocaleDateString('en-AU', options)}`;
  }

  /**
   * Format timeline string
   * @param {Date} startDate - Project creation date
   * @param {Date} endDate - Current date
   * @returns {string} Formatted timeline
   */
  formatTimeline(startDate, endDate) {
    const start = startDate.toLocaleDateString('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const end = endDate.toLocaleDateString('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    return `${start} to ${end} (${durationDays} days)`;
  }

  /**
   * Generate HTML content for PDF using Handlebars template
   * @param {Object} data - Summary data
   * @returns {Promise<string>} HTML content
   */
  /**
   * Generates HTML content from summary data using Handlebars template
   * @async
   * @method generateHTMLContent
   * @param {Object} data - Processed summary data for template rendering
   * @returns {Promise<string>} Rendered HTML content ready for PDF conversion
   * @throws {Error} When template file cannot be read or compilation fails
   * @description Compiles Handlebars template with summary data to create final HTML for PDF generation
   */
  async generateHTMLContent(data) {
    try {
      // Read the template file
      const templatePath = path.join(__dirname, '../templates/project-summary.hbs');
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Compile the template
      const template = handlebars.compile(templateContent);
      
      // Ensure activityTimeline exists and add activity percentage for each timeline item
      const activityTimeline = data.activityTimeline || [];
      const maxActivity = Math.max(...activityTimeline.map(w => w.activity || 0), 1);
      
      const dataWithHelpers = {
        ...data,
        activityTimeline: activityTimeline.map(week => ({
          ...week,
          activityPercent: ((week.activity || 0) / maxActivity) * 100
        }))
      };
      
      // Generate HTML
      return template(dataWithHelpers);
    } catch (error) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }
}

module.exports = PDFService;
