import React from 'react';
import { render, screen } from '@testing-library/react';
import ProjectTasksPage from '../pages/ProjectTasksPage';

describe('ProjectTasksPage', () => {
  test.todo('renders default layout and fetches issues');
  test.todo('applies filters and syncs URL state');
  test.todo('persists column selections via localStorage');

  test('renders loading placeholder', () => {
    render(<ProjectTasksPage />);
    expect(screen.getByText(/tasks/i)).toBeInTheDocument();
  });
});



