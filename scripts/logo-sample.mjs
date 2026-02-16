import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";

const input = process.argv[2];
if (!input) {
  console.error("Usage: node scripts/logo-sample.mjs <path-to-image>");
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

function px(x, y) {
  const idx = (width * y + x) << 2;
  return {
    r: img.data[idx],
    g: img.data[idx + 1],
    b: img.data[idx + 2],
    a: img.data[idx + 3],
  };
}

const samples = {
  width,
  height,
  topLeft: px(0, 0),
  topRight: px(width - 1, 0),
  bottomLeft: px(0, height - 1),
  bottomRight: px(width - 1, height - 1),
  center: px(Math.floor(width / 2), Math.floor(height / 2)),
};

console.log(JSON.stringify(samples, null, 2));
