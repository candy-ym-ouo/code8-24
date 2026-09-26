import { describe, expect, it } from 'vitest';
import {
  isRestoreWindowOpen,
  isStrictlyEditable,
  normalizeMoodTags,
  reconcilePageCountWithTracePage,
  validateExistingPageRange,
  validateExistingSinglePage,
  validatePageRange,
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

  it('normalizes mood tags and rejects empty or duplicate overrun', () => {
    expect(normalizeMoodTags(['MOVED', 'MOVED', 'CALM'])).toEqual(['MOVED', 'CALM']);
    expect(() => normalizeMoodTags([])).toThrow(AppError);
  });

  it('allows unchanged legacy out-of-bounds pages while rejecting new out-of-bounds pages', () => {
    expect(() => validateExistingSinglePage(120, 120, 100)).not.toThrow();
    expect(() => validateExistingSinglePage(100, 120, 100)).not.toThrow();
    expect(() => validateExistingSinglePage(101, 120, 100)).toThrow(AppError);
    expect(() => validateExistingPageRange(110, 120, 110, 120, 100)).not.toThrow();
    expect(() => validateExistingPageRange(90, 100, 110, 120, 100)).not.toThrow();
    expect(() => validateExistingPageRange(90, 120, 110, 120, 100)).toThrow(AppError);
  });

  it('reconciles a declared page count deterministically while leaving unknown page counts alone', () => {
    expect(reconcilePageCountWithTracePage(100, 120)).toBe(120);
    expect(reconcilePageCountWithTracePage(120, 100)).toBe(120);
    expect(reconcilePageCountWithTracePage(null, 120)).toBeNull();
    expect(reconcilePageCountWithTracePage(100, 0)).toBe(100);
  });

  it('enforces restore and edit windows', () => {
    const now = new Date('2026-09-24T12:00:00.000Z');
    expect(isRestoreWindowOpen(new Date('2026-09-24T00:00:00.000Z'), now)).toBe(true);
    expect(isRestoreWindowOpen(new Date('2026-09-22T00:00:00.000Z'), now)).toBe(false);
    expect(isStrictlyEditable(new Date('2026-09-25T00:00:00.000Z'), now)).toBe(true);
    expect(isStrictlyEditable(new Date('2026-09-23T00:00:00.000Z'), now)).toBe(false);
  });
});
