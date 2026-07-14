const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

async function main() {
  const root = path.join(__dirname, '..');
  const buildDir = path.join(root, 'build');
  await fs.mkdir(buildDir, { recursive: true });
  const svg = path.join(root, 'assets', 'icon.svg');
  const png = path.join(buildDir, 'icon.png');
  await sharp(svg).resize(1024, 1024).png().toFile(png);
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const buffers = await Promise.all(sizes.map((size) => sharp(svg).resize(size, size).png().toBuffer()));
  await fs.writeFile(path.join(buildDir, 'icon.ico'), await pngToIco(buffers));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
