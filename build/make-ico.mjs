/**
 * 从 JPG 创建多尺寸 ICO 文件
 * 使用 PNG 嵌入格式，兼容 Windows 10/11
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const srcPath = process.argv[2];
const icoPath = process.argv[3];

// 用 ImageMagick 或 Sharp 生成不同尺寸的 PNG，然后打包成 ICO
// 这里用 PowerShell + .NET 来 resize
const sizes = [256, 128, 64, 48, 32, 16];

// 使用 PowerShell + System.Drawing 生成各尺寸 PNG
const pngBuffers = [];
for (const size of sizes) {
  const pngPath = `${srcPath.replace(/\.jpg$/, '')}-${size}.png`;
  const psCmd = `Add-Type -AssemblyName System.Drawing; $img = [System.Drawing.Image]::FromFile('${srcPath.replace(/\\/g,'\\')}'); $bmp = New-Object System.Drawing.Bitmap(${size},${size}); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $g.DrawImage($img, 0, 0, ${size}, ${size}); $bmp.Save('${pngPath.replace(/\\/g,'\\')}', [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose(); $img.Dispose();`;
  try {
    execSync(`powershell -Command "${psCmd}"`, { stdio: 'pipe' });
    const buf = readFileSync(pngPath);
    pngBuffers.push({ size, data: buf });
    console.log(`  Generated ${size}x${size}: ${(buf.length/1024).toFixed(1)}KB`);
  } catch(e) {
    console.error(`Failed to generate ${size}x${size}: ${e.message}`);
  }
}

if (pngBuffers.length === 0) {
  console.error('No PNG buffers generated');
  process.exit(1);
}

// 构造 ICO 文件
// ICO header: 6 bytes
// ICONDIRENTRY: 16 bytes * count
// PNG data: variable

const headerSize = 6;
const entrySize = 16;
const entriesSize = entrySize * pngBuffers.length;
const dataOffset = headerSize + entriesSize;

// 计算各数据段偏移
let currentOffset = dataOffset;
const entries = [];
for (const { size, data } of pngBuffers) {
  entries.push({ size, data, offset: currentOffset });
  currentOffset += data.length;
}

// 写入 ICO
const buffers = [];

// ICONDIR (6 bytes)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = ICO
header.writeUInt16LE(pngBuffers.length, 4); // count
buffers.push(header);

// ICONDIRENTRY (16 bytes each)
for (const { size, data, offset } of entries) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width (256 -> 0)
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // color count (0 = no palette)
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(data.length, 8); // bytes in resource
  entry.writeUInt32LE(offset, 12); // offset
  buffers.push(entry);
}

// PNG data
for (const { data } of entries) {
  buffers.push(data);
}

const ico = Buffer.concat(buffers);
writeFileSync(icoPath, ico);
console.log(`\nICO created: ${(ico.length/1024).toFixed(1)}KB with ${pngBuffers.length} sizes`);
console.log(`Path: ${icoPath}`);
