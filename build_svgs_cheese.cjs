const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'public', 'assets');

const wrapSVG = (content, width, height) => {
    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">\\n' +
        '  <defs>\\n' +
        '    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">\\n' +
        '      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.2"/>\\n' +
        '    </filter>\\n' +
        (content.defs || '') +
        '  </defs>\\n' +
        '  <g filter="url(#shadow)">\\n' +
        content.body +
        '  </g>\\n' +
        '</svg>';
};

function generateCheese(type) {
    let defs = '';
    let body = '';

    if (type === 'american') {
        defs = '<linearGradient id="am-grad" x1="0%" y1="0%" x2="100%" y2="100%">\\n' +
            '  <stop offset="0%" stop-color="#FFD54F"/>\\n' +
            '  <stop offset="50%" stop-color="#FFC107"/>\\n' +
            '  <stop offset="100%" stop-color="#FF9800"/>\\n' +
            '</linearGradient>\\n';

        // Slanted, slightly rounded square
        body = '<!-- Cheese Body -->\\n' +
            '<path d="M 40 120 Q 50 70 140 60 Q 220 50 220 120 Q 210 180 120 190 Q 30 200 40 120 Z" fill="url(#am-grad)" stroke="#F57C00" stroke-width="4" stroke-linejoin="round"/>\\n' +
            '<!-- Glossy shine -->\\n' +
            '<path d="M 60 110 Q 70 80 130 75" fill="none" stroke="#FFF" stroke-width="6" stroke-linecap="round" opacity="0.6"/>\\n' +
            '<path d="M 50 130 Q 60 160 110 170" fill="none" stroke="#FF5722" stroke-width="4" stroke-linecap="round" opacity="0.4"/>\\n';
    } else if (type === 'swiss') {
        defs = '<linearGradient id="sw-grad" x1="0%" y1="0%" x2="100%" y2="100%">\\n' +
            '  <stop offset="0%" stop-color="#FFF9C4"/>\\n' +
            '  <stop offset="50%" stop-color="#FFF176"/>\\n' +
            '  <stop offset="100%" stop-color="#FBC02D"/>\\n' +
            '</linearGradient>\\n' +
            '<radialGradient id="hole-shadow" cx="50%" cy="50%" r="50%">\\n' +
            '  <stop offset="70%" stop-color="#000" stop-opacity="0.3"/>\\n' +
            '  <stop offset="100%" stop-color="#000" stop-opacity="0"/>\\n' +
            '</radialGradient>\\n';

        // Base cheese
        body = '<path d="M 40 120 Q 40 60 130 50 Q 210 40 220 110 Q 230 180 140 190 Q 50 200 40 120 Z" fill="url(#sw-grad)" stroke="#FBC02D" stroke-width="4" stroke-linejoin="round"/>\\n';

        // Glossy rim
        body += '<path d="M 60 100 Q 60 70 120 65" fill="none" stroke="#FFF" stroke-width="6" stroke-linecap="round" opacity="0.8"/>\\n';

        // Holes (cx, cy, r)
        const holes = [
            [90, 90, 20], [160, 110, 25], [110, 150, 15], [60, 140, 12], [180, 160, 18], [140, 65, 12]
        ];

        holes.forEach(h => {
            // Inner hole background (darker yellow to look like table/bread below, or just deep shadow)
            body += '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="' + h[2] + '" fill="#E6AE25" stroke="#FBC02D" stroke-width="2"/>\\n';
            // Inner shadow (top left)
            body += '<path d="M ' + (h[0] - h[2] * 0.8) + ' ' + (h[1] - h[2] * 0.2) + ' A ' + h[2] + ' ' + h[2] + ' 0 0 1 ' + (h[0] + h[2] * 0.2) + ' ' + (h[1] - h[2] * 0.8) + '" fill="none" stroke="#C89000" stroke-width="4" stroke-linecap="round"/>\\n';
            // Inner highlight (bottom right)
            body += '<path d="M ' + (h[0] + h[2] * 0.8) + ' ' + (h[1] + h[2] * 0.2) + ' A ' + h[2] + ' ' + h[2] + ' 0 0 1 ' + (h[0] - h[2] * 0.2) + ' ' + (h[1] + h[2] * 0.8) + '" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.7"/>\\n';
        });
    }

    return wrapSVG({ defs: defs, body: body }, 256, 256);
}

function generateCheeseStack(type) {
    let defs = '';
    let body = '';

    if (type === 'american') {
        defs = '<linearGradient id="stack-am-grad" x1="0%" y1="0%" x2="0%" y2="100%">\\n' +
            '  <stop offset="0%" stop-color="#FFD54F"/>\\n' +
            '  <stop offset="100%" stop-color="#FF9800"/>\\n' +
            '</linearGradient>\\n';

        // Stack layers (drawn back to front, bottom to top)
        const layers = [
            { y: 80, a: -5, c1: '#FF9800', c2: 'url(#stack-am-grad)' },
            { y: 72, a: 3, c1: '#FF9800', c2: 'url(#stack-am-grad)' },
            { y: 64, a: -2, c1: '#FFB300', c2: '#FFD54F' },
            { y: 56, a: 4, c1: '#FF9800', c2: 'url(#stack-am-grad)' }
        ];

        layers.forEach(l => {
            // transform center is roughly 64, 64
            body += '<g transform="rotate(' + l.a + ' 64 64)">\\n';
            // Side thickness
            body += '<path d="M 20 ' + l.y + ' L 108 ' + l.y + ' L 108 ' + (l.y + 4) + ' L 20 ' + (l.y + 4) + ' Z" fill="' + l.c1 + '"/>\\n';
            // Top surface
            body += '<path d="M 25 ' + (l.y - 10) + ' L 113 ' + (l.y - 10) + ' L 108 ' + l.y + ' L 20 ' + l.y + ' Z" fill="' + l.c2 + '" stroke="#F57C00" stroke-width="1.5" stroke-linejoin="round"/>\\n';
            // Highlight edge
            body += '<path d="M 22 ' + l.y + ' L 106 ' + l.y + '" fill="none" stroke="#FFF" stroke-width="1.5" opacity="0.7"/>\\n';
            body += '</g>\\n';
        });
    } else if (type === 'swiss') {
        defs = '<linearGradient id="stack-sw-grad" x1="0%" y1="0%" x2="0%" y2="100%">\\n' +
            '  <stop offset="0%" stop-color="#FFF9C4"/>\\n' +
            '  <stop offset="100%" stop-color="#FBC02D"/>\\n' +
            '</linearGradient>\\n';

        const layers = [
            { y: 80, a: 4 }, { y: 72, a: -2 }, { y: 64, a: 5 }, { y: 56, a: -3 }
        ];

        layers.forEach((l, i) => {
            body += '<g transform="rotate(' + l.a + ' 64 64)">\\n';
            // Side thickness
            body += '<path d="M 20 ' + l.y + ' L 108 ' + l.y + ' L 108 ' + (l.y + 4) + ' L 20 ' + (l.y + 4) + ' Z" fill="#FBC02D"/>\\n';
            // Top surface
            body += '<path d="M 25 ' + (l.y - 10) + ' L 113 ' + (l.y - 10) + ' L 108 ' + l.y + ' L 20 ' + l.y + ' Z" fill="url(#stack-sw-grad)" stroke="#FBC02D" stroke-width="1.5" stroke-linejoin="round"/>\\n';
            // Highlight edge
            body += '<path d="M 22 ' + l.y + ' L 106 ' + l.y + '" fill="none" stroke="#FFF" stroke-width="1.5" opacity="0.6"/>\\n';

            // Add pseudo holes on the visible edge for top layers
            if (i > 1) {
                body += '<ellipse cx="' + (40 + i * 15) + '" cy="' + (l.y - 5) + '" rx="6" ry="3" fill="#E6AE25"/>\\n';
                body += '<ellipse cx="' + (80 - i * 5) + '" cy="' + (l.y - 2) + '" rx="4" ry="2" fill="#E6AE25"/>\\n';
                // highlight the hole bottom rim
                body += '<path d="M ' + (40 + i * 15 - 4) + ' ' + (l.y - 5) + ' Q ' + (40 + i * 15) + ' ' + (l.y - 2) + ' ' + (40 + i * 15 + 4) + ' ' + (l.y - 5) + '" fill="none" stroke="#FFF" stroke-width="1" opacity="0.8"/>\\n';
            }
            body += '</g>\\n';
        });
    }

    return wrapSVG({ defs: defs, body: body }, 128, 128);
}

const cheeses = ['american', 'swiss'];
cheeses.forEach(c => {
    fs.writeFileSync(path.join(outDir, 'cheese_' + c + '.svg'), generateCheese(c));
    fs.writeFileSync(path.join(outDir, 'cheese_stack_' + c + '.svg'), generateCheeseStack(c));
});
console.log('Cheeses generated!');
