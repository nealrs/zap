#!/usr/bin/env node

/**
 * Headless Audio Asset Generator for BubbleZap 3D
 * Uses Puppeteer to render audio files and save them directly to app/audio/
 * Run: node tools/generate-audio-headless.js
 */

import puppeteer from 'puppeteer';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const outputDir = path.join(rootDir, 'app', 'audio');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('🎵 BubbleZap 3D - Headless Audio Asset Generator');
console.log('================================================\n');

// Start temporary server on port 6767 that serves both app/ and tools/
console.log('🚀 Starting temporary server on port 6767...');

// Create a simple express server inline
const app = express();

// Serve app directory
app.use(express.static(path.join(rootDir, 'app')));
// Serve tools directory for the generator HTML
app.use('/tools', express.static(path.join(rootDir, 'tools')));

const serverInstance = app.listen(6767, () => {
    console.log('✅ Server started\n');
});

console.log('🌐 Launching headless browser...');
const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();

// Enable console logging from browser
page.on('console', msg => {
    const text = msg.text();
    console.log(`[Browser] ${text}`);
});

// Log page errors
page.on('pageerror', error => {
    console.error('[Browser Error]', error.message);
});

// Log request failures
page.on('requestfailed', request => {
    console.error('[Request Failed]', request.url());
});

// Log responses to see 404s
page.on('response', response => {
    if (response.status() === 404) {
        console.error('[404 Not Found]', response.url());
    }
});

console.log('📄 Loading audio generator page...\n');
await page.goto('http://localhost:6767/tools/generate-audio-standalone.html', {
    waitUntil: 'networkidle0'
});

// Wait for page to be fully loaded
await page.waitForSelector('#generateBtn');

console.log('🎵 Starting audio generation...\n');

// Store files in browser context
await page.evaluate(() => {
    window.generatedFiles = {};
});

// Inject file saving logic
await page.exposeFunction('saveFile', (filename, arrayBuffer) => {
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`✅ Saved: ${filename}`);
});

// Override the downloadBlob function to save files directly
await page.evaluate(() => {
    // Override downloadBlob to store files instead
    const originalDownloadBlob = window.downloadBlob;
    window.downloadBlob = function(blob, filename) {
        // Store the blob for later
        window.generatedFiles[filename] = blob;
    };
    
    // Override the download as zip function to save files individually
    window.downloadAsZip = async function() {
        for (const [filename, blob] of Object.entries(window.generatedFiles)) {
            const arrayBuffer = await blob.arrayBuffer();
            await window.saveFile(filename, arrayBuffer);
        }
    };
});

// Click generate button
await page.click('#generateBtn');

// Wait for generation to complete (look for the download button to be enabled)
console.log('⏳ Generating audio files (this may take 30-60 seconds)...\n');

await page.waitForFunction(
    () => !document.getElementById('downloadZipBtn').disabled,
    { timeout: 120000 }
);

console.log('\n📦 Saving files to app/audio/...\n');

// Trigger the save
await page.evaluate(() => {
    window.downloadAsZip();
});

// Wait a bit for all files to be saved
await new Promise(resolve => setTimeout(resolve, 2000));

console.log('\n✅ Audio generation complete!');
console.log(`📁 Files saved to: ${outputDir}`);

// List generated files
const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.wav'));
console.log(`\n🎵 Generated ${files.length} audio files:`);
files.forEach(f => {
    const stats = fs.statSync(path.join(outputDir, f));
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   - ${f} (${sizeMB} MB)`);
});

// Cleanup
console.log('\n🧹 Cleaning up...');
await browser.close();
serverInstance.close();

console.log('✅ Done!\n');
process.exit(0);
