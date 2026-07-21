/**
 * Strip cream circular plate + soft drop shadow from the official EyeQ badge,
 * producing transparent PNGs that blend into marketing/app chrome.
 *
 * Usage: node scripts/process-eyeq-logo.mjs
 */
import sharp from 'sharp';
import { copyFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'public/brand/eyeq-logo.png');
const BACKUP = path.join(root, 'public/brand/eyeq-logo-original.png');
const FULL_OUT = path.join(root, 'public/brand/eyeq-logo.png');
const MARK_OUT = path.join(root, 'public/brand/eyeq-mark.png');
const ICON_ONLY_OUT = path.join(root, 'public/brand/eyeq-icon.png');
const ICON_OUT = path.join(root, 'src/app/icon.png');
const APPLE_OUT = path.join(root, 'src/app/apple-icon.png');

if (!existsSync(BACKUP)) {
  copyFileSync(SRC, BACKUP);
}

const inputPath = existsSync(BACKUP) ? BACKUP : SRC;
const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const out = Buffer.from(data);

function isPlateOrShadow(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Pure white outside the badge
  if (r >= 250 && g >= 250 && b >= 250) return { kill: true, soft: 0 };

  // Cream plate (~#faf8f4 / #fcf7f3)
  if (r >= 245 && g >= 240 && b >= 230 && chroma <= 24) return { kill: true, soft: 0 };

  // Warm soft plate still cream-like
  if (r >= 235 && g >= 228 && b >= 215 && chroma <= 28 && lum >= 230) return { kill: true, soft: 0 };

  // Soft drop shadow: low-chroma gray / warm gray (not navy/teal ink)
  if (chroma <= 18 && lum >= 170 && lum <= 245) {
    const tealish = b > 140 && g > 140 && Math.abs(g - b) < 25 && r < g;
    if (!tealish) return { kill: true, soft: 0 };
  }

  // Feather near-cream fringe so edges aren't harsh
  if (r >= 220 && g >= 210 && b >= 195 && chroma <= 35 && lum >= 210) {
    if (b >= g && lum < 215) return { kill: false, soft: 0 };
    const t = Math.min(1, (lum - 210) / 35);
    return { kill: false, soft: 0.35 + t * 0.65 };
  }

  return { kill: false, soft: 0 };
}

for (let i = 0; i < out.length; i += 4) {
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  const a = out[i + 3];
  if (a === 0) continue;
  const { kill, soft } = isPlateOrShadow(r, g, b);
  if (kill) {
    out[i + 3] = 0;
  } else if (soft > 0) {
    out[i + 3] = Math.round(a * (1 - soft));
  }
}

function contentBounds(buf, width, height, alphaMin = 16) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (buf[(y * width + x) * 4 + 3] > alphaMin) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

function cropRgba(buf, width, height, box, pad = 0) {
  let { minX, minY, maxX, maxY } = box;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const cropped = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((minY + y) * width + (minX + x)) * 4;
      const di = (y * cw + x) * 4;
      cropped[di] = buf[si];
      cropped[di + 1] = buf[si + 1];
      cropped[di + 2] = buf[si + 2];
      cropped[di + 3] = buf[si + 3];
    }
  }
  return { data: cropped, width: cw, height: ch };
}

const bounds = contentBounds(out, w, h);
console.log('content bounds', bounds);
const full = cropRgba(out, w, h, bounds, 24);

await sharp(full.data, { raw: { width: full.width, height: full.height, channels: 4 } })
  .png()
  .toFile(FULL_OUT);

// Compact horizontal lockup: eye icon | EYE Q wordmark (no taglines).
// Better for h-9–h-11 nav than a tall stacked badge.
const rowDensity = [];
for (let y = 0; y < full.height; y++) {
  let opaque = 0;
  for (let x = 0; x < full.width; x++) {
    if (full.data[(y * full.width + x) * 4 + 3] > 40) opaque++;
  }
  rowDensity.push(opaque);
}

const mid = Math.floor(full.height * 0.45);
let wordmarkPeak = mid;
for (let y = mid; y < full.height * 0.75; y++) {
  if (rowDensity[y] > rowDensity[wordmarkPeak]) wordmarkPeak = y;
}

// Wordmark band sits just under the icon — search upward only a short window
// so iris/pupil quiet zones are not mistaken for the icon/wordmark gap.
let wmStart = wordmarkPeak;
for (let y = wordmarkPeak; y > Math.max(0, wordmarkPeak - 90); y--) {
  if (rowDensity[y] < 60 && rowDensity[Math.max(0, y - 1)] < 80) {
    wmStart = y + 1;
    break;
  }
}
let wmEnd = wordmarkPeak;
for (let y = wordmarkPeak; y < Math.min(full.height - 1, wordmarkPeak + 100); y++) {
  if (rowDensity[y] > 90) wmEnd = y;
  if (y > wordmarkPeak + 15 && rowDensity[y] < 25 && rowDensity[y + 1] < 25) {
    break;
  }
}
// Include glyph descenders / Q bottom if a second dense blip follows a tiny gap
for (let y = wmEnd + 1; y < Math.min(full.height - 1, wmEnd + 45); y++) {
  if (rowDensity[y] > 150) wmEnd = y;
  if (rowDensity[y] < 20 && y > wmEnd + 8) break;
}
wmEnd = Math.min(full.height - 1, wmEnd + 4);
wmStart = Math.max(0, wmStart - 2);

// Ensure we captured full glyph height (EYE Q often has a counter-gap mid-letter)
let lateDense = wmEnd;
for (let y = wmStart; y < Math.min(full.height - 1, wordmarkPeak + 90); y++) {
  if (rowDensity[y] > 150) lateDense = y;
}
// Don't swallow the divider/tagline block (usually a quieter then thinner band)
if (lateDense > wmEnd && lateDense - wmEnd < 55) {
  wmEnd = lateDense + 4;
}

// Icon: everything above wordmark start (Q-tail may slightly overlap — clip above wm)
const iconEnd = Math.max(24, wmStart - 4);
const iconBox = contentBounds(full.data, full.width, iconEnd);
const iconCrop = cropRgba(full.data, full.width, iconEnd, iconBox, 8);

const wmHeight = wmEnd - wmStart + 1;
const wmSlice = Buffer.alloc(full.width * wmHeight * 4);
for (let y = 0; y < wmHeight; y++) {
  full.data.copy(
    wmSlice,
    y * full.width * 4,
    (wmStart + y) * full.width * 4,
    (wmStart + y + 1) * full.width * 4,
  );
}
const wmBox = contentBounds(wmSlice, full.width, wmHeight);
const wmCrop = cropRgba(wmSlice, full.width, wmHeight, wmBox, 6);

console.log('icon', iconCrop.width, iconCrop.height, 'wordmark', wmCrop.width, wmCrop.height, {
  wmStart,
  wmEnd,
  wordmarkPeak,
});

// Scale wordmark to ~42% of icon height, then compose horizontally
const targetWmH = Math.max(24, Math.round(iconCrop.height * 0.42));
const wmScale = targetWmH / wmCrop.height;
const targetWmW = Math.round(wmCrop.width * wmScale);
const wmResized = await sharp(wmCrop.data, {
  raw: { width: wmCrop.width, height: wmCrop.height, channels: 4 },
})
  .resize(targetWmW, targetWmH)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const gap = Math.round(iconCrop.height * 0.08);
const markH = iconCrop.height;
const markW = iconCrop.width + gap + wmResized.info.width;
const composed = Buffer.alloc(markW * markH * 4);
// place icon at left
for (let y = 0; y < iconCrop.height; y++) {
  for (let x = 0; x < iconCrop.width; x++) {
    const si = (y * iconCrop.width + x) * 4;
    const di = (y * markW + x) * 4;
    composed[di] = iconCrop.data[si];
    composed[di + 1] = iconCrop.data[si + 1];
    composed[di + 2] = iconCrop.data[si + 2];
    composed[di + 3] = iconCrop.data[si + 3];
  }
}
// place wordmark vertically centered to the right
const wmOx = iconCrop.width + gap;
const wmOy = Math.floor((markH - wmResized.info.height) / 2);
for (let y = 0; y < wmResized.info.height; y++) {
  for (let x = 0; x < wmResized.info.width; x++) {
    const si = (y * wmResized.info.width + x) * 4;
    const di = ((y + wmOy) * markW + (x + wmOx)) * 4;
    const a = wmResized.data[si + 3];
    if (a === 0) continue;
    // alpha over
    const ia = a / 255;
    composed[di] = Math.round(wmResized.data[si] * ia + composed[di] * (1 - ia));
    composed[di + 1] = Math.round(wmResized.data[si + 1] * ia + composed[di + 1] * (1 - ia));
    composed[di + 2] = Math.round(wmResized.data[si + 2] * ia + composed[di + 2] * (1 - ia));
    composed[di + 3] = Math.min(255, composed[di + 3] + a);
  }
}

const markTrimBox = contentBounds(composed, markW, markH);
const mark = cropRgba(composed, markW, markH, markTrimBox, 12);

await sharp(mark.data, { raw: { width: mark.width, height: mark.height, channels: 4 } })
  .png()
  .toFile(MARK_OUT);

// Icon-only (eye) for collapsed chrome
await sharp(iconCrop.data, {
  raw: { width: iconCrop.width, height: iconCrop.height, channels: 4 },
})
  .png()
  .toFile(ICON_ONLY_OUT);

// Square favicons from the eye mark
const side = Math.max(iconCrop.width, iconCrop.height);
const icon = Buffer.alloc(side * side * 4);
const ox = Math.floor((side - iconCrop.width) / 2);
const oy = Math.floor((side - iconCrop.height) / 2);
for (let y = 0; y < iconCrop.height; y++) {
  for (let x = 0; x < iconCrop.width; x++) {
    const si = (y * iconCrop.width + x) * 4;
    const di = ((y + oy) * side + (x + ox)) * 4;
    icon[di] = iconCrop.data[si];
    icon[di + 1] = iconCrop.data[si + 1];
    icon[di + 2] = iconCrop.data[si + 2];
    icon[di + 3] = iconCrop.data[si + 3];
  }
}

await sharp(icon, { raw: { width: side, height: side, channels: 4 } })
  .resize(512, 512)
  .png()
  .toFile(ICON_OUT);

await sharp(icon, { raw: { width: side, height: side, channels: 4 } })
  .resize(180, 180)
  .png()
  .toFile(APPLE_OUT);

const fullMeta = await sharp(FULL_OUT).metadata();
const markMeta = await sharp(MARK_OUT).metadata();
const iconMeta = await sharp(ICON_ONLY_OUT).metadata();
console.log('wrote full', fullMeta.width, 'x', fullMeta.height);
console.log('wrote mark', markMeta.width, 'x', markMeta.height);
console.log('wrote icon', iconMeta.width, 'x', iconMeta.height);
