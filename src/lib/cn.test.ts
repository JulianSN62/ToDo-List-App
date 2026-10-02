import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('conserva tamaño y color de texto del diseño juntos', () => {
    const result = cn('text-body text-fg', 'text-danger');
    expect(result).toContain('text-body');
    expect(result).toContain('text-danger');
    expect(result).not.toContain('text-fg');
  });

  it('resuelve conflictos entre tamaños', () => {
    expect(cn('text-body', 'text-caption')).toBe('text-caption');
  });
});
