/**
 * Build transparent EyeQ brand assets from the official circular badge.
 * Uses edge flood-fill (not aggressive chroma kill) so navy/teal ink stays sharp.
 *
 * Usage: node scripts/process-eyeq-logo.mjs
 */
import sharp from 'sharp';
import { copyFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKUP = path.join(root, 'public/brand/eyeq-logo-original.png');
const SRC_CANDIDATES = [
  BACKUP,
  path.join(root, 'public/brand/eyeq-logo.png'),
];
const FULL_OUT = path.join(root, 'public/brand/eyeq-logo.png');
const MARK_OUT = path.join(root, 'public/brand/eyeq-mark.png');
const ICON_ONLY_OUT = path.join(root, 'public/brand/eyeq-icon.png');
const ICON_OUT = path.join(root, 'src/app/icon.png');
const APPLE_OUT = path.join(root, 'src/app/apple-icon.png');

const inputPath = SRC_CANDIDATES.find((p) => existsSync(p));
if (!inputPath) {
  console.error('No source logo found under public/brand/');
  process.exit(1);
}
if (!existsSync(BACKUP) && inputPath !== BACKUP) {
  copyFileSync(inputPath, BACKUP);
}

const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;
const rgba = Buffer.from(data);

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isBackground(r, g, b, a) {
  if (a < 8) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const L = lum(r, g, b);
  // Exterior white
  if (r >= 248 && g >= 248 && b >= 248) return true;
  // Cream plate / soft shadow (low chroma, bright)
  if (chroma <= 22 && L >= 210) return true;
  if (r >= 236 && g >= 230 && b >= 218 && chroma <= 30 && L >= 225) return true;
  // Soft gray drop shadow
  if (chroma <= 14 && L >= 175 && L <= 235) return true;
  return false;
}

// Flood-fill from image edges so we only remove exterior plate, not interior highlights.
const visit = new Uint8Array(w * h);
const queue = [];
const push = (x, y) => {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const i = y * w + x;
  if (visit[i]) return;
  const o = i * 4;
  if (!isBackground(rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3])) return;
  visit[i] = 1;
  queue.push(i);
};

for (let x = 0; x < w; x++) {
  push(x, 0);
  push(x, h - 1);
}
for (let y = 0; y < h; y++) {
  push(0, y);
  push(w - 1, y);
}

while (queue.length) {
  const i = queue.pop();
  const x = i % w;
  const y = (i / w) | 0;
  rgba[i * 4 + 3] = 0;
  push(x + 1, y);
  push(x - 1, y);
  push(x, y + 1);
  push(x, y - 1);
}

function contentBounds(buf, width, height, alphaMin = 20) {
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
  if (maxX < minX) return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1 };
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

const fullBox = contentBounds(rgba, w, h);
const full = cropRgba(rgba, w, h, fullBox, 16);

await sharp(full.data, { raw: { width: full.width, height: full.height, channels: 4 } })
  .png()
  .toFile(FULL_OUT);

// Row density to find the divider ABOVE taglines (lower portion), not the
// gap between the eye icon and the EYE Q wordmark.
const rowDensity = [];
for (let y = 0; y < full.height; y++) {
  let opaque = 0;
  for (let x = 0; x < full.width; x++) {
    if (full.data[(y * full.width + x) * 4 + 3] > 40) opaque++;
  }
  rowDensity.push(opaque);
}

const densMax = Math.max(...rowDensity, 1);
// Tagline block lives in the bottom ~35%. Find a quiet horizontal rule there.
let dividerY = Math.floor(full.height * 0.78);
for (let y = Math.floor(full.height * 0.68); y < Math.floor(full.height * 0.9); y++) {
  const d = rowDensity[y] / densMax;
  const next = rowDensity[Math.min(full.height - 1, y + 2)] / densMax;
  // Thin rule: very sparse row, then denser tagline rows below
  if (d < 0.08 && next > 0.12) {
    dividerY = y;
    break;
  }
}

// Nav mark = icon + EYE Q (exclude taglines below divider)
const markCrop = cropRgba(
  full.data,
  full.width,
  full.height,
  { minX: 0, minY: 0, maxX: full.width - 1, maxY: Math.max(80, dividerY - 2) },
  0,
);
const markTrim = cropRgba(
  markCrop.data,
  markCrop.width,
  markCrop.height,
  contentBounds(markCrop.data, markCrop.width, markCrop.height),
  8,
);

// Export at high resolution so nav downscale stays crisp (no stretch mush)
await sharp(markTrim.data, {
  raw: { width: markTrim.width, height: markTrim.height, channels: 4 },
})
  .resize({
    width: Math.round(markTrim.width * 2),
    height: Math.round(markTrim.height * 2),
    kernel: sharp.kernel.lanczos3,
  })
  .png()
  .toFile(MARK_OUT);

// Icon-only: top portion until wordmark band (approx upper 55% of mark)
const iconCut = Math.floor(markTrim.height * 0.58);
const iconSlice = cropRgba(
  markTrim.data,
  markTrim.width,
  markTrim.height,
  { minX: 0, minY: 0, maxX: markTrim.width - 1, maxY: iconCut },
  0,
);
const iconTrim = cropRgba(iconSlice.data, iconSlice.width, iconSlice.height, contentBounds(iconSlice.data, iconSlice.width, iconSlice.height), 6);

await sharp(iconTrim.data, {
  raw: { width: iconTrim.width, height: iconTrim.height, channels: 4 },
})
  .png()
  .toFile(ICON_ONLY_OUT);

const side = Math.max(iconTrim.width, iconTrim.height);
const square = Buffer.alloc(side * side * 4);
const ox = Math.floor((side - iconTrim.width) / 2);
const oy = Math.floor((side - iconTrim.height) / 2);
for (let y = 0; y < iconTrim.height; y++) {
  for (let x = 0; x < iconTrim.width; x++) {
    const si = (y * iconTrim.width + x) * 4;
    const di = ((y + oy) * side + (x + ox)) * 4;
    square[di] = iconTrim.data[si];
    square[di + 1] = iconTrim.data[si + 1];
    square[di + 2] = iconTrim.data[si + 2];
    square[di + 3] = iconTrim.data[si + 3];
  }
}

await sharp(square, { raw: { width: side, height: side, channels: 4 } })
  .resize(512, 512)
  .png()
  .toFile(ICON_OUT);

await sharp(square, { raw: { width: side, height: side, channels: 4 } })
  .resize(180, 180)
  .png()
  .toFile(APPLE_OUT);

const fullMeta = await sharp(FULL_OUT).metadata();
const markMeta = await sharp(MARK_OUT).metadata();
const iconMeta = await sharp(ICON_ONLY_OUT).metadata();
console.log('source', inputPath);
console.log('full', fullMeta.width, 'x', fullMeta.height);
console.log('mark', markMeta.width, 'x', markMeta.height);
console.log('icon', iconMeta.width, 'x', iconMeta.height);
