import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders welcome screen', () => {
  render(<App />);
  expect(screen.getByText(/AI Health Assistant/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Start Assessment/i })).toBeInTheDocument();
});
