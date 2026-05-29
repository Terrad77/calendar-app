const fs = require('fs');
const assetsDir = 'dist/assets';
const files = fs.readdirSync(assetsDir);
const mapFile = files.find((f) => /^index-.*\.js\.map$/.test(f));
if (!mapFile) {
  console.error('map missing');
  process.exit(0);
}
const path = `${assetsDir}/${mapFile}`;
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
