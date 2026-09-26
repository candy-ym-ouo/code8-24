import { describe, expect, it } from 'vitest';
import {
  assertPagesRestorable,
  isRestoreWindowOpen,
  isStrictlyEditable,
  normalizeMoodTags,
  pagesWithinPageCount,
  validatePageRange,
  validateSinglePage,
  validateStatusTransition
} from './domain.js';
import { AppError } from './errors.js';

describe('domain rules', () => {
  it('allows declared status transitions', () => {
    expect(() => validateStatusTransition('READING', 'READ')).not.toThrow();
    expect(() => validateStatusTransition('READ', 'READING')).not.toThrow();
  });

  it('rejects illegal status transitions', () => {
    expect(() => validateStatusTransition('TO_READ', 'READ')).toThrow(AppError);
    expect(() => validateStatusTransition('ABANDONED', 'READING')).toThrow(AppError);
  });

  it('validates page ranges and page count', () => {
    expect(() => validatePageRange(42, 44, 300)).not.toThrow();
    expect(() => validatePageRange(44, 42, 300)).toThrow(AppError);
    expect(() => validatePageRange(42, 301, 300)).toThrow(AppError);
  });

  it('validates single pages against page count', () => {
    expect(() => validateSinglePage(300, 300)).not.toThrow();
    expect(() => validateSinglePage(300, null)).not.toThrow();
    expect(() => validateSinglePage(301, 300)).toThrow(AppError);
    expect(() => validateSinglePage(0, 300)).toThrow(AppError);
  });

  it('checks pages against page count as a pure function', () => {
    expect(pagesWithinPageCount([300], null)).toBe(true);
    expect(pagesWithinPageCount([], 100)).toBe(true);
    expect(pagesWithinPageCount([100, 300], 300)).toBe(true);
    expect(pagesWithinPageCount([301], 300)).toBe(false);
    expect(pagesWithinPageCount([10, 20, 301], 300)).toBe(false);
  });

  it('rejects restoring traces beyond the current page count', () => {
    expect(() => assertPagesRestorable([300], 300)).not.toThrow();
    expect(() => assertPagesRestorable([300], null)).not.toThrow();
    expect(() => assertPagesRestorable([10, 100], 100)).not.toThrow();
    expect(() => assertPagesRestorable([300], 100)).toThrow(AppError);
    expect(() => assertPagesRestorable([10, 500], 300)).toThrow(AppError);
    try {
      assertPagesRestorable([500], 100);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(409);
      expect((error as AppError).code).toBe('PAGE_OUT_OF_RANGE');
      expect((error as AppError).message).toContain('500');
      expect((error as AppError).message).toContain('100');
    }
  });

  it('normalizes mood tags and rejects empty or duplicate overrun', () => {
    expect(normalizeMoodTags(['MOVED', 'MOVED', 'CALM'])).toEqual(['MOVED', 'CALM']);
    expect(() => normalizeMoodTags([])).toThrow(AppError);
  });

  it('enforces restore and edit windows', () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    expect(isRestoreWindowOpen(new Date('2026-09-24T00:00:00.000Z'), now)).toBe(true);
    expect(isRestoreWindowOpen(new Date('2026-09-22T00:00:00.000Z'), now)).toBe(false);
    expect(isStrictlyEditable(new Date('2026-09-25T00:00:00.000Z'), now)).toBe(true);
    expect(isStrictlyEditable(new Date('2026-09-23T00:00:00.000Z'), now)).toBe(false);
  });
});
