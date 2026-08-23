const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf-8');

html = html.replace(/<title>.*?<\/title>/gi, '');
html = html.replace(/<meta\s+[^>]*property=["']og:[^"']*["'][^>]*>/gi, '');
html = html.replace(/<meta\s+[^>]*name=["']description["'][^>]*>/gi, '');
html = html.replace(/<meta\s+[^>]*name=["']twitter:[^"']*["'][^>]*>/gi, '');

console.log('AFTER CLEAN REPLACEMENT:');
console.log(html);
