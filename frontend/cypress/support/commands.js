// cypress/support/commands.js

// Custom command to login programmatically
Cypress.Commands.add('login', (email, password) => {
  // Use cy.session to cache the login state
  cy.session([email, password], () => {
    cy.request({
      method: 'POST',
      url: `${Cypress.config().baseUrl.replace(/\/$/, '')}/api/login`,
      body: { email, password },
    }).then((response) => {
      // Store the user in localStorage
      window.localStorage.setItem('user', JSON.stringify(response.body.user));
    });
  });
  
  // Visit the dashboard to ensure we're logged in
  cy.visit('/dashboard');
});

// Custom command to create a project programmatically
Cypress.Commands.add('createProject', (name, description) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.config().baseUrl.replace(/\/$/, '')}/api/projects`,
    body: { name, description },
  }).then((response) => {
    return response.body;
  });
});

// Custom command to create a task programmatically
Cypress.Commands.add('createTask', (projectId, title, description, priority = 'Medium', status = 'To Do') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.config().baseUrl.replace(/\/$/, '')}/api/tasks`,
    body: { projectId, title, description, priority, status },
  }).then((response) => {
    return response.body;
  });
});

// Custom command to logout programmatically
Cypress.Commands.add('logout', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.config().baseUrl.replace(/\/$/, '')}/api/logout`,
  });
  
  // Clear localStorage
  cy.clearLocalStorage();
  
  // Clear all sessions
  cy.clearAllSessionStorage();
  cy.clearAllCookies();
  
  // Visit the login page
  cy.visit('/login');
}); 