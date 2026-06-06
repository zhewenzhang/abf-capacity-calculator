import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PageShell from './PageShell';

describe('PageShell', () => {
  it('renders children', () => {
    const { getByText } = render(
      <PageShell>
        <div>Hello World</div>
      </PageShell>
    );
    expect(getByText('Hello World')).toBeTruthy();
  });

  it('default variant adds abf-page-shell--standard class', () => {
    const { container } = render(
      <PageShell>
        <div>content</div>
      </PageShell>
    );
    const shell = container.querySelector('.abf-page-shell');
    expect(shell?.className).toContain('abf-page-shell--standard');
  });

  it('variant="wide" adds abf-page-shell--wide class', () => {
    const { container } = render(
      <PageShell variant="wide">
        <div>content</div>
      </PageShell>
    );
    const shell = container.querySelector('.abf-page-shell--wide');
    expect(shell).toBeTruthy();
  });

  it('variant="narrow" adds abf-page-shell--narrow class', () => {
    const { container } = render(
      <PageShell variant="narrow">
        <div>content</div>
      </PageShell>
    );
    const shell = container.querySelector('.abf-page-shell--narrow');
    expect(shell).toBeTruthy();
  });

  it('variant="full" adds abf-page-shell--full class', () => {
    const { container } = render(
      <PageShell variant="full">
        <div>content</div>
      </PageShell>
    );
    const shell = container.querySelector('.abf-page-shell--full');
    expect(shell).toBeTruthy();
  });

  it('includes twk-page class for fade-in animation', () => {
    const { container } = render(
      <PageShell>
        <div>content</div>
      </PageShell>
    );
    const shell = container.querySelector('.abf-page-shell');
    expect(shell?.className).toContain('twk-page');
  });

  it('accepts additional className', () => {
    const { container } = render(
      <PageShell className="my-extra-class">
        <div>content</div>
      </PageShell>
    );
    const shell = container.querySelector('.abf-page-shell');
    expect(shell?.className).toContain('my-extra-class');
  });
});
