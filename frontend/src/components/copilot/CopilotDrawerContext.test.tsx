import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CopilotDrawerProvider } from './CopilotDrawerContext';

describe('CopilotDrawerProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <CopilotDrawerProvider>
        <div>Hello Drawer</div>
      </CopilotDrawerProvider>
    );
    expect(getByText('Hello Drawer')).toBeTruthy();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <CopilotDrawerProvider>
        <div>test</div>
      </CopilotDrawerProvider>
    );
    expect(container).toBeTruthy();
  });
});
