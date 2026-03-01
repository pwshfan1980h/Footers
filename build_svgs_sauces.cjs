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

function generateSauce(type) {
    let defs = '';
    let body = '';

    if (type === 'mayo') {
        defs = '<linearGradient id="mayo-grad" x1="0%" y1="0%" x2="100%" y2="0%">\\n' +
            '  <stop offset="0%" stop-color="#E0E0E0"/>\\n' +
            '  <stop offset="30%" stop-color="#FFFFFF"/>\\n' +
            '  <stop offset="80%" stop-color="#F5F5F5"/>\\n' +
            '  <stop offset="100%" stop-color="#9E9E9E"/>\\n' +
            '</linearGradient>\\n' +
            '<linearGradient id="cap-mayo" x1="0%" y1="0%" x2="100%" y2="0%">\\n' +
            '  <stop offset="0%" stop-color="#0288D1"/>\\n' +
            '  <stop offset="40%" stop-color="#03A9F4"/>\\n' +
            '  <stop offset="100%" stop-color="#01579B"/>\\n' +
            '</linearGradient>\\n';

        body = '<!-- Bottle Body -->\\n' +
            '<path d="M 30 80 Q 24 100 24 140 L 24 200 Q 24 220 34 220 L 94 220 Q 104 220 104 200 L 104 140 Q 104 100 98 80 Z" fill="url(#mayo-grad)" stroke="#BDBDBD" stroke-width="2"/>\\n' +
            '<!-- Neck -->\\n' +
            '<path d="M 44 80 L 44 50 L 84 50 L 84 80 Z" fill="url(#mayo-grad)" stroke="#BDBDBD" stroke-width="2"/>\\n' +
            '<!-- Highlight -->\\n' +
            '<path d="M 35 100 L 35 200" fill="none" stroke="#FFF" stroke-width="6" stroke-linecap="round" opacity="0.8"/>\\n' +
            '<!-- Cap -->\\n' +
            '<path d="M 40 50 L 40 25 Q 40 20 45 20 L 83 20 Q 88 20 88 25 L 88 50 Z" fill="url(#cap-mayo)" stroke="#01579B" stroke-width="2"/>\\n' +
            '<path d="M 45 25 L 45 45" fill="none" stroke="#B3E5FC" stroke-width="3" stroke-linecap="round"/>\\n' +
            '<!-- Cone tip -->\\n' +
            '<path d="M 55 20 L 60 5 L 68 5 L 73 20 Z" fill="url(#cap-mayo)" stroke="#01579B" stroke-width="2"/>\\n' +
            '<!-- Label -->\\n' +
            '<path d="M 24 120 L 104 120 L 104 170 L 24 170 Z" fill="#E1F5FE" opacity="0.9"/>\\n' +
            '<path d="M 24 120 L 104 120" fill="none" stroke="#0288D1" stroke-width="2"/>\\n' +
            '<path d="M 24 170 L 104 170" fill="none" stroke="#0288D1" stroke-width="2"/>\\n' +
            '<text x="64" y="152" font-family="Arial, sans-serif" font-size="20" font-weight="900" fill="#01579B" text-anchor="middle" letter-spacing="1">MAYO</text>\\n';
    } else if (type === 'mustard') {
        defs = '<linearGradient id="must-grad" x1="0%" y1="0%" x2="100%" y2="0%">\\n' +
            '  <stop offset="0%" stop-color="#FBC02D"/>\\n' +
            '  <stop offset="30%" stop-color="#FFF176"/>\\n' +
            '  <stop offset="80%" stop-color="#FDD835"/>\\n' +
            '  <stop offset="100%" stop-color="#F57F17"/>\\n' +
            '</linearGradient>\\n' +
            '<linearGradient id="cap-must" x1="0%" y1="0%" x2="100%" y2="0%">\\n' +
            '  <stop offset="0%" stop-color="#C62828"/>\\n' +
            '  <stop offset="40%" stop-color="#F44336"/>\\n' +
            '  <stop offset="100%" stop-color="#B71C1C"/>\\n' +
            '</linearGradient>\\n';

        body = '<!-- Bottle Body -->\\n' +
            '<path d="M 30 80 Q 24 100 24 140 L 24 200 Q 24 220 34 220 L 94 220 Q 104 220 104 200 L 104 140 Q 104 100 98 80 Z" fill="url(#must-grad)" stroke="#F57F17" stroke-width="2"/>\\n' +
            '<!-- Neck -->\\n' +
            '<path d="M 44 80 L 44 50 L 84 50 L 84 80 Z" fill="url(#must-grad)" stroke="#F57F17" stroke-width="2"/>\\n' +
            '<!-- Highlight -->\\n' +
            '<path d="M 35 100 L 35 200" fill="none" stroke="#FFF" stroke-width="6" stroke-linecap="round" opacity="0.6"/>\\n' +
            '<!-- Cap -->\\n' +
            '<path d="M 40 50 L 40 25 Q 40 20 45 20 L 83 20 Q 88 20 88 25 L 88 50 Z" fill="url(#cap-must)" stroke="#B71C1C" stroke-width="2"/>\\n' +
            '<path d="M 45 25 L 45 45" fill="none" stroke="#FFCDD2" stroke-width="3" stroke-linecap="round"/>\\n' +
            '<!-- Cone tip -->\\n' +
            '<path d="M 55 20 L 60 5 L 68 5 L 73 20 Z" fill="url(#cap-must)" stroke="#B71C1C" stroke-width="2"/>\\n' +
            '<!-- Label -->\\n' +
            '<path d="M 24 120 L 104 120 L 104 170 L 24 170 Z" fill="#FFEB3B" opacity="0.9"/>\\n' +
            '<path d="M 24 120 L 104 120" fill="none" stroke="#C62828" stroke-width="2"/>\\n' +
            '<path d="M 24 170 L 104 170" fill="none" stroke="#C62828" stroke-width="2"/>\\n' +
            '<text x="64" y="152" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="#B71C1C" text-anchor="middle" letter-spacing="0.5">MUSTARD</text>\\n';
    }

    return wrapSVG({ defs: defs, body: body }, 128, 256);
}

function generateTray(isThin) {
    let w = 200, h = isThin ? 100 : 140;
    // Inner metallic plastic tray look instead of flat wood (make it a sleek dark grey/black tray like modern fast food)
    let defs = '<linearGradient id="tray-grad" x1="0%" y1="0%" x2="100%" y2="100%">\\n' +
        '  <stop offset="0%" stop-color="#424242"/>\\n' +
        '  <stop offset="50%" stop-color="#212121"/>\\n' +
        '  <stop offset="100%" stop-color="#111111"/>\\n' +
        '</linearGradient>\\n' +
        '<linearGradient id="inner-grad" x1="0%" y1="0%" x2="0%" y2="100%">\\n' +
        '  <stop offset="0%" stop-color="#212121"/>\\n' +
        '  <stop offset="100%" stop-color="#3A3A3A"/>\\n' +
        '</linearGradient>\\n' +
        '<pattern id="pattern-dots" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">\\n' +
        '  <circle cx="2" cy="2" r="0.5" fill="#424242"/>\\n' +
        '</pattern>\\n';

    let body = '';
    if (isThin) {
        body += '<!-- Main Board -->\\n' +
            '<path d="M 10 20 Q 10 10 20 10 L 180 10 Q 190 10 190 20 L 190 80 Q 190 90 180 90 L 20 90 Q 10 90 10 80 Z" fill="url(#tray-grad)" stroke="#000" stroke-width="2"/>\\n' +
            '<!-- Inner Area -->\\n' +
            '<path d="M 18 20 Q 18 18 20 18 L 180 18 Q 182 18 182 20 L 182 80 Q 182 82 180 82 L 20 82 Q 18 82 18 80 Z" fill="url(#inner-grad)"/>\\n' +
            '<!-- Texture -->\\n' +
            '<path d="M 18 20 Q 18 18 20 18 L 180 18 Q 182 18 182 20 L 182 80 Q 182 82 180 82 L 20 82 Q 18 82 18 80 Z" fill="url(#pattern-dots)"/>\\n' +
            '<!-- Bevel Inner Shadow/Highlight -->\\n' +
            '<path d="M 18 20 L 180 20" fill="none" stroke="#111" stroke-width="3" opacity="0.8"/>\\n' +
            '<path d="M 18 80 L 180 80" fill="none" stroke="#616161" stroke-width="2" opacity="0.6"/>\\n' +
            '<path d="M 20 18 L 20 82" fill="none" stroke="#111" stroke-width="3" opacity="0.8"/>\\n' +
            '<path d="M 180 18 L 180 82" fill="none" stroke="#555" stroke-width="2" opacity="0.5"/>\\n' +
            '<!-- Rim Highlight Top -->\\n' +
            '<path d="M 20 12 L 180 12" fill="none" stroke="#757575" stroke-width="2" stroke-linecap="round" opacity="0.8"/>\\n';
    } else {
        body += '<!-- Main Board -->\\n' +
            '<path d="M 10 20 Q 10 10 20 10 L 180 10 Q 190 10 190 20 L 190 120 Q 190 130 180 130 L 20 130 Q 10 130 10 120 Z" fill="url(#tray-grad)" stroke="#000" stroke-width="2"/>\\n' +
            '<!-- Inner Area -->\\n' +
            '<path d="M 18 20 Q 18 18 20 18 L 180 18 Q 182 18 182 20 L 182 120 Q 182 122 180 122 L 20 122 Q 18 122 18 120 Z" fill="url(#inner-grad)"/>\\n' +
            '<!-- Texture -->\\n' +
            '<path d="M 18 20 Q 18 18 20 18 L 180 18 Q 182 18 182 20 L 182 120 Q 182 122 180 122 L 20 122 Q 18 122 18 120 Z" fill="url(#pattern-dots)"/>\\n' +
            '<!-- Bevel Inner Shadow/Highlight -->\\n' +
            '<path d="M 18 20 L 180 20" fill="none" stroke="#111" stroke-width="3" opacity="0.8"/>\\n' +
            '<path d="M 18 120 L 180 120" fill="none" stroke="#616161" stroke-width="2" opacity="0.6"/>\\n' +
            '<path d="M 20 18 L 20 122" fill="none" stroke="#111" stroke-width="3" opacity="0.8"/>\\n' +
            '<path d="M 180 18 L 180 122" fill="none" stroke="#555" stroke-width="2" opacity="0.5"/>\\n' +
            '<!-- Rim Highlight Top -->\\n' +
            '<path d="M 20 12 L 180 12" fill="none" stroke="#757575" stroke-width="2" stroke-linecap="round" opacity="0.8"/>\\n';
    }

    return wrapSVG({ defs: defs, body: body }, w, h);
}

fs.writeFileSync(path.join(outDir, 'sauce_mayo_bottle.svg'), generateSauce('mayo'));
fs.writeFileSync(path.join(outDir, 'sauce_mustard_bottle.svg'), generateSauce('mustard'));
fs.writeFileSync(path.join(outDir, 'tray.svg'), generateTray(false));
fs.writeFileSync(path.join(outDir, 'tray_thin.svg'), generateTray(true));
console.log('Sauces and trays generated!');
