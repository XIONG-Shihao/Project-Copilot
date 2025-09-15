// cypress/e2e/e2e.cy.js

describe('End-to-End User Flow', { testIsolation: false }, () => {
  // Generate a unique email to avoid conflicts with auth tests
  const randomEmail = `e2e${Math.floor(Math.random() * 10000)}@example.com`;
  const email = randomEmail;
  const password = 'Password123!';
  const name = 'E2E Test User';
  const projectName = 'Test Project';
  const projectDescription = 'This is a test project created by Cypress';
  
  // Flag to track if we're logged in
  let isLoggedIn = false;

  // Run this before all tests
  before(() => {
    // Try to ensure we start fresh
    cy.clearLocalStorage();
    cy.clearAllCookies();
    cy.clearAllSessionStorage();
    
    // Start by visiting the login page and wait for any redirects
    cy.visit('/login');
    cy.wait(3000); // Give time for any automatic redirects
    
    // Now check where we ended up
    cy.url().then(currentUrl => {
      cy.log('Current URL after visiting /login and waiting:', currentUrl);
      
      if (currentUrl.includes('/dashboard')) {
        // We were automatically redirected to dashboard (user already logged in)
        cy.log('Automatically redirected to dashboard - user already authenticated');
        isLoggedIn = true;
        cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
      } else {
        // We're still on login page, so we can proceed with authentication
        cy.log('On login page, proceeding with authentication flow');
        
        // Try to login first (user might already exist)
        cy.get('input[placeholder="Enter email"]').should('be.visible').type(email);
        cy.get('input[placeholder="Password"]').should('be.visible').type(password);
        cy.get('button[type="submit"]').click();
        
        // Wait and see what happens
        cy.wait(3000);
        cy.url().then(afterLoginUrl => {
          cy.log('URL after login attempt:', afterLoginUrl);
          
          if (afterLoginUrl.includes('/dashboard')) {
            // Login was successful
            cy.log('Login successful with existing credentials');
            isLoggedIn = true;
            cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
          } else {
            // Login failed, user doesn't exist - let's register
            cy.log('Login failed, user does not exist - proceeding with registration');
            cy.visit('/register');
            
            cy.get('input[placeholder="Enter name"]').should('be.visible').type(name);
            cy.get('input[placeholder="Enter email"]').should('be.visible').type(email);
            cy.get('input[placeholder="Password"]').should('be.visible').type(password);
            cy.get('input[placeholder="Confirm Password"]').should('be.visible').type(password);
            cy.get('button[type="submit"]').click();
            
            // Wait for successful registration
            cy.contains('Account created successfully', { timeout: 10000 }).should('be.visible');
            cy.url({ timeout: 10000 }).should('include', '/dashboard');
            cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
            
            isLoggedIn = true;
            cy.log('Registration successful - now on dashboard');
          }
        });
      }
    });
  });
  
  // First test just to verify authentication worked
  it('should be logged in and on dashboard', () => {
    // Ensure we're logged in (this should be handled by the before hook)
    if (!isLoggedIn) {
      cy.log('ERROR: User should be logged in by now');
      // Try to go to dashboard anyway - maybe we missed the redirect
      cy.visit('/dashboard');
    }
    
    // Verify we're on the dashboard
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
    
    // Update the login status for subsequent tests
    isLoggedIn = true;
    cy.log('Authentication verified - user is on dashboard');
  });

  // Dashboard test - only run if logged in
  it('should display user dashboard after login', () => {
    // Make sure we're on the dashboard
    cy.url().then(url => {
      cy.log('Current URL at start of dashboard test:', url);
      if (!url.includes('/dashboard')) {
        cy.visit('/dashboard');
        // Wait for dashboard to fully load
        cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
      }
    });
    
    // Check dashboard elements with appropriate timeouts
    cy.contains('Welcome', { timeout: 5000 }).should('be.visible');
    cy.contains('Your Projects', { timeout: 5000 }).should('be.visible');
    
    // Navbar should be visible
    cy.get('nav', { timeout: 5000 }).should('be.visible');
    cy.contains('CollabMate', { timeout: 5000 }).should('be.visible');
  });

  // Project creation test
  it('should create a new project', () => {
    // Make sure we're on the dashboard
    cy.url().then(url => {
      cy.log('Current URL at start of create project test:', url);
      if (!url.includes('/dashboard')) {
        cy.visit('/dashboard');
        // Wait for dashboard to fully load
        cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
      }
    });
    
    // Wait for page to be ready before clicking
    cy.contains('Create New Project', { timeout: 10000 }).should('be.visible').click();
    
    // Wait for the modal to appear
    cy.get('.modal-dialog', { timeout: 5000 }).should('be.visible');
    cy.contains('Create New Project').should('be.visible');
    
    // Fill in project form using the actual form fields from Dashboard.js
    cy.get('#projectName').should('be.visible').type(projectName);
    cy.get('#projectDescription').should('be.visible').type(projectDescription);
    
    // Submit the form by clicking the Create Project button in the modal
    cy.contains('button', 'Create Project').click();
    
    // Wait for the toast notification
    cy.contains('Project created successfully', { timeout: 10000 }).should('be.visible');
    
    // Wait for the project to appear in the list
    cy.contains(projectName, { timeout: 10000 }).should('be.visible');
  });

  // Project display test
  it('should display project in dashboard', () => {
    // Go to dashboard
    cy.visit('/dashboard');
    
    // Wait for dashboard to fully load
    cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
    
    // Project should be listed in dashboard with longer timeout
    cy.contains(projectName, { timeout: 10000 }).should('be.visible');
    
    // Click on the View Project button for our project
    cy.contains(projectName)
      .parents('.card')
      .find('button')
      .contains('View Project')
      .click();
    
    // Should navigate to project dashboard with longer timeout
    cy.url({ timeout: 10000 }).should('include', '/project/');
    
    // Project details should be visible with longer timeout
    cy.contains(projectName, { timeout: 10000 }).should('be.visible');
  });

  // Task creation test
  it('should add a task to the project', () => {
    // Go to dashboard
    cy.visit('/dashboard');
    
    // Wait for dashboard to fully load
    cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
    
    // Navigate to project
    cy.contains(projectName)
      .parents('.card')
      .find('button')
      .contains('View Project')
      .click();
    
    // Wait for project page to load
    cy.url({ timeout: 10000 }).should('include', '/project/');
    
    // Find the Tasks card header and click the Create Task button within it
    cy.contains('h5', 'Tasks')
      .parents('.card-header')
      .find('button')
      .contains('+ Create Task')
      .click({ force: true });
    
    // Wait for the modal to appear
    cy.get('.modal-dialog', { timeout: 5000 }).should('be.visible');
    cy.contains('Create Task').should('be.visible');
    
    // Fill in task form with waiting - using the actual form fields from TasksSection.js
    const taskTitle = 'Test Task';
    const taskDescription = 'This is a test task created by Cypress';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    cy.get('#taskName').should('be.visible').type(taskTitle);
    cy.get('#taskDescription').should('be.visible').type(taskDescription);
    cy.get('#taskDeadline').should('be.visible').type(formattedDate);
    
    // Submit the form by clicking the Create Task button in the modal footer
    cy.get('.modal-footer')
      .find('button')
      .contains('Create Task')
      .should('be.visible')
      .click();
    
    // Wait for the toast notification
    cy.contains('Task created successfully', { timeout: 10000 }).should('be.visible');
    
    // Task should be visible in the task list with longer timeout
    cy.contains(taskTitle, { timeout: 10000 }).should('be.visible');
  });

  // Logout test
  it('should logout successfully', () => {
    // Go to dashboard
    cy.visit('/dashboard');
    
    // Wait for dashboard to fully load
    cy.contains('Welcome', { timeout: 10000 }).should('be.visible');
    
    // Wait for nav to be visible
    cy.get('nav', { timeout: 5000 }).should('be.visible');
    
    // Click on Logout directly (based on AppNavbar.js)
    cy.get('nav').contains('Logout', { timeout: 5000 }).should('be.visible').click();
    
    // Should redirect to login page with longer timeout
    cy.url({ timeout: 10000 }).should('include', '/login');
    
    // Local storage should be cleared
    cy.window().then((win) => {
      expect(win.localStorage.getItem('user')).to.be.null;
    });
    
    // Update login status
    isLoggedIn = false;
  });
});