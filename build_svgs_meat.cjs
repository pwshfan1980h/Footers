const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'public', 'assets');

const wrapSVG = (content, width = 256, height = 256) => `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
    </filter>
${content.defs || ''}
  </defs>
  <g filter="url(#shadow)">
${content.body}
  </g>
</svg>`.trim();

// 256x256 individual meats
function generateMeat(type) {
  let defs = '';
  let body = '';

  if (type === 'bacon') {
    defs = `
      <linearGradient id="bacon-grad1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#8B0000"/>
        <stop offset="30%" stop-color="#CD5C5C"/>
        <stop offset="50%" stop-color="#FFE4E1"/>
        <stop offset="70%" stop-color="#CD5C5C"/>
        <stop offset="100%" stop-color="#8B0000"/>
      </linearGradient>
      <linearGradient id="bacon-grad2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#A52A2A"/>
        <stop offset="40%" stop-color="#F08080"/>
        <stop offset="60%" stop-color="#FFF0F5"/>
        <stop offset="100%" stop-color="#A52A2A"/>
      </linearGradient>
    `;
    body = `
      <!-- Bacon Strip 1 -->
      <path d="M 40 50 Q 70 30 100 60 T 160 50 T 220 70 L 220 90 Q 160 70 100 80 T 40 70 Z" fill="url(#bacon-grad1)" stroke="#5C0000" stroke-width="2"/>
      <path d="M 45 60 Q 75 40 105 70 T 165 60 T 215 80" fill="none" stroke="#FFF" stroke-width="4" opacity="0.6"/>
      
      <!-- Bacon Strip 2 -->
      <path d="M 30 110 Q 60 90 90 120 T 150 110 T 210 130 L 210 150 Q 150 130 90 140 T 30 130 Z" fill="url(#bacon-grad2)" stroke="#5C0000" stroke-width="2"/>
      <path d="M 35 120 Q 65 100 95 130 T 155 120 T 205 140" fill="none" stroke="#FFF" stroke-width="4" opacity="0.6"/>

      <!-- Bacon Strip 3 -->
      <path d="M 50 170 Q 80 150 110 180 T 170 170 T 230 190 L 230 210 Q 170 190 110 200 T 50 190 Z" fill="url(#bacon-grad1)" stroke="#5C0000" stroke-width="2"/>
      <path d="M 55 180 Q 85 160 115 190 T 175 180 T 225 200" fill="none" stroke="#FFF" stroke-width="4" opacity="0.6"/>
      
      <!-- Highlights/Crispness -->
      <path d="M 50 70 L 60 75 M 150 70 L 160 65 M 90 140 L 100 135 M 160 190 L 170 195" fill="none" stroke="#3E0000" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
    `;
  } else if (type === 'ham') {
    defs = `
      <radialGradient id="ham-grad" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#FFB6C1"/>
        <stop offset="80%" stop-color="#F08080"/>
        <stop offset="100%" stop-color="#CD5C5C"/>
      </radialGradient>
      <radialGradient id="ham-grad2" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFA07A"/>
        <stop offset="100%" stop-color="#E9967A"/>
      </radialGradient>
    `;
    body = `
      <path d="M 40 100 C 40 40, 100 20, 160 40 C 220 60, 240 120, 200 180 C 160 240, 80 220, 40 180 C 10 150, 40 130, 40 100 Z" fill="url(#ham-grad)" stroke="#B22222" stroke-width="4"/>
      <path d="M 100 70 C 120 50, 180 50, 180 100 C 180 150, 140 190, 100 190 C 60 190, 70 120, 100 70 Z" fill="url(#ham-grad2)" opacity="0.8"/>
      <path d="M 90 75 Q 110 90 130 80 M 110 140 Q 130 160 150 140" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
      <!-- Fold -->
      <path d="M 70 80 Q 90 130 160 160" fill="none" stroke="#CD5C5C" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      <path d="M 70 76 Q 90 126 160 156" fill="none" stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    `;
  } else if (type === 'prosciutto') {
    defs = `
      <linearGradient id="pro-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#b83838"/>
        <stop offset="50%" stop-color="#912727"/>
        <stop offset="100%" stop-color="#691a1a"/>
      </linearGradient>
    `;
    body = `
      <!-- erratic, highly folded -->
      <path d="M 50 120 C 30 70, 90 20, 150 40 C 210 60, 230 90, 190 150 C 150 210, 210 230, 160 230 C 110 230, 80 180, 50 120 Z" fill="url(#pro-grad)" stroke="#4a1010" stroke-width="3"/>
      
      <!-- Fat marbling -->
      <path d="M 60 110 Q 100 60 140 50" fill="none" stroke="#FFF" stroke-width="4" stroke-linecap="round" opacity="0.8"/>
      <path d="M 80 140 Q 140 100 180 140" fill="none" stroke="#FFF" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
      <path d="M 120 180 Q 160 190 180 210" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
      
      <!-- Folds and shadows -->
      <path d="M 80 130 Q 120 90 170 130" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round" opacity="0.2"/>
      <path d="M 70 80 C 100 100, 150 80, 180 120" fill="none" stroke="#e08f8f" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
    `;
  } else if (type === 'roastbeef') {
    defs = `
      <radialGradient id="rb-grad" cx="50%" cy="50%" r="50%">
        <stop offset="30%" stop-color="#a64d4d"/>
        <stop offset="70%" stop-color="#803333"/>
        <stop offset="100%" stop-color="#4d1a1a"/>
      </radialGradient>
    `;
    body = `
      <path d="M 50 100 C 30 50, 110 30, 170 60 C 230 90, 220 160, 180 200 C 140 240, 70 230, 40 180 C 10 130, 70 150, 50 100 Z" fill="url(#rb-grad)" stroke="#260d0d" stroke-width="4"/>
      <!-- Folds -->
      <path d="M 70 90 Q 120 140 180 110" fill="none" stroke="#260d0d" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      <path d="M 80 150 Q 130 180 170 170" fill="none" stroke="#260d0d" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
      <!-- Gloss/Highlight -->
      <path d="M 80 80 Q 120 60 160 70" fill="none" stroke="#e6b3b3" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
      <path d="M 60 140 Q 90 120 120 130" fill="none" stroke="#e6b3b3" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    `;
  } else if (type === 'turkey') {
    defs = `
      <radialGradient id="turk-grad" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="70%" stop-color="#F5F5DC"/>
        <stop offset="100%" stop-color="#D2B48C"/>
      </radialGradient>
      <radialGradient id="turk-grad2" cx="60%" cy="60%" r="60%">
        <stop offset="0%" stop-color="#FFF8DC"/>
        <stop offset="100%" stop-color="#DEB887"/>
      </radialGradient>
    `;
    body = `
      <path d="M 50 90 C 40 40, 110 20, 170 40 C 230 60, 240 130, 190 190 C 140 250, 60 210, 40 160 C 20 110, 60 140, 50 90 Z" fill="url(#turk-grad)" stroke="#A0522D" stroke-width="3"/>
      <!-- Darker folded meat chunk -->
      <path d="M 80 80 C 100 60, 160 60, 180 100 C 200 140, 150 180, 100 170 C 50 160, 60 100, 80 80 Z" fill="url(#turk-grad2)" opacity="0.6"/>
      <!-- Folds -->
      <path d="M 60 130 Q 110 160 170 120" fill="none" stroke="#8B4513" stroke-width="4" stroke-linecap="round" opacity="0.3"/>
      <!-- Herb flecks / turkey roasting marks -->
      <circle cx="100" cy="70" r="1.5" fill="#8B4513" opacity="0.5"/>
      <circle cx="140" cy="90" r="2" fill="#8B4513" opacity="0.4"/>
      <circle cx="90" cy="130" r="1.5" fill="#8B4513" opacity="0.6"/>
      <circle cx="160" cy="150" r="2" fill="#8B4513" opacity="0.4"/>
    `;
  }

  return wrapSVG({ defs, body }, 256, 256);
}

// 128x88 piles
function generateMeatPile(type) {
  let defs = '';
  let body = '<!-- Base shadow -->\\n  <ellipse cx="64" cy="65" rx="50" ry="20" fill="#000" opacity="0.3" />\\n';

  if (type === 'bacon') {
    body += '<!-- Back strips -->\\n' +
      '<path d="M 20 60 Q 40 40 60 60 T 100 50 L 105 60 Q 65 70 45 50 T 15 65 Z" fill="#8B0000" stroke="#5C0000" stroke-width="1"/>\\n' +
      '<path d="M 25 58 Q 45 38 65 58 T 95 48" fill="none" stroke="#FFE4E1" stroke-width="2" opacity="0.7"/>\\n' +
      '<!-- Mid strips -->\\n' +
      '<path d="M 30 50 Q 50 30 70 50 T 110 40 L 115 50 Q 75 60 55 40 T 25 55 Z" fill="#B22222" stroke="#8B0000" stroke-width="1"/>\\n' +
      '<path d="M 35 48 Q 55 28 75 48 T 105 38" fill="none" stroke="#FFE4E1" stroke-width="2" opacity="0.8"/>\\n' +
      '<!-- Front strips -->\\n' +
      '<path d="M 40 38 Q 60 18 80 38 T 100 35 L 105 45 Q 85 55 65 35 T 35 45 Z" fill="#CD5C5C" stroke="#A52A2A" stroke-width="1"/>\\n' +
      '<path d="M 45 36 Q 65 16 85 36 T 95 33" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.9"/>\\n' +
      '<!-- Grease shine -->\\n' +
      '<circle cx="60" cy="35" r="2.5" fill="#FFF" opacity="0.8"/>\\n' +
      '<circle cx="80" cy="45" r="1.5" fill="#FFF" opacity="0.7"/>\\n';
  } else if (type === 'ham') {
    defs = '<linearGradient id="pile-ham-grad" x1="0%" y1="0%" x2="0%" y2="100%">\\n' +
      '<stop offset="0%" stop-color="#FFB6C1"/>\\n' +
      '<stop offset="100%" stop-color="#CD5C5C"/>\\n' +
      '</linearGradient>\\n';
    body += '<path d="M 20 60 Q 40 30 60 40 Q 80 50 70 65 Q 50 80 20 60" fill="url(#pile-ham-grad)" stroke="#B22222" stroke-width="2" />\\n' +
      '<path d="M 50 50 Q 60 20 90 30 Q 110 40 100 60 Q 70 75 50 50" fill="url(#pile-ham-grad)" stroke="#B22222" stroke-width="2" />\\n' +
      '<path d="M 70 45 Q 90 20 110 35 Q 120 55 90 70" fill="url(#pile-ham-grad)" stroke="#B22222" stroke-width="2" />\\n' +
      '<path d="M 35 45 Q 50 15 80 25 Q 100 40 70 60 Q 40 50 35 45" fill="#FFC0CB" stroke="#B22222" stroke-width="2" />\\n' +
      '<!-- glossy highlights -->\\n' +
      '<path d="M 45 30 Q 60 20 75 25" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.6"/>\\n' +
      '<path d="M 60 45 Q 80 35 90 50" fill="none" stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity="0.5"/>\\n';
  } else if (type === 'prosciutto') {
    defs = '<linearGradient id="pile-pro-grad" x1="0%" y1="0%" x2="0%" y2="100%">\\n' +
      '<stop offset="0%" stop-color="#b83838"/>\\n' +
      '<stop offset="100%" stop-color="#691a1a"/>\\n' +
      '</linearGradient>\\n';
    body += '<path d="M 25 55 Q 35 25 65 35 Q 85 45 75 60 Q 55 75 25 55" fill="url(#pile-pro-grad)" stroke="#4a1010" stroke-width="1.5" />\\n' +
      '<path d="M 55 45 Q 65 15 95 25 Q 115 35 105 50 Q 75 65 55 45" fill="url(#pile-pro-grad)" stroke="#4a1010" stroke-width="1.5" />\\n' +
      '<path d="M 40 40 Q 55 10 85 20 Q 105 35 75 55 Q 45 45 40 40" fill="#912727" stroke="#4a1010" stroke-width="1.5" />\\n' +
      '<!-- Fat striations -->\\n' +
      '<path d="M 30 50 Q 50 35 70 45" fill="none" stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity="0.8"/>\\n' +
      '<path d="M 60 40 Q 80 25 100 35" fill="none" stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity="0.8"/>\\n' +
      '<path d="M 45 35 Q 65 20 85 30" fill="none" stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity="0.9"/>\\n';
  } else if (type === 'roastbeef') {
    defs = '<linearGradient id="pile-rb-grad" x1="0%" y1="0%" x2="0%" y2="100%">\\n' +
      '<stop offset="0%" stop-color="#a64d4d"/>\\n' +
      '<stop offset="100%" stop-color="#4d1a1a"/>\\n' +
      '</linearGradient>\\n';
    body += '<path d="M 20 55 C 30 20, 70 20, 80 45 C 90 70, 40 80, 20 55 Z" fill="url(#pile-rb-grad)" stroke="#260d0d" stroke-width="2" />\\n' +
      '<path d="M 50 45 C 60 10, 100 10, 110 35 C 120 60, 70 70, 50 45 Z" fill="url(#pile-rb-grad)" stroke="#260d0d" stroke-width="2" />\\n' +
      '<path d="M 35 40 C 45 5, 85 5, 95 30 C 105 55, 55 65, 35 40 Z" fill="#803333" stroke="#260d0d" stroke-width="2" />\\n' +
      '<!-- glossy highlights -->\\n' +
      '<path d="M 45 25 Q 65 15 80 25" fill="none" stroke="#e6b3b3" stroke-width="2" stroke-linecap="round" opacity="0.5"/>\\n' +
      '<path d="M 35 40 Q 55 30 70 40" fill="none" stroke="#e6b3b3" stroke-width="2" stroke-linecap="round" opacity="0.4"/>\\n';
  } else if (type === 'turkey') {
    defs = '<linearGradient id="pile-tk-grad" x1="0%" y1="0%" x2="0%" y2="100%">\\n' +
      '<stop offset="0%" stop-color="#FFFFFF"/>\\n' +
      '<stop offset="100%" stop-color="#D2B48C"/>\\n' +
      '</linearGradient>\\n';
    body += '<path d="M 25 55 C 35 25, 75 25, 80 50 C 85 75, 35 75, 25 55 Z" fill="url(#pile-tk-grad)" stroke="#8B4513" stroke-width="1.5" />\\n' +
      '<path d="M 55 45 C 65 15, 105 15, 110 40 C 115 65, 65 65, 55 45 Z" fill="url(#pile-tk-grad)" stroke="#8B4513" stroke-width="1.5" />\\n' +
      '<path d="M 40 40 C 50 10, 90 10, 95 35 C 100 60, 50 60, 40 40 Z" fill="#FFF8DC" stroke="#8B4513" stroke-width="1.5" />\\n' +
      '<!-- Herb spotting -->\\n' +
      '<circle cx="50" cy="30" r="1.5" fill="#8B4513" opacity="0.6"/>\\n' +
      '<circle cx="70" cy="25" r="1.5" fill="#8B4513" opacity="0.5"/>\\n' +
      '<circle cx="85" cy="45" r="1.5" fill="#8B4513" opacity="0.4"/>\\n' +
      '<circle cx="45" cy="50" r="1" fill="#8B4513" opacity="0.5"/>\\n' +
      '<circle cx="65" cy="45" r="1" fill="#8B4513" opacity="0.6"/>\\n';
  }

  return wrapSVG({ defs, body }, 128, 88);
}

const meats = ['bacon', 'ham', 'prosciutto', 'roastbeef', 'turkey'];
meats.forEach(m => {
  fs.writeFileSync(path.join(outDir, 'meat_' + m + '.svg'), generateMeat(m));
  fs.writeFileSync(path.join(outDir, 'meat_pile_' + m + '.svg'), generateMeatPile(m));
});
console.log('Meats generated!');
