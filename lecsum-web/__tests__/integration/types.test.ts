import { describe, it, expect } from 'vitest';
import { cleanName, timeAgo, courseGradient, COURSE_COLORS } from '@/app/dashboard/components/types';

describe('types utilities', () => {
  describe('cleanName', () => {
    it('removes timestamp prefix from filename', () => {
      expect(cleanName('user123-1234567890-lecture.pdf')).toBe('lecture.pdf');
    });

    it('removes extension', () => {
      expect(cleanName('my_file.mp3')).toBe('my_file');
    });

    it('handles files without extension', () => {
      expect(cleanName('lecture')).toBe('lecture');
    });

    it('preserves hyphens in filename', () => {
      expect(cleanName('user-123-my-lecture-file.pdf')).toBe('my-lecture-file.pdf');
    });
  });

  describe('timeAgo', () => {
    it('returns "Just now" for recent timestamps', () => {
      const now = new Date().toISOString();
      expect(timeAgo(now)).toBe('Just now');
    });

    it('returns minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(timeAgo(fiveMinutesAgo)).toBe('5m ago');
    });

    it('returns hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      expect(timeAgo(twoHoursAgo)).toBe('2h ago');
    });

    it('returns days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      expect(timeAgo(threeDaysAgo)).toBe('3d ago');
    });

    it('returns empty string for undefined', () => {
      expect(timeAgo()).toBe('');
    });
  });

  describe('courseGradient', () => {
    it('returns gradient for valid color', () => {
      const gradient = courseGradient('#4ade80');
      expect(gradient).toContain('linear-gradient');
      expect(gradient).toContain('#073d1c');
    });

    it('returns default gradient for unknown color', () => {
      const gradient = courseGradient('#unknowncolor');
      expect(gradient).toContain('linear-gradient');
      expect(gradient).toContain('#111');
    });

    it('maps all course colors', () => {
      COURSE_COLORS.forEach(color => {
        const gradient = courseGradient(color);
        expect(gradient).toBeTruthy();
        expect(gradient).toContain('linear-gradient');
      });
    });
  });

  describe('COURSE_COLORS', () => {
    it('contains exactly 8 colors', () => {
      expect(COURSE_COLORS).toHaveLength(8);
    });

    it('all colors are valid hex codes', () => {
      COURSE_COLORS.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});
