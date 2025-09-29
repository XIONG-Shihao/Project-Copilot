// src/test/AppNavbar.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';

// Silence all warnings in this file:
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  // eslint-disable-next-line no-console
  console.warn.mockRestore();
});

jest.mock('axios', () => ({
  create: () => ({
    get: jest.fn(),
    post: jest.fn(),
    // add other methods as needed
  }),
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock AuthService and toast
jest.mock('../services/auth.service', () => ({
  logout: jest.fn(() => Promise.resolve()),
}));
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn((msg, opts) => {
      if (opts && typeof opts.onClose === 'function') opts.onClose();
    }),
    error: jest.fn(),
  },
}));

test('renders AppNavbar and finds navigation', () => {
  render(
    <MemoryRouter>
      <AppNavbar />
    </MemoryRouter>
  );
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});

test('shows the brand text', () => {
  render(
    <MemoryRouter>
      <AppNavbar />
    </MemoryRouter>
  );
  expect(screen.getByText('ProjectCopilot')).toBeInTheDocument();
});

test('shows Dashboard link when showDashboardLink is true', () => {
  render(
    <MemoryRouter>
      <AppNavbar showDashboardLink={true} />
    </MemoryRouter>
  );
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
});

test('does not show Dashboard link when showDashboardLink is false', () => {
  render(
    <MemoryRouter>
      <AppNavbar showDashboardLink={false} />
    </MemoryRouter>
  );
  expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
});

test('calls logout and shows toast on Logout click', async () => {
  const { logout } = require('../services/auth.service');
  const { toast } = require('react-toastify');
  render(
    <MemoryRouter>
      <AppNavbar />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByText('Logout'));
  
  // Split into separate waitFor calls to avoid the linting error
  await waitFor(() => {
    expect(logout).toHaveBeenCalled();
  });
  
  await waitFor(() => {
    expect(toast.success).toHaveBeenCalled();
  });
});
