// Genera los íconos de la PWA y de Android a partir de los SVG de assets/.
// Uso: npm run icons  (volver a correrlo si cambia el ícono definitivo, Fase 10).

import { existsSync, readdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const assets = join(root, 'assets');
const publicDir = join(root, 'public');
const androidRes = join(root, 'android', 'app', 'src', 'main', 'res');

const ACCENT = '#4F46E5';
const SPLASH_BACKGROUND = '#F8FAFC';

const icon = join(assets, 'icon.svg');
const maskable = join(assets, 'icon-maskable.svg');
const foreground = join(assets, 'icon-foreground.svg');

async function png(source, size, target) {
  await sharp(source, { density: 384 }).resize(size, size).png().toFile(target);
}

async function roundPng(source, size, target) {
  const circle = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`,
  );
  await sharp(source, { density: 384 })
    .resize(size, size)
    .composite([{ input: circle, blend: 'dest-in' }])
    .png()
    .toFile(target);
}

async function generatePwaIcons() {
  copyFileSync(icon, join(publicDir, 'favicon.svg'));
  await png(icon, 192, join(publicDir, 'pwa-192x192.png'));
  await png(icon, 512, join(publicDir, 'pwa-512x512.png'));
  await png(maskable, 512, join(publicDir, 'maskable-icon-512x512.png'));
  await png(maskable, 180, join(publicDir, 'apple-touch-icon-180x180.png'));
  console.log('Íconos de la PWA generados en public/');
}

// Densidades de Android: ícono clásico (48dp) y capa frontal del ícono adaptativo (108dp).
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function generateAndroidIcons() {
  if (!existsSync(androidRes)) {
    console.log(
      'No existe android/: se omiten los íconos de Android (correr "npx cap add android" primero).',
    );
    return;
  }
  for (const [density, scale] of Object.entries(DENSITIES)) {
    const dir = join(androidRes, `mipmap-${density}`);
    await png(maskable, Math.round(48 * scale), join(dir, 'ic_launcher.png'));
    await roundPng(maskable, Math.round(48 * scale), join(dir, 'ic_launcher_round.png'));
    await png(foreground, Math.round(108 * scale), join(dir, 'ic_launcher_foreground.png'));
  }
  writeFileSync(
    join(androidRes, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ACCENT}</color>\n</resources>\n`,
  );

  // Splash: fondo neutro con el ícono centrado, respetando el tamaño de cada imagen existente.
  for (const entry of readdirSync(androidRes, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('drawable')) continue;
    const target = join(androidRes, entry.name, 'splash.png');
    if (!existsSync(target)) continue;
    const { width = 480, height = 800 } = await sharp(target).metadata();
    const iconSize = Math.round(Math.min(width, height) * 0.25);
    const iconBuffer = await sharp(icon, { density: 384 })
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();
    const output = await sharp({
      create: { width, height, channels: 4, background: SPLASH_BACKGROUND },
    })
      .composite([{ input: iconBuffer, gravity: 'center' }])
      .png()
      .toBuffer();
    writeFileSync(target, output);
  }
  console.log('Íconos y splash de Android generados en android/app/src/main/res/');
}

await generatePwaIcons();
await generateAndroidIcons();
