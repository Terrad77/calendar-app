const fs = require('fs');
const path = 'dist/assets/index-B3uzuKPl.js.map';
if (!fs.existsSync(path)) {
  console.error('map missing');
  process.exit(0);
}
const m = JSON.parse(fs.readFileSync(path, 'utf8'));
const sources = m.sources || [];
const contents = m.sourcesContent || [];
const arr = [];
for (let i = 0; i < sources.length; i++) {
  const src = sources[i];
  const content = contents[i] || '';
  arr.push({ source: src, size: content.length });
}
arr.sort((a, b) => b.size - a.size);
fs.writeFileSync('dist/bundle-top-sources.json', JSON.stringify(arr.slice(0, 80), null, 2));
console.log('wrote dist/bundle-top-sources.json');
