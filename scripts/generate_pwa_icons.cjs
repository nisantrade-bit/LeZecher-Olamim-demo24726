const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Luxurious Gold Candle SVG template for PWA icon
const svgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Dark Luxury Background -->
  <rect width="512" height="512" rx="110" fill="#0d0d0d"/>
  <circle cx="256" cy="256" r="230" fill="url(#bg-glow)" opacity="0.6"/>
  
  <!-- Outer Gold Ring -->
  <rect x="24" y="24" width="464" height="464" rx="90" border-radius="90" stroke="url(#gold-grad)" stroke-width="8" opacity="0.4"/>
  
  <!-- Candle Halo Glow -->
  <circle cx="256" cy="180" r="100" fill="url(#halo-glow)"/>

  <!-- Flame Flame Outer -->
  <path d="M256 90C256 90 295 150 295 190C295 211.5 277.5 229 256 229C234.5 229 217 211.5 217 190C217 150 256 90 256 90Z" fill="url(#flame-grad)"/>
  
  <!-- Flame Inner Core -->
  <path d="M256 125C256 125 278 165 278 192C278 204 268 214 256 214C244 214 234 204 234 192C234 165 256 125 256 125Z" fill="url(#flame-core)"/>
  
  <!-- Wick -->
  <line x1="256" y1="225" x2="256" y2="242" stroke="#111" stroke-width="6" stroke-linecap="round"/>

  <!-- Candle Body -->
  <rect x="206" y="240" width="100" height="180" rx="14" fill="url(#candle-body)" stroke="url(#gold-grad)" stroke-width="4"/>
  
  <!-- Candle Wax Drips -->
  <path d="M216 240V270C216 276 222 280 226 274V240" fill="#f59e0b" opacity="0.7"/>
  <path d="M286 240V285C286 291 294 294 298 286V240" fill="#f59e0b" opacity="0.8"/>

  <!-- Pedestal -->
  <path d="M166 415C166 405 176 398 188 398H324C336 398 346 405 346 415V425H166V415Z" fill="url(#gold-grad)"/>

  <defs>
    <radialGradient id="bg-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(256 256) rotate(90) scale(256)">
      <stop stop-color="#1e293b"/>
      <stop offset="1" stop-color="#0d0d0d"/>
    </radialGradient>
    <radialGradient id="halo-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(256 180) rotate(90) scale(100)">
      <stop stop-color="#f59e0b" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="flame-grad" x1="256" y1="90" x2="256" y2="229" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fef08a"/>
      <stop offset="0.4" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="flame-core" x1="256" y1="125" x2="256" y2="214" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff"/>
      <stop offset="0.7" stop-color="#fef08a"/>
      <stop offset="1" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="candle-body" x1="206" y1="240" x2="306" y2="420" gradientUnits="userSpaceOnUse">
      <stop stop-color="#d97706"/>
      <stop offset="0.5" stop-color="#b45309"/>
      <stop offset="1" stop-color="#78350f"/>
    </linearGradient>
    <linearGradient id="gold-grad" x1="166" y1="398" x2="346" y2="425" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fef08a"/>
      <stop offset="0.5" stop-color="#c8a96e"/>
      <stop offset="1" stop-color="#854d0e"/>
    </linearGradient>
  </defs>
</svg>
`;

async function generateIcons() {
  const svgBuffer = Buffer.from(svgIcon(512));
  
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
    
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Icons generated successfully in /public');
}

generateIcons().catch(console.error);
