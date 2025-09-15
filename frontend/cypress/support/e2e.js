// cypress/support/e2e.js

// Import commands.js using ES2015 syntax:
import './commands';

// Disable screenshots on test failures
Cypress.Screenshot.defaults({
  screenshotOnRunFailure: false,
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false;
}); 