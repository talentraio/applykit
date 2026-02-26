/**
 * Unit tests for parseValidationErrors.
 *
 * Feature: 016-errors-handling
 */

import { describe, expect, it } from 'vitest';
import { parseValidationErrors } from '../../../../app/utils/api-errors/validation';

describe('parseValidationErrors', () => {
  describe('flat paths', () => {
    it('should convert a single flat path issue to FormError', () => {
      const data = {
        issues: [{ path: ['email'], message: 'Invalid email address' }]
      };

      const result = parseValidationErrors(data);

      expect(result).toEqual([{ name: 'email', message: 'Invalid email address' }]);
    });

    it('should convert multiple flat path issues', () => {
      const data = {
        issues: [
          { path: ['email'], message: 'Invalid email' },
          { path: ['password'], message: 'Too short' }
        ]
      };

      const result = parseValidationErrors(data);

      expect(result).toEqual([
        { name: 'email', message: 'Invalid email' },
        { name: 'password', message: 'Too short' }
      ]);
    });
  });

  describe('nested paths', () => {
    it('should convert nested path to dot notation', () => {
      const data = {
        issues: [{ path: ['user', 'email'], message: 'Required' }]
      };

      const result = parseValidationErrors(data);

      expect(result).toEqual([{ name: 'user.email', message: 'Required' }]);
    });

    it('should handle deeply nested paths', () => {
      const data = {
        issues: [{ path: ['company', 'address', 'city'], message: 'Required' }]
      };

      const result = parseValidationErrors(data);

      expect(result).toEqual([{ name: 'company.address.city', message: 'Required' }]);
    });
  });

  describe('array paths', () => {
    it('should convert array indices to dot notation with numeric segments', () => {
      const data = {
        issues: [{ path: ['items', 0, 'name'], message: 'Required' }]
      };

      const result = parseValidationErrors(data);

      expect(result).toEqual([{ name: 'items.0.name', message: 'Required' }]);
    });

    it('should handle multiple array index levels', () => {
      const data = {
        issues: [{ path: ['sections', 2, 'entries', 1, 'title'], message: 'Too long' }]
      };

      const result = parseValidationErrors(data);

      expect(result).toEqual([{ name: 'sections.2.entries.1.title', message: 'Too long' }]);
    });
  });

  describe('empty/root-level issues', () => {
    it('should skip issues with empty path (root-level errors)', () => {
      const data = {
        issues: [{ path: [], message: 'Passwords do not match' }]
      };

      const result = parseValidationErrors(data);

      expect(result).toEqual([]);
    });

    it('should skip root-level issues but keep field-level ones', () => {
      const data = {
        issues: [
          { path: [], message: 'Form is invalid' },
          { path: ['email'], message: 'Invalid email' }
        ]
      };

      const result = parseValidationErrors(data);

      expect(result).toEqual([{ name: 'email', message: 'Invalid email' }]);
    });
  });

  describe('empty/missing issues', () => {
    it('should return empty array when issues array is empty', () => {
      const data = { issues: [] };

      const result = parseValidationErrors(data);

      expect(result).toEqual([]);
    });

    it('should return empty array when issues field is missing', () => {
      const data = { message: 'Some error' };

      const result = parseValidationErrors(data);

      expect(result).toEqual([]);
    });

    it('should return empty array when issues is not an array', () => {
      const data = { issues: 'not an array' };

      const result = parseValidationErrors(data);

      expect(result).toEqual([]);
    });
  });

  describe('malformed data (graceful handling, never throws)', () => {
    it('should return empty array for null input', () => {
      expect(parseValidationErrors(null)).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      expect(parseValidationErrors(undefined)).toEqual([]);
    });

    it('should return empty array for string input', () => {
      expect(parseValidationErrors('error')).toEqual([]);
    });

    it('should return empty array for number input', () => {
      expect(parseValidationErrors(42)).toEqual([]);
    });

    it('should return empty array for boolean input', () => {
      expect(parseValidationErrors(true)).toEqual([]);
    });

    it('should skip malformed issues within the array', () => {
      const data = {
        issues: [
          { path: ['email'], message: 'Valid issue' },
          { message: 'Missing path' },
          { path: 'not-array', message: 'Bad path type' },
          { path: ['name'] },
          42,
          null,
          { path: ['age'], message: 'Too young' }
        ]
      };

      const result = parseValidationErrors(data);

      expect(result).toEqual([
        { name: 'email', message: 'Valid issue' },
        { name: 'age', message: 'Too young' }
      ]);
    });

    it('should return empty array for empty object', () => {
      expect(parseValidationErrors({})).toEqual([]);
    });
  });
});
