import fs from 'node:fs';
import zlib from 'node:zlib';

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
  console.error(`❌ Screenshot file not found: ${filePath}`);
  process.exit(1);
}

const buf = fs.readFileSync(filePath);
if (buf.length < 10000) {
  console.error(`❌ Screenshot file too small (${buf.length} bytes) — likely corrupt or blank`);
  process.exit(1);
}

// Verify PNG Header
const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
if (!buf.subarray(0, 8).equals(pngSig)) {
  console.error('❌ Invalid PNG signature');
  process.exit(1);
}

// Read IHDR width & height
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

if (width >= height) {
  console.error(`❌ Orientation check failed: expected Portrait (width < height), got ${width}x${height}`);
  process.exit(1);
}

// Extract IDAT chunks and inspect decompressed scanlines to ensure it's not a blank white/black screen
let offset = 8;
const idatChunks = [];
while (offset < buf.length) {
  const length = buf.readUInt32BE(offset);
  const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
  if (type === 'IDAT') {
    idatChunks.push(buf.subarray(offset + 8, offset + 8 + length));
  }
  offset += 12 + length;
}

const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
let nonWhiteSamples = 0;
let colorfulSamples = 0;
const step = 400;

for (let i = 1000; i < decompressed.length - 4; i += step) {
  const r = decompressed[i];
  const g = decompressed[i + 1];
  const b = decompressed[i + 2];
  if (r < 240 || g < 240 || b < 240) nonWhiteSamples++;
  if (Math.abs(r - g) > 15 || Math.abs(g - b) > 15 || Math.abs(r - b) > 15) colorfulSamples++;
}

if (nonWhiteSamples < 20 || colorfulSamples < 5) {
  console.error(
    `❌ Blank screen detected! (nonWhiteSamples=${nonWhiteSamples}, colorfulSamples=${colorfulSamples})`
  );
  process.exit(1);
}

console.log(`✅ Screenshot verified: ${filePath} (${width}x${height} Portrait, rich UI pixels confirmed)`);
