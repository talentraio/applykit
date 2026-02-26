/**
 * Unit tests for ApiError class and isApiError type guard.
 *
 * Feature: 016-errors-handling
 */

import { describe, expect, it } from 'vitest';
import { ApiError, isApiError } from '../../../../app/utils/api-errors/api-error';

describe('apiError', () => {
  const mockResponse = {
    status: 422,
    statusText: 'Unprocessable Entity',
    url: '/api/vacancies',
    _data: { issues: [{ path: ['title'], message: 'Required' }] }
  };

  describe('construction', () => {
    it('should create an ApiError from a response-like object', () => {
      const error = new ApiError(mockResponse);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.name).toBe('ApiError');
    });

    it('should set the message from status code and text', () => {
      const error = new ApiError(mockResponse);

      expect(error.message).toBe('API error 422: Unprocessable Entity');
    });

    it('should handle response without _data', () => {
      const response = {
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/test'
      };

      const error = new ApiError(response);

      expect(error.data).toBeUndefined();
    });
  });

  describe('property access', () => {
    it('should expose status', () => {
      const error = new ApiError(mockResponse);

      expect(error.status).toBe(422);
    });

    it('should expose statusText', () => {
      const error = new ApiError(mockResponse);

      expect(error.statusText).toBe('Unprocessable Entity');
    });

    it('should expose url', () => {
      const error = new ApiError(mockResponse);

      expect(error.url).toBe('/api/vacancies');
    });

    it('should expose data from _data', () => {
      const error = new ApiError(mockResponse);

      expect(error.data).toEqual({
        issues: [{ path: ['title'], message: 'Required' }]
      });
    });
  });

  describe('formErrors', () => {
    it('should initialize with empty formErrors array', () => {
      const error = new ApiError(mockResponse);

      expect(error.formErrors).toEqual([]);
    });

    it('should allow setting formErrors', () => {
      const error = new ApiError(mockResponse);

      error.formErrors = [
        { name: 'title', message: 'Required' },
        { name: 'email', message: 'Invalid' }
      ];

      expect(error.formErrors).toEqual([
        { name: 'title', message: 'Required' },
        { name: 'email', message: 'Invalid' }
      ]);
    });
  });

  describe('various status codes', () => {
    it('should handle 401 Unauthorized', () => {
      const error = new ApiError({
        status: 401,
        statusText: 'Unauthorized',
        url: '/api/me'
      });

      expect(error.status).toBe(401);
      expect(error.message).toBe('API error 401: Unauthorized');
    });

    it('should handle 403 Forbidden', () => {
      const error = new ApiError({
        status: 403,
        statusText: 'Forbidden',
        url: '/api/admin',
        _data: { code: 'ACCESS_DENIED' }
      });

      expect(error.status).toBe(403);
      expect(error.data).toEqual({ code: 'ACCESS_DENIED' });
    });

    it('should handle 500 Internal Server Error', () => {
      const error = new ApiError({
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/crash',
        _data: { message: 'Something went wrong' }
      });

      expect(error.status).toBe(500);
      expect(error.message).toBe('API error 500: Internal Server Error');
    });
  });
});

describe('isApiError', () => {
  describe('true cases', () => {
    it('should return true for ApiError instances', () => {
      const error = new ApiError({
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/test'
      });

      expect(isApiError(error)).toBe(true);
    });

    it('should return true for ApiError with various status codes', () => {
      const codes = [
        { status: 401, statusText: 'Unauthorized' },
        { status: 403, statusText: 'Forbidden' },
        { status: 422, statusText: 'Unprocessable Entity' },
        { status: 429, statusText: 'Too Many Requests' },
        { status: 500, statusText: 'Internal Server Error' }
      ];

      for (const { status, statusText } of codes) {
        const error = new ApiError({ status, statusText, url: '/api/test' });
        expect(isApiError(error)).toBe(true);
      }
    });
  });

  describe('false cases', () => {
    it('should return false for plain Error', () => {
      expect(isApiError(new Error('some error'))).toBe(false);
    });

    it('should return false for plain objects', () => {
      expect(isApiError({ status: 500, message: 'error' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isApiError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isApiError(undefined)).toBe(false);
    });

    it('should return false for strings', () => {
      expect(isApiError('error')).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(isApiError(42)).toBe(false);
    });

    it('should return false for objects with wrong brand value', () => {
      const fake = { [Symbol.for('ApiError')]: false };

      expect(isApiError(fake)).toBe(false);
    });

    it('should return false for objects with brand set to non-boolean', () => {
      const fake = { [Symbol.for('ApiError')]: 'true' };

      expect(isApiError(fake)).toBe(false);
    });
  });

  describe('cross-module safety', () => {
    it('should detect brand via Symbol.for (global registry)', () => {
      // Simulate a cross-module scenario: object with correct brand symbol
      const simulatedCrossModule = Object.create(Error.prototype);
      Object.defineProperty(simulatedCrossModule, Symbol.for('ApiError'), {
        value: true,
        writable: false,
        enumerable: false
      });

      expect(isApiError(simulatedCrossModule)).toBe(true);
    });
  });
});
