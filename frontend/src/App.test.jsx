import React from 'react';
import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

test('renders PackSale title', async () => {
  // App imports `ethers`; Vite is aliased in test mode to our mock so import is safe.
  const { default: App } = await import('./App.jsx');
  render(App ? <App /> : null);

  const title = await screen.findByText(/PackSale Demo/i);
  expect(title).toBeInTheDocument();
});
