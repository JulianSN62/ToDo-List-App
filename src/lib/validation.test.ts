import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  isValidOtp,
  LIMITS,
  normalizeDescription,
  normalizeFolderName,
  normalizeTagName,
  normalizeTitle,
} from './validation';

describe('validaciones', () => {
  it('recorta el título y exige que no esté vacío', () => {
    expect(normalizeTitle('  Comprar pan  ')).toBe('Comprar pan');
    expect(normalizeTitle('   ')).toBeNull();
    expect(normalizeTitle('x'.repeat(LIMITS.taskTitle + 1))).toBeNull();
  });

  it('valida el nombre de carpeta', () => {
    expect(normalizeFolderName(' Universidad ')).toBe('Universidad');
    expect(normalizeFolderName('')).toBeNull();
  });

  it('valida el nombre de etiqueta', () => {
    expect(normalizeTagName('  Urgente ')).toBe('Urgente');
    expect(normalizeTagName('  ')).toBeNull();
    expect(normalizeTagName('x'.repeat(LIMITS.tagName))).toHaveLength(LIMITS.tagName);
    expect(normalizeTagName('x'.repeat(LIMITS.tagName + 1))).toBeNull();
  });

  it('guarda descripciones vacías como null', () => {
    expect(normalizeDescription('   ')).toBeNull();
    expect(normalizeDescription('Hola  ')).toBe('Hola');
  });

  it('valida email y código OTP', () => {
    expect(isValidEmail('vos@email.com')).toBe(true);
    expect(isValidEmail('no-es-email')).toBe(false);
    expect(isValidOtp('12345678', 8)).toBe(true);
    expect(isValidOtp('123456', 8)).toBe(false);
    expect(isValidOtp('123456789', 8)).toBe(false);
    expect(isValidOtp('1234a678', 8)).toBe(false);
    expect(isValidOtp('123456', 6)).toBe(true);
  });
});
