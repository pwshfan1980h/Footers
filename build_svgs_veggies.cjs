const fs = require('fs');
const path = require('path');
const outDir = path.join(__dirname, 'public', 'assets');

const wrapSVG = (content, width, height) => {
    return '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg">\\n' +
        '  <defs>\\n' +
        '    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">\\n' +
        '      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>\\n' +
        '    </filter>\\n' +
        (content.defs || '') +
        '  </defs>\\n' +
        '  <g filter="url(#shadow)">\\n' +
        content.body +
        '  </g>\\n' +
        '</svg>';
};

function generateVeggie(type) {
    let defs = '';
    let body = '';

    if (type === 'tomato') {
        defs = '<radialGradient id="tom-grad" cx="40%" cy="40%" r="60%">\\n' +
            '  <stop offset="0%" stop-color="#FF5252"/>\\n' +
            '  <stop offset="70%" stop-color="#D32F2F"/>\\n' +
            '  <stop offset="100%" stop-color="#B71C1C"/>\\n' +
            '</radialGradient>\\n' +
            '<linearGradient id="tom-flesh" x1="0%" y1="0%" x2="100%" y2="100%">\\n' +
            '  <stop offset="0%" stop-color="#FF5252"/>\\n' +
            '  <stop offset="100%" stop-color="#E53935"/>\\n' +
            '</linearGradient>\\n';
        body = '<circle cx="128" cy="128" r="80" fill="url(#tom-grad)" stroke="#B71C1C" stroke-width="4"/>\\n' +
            '<circle cx="128" cy="128" r="65" fill="url(#tom-flesh)" opacity="0.9"/>\\n' +
            '<!-- Segments -->\\n' +
            '<path d="M 128 128 L 88 88 Q 128 68 168 88 Z" fill="#B71C1C" opacity="0.8"/>\\n' +
            '<path d="M 128 128 L 168 88 Q 188 128 168 168 Z" fill="#B71C1C" opacity="0.8"/>\\n' +
            '<path d="M 128 128 L 168 168 Q 128 188 88 168 Z" fill="#B71C1C" opacity="0.8"/>\\n' +
            '<path d="M 128 128 L 88 168 Q 68 128 88 88 Z" fill="#B71C1C" opacity="0.8"/>\\n' +
            '<!-- Seeds -->\\n' +
            '<circle cx="120" cy="100" r="3" fill="#FFCDD2"/><circle cx="136" cy="100" r="3" fill="#FFCDD2"/>\\n' +
            '<circle cx="156" cy="120" r="3" fill="#FFCDD2"/><circle cx="156" cy="136" r="3" fill="#FFCDD2"/>\\n' +
            '<circle cx="136" cy="156" r="3" fill="#FFCDD2"/><circle cx="120" cy="156" r="3" fill="#FFCDD2"/>\\n' +
            '<circle cx="100" cy="136" r="3" fill="#FFCDD2"/><circle cx="100" cy="120" r="3" fill="#FFCDD2"/>\\n' +
            '<!-- Center -->\\n' +
            '<circle cx="128" cy="128" r="8" fill="#FF8A80" opacity="0.8"/>\\n' +
            '<!-- Gloss -->\\n' +
            '<path d="M 70 128 A 58 58 0 0 1 128 70" fill="none" stroke="#FFF" stroke-width="5" stroke-linecap="round" opacity="0.6"/>\\n' +
            '<path d="M 100 80 Q 120 70 140 85" fill="none" stroke="#FFF" stroke-width="4" stroke-linecap="round" opacity="0.8"/>\\n';
    } else if (type === 'lettuce') {
        defs = '<radialGradient id="let-grad" cx="50%" cy="50%" r="50%">\\n' +
            '  <stop offset="30%" stop-color="#C8E6C9"/>\\n' +
            '  <stop offset="80%" stop-color="#81C784"/>\\n' +
            '  <stop offset="100%" stop-color="#4CAF50"/>\\n' +
            '</radialGradient>\\n';
        body = '<!-- Leaf outline -->\\n' +
            '<path d="M 128 200 C 60 200, 30 160, 40 100 C 50 40, 90 20, 140 40 C 200 60, 240 100, 200 160 C 180 200, 150 200, 128 200 Z" fill="url(#let-grad)" stroke="#388E3C" stroke-width="4" stroke-linejoin="round"/>\\n' +
            '<!-- Ruffles/Folds -->\\n' +
            '<path d="M 40 100 C 50 140, 80 180, 128 180 C 160 180, 190 150, 200 120" fill="none" stroke="#388E3C" stroke-width="3" stroke-linecap="round" opacity="0.5"/>\\n' +
            '<path d="M 60 70 C 80 50, 120 40, 160 70" fill="none" stroke="#388E3C" stroke-width="3" stroke-linecap="round" opacity="0.5"/>\\n' +
            '<!-- Veins -->\\n' +
            '<path d="M 128 180 Q 128 120 120 60 M 128 160 Q 90 140 70 110 M 128 140 Q 160 130 180 100 M 125 100 Q 100 90 80 70 M 125 80 Q 150 70 160 50" fill="none" stroke="#E8F5E9" stroke-width="4" stroke-linecap="round" opacity="0.8"/>\\n' +
            '<!-- Leaf gloss -->\\n' +
            '<path d="M 70 150 Q 80 170 100 170 M 150 60 Q 180 60 190 80" fill="none" stroke="#FFF" stroke-width="5" stroke-linecap="round" opacity="0.5"/>\\n';
    } else if (type === 'arugula') {
        defs = '<linearGradient id="aru-grad" x1="0%" y1="0%" x2="100%" y2="100%">\\n' +
            '  <stop offset="0%" stop-color="#4CAF50"/>\\n' +
            '  <stop offset="100%" stop-color="#1B5E20"/>\\n' +
            '</linearGradient>\\n';
        body = '<!-- Spiky Leaf -->\\n' +
            '<path d="M 128 210 Q 120 180 100 160 Q 60 150 70 120 Q 90 120 100 90 Q 70 70 90 40 Q 128 20 150 50 Q 180 60 160 90 Q 180 120 150 140 Q 180 170 140 180 Q 130 200 128 210 Z" fill="url(#aru-grad)" stroke="#1B5E20" stroke-width="3" stroke-linejoin="round"/>\\n' +
            '<!-- Central stem and veins -->\\n' +
            '<path d="M 128 210 Q 128 150 120 40" fill="none" stroke="#C8E6C9" stroke-width="4" stroke-linecap="round" opacity="0.9"/>\\n' +
            '<path d="M 128 160 Q 90 150 75 125 M 128 140 Q 160 140 170 110 M 125 100 Q 90 90 80 50 M 125 80 Q 160 70 170 60" fill="none" stroke="#C8E6C9" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>\\n' +
            '<!-- Gloss -->\\n' +
            '<path d="M 110 50 Q 120 35 130 40" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.5"/>\\n';
    } else if (type === 'pickles') {
        defs = '<radialGradient id="pic-grad" cx="50%" cy="50%" r="50%">\\n' +
            '  <stop offset="30%" stop-color="#CDDC39"/>\\n' +
            '  <stop offset="80%" stop-color="#9E9D24"/>\\n' +
            '  <stop offset="100%" stop-color="#827717"/>\\n' +
            '</radialGradient>\\n';
        body = '<!-- Pickle Slice Base -->\\n' +
            '<circle cx="128" cy="128" r="70" fill="url(#pic-grad)" stroke="#33691E" stroke-width="4"/>\\n' +
            '<!-- Ridges (crinkle cut) -->\\n' +
            '<circle cx="128" cy="128" r="55" fill="none" stroke="#F0F4C3" stroke-width="3" opacity="0.6" stroke-dasharray="10 5"/>\\n' +
            '<circle cx="128" cy="128" r="40" fill="none" stroke="#F0F4C3" stroke-width="3" opacity="0.6" stroke-dasharray="8 6"/>\\n' +
            '<circle cx="128" cy="128" r="25" fill="none" stroke="#F0F4C3" stroke-width="3" opacity="0.6" stroke-dasharray="6 4"/>\\n' +
            '<!-- Seeds -->\\n' +
            '<circle cx="110" cy="150" r="3" fill="#FFF9C4" opacity="0.8"/>\\n' +
            '<circle cx="140" cy="110" r="3" fill="#FFF9C4" opacity="0.8"/>\\n' +
            '<circle cx="100" cy="110" r="3" fill="#FFF9C4" opacity="0.8"/>\\n' +
            '<!-- Wet Gloss -->\\n' +
            '<path d="M 75 100 A 60 60 0 0 1 100 75" fill="none" stroke="#FFF" stroke-width="5" stroke-linecap="round" opacity="0.7"/>\\n' +
            '<path d="M 160 160 A 50 50 0 0 0 170 120" fill="none" stroke="#FFF" stroke-width="4" stroke-linecap="round" opacity="0.5"/>\\n';
    } else if (type === 'onion') {
        defs = '<linearGradient id="oni-grad" x1="0%" y1="0%" x2="100%" y2="100%">\\n' +
            '  <stop offset="0%" stop-color="#E1BEE7"/>\\n' +
            '  <stop offset="50%" stop-color="#F3E5F5"/>\\n' +
            '  <stop offset="100%" stop-color="#CE93D8"/>\\n' +
            '</linearGradient>\\n';
        body = '<!-- Rings -->\\n' +
            '<circle cx="128" cy="128" r="75" fill="none" stroke="#7B1FA2" stroke-width="3"/>\\n' +
            '<circle cx="128" cy="128" r="72" fill="none" stroke="url(#oni-grad)" stroke-width="6"/>\\n' +
            '<circle cx="128" cy="128" r="69" fill="none" stroke="#7B1FA2" stroke-width="2" opacity="0.5"/>\\n' +
            '<circle cx="118" cy="138" r="55" fill="none" stroke="#7B1FA2" stroke-width="2"/>\\n' +
            '<circle cx="118" cy="138" r="52" fill="none" stroke="url(#oni-grad)" stroke-width="5"/>\\n' +
            '<circle cx="118" cy="138" r="49" fill="none" stroke="#7B1FA2" stroke-width="1.5" opacity="0.5"/>\\n' +
            '<circle cx="138" cy="115" r="35" fill="none" stroke="#7B1FA2" stroke-width="2"/>\\n' +
            '<circle cx="138" cy="115" r="32" fill="none" stroke="#F3E5F5" stroke-width="4"/>\\n' +
            '<!-- Core -->\\n' +
            '<ellipse cx="128" cy="128" rx="10" ry="15" fill="#F3E5F5" stroke="#7B1FA2" stroke-width="2" transform="rotate(45 128 128)"/>\\n' +
            '<!-- Highlights -->\\n' +
            '<path d="M 70 90 A 70 70 0 0 1 128 55" fill="none" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>\\n';
    } else if (type === 'olives') {
        defs = '<radialGradient id="oli-grad" cx="40%" cy="40%" r="60%">\\n' +
            '  <stop offset="0%" stop-color="#424242"/>\\n' +
            '  <stop offset="70%" stop-color="#212121"/>\\n' +
            '  <stop offset="100%" stop-color="#000000"/>\\n' +
            '</radialGradient>\\n';
        body = '<!-- Olive Base -->\\n' +
            '<circle cx="128" cy="128" r="40" fill="url(#oli-grad)" stroke="#000" stroke-width="3"/>\\n' +
            '<!-- Pimento/Hole -->\\n' +
            '<circle cx="128" cy="128" r="15" fill="#B71C1C" stroke="#7F0000" stroke-width="2"/>\\n' +
            '<circle cx="128" cy="128" r="6" fill="#7F0000" opacity="0.6"/>\\n' +
            '<!-- Extremely Glossy Highlight -->\\n' +
            '<path d="M 100 100 A 30 30 0 0 1 130 90" fill="none" stroke="#FFF" stroke-width="4" stroke-linecap="round" opacity="0.9"/>\\n' +
            '<circle cx="105" cy="115" r="2" fill="#FFF" opacity="0.8"/>\\n';
    }

    return wrapSVG({ defs: defs, body: body }, 256, 256);
}

function generateBowlVeggie(type) {
    let body = '<!-- Base contents -->\\n';
    let w = 100, h = 60;

    // Basic fill and shapes tailored per type
    if (type === 'tomato') {
        body += '<path d="M 15 50 Q 50 30 85 50 Z" fill="#D32F2F" />\\n' +
            '<circle cx="35" cy="40" r="14" fill="#F44336" stroke="#B71C1C" stroke-width="1.5" />\\n' +
            '<circle cx="65" cy="40" r="14" fill="#E53935" stroke="#B71C1C" stroke-width="1.5" />\\n' +
            '<circle cx="50" cy="35" r="15" fill="#FF5252" stroke="#B71C1C" stroke-width="1.5" />\\n' +
            '<path d="M 45 35 Q 50 30 55 35" fill="none" stroke="#FFF" stroke-width="2" stroke-linecap="round" opacity="0.6"/>\\n';
    } else if (type === 'lettuce') {
        body += '<path d="M 10 50 Q 50 20 90 50 Z" fill="#388E3C" />\\n' +
            '<path d="M 20 45 Q 35 25 50 35 Q 65 25 80 45 Z" fill="#81C784" stroke="#2E7D32" stroke-width="1.5" />\\n' +
            '<path d="M 30 50 Q 50 15 70 50 Z" fill="#A5D6A7" stroke="#2E7D32" stroke-width="1.5" />\\n' +
            '<path d="M 45 45 L 50 35 L 55 45" fill="none" stroke="#E8F5E9" stroke-width="1.5" stroke-linecap="round"/>\\n';
    } else if (type === 'arugula') {
        body += '<path d="M 15 50 Q 50 25 85 50 Z" fill="#1B5E20" />\\n' +
            '<path d="M 25 50 L 35 30 L 40 40 L 50 20 L 60 40 L 65 30 L 75 50 Z" fill="#4CAF50" stroke="#1B5E20" stroke-width="1.5" stroke-linejoin="round"/>\\n' +
            '<path d="M 35 50 L 50 30 L 65 50" fill="none" stroke="#C8E6C9" stroke-width="1.5" stroke-linecap="round"/>\\n';
    } else if (type === 'pickles') {
        body += '<path d="M 15 50 Q 50 30 85 50 Z" fill="#827717" />\\n' +
            '<ellipse cx="35" cy="45" rx="15" ry="8" fill="#CDDC39" stroke="#33691E" stroke-width="1.5" transform="rotate(-15 35 45)"/>\\n' +
            '<ellipse cx="65" cy="45" rx="15" ry="8" fill="#CDDC39" stroke="#33691E" stroke-width="1.5" transform="rotate(15 65 45)"/>\\n' +
            '<ellipse cx="50" cy="35" rx="16" ry="9" fill="#D4E157" stroke="#33691E" stroke-width="1.5"/>\\n' +
            '<path d="M 40 35 L 60 35 M 40 38 L 60 38" fill="none" stroke="#F0F4C3" stroke-width="1" opacity="0.8"/>\\n' +
            '<path d="M 45 32 Q 50 30 55 32" fill="none" stroke="#FFF" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>\\n';
    } else if (type === 'onion') {
        body += '<path d="M 15 50 Q 50 30 85 50 Z" fill="#7B1FA2" />\\n' +
            '<ellipse cx="40" cy="45" rx="16" ry="6" fill="none" stroke="#CE93D8" stroke-width="2" transform="rotate(-20 40 45)"/>\\n' +
            '<ellipse cx="40" cy="45" rx="13" ry="4" fill="none" stroke="#F3E5F5" stroke-width="1.5" transform="rotate(-20 40 45)"/>\\n' +
            '<ellipse cx="60" cy="45" rx="16" ry="6" fill="none" stroke="#CE93D8" stroke-width="2" transform="rotate(20 60 45)"/>\\n' +
            '<ellipse cx="60" cy="45" rx="13" ry="4" fill="none" stroke="#F3E5F5" stroke-width="1.5" transform="rotate(20 60 45)"/>\\n' +
            '<ellipse cx="50" cy="35" rx="18" ry="8" fill="none" stroke="#E1BEE7" stroke-width="2.5"/>\\n' +
            '<ellipse cx="50" cy="35" rx="14" ry="5" fill="none" stroke="#FFF" stroke-width="1.5"/>\\n';
    } else if (type === 'olives') {
        body += '<path d="M 15 50 Q 50 35 85 50 Z" fill="#000" />\\n' +
            '<circle cx="30" cy="45" r="8" fill="#212121" stroke="#000" stroke-width="1.5"/>\\n' +
            '<circle cx="30" cy="45" r="3" fill="#B71C1C"/>\\n' +
            '<circle cx="70" cy="45" r="8" fill="#212121" stroke="#000" stroke-width="1.5"/>\\n' +
            '<circle cx="70" cy="45" r="3" fill="#B71C1C"/>\\n' +
            '<circle cx="50" cy="35" r="9" fill="#424242" stroke="#000" stroke-width="1.5"/>\\n' +
            '<circle cx="50" cy="35" r="3.5" fill="#B71C1C"/>\\n' +
            '<path d="M 46 32 Q 48 30 50 31" fill="none" stroke="#FFF" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>\\n' +
            '<path d="M 27 42 Q 29 40 31 41" fill="none" stroke="#FFF" stroke-width="1" stroke-linecap="round" opacity="0.8"/>\\n';
    }

    // Wrap simple SVG without drop shadow
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">\\n' +
        body +
        '</svg>';
}

const veggies = ['tomato', 'lettuce', 'arugula', 'pickles', 'onion', 'olives'];
veggies.forEach(v => {
    fs.writeFileSync(path.join(outDir, 'top_' + v + '.svg'), generateVeggie(v));
    fs.writeFileSync(path.join(outDir, 'bowl_content_' + v + '.svg'), generateBowlVeggie(v));
});
console.log('Veggies generated!');
