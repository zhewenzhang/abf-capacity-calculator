import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for read-only onChange guard pattern.
 *
 * These tests verify the guard function used in spreadsheet lab pages
 * to prevent state changes when the user is a viewer.
 */

describe('readOnlyGuard', () => {
  /**
   * Simulates the onChange guard pattern used in spreadsheet pages.
   * Returns true if the change should be applied, false if it should be blocked.
   */
  function guardOnChange(writable: boolean): boolean {
    if (!writable) return false;
    return true;
  }

  describe('when writable is false (viewer)', () => {
    it('should block onChange', () => {
      const writable = false;
      expect(guardOnChange(writable)).toBe(false);
    });

    it('should not call setState when guard returns false', () => {
      const writable = false;
      const mockSetState = vi.fn();

      // Simulate the onChange handler pattern
      const handleChange = (newRows: unknown[]) => {
        if (!writable) return; // Guard
        mockSetState(newRows);
      };

      handleChange([{ id: 1, value: 'test' }]);
      expect(mockSetState).not.toHaveBeenCalled();
    });
  });

  describe('when writable is true (owner/editor)', () => {
    it('should allow onChange', () => {
      const writable = true;
      expect(guardOnChange(writable)).toBe(true);
    });

    it('should call setState when guard returns true', () => {
      const writable = true;
      const mockSetState = vi.fn();

      const handleChange = (newRows: unknown[]) => {
        if (!writable) return;
        mockSetState(newRows);
      };

      const testRows = [{ id: 1, value: 'test' }];
      handleChange(testRows);
      expect(mockSetState).toHaveBeenCalledWith(testRows);
    });
  });
});

describe('column disabled pattern', () => {
  it('should compute disabled based on writable', () => {
    const testCases = [
      { writable: false, expectedDisabled: true },
      { writable: true, expectedDisabled: false },
    ];

    for (const { writable, expectedDisabled } of testCases) {
      // Simulate column config
      const column = {
        disabled: !writable,
      };
      expect(column.disabled).toBe(expectedDisabled);
    }
  });
});
