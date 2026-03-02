const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'public', 'assets');

// Helper to wrap SVG content - Use a very tight viewbox
const wrapSVG = (content, width = 256, height = 256, viewBox = "0 0 256 256") => `
<svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/>
    </filter>
    <filter id="inner-shadow">
      <feOffset dx="0" dy="0"/>
      <feGaussianBlur stdDeviation="4" result="offset-blur"/>
      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
      <feFlood flood-color="black" flood-opacity="0.4" result="color"/>
      <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
      <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
    </filter>
${content.defs || ''}
  </defs>
  <g filter="url(#shadow)">
${content.body}
  </g>
</svg>`.trim();

// Definitions for Breads
const breadDefs = {
  white: {
    crustOuter: '#EAA655', crustInner: '#D9822B', crustStroke: '#A85D10',
    innerOuter: '#FFFFFF', innerInner: '#FFF5E6', innerRim: '#EED9C3',
    speck: '#E3CBA8', speckOpacity: 0.5
  },
  wheat: {
    crustOuter: '#B5825B', crustInner: '#8F5E36', crustStroke: '#5E381C',
    innerOuter: '#E8D0AE', innerInner: '#D1A67B', innerRim: '#B88B5E',
    speck: '#70421A', speckOpacity: 0.85
  },
  sourdough: {
    crustOuter: '#DEC199', crustInner: '#B3956F', crustStroke: '#80694B',
    innerOuter: '#FFFDF2', innerInner: '#EFE7CF', innerRim: '#DFD1B0',
    speck: '#C2B084', speckOpacity: 0.75
  }
};

const toastedOverlay = `
    <!-- Grill marks -->
    <path d="M 20 70 L 492 70 M 20 128 L 492 128 M 20 186 L 492 186" fill="none" stroke="#5c2f0d" stroke-width="20" stroke-linecap="round" opacity="0.25" filter="blur(3px)"/>
    <path d="M 20 70 L 492 70 M 20 128 L 492 128 M 20 186 L 492 186" fill="none" stroke="#4a260d" stroke-width="8" stroke-linecap="round" opacity="0.5"/>
    <path d="M 40 50 L 200 200 M 130 50 L 500 160 M 0 100 L 120 200" fill="none" stroke="#5c2f0d" stroke-width="6" stroke-linecap="round" opacity="0.15"/>
    <radialGradient id="toast-grad" cx="50%" cy="50%" r="50%">
      <stop offset="30%" stop-color="#8a4d1f" stop-opacity="0"/>
      <stop offset="100%" stop-color="#5c2f0d" stop-opacity="0.45"/>
    </radialGradient>
    <path d="M 256 20 C 460 20, 492 60, 492 128 C 492 196, 460 236, 256 236 C 52 236, 20 196, 20 128 C 20 60, 52 20, 256 20 Z" fill="url(#toast-grad)"/>
`;

function generateBread(type, toasted) {
  const c = breadDefs[type];
  const crustId = `crust-${type}`;
  const innerId = `inner-${type}`;

  const defs = `
    <radialGradient id="${crustId}" cx="50%" cy="50%" r="50%">
      <stop offset="50%" stop-color="${c.crustOuter}"/>
      <stop offset="100%" stop-color="${c.crustInner}"/>
    </radialGradient>
    <radialGradient id="${innerId}" cx="45%" cy="45%" r="65%">
      <stop offset="0%" stop-color="${c.innerOuter}"/>
      <stop offset="100%" stop-color="${c.innerInner}"/>
    </radialGradient>
  `;

  let specks = '';
  // Scatter horizontally and vertically
  for (let i = 0; i < 150; i++) {
    const cx = 30 + Math.random() * 452;
    const cy = 30 + Math.random() * 196;

    if (type === 'sourdough' && Math.random() < 0.25) {
      const rx = 4 + Math.random() * 8;
      const ry = 3 + Math.random() * 6;
      specks += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#C8B898" opacity="0.85" filter="url(#inner-shadow)" />\n`;
    } else {
      const r = 1 + Math.random() * 3.0;
      specks += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.speck}" opacity="${c.speckOpacity}"/>\n`;
    }
  }

  // Large flat slice shaped exactly like an open sub
  // 512 is long, 256 is tall
  const pathD = type === 'sourdough'
    ? "M 256 20 C 460 20, 492 60, 492 128 C 492 196, 460 236, 256 236 C 52 236, 20 196, 20 128 C 20 60, 52 20, 256 20 Z"
    : "M 256 20 C 460 20, 492 60, 492 128 C 492 196, 460 236, 256 236 C 52 236, 20 196, 20 128 C 20 60, 52 20, 256 20 Z";

  const innerPathD = type === 'sourdough'
    ? "M 256 32 C 436 32, 460 68, 460 128 C 460 188, 436 224, 256 224 C 76 224, 52 188, 52 128 C 52 68, 76 32, 256 32 Z"
    : "M 256 32 C 436 32, 460 68, 460 128 C 460 188, 436 224, 256 224 C 76 224, 52 188, 52 128 C 52 68, 76 32, 256 32 Z";

  const baseBody = `
    <!-- Cartoony Bread Crust -->
    <path d="${pathD}" fill="url(#${crustId})" stroke="${c.crustStroke}" stroke-width="12" stroke-linejoin="round"/>
          
    <!-- Inner bread crumb -->
    <path d="${innerPathD}" fill="url(#${innerId})"/>
          
    <!-- Inner soft shadow / rim -->
    <path d="${innerPathD}" fill="none" stroke="${c.innerRim}" stroke-width="12" opacity="0.85" filter="blur(3px)"/>

    <g>
      ${specks}
    </g>
    
    <path d="M 64 64 C 180 44, 320 40, 450 48" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" opacity="0.35"/>
  `;

  const body = baseBody + (toasted ? toastedOverlay : '');
  return wrapSVG({ defs, body }, 512, 256, "0 0 512 256");
}

function generateLoaf(type) {
  const c = breadDefs[type];
  const crustId = `loaf-crust-${type}`;

  const defs = `
    <linearGradient id="${crustId}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c.crustOuter}"/>
      <stop offset="50%" stop-color="${c.crustInner}"/>
      <stop offset="100%" stop-color="${c.crustStroke}"/>
    </linearGradient>
  `;

  // Spread scores along the loaf
  const scores = `
    <path d="M 120 80 Q 160 110 120 150" fill="none" stroke="${c.innerRim}" stroke-width="10" stroke-linecap="round" opacity="0.75" filter="url(#inner-shadow)"/>
    <path d="M 256 80 Q 296 110 256 150" fill="none" stroke="${c.innerRim}" stroke-width="10" stroke-linecap="round" opacity="0.75" filter="url(#inner-shadow)"/>
    <path d="M 392 80 Q 432 110 392 150" fill="none" stroke="${c.innerRim}" stroke-width="10" stroke-linecap="round" opacity="0.75" filter="url(#inner-shadow)"/>
  `;

  const body = `
    <!-- Full Loaf Shape -->
    <path d="M 60 190 Q 60 50 256 50 Q 452 50 452 190 L 452 210 Q 452 230 256 230 Q 60 230 60 210 Z" 
          fill="url(#${crustId})" stroke="${c.crustStroke}" stroke-width="10" stroke-linejoin="round"/>
          
    <!-- Inner soft shading highlight -->
    <path d="M 80 190 Q 80 60 256 60 Q 432 60 432 190 L 432 206 Q 432 220 256 220 Q 80 220 80 206 Z" 
          fill="none" stroke="#FFFFFF" stroke-width="6" opacity="0.15"/>

    ${scores}
    
    <path d="M 144 80 Q 256 70 368 80" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" opacity="0.45"/>
  `;

  return wrapSVG({ defs, body }, 512, 256, "0 0 512 256");
}

Object.keys(breadDefs).forEach(type => {
  fs.writeFileSync(path.join(outDir, 'bread_' + type + '.svg'), generateBread(type, false));
  fs.writeFileSync(path.join(outDir, 'bread_' + type + '_toasted.svg'), generateBread(type, true));
  fs.writeFileSync(path.join(outDir, 'loaf_' + type + '.svg'), generateLoaf(type));
});
console.log('Bread generated!');
