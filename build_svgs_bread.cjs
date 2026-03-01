const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'public', 'assets');

// Helper to wrap SVG content
const wrapSVG = (content, width = 128, height = 128) => `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000" flood-opacity="0.25"/>
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
    crustOuter: '#EAA655', crustInner: '#C27A29', crustStroke: '#8C4E0A',
    innerOuter: '#FFFFFF', innerInner: '#FFF2E0', innerRim: '#E6D3B8',
    speck: '#E3CBA8', speckOpacity: 0.6
  },
  wheat: {
    crustOuter: '#A67B5B', crustInner: '#7A5230', crustStroke: '#4A2A18',
    innerOuter: '#E8CA9D', innerInner: '#C69C6D', innerRim: '#B08050',
    speck: '#70421A', speckOpacity: 0.8
  },
  sourdough: {
    crustOuter: '#D4B88E', crustInner: '#A88D68', crustStroke: '#7A6242',
    innerOuter: '#FFFBEA', innerInner: '#EBE2C5', innerRim: '#D4C69F',
    speck: '#C2B084', speckOpacity: 0.7
  }
};

const toastedOverlay = `
    <!-- Toasted marks -->
    <path d="M 40 40 L 90 40 M 45 60 L 85 60 M 35 80 L 95 80" fill="none" stroke="#6b3e1b" stroke-width="12" stroke-linecap="round" opacity="0.3" filter="blur(2px)"/>
    <path d="M 40 40 L 90 40 M 45 60 L 85 60 M 35 80 L 95 80" fill="none" stroke="#4a260d" stroke-width="6" stroke-linecap="round" opacity="0.4"/>
    <radialGradient id="toast-grad" cx="50%" cy="50%" r="50%">
      <stop offset="40%" stop-color="#8a4d1f" stop-opacity="0"/>
      <stop offset="100%" stop-color="#5c2f0d" stop-opacity="0.4"/>
    </radialGradient>
    <path d="M 64 28 C 84 28, 100 40, 102 60 C 104 80, 86 92, 64 94 C 42 96, 26 80, 28 60 C 30 40, 44 28, 64 28 Z" fill="url(#toast-grad)"/>
`;

function generateBread(type, toasted) {
  const c = breadDefs[type];
  const crustId = `crust-${type}`;
  const innerId = `inner-${type}`;

  const defs = `
    <radialGradient id="${crustId}" cx="50%" cy="50%" r="50%">
      <stop offset="60%" stop-color="${c.crustOuter}"/>
      <stop offset="100%" stop-color="${c.crustInner}"/>
    </radialGradient>
    <radialGradient id="${innerId}" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${c.innerOuter}"/>
      <stop offset="100%" stop-color="${c.innerInner}"/>
    </radialGradient>
  `;

  let specks = '';
  // Random specks
  const prng = [
    [50, 50, 2.5], [80, 65, 3], [65, 80, 2], [45, 70, 1.5], [85, 45, 2], [35, 55, 2],
    [70, 35, 2.5], [40, 80, 2], [90, 80, 1.5]
  ];
  for (const [cx, cy, r] of prng) {
    if (type === 'sourdough' && (cx + cy) % 3 === 0) {
      // Sourdough has big holes
      specks += `<ellipse cx="${cx}" cy="${cy}" rx="${r * 2}" ry="${r * 1.5}" fill="#C8B898" opacity="0.8"/>\n`;
    } else {
      specks += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.speck}" opacity="${c.speckOpacity}"/>\n`;
    }
  }

  const baseBody = `
    <!-- Cartoony Bread Crust -->
    <path d="M 64 16 C 96 16, 120 36, 120 62 C 120 88, 96 112, 64 112 C 32 112, 8 88, 8 62 C 8 36, 32 16, 64 16 Z" 
          fill="url(#${crustId})" stroke="${c.crustStroke}" stroke-width="4" stroke-linejoin="round"/>
          
    <!-- Inner bread -->
    <path d="M 64 24 C 88 24, 108 40, 108 62 C 108 84, 88 100, 64 100 C 40 100, 20 84, 20 62 C 20 40, 40 24, 64 24 Z" 
          fill="url(#${innerId})"/>
          
    <!-- Inner shadow / Rim light on inner bread -->
    <path d="M 64 24 C 88 24, 108 40, 108 62 C 108 84, 88 100, 64 100 C 40 100, 20 84, 20 62 C 20 40, 40 24, 64 24 Z" 
          fill="none" stroke="${c.innerRim}" stroke-width="4" opacity="0.8"/>

    <!-- Flour / texture specks -->
    <g>
      ${specks}
    </g>
    
    <!-- Cartoon Highlight -->
    <path d="M 32 36 C 44 28, 64 26, 80 30" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
  `;

  const body = baseBody + (toasted ? toastedOverlay : '');
  return wrapSVG({ defs, body });
}

// Generate Loaves
function generateLoaf(type) {
  const c = breadDefs[type];
  const crustId = `loaf-crust-${type}`;

  const defs = `
    <linearGradient id="${crustId}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${c.crustOuter}"/>
      <stop offset="40%" stop-color="${c.crustInner}"/>
      <stop offset="100%" stop-color="${c.crustStroke}"/>
    </linearGradient>
  `;

  let specks = '';
  // Top crust scoring
  const scores = `
    <path d="M 30 20 Q 50 40 30 60" fill="none" stroke="${c.innerRim}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    <path d="M 64 20 Q 84 40 64 60" fill="none" stroke="${c.innerRim}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    <path d="M 98 20 Q 118 40 98 60" fill="none" stroke="${c.innerRim}" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
  `;

  const body = `
    <!-- Loaf Body -->
    <path d="M 20 80 Q 20 20 64 20 Q 108 20 108 80 L 108 100 Q 108 110 64 110 Q 20 110 20 100 Z" 
          fill="url(#${crustId})" stroke="${c.crustStroke}" stroke-width="4" stroke-linejoin="round"/>
          
    <path d="M 24 80 Q 24 24 64 24 Q 104 24 104 80 L 104 98 Q 104 106 64 106 Q 24 106 24 98 Z" 
          fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.2"/>

    ${scores}
    
    <!-- Cartoon Highlight -->
    <path d="M 36 30 Q 64 26 92 30" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
  `;

  return wrapSVG({ defs, body });
}

Object.keys(breadDefs).forEach(type => {
  fs.writeFileSync(path.join(outDir, 'bread_' + type + '.svg'), generateBread(type, false));
  fs.writeFileSync(path.join(outDir, 'bread_' + type + '_toasted.svg'), generateBread(type, true));
  fs.writeFileSync(path.join(outDir, 'loaf_' + type + '.svg'), generateLoaf(type));
});
console.log('Bread generated!');
