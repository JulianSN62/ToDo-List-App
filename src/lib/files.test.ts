import { describe, expect, it } from 'vitest';
import {
  buildStoragePath,
  compressionPlan,
  displayFileName,
  extensionForType,
  FALLBACK_MIME_TYPE,
  fileKind,
  fitWithin,
  formatFileSize,
  isWithinSizeLimit,
  keepCompressed,
  MAX_FILE_BYTES,
  normalizeMimeType,
  renameExtension,
  sanitizeFileName,
  splitExtension,
} from './files';
import { LIMITS } from './validation';

const OWNER = '11111111-1111-4111-8111-111111111111';
const TASK = '22222222-2222-4222-8222-222222222222';
const ATTACHMENT = '33333333-3333-4333-8333-333333333333';

describe('archivos adjuntos', () => {
  it('el límite es de 10 MB, incluido', () => {
    expect(MAX_FILE_BYTES).toBe(10_485_760);
    expect(isWithinSizeLimit(MAX_FILE_BYTES)).toBe(true);
    expect(isWithinSizeLimit(MAX_FILE_BYTES + 1)).toBe(false);
    expect(isWithinSizeLimit(0)).toBe(true);
  });

  it('normaliza el tipo MIME', () => {
    expect(normalizeMimeType('Image/JPEG')).toBe('image/jpeg');
    expect(normalizeMimeType('text/plain; charset=utf-8')).toBe('text/plain');
    expect(normalizeMimeType('')).toBe(FALLBACK_MIME_TYPE);
    expect(normalizeMimeType(undefined)).toBe(FALLBACK_MIME_TYPE);
    expect(normalizeMimeType('no es un tipo')).toBe(FALLBACK_MIME_TYPE);
    expect(normalizeMimeType(`a/${'b'.repeat(LIMITS.mimeType)}`)).toBe(FALLBACK_MIME_TYPE);
  });

  it('distingue imágenes que se pueden mostrar, PDF y el resto', () => {
    expect(fileKind('image/jpeg')).toBe('image');
    expect(fileKind('image/svg+xml')).toBe('image');
    expect(fileKind('image/heic')).toBe('other');
    expect(fileKind('application/pdf')).toBe('pdf');
    expect(fileKind('', 'contrato.PDF')).toBe('pdf');
    expect(fileKind('text/html', 'pagina.pdf')).toBe('other');
    expect(fileKind('application/zip', 'fotos.zip')).toBe('other');
  });

  it('separa la extensión', () => {
    expect(splitExtension('foto.final.JPG')).toEqual({ base: 'foto.final', extension: 'JPG' });
    expect(splitExtension('.env')).toEqual({ base: '.env', extension: '' });
    expect(splitExtension('sin-extension')).toEqual({ base: 'sin-extension', extension: '' });
    expect(splitExtension('termina.')).toEqual({ base: 'termina.', extension: '' });
  });

  it('limpia el nombre que se muestra y lo recorta conservando la extensión', () => {
    expect(displayFileName('  Presupuesto   año 2026.pdf ')).toBe('Presupuesto año 2026.pdf');
    expect(displayFileName('carpeta/sub\\archivo.txt')).toBe('carpeta-sub-archivo.txt');
    expect(displayFileName('con\u0000control​.txt')).toBe('concontrol.txt');
    expect(displayFileName('   ')).toBe('archivo');
    const long = displayFileName(`${'a'.repeat(400)}.pdf`);
    expect(long).toHaveLength(LIMITS.fileName);
    expect(long.endsWith('.pdf')).toBe(true);
  });

  it('arma un nombre seguro para Storage', () => {
    expect(sanitizeFileName('Presupuesto año 2026.PDF')).toBe('Presupuesto-ano-2026.pdf');
    expect(sanitizeFileName('¿qué?.jpg')).toBe('que.jpg');
    expect(sanitizeFileName('../../secreto')).toBe('secreto');
    expect(sanitizeFileName('日本語.png')).toBe('archivo.png');
    expect(sanitizeFileName('')).toBe('archivo');
    const long = sanitizeFileName(`${'x'.repeat(300)}.jpeg`);
    expect(long.length).toBeLessThanOrEqual(100);
    expect(long.endsWith('.jpeg')).toBe(true);
    expect(sanitizeFileName('a b/c\\d.tar.gz')).toBe('a-b-c-d.tar.gz');
  });

  it('la ruta en Storage empieza con el dueño, la tarea y el id del adjunto', () => {
    const path = buildStoragePath(OWNER, TASK, ATTACHMENT, 'Foto del día.jpg');
    expect(path).toBe(`${OWNER}/${TASK}/${ATTACHMENT}-Foto-del-dia.jpg`);
    expect(path.split('/')).toHaveLength(3);
    expect(buildStoragePath(OWNER, TASK, ATTACHMENT, 'a/../../b').split('/')).toHaveLength(3);
  });

  it('cambia la extensión', () => {
    expect(renameExtension('foto.png', 'webp')).toBe('foto.webp');
    expect(renameExtension('foto', 'jpg')).toBe('foto.jpg');
  });

  it('solo comprime JPEG, PNG y WebP', () => {
    expect(compressionPlan('image/jpeg')).toEqual({
      outputType: 'image/jpeg',
      quality: 0.8,
      maxSide: 1600,
    });
    expect(compressionPlan('image/png')?.outputType).toBe('image/webp');
    expect(compressionPlan('image/webp')?.outputType).toBe('image/webp');
    expect(compressionPlan('image/gif')).toBeNull();
    expect(compressionPlan('image/svg+xml')).toBeNull();
    expect(compressionPlan('image/heic')).toBeNull();
    expect(compressionPlan('application/pdf')).toBeNull();
    expect(extensionForType('image/jpeg')).toBe('jpg');
    expect(extensionForType('image/webp')).toBe('webp');
    expect(extensionForType('application/pdf')).toBeNull();
  });

  it('achica sin deformar ni agrandar', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200, resized: true });
    expect(fitWithin(1000, 5000, 1600)).toEqual({ width: 320, height: 1600, resized: true });
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600, resized: false });
    expect(fitWithin(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600, resized: false });
    expect(fitWithin(10000, 1, 1600)).toEqual({ width: 1600, height: 1, resized: true });
  });

  it('usa la versión comprimida solo si es más liviana', () => {
    expect(keepCompressed(1000, 400)).toBe(true);
    expect(keepCompressed(1000, 1000)).toBe(false);
    expect(keepCompressed(1000, 1200)).toBe(false);
    expect(keepCompressed(1000, 0)).toBe(false);
  });

  it('muestra los tamaños en español', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(820)).toBe('820 B');
    expect(formatFileSize(12 * 1024)).toBe('12 KB');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1,5 MB');
    expect(formatFileSize(MAX_FILE_BYTES)).toBe('10 MB');
    expect(formatFileSize(10.2 * 1024 * 1024)).toBe('10,2 MB');
    expect(formatFileSize(14.25 * 1024 * 1024)).toBe('14,3 MB');
    expect(formatFileSize(150 * 1024 * 1024)).toBe('150 MB');
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });
});
