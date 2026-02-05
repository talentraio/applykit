import type { Vacancy } from '../schemas/vacancy';
import { describe, expect, it } from 'vitest';
import { getVacancyTitle } from '../schemas/vacancy';

describe('getVacancyTitle', () => {
  it('should return "Company (Position)" when jobPosition is provided', () => {
    const vacancy: Vacancy = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      company: 'Acme Corp',
      jobPosition: 'Senior Developer',
      description: 'Job description',
      status: 'created',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(getVacancyTitle(vacancy)).toBe('Acme Corp (Senior Developer)');
  });

  it('should return just "Company" when jobPosition is not provided', () => {
    const vacancy: Vacancy = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      company: 'Acme Corp',
      jobPosition: undefined,
      description: 'Job description',
      status: 'created',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(getVacancyTitle(vacancy)).toBe('Acme Corp');
  });

  it('should return just "Company" when jobPosition is null', () => {
    const vacancy: Vacancy = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      company: 'Acme Corp',
      jobPosition: null,
      description: 'Job description',
      status: 'created',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(getVacancyTitle(vacancy)).toBe('Acme Corp');
  });

  it('should handle company names with special characters', () => {
    const vacancy: Vacancy = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      company: 'Smith & Co.',
      jobPosition: 'UI/UX Designer',
      description: 'Job description',
      status: 'created',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    expect(getVacancyTitle(vacancy)).toBe('Smith & Co. (UI/UX Designer)');
  });
});
