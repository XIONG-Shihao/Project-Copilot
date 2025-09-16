// cypress/e2e/auth.cy.js

describe('Authentication Flow', () => {
  // Generate a random email for testing
  const randomEmail = `test${Math.floor(Math.random() * 10000)}@example.com`;
  const password = 'Password123!';
  const name = 'Test User';

  beforeEach(() => {
    // Clear localStorage before each test
    cy.clearLocalStorage();
    cy.clearAllCookies();
    cy.clearAllSessionStorage();
  });

  it('should navigate to the login page', () => {
    cy.visit('/login');
    cy.contains('h2', 'Login').should('be.visible');
    cy.contains('CollabMate').should('be.visible');
  });

  it('should show validation errors for empty login form', () => {
    cy.visit('/login');
    cy.get('button[type="submit"]').click();
    
    // Check for validation messages (HTML5 validation)
    cy.get('input[placeholder=\"Enter email\"]:invalid').should('exist');
    cy.get('input[placeholder=\"Password\"]:invalid').should('exist');
  });

  it('should navigate to registration page from login page', () => {
    cy.visit('/login');
    cy.contains('Register').click();
    cy.url().should('include', '/register');
    cy.contains('h2', 'Register').should('be.visible');
  });

  it('should register a new user', () => {
    cy.visit('/register');
    
    // Fill in registration form
    cy.get('input[placeholder="Enter name"]').type(name);
    cy.get('input[placeholder="Enter email"]').type(randomEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('input[placeholder="Confirm Password"]').type(password);
    
    // Intercept the registration API call
    cy.intercept('POST', '**/api/register').as('registerRequest');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call to complete
    cy.wait('@registerRequest').then((interception) => {
      // Check status code if available
      if (interception.response) {
        expect(interception.response.statusCode).to.be.oneOf([200, 201]);
      }
    });
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');
    
    // Local storage should contain user data
    cy.window().then((win) => {
      expect(win.localStorage.getItem('user')).to.exist;
    });
  });

  it('should show error for mismatched passwords', () => {
    cy.visit('/register');
    
    // Fill in registration form with mismatched passwords
    cy.get('input[placeholder="Enter name"]').type(name);
    cy.get('input[placeholder="Enter email"]').type(randomEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('input[placeholder="Confirm Password"]').type(password + '1');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Should show error message
    cy.contains('Passwords do not match').should('be.visible');
    
    // Should not navigate away
    cy.url().should('include', '/register');
  });

  it('should login with registered credentials', () => {
    cy.visit('/login');
    
    // Fill in login form
    cy.get('input[placeholder="Enter email"]').type(randomEmail);
    cy.get('input[placeholder="Password"]').type(password);
    
    // Intercept the login API call
    cy.intercept('POST', '**/api/login').as('loginRequest');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call to complete
    cy.wait('@loginRequest').then((interception) => {
      // Check status code if available
      if (interception.response) {
        expect(interception.response.statusCode).to.be.oneOf([200, 201]);
      }
    });
    
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');
    
    // Local storage should contain user data
    cy.window().then((win) => {
      expect(win.localStorage.getItem('user')).to.exist;
    });
  });

  it('should show error for invalid login', () => {
    cy.visit('/login');
    
    // Fill in login form with invalid credentials
    cy.get('input[placeholder="Enter email"]').type('invalid@example.com');
    cy.get('input[placeholder="Password"]').type('WrongPassword123!');
    
    // Intercept the login API call
    cy.intercept('POST', '**/api/login').as('loginRequest');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Wait for the API call to complete
    cy.wait('@loginRequest');
    
    // Should show error toast
    cy.contains('Login failed').should('be.visible');
    
    // Should not navigate away
    cy.url().should('include', '/login');
  });
}); 