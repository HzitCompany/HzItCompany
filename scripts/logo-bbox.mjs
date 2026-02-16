import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/logo-bbox.mjs <path-to-png>");
  process.exit(2);
}

const fullPath = path.resolve(process.cwd(), input);
const data = fs.readFileSync(fullPath);

const sig0 = data[0];
const sig1 = data[1];
const sig2 = data[2];

/** @type {{ width: number; height: number; data: Uint8Array }} */
let img;

// JPEG: FF D8 FF
if (sig0 === 0xff && sig1 === 0xd8 && sig2 === 0xff) {
  img = jpeg.decode(data, { useTArray: true });
} else {
  img = PNG.sync.read(data);
}

const { width, height } = img;

function isBackground(r, g, b, a) {
  if (a === 0) return true;
  // Treat pixels near the corner matte color as background (tolerant to JPEG artifacts).
  const bg = 253;
  const d = Math.max(Math.abs(r - bg), Math.abs(g - bg), Math.abs(b - bg));
  return d <= 14;
}

let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) << 2;
    const r = img.data[idx];
    const g = img.data[idx + 1];
    const b = img.data[idx + 2];
    const a = img.data[idx + 3];

    if (!isBackground(r, g, b, a)) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
}

if (maxX < 0 || maxY < 0) {
  console.log(JSON.stringify({ width, height, bbox: null }, null, 2));
  process.exit(0);
}

// Expand slightly to keep glow edges.
const pad = Math.round(Math.min(width, height) * 0.01);
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(width - 1, maxX + pad);
maxY = Math.min(height - 1, maxY + pad);

const bbox = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
console.log(JSON.stringify({ width, height, bbox }, null, 2));
