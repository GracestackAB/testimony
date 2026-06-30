const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background (parchment color from globals.css)
  ctx.fillStyle = '#faf8f3';
  ctx.fillRect(0, 0, size, size);

  // Olive/green accent border
  ctx.strokeStyle = '#7BA05B';
  ctx.lineWidth = size * 0.08;
  ctx.strokeRect(size * 0.1, size * 0.1, size * 0.8, size * 0.8);

  // Text - "Testimony"
  ctx.fillStyle = '#1a1814';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const fontSize = size * 0.18;
  ctx.font = `bold ${fontSize}px "Source Serif 4", Georgia, serif`;
  ctx.fillText('Testimony', size / 2, size / 2 - fontSize * 0.3);
  
  // ".se"
  ctx.font = `${fontSize * 0.7}px "Inter", sans-serif`;
  ctx.fillText('.se', size / 2, size / 2 + fontSize * 0.5);

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, '../public', `icon-${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated ${outputPath}`);
}

generateIcon(192);
generateIcon(512);
