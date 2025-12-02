const fs = require('fs');
const path = require('path');

// Simple SVG creation for the og:image
const createOGImageSVG = () => {
    const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bg)"/>

        <!-- Content -->
        <text x="600" y="200" text-anchor="middle" fill="white" font-size="80" font-family="Arial, sans-serif" font-weight="bold">🧠</text>

        <text x="600" y="320" text-anchor="middle" fill="white" font-size="64" font-family="Arial, sans-serif" font-weight="bold">MBTI Personality Test</text>

        <text x="600" y="400" text-anchor="middle" fill="white" font-size="32" font-family="Arial, sans-serif" opacity="0.9">Discover your unique personality type</text>
        <text x="600" y="440" text-anchor="middle" fill="white" font-size="32" font-family="Arial, sans-serif" opacity="0.9">with our comprehensive assessment</text>
    </svg>
    `;

    return svg;
};

// Write the SVG file
const svgContent = createOGImageSVG();
const svgPath = path.join(__dirname, '../public/og-image.svg');
const pngPath = path.join(__dirname, '../public/og-image.png');

// Save as SVG first
fs.writeFileSync(svgPath, svgContent);

console.log('✅ SVG OG image created at:', svgPath);
console.log('📄 Note: For PNG conversion, you can use:');
console.log('  1. Online SVG to PNG converters');
console.log('  2. CLI tools like: rsvg-convert og-image.svg -o og-image.png');
console.log('  3. Or use the SVG directly: og-image.svg');

// Update HTML to use SVG as fallback
const indexPath = path.join(__dirname, '../public/index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace PNG references with SVG
indexContent = indexContent.replace(/og-image\.png/g, 'og-image.svg');
fs.writeFileSync(indexPath, indexContent);

console.log('✅ Updated index.html to use og-image.svg');