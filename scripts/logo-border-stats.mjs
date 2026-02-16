import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/logo-border-stats.mjs <path-to-image>");
  process.exit(2);
}

const fullPath = path.resolve(process.cwd(), input);
const data = fs.readFileSync(fullPath);
const sig0 = data[0];
const sig1 = data[1];
const sig2 = data[2];

let img;
if (sig0 === 0xff && sig1 === 0xd8 && sig2 === 0xff) {
  img = jpeg.decode(data, { useTArray: true });
} else {
  img = PNG.sync.read(data);
}

const { width, height } = img;

let min = 255;
let max = 0;
let minPixel = null;

function brightness(r, g, b) {
  return Math.round((r + g + b) / 3);
}

function check(x, y) {
  const idx = (width * y + x) << 2;
  const r = img.data[idx];
  const g = img.data[idx + 1];
  const b = img.data[idx + 2];
  const a = img.data[idx + 3];
  const br = brightness(r, g, b);
  if (a === 0) return;
  if (br < min) {
    min = br;
    minPixel = { x, y, r, g, b, a, br };
  }
  if (br > max) max = br;
}

for (let x = 0; x < width; x++) {
  check(x, 0);
  check(x, height - 1);
}
for (let y = 0; y < height; y++) {
  check(0, y);
  check(width - 1, y);
}

console.log(JSON.stringify({ width, height, borderBrightness: { min, max, minPixel } }, null, 2));
