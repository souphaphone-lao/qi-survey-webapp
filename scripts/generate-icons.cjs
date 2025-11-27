/**
 * Generate PWA Icons
 *
 * Converts icon.svg to required PNG sizes for PWA
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSvgPath = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

const sizes = [
    { size: 192, filename: 'icon-192.png' },
    { size: 512, filename: 'icon-512.png' }
];

async function generateIcons() {
    console.log('🎨 Generating PWA icons...\n');

    // Check if SVG exists
    if (!fs.existsSync(iconSvgPath)) {
        console.error('❌ Error: icon.svg not found at', iconSvgPath);
        process.exit(1);
    }

    for (const { size, filename } of sizes) {
        const outputPath = path.join(outputDir, filename);

        try {
            await sharp(iconSvgPath)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toFile(outputPath);

            const stats = fs.statSync(outputPath);
            const fileSizeKB = (stats.size / 1024).toFixed(2);

            console.log(`✅ Generated ${filename} (${size}×${size}) - ${fileSizeKB} KB`);
        } catch (error) {
            console.error(`❌ Error generating ${filename}:`, error.message);
            process.exit(1);
        }
    }

    console.log('\n🎉 All PWA icons generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - public/icons/icon-192.png');
    console.log('  - public/icons/icon-512.png');
    console.log('\nYou can now build the PWA with: npm run build');
}

generateIcons().catch(error => {
    console.error('❌ Failed to generate icons:', error);
    process.exit(1);
});
