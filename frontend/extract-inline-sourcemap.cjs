const fs = require('fs');
const path = require('path');
const assetsDir = path.join(__dirname, 'dist', 'assets');
const files = fs.readdirSync(assetsDir);
const jsFile = files.find((f) => /^index-.*\.js$/.test(f));
if (!jsFile) {
  console.error('index JS not found in dist/assets');
  process.exit(1);
}
const jsPath = path.join(assetsDir, jsFile);
const content = fs.readFileSync(jsPath, 'utf8');
// Look for inline sourceMappingURL
const dataUrlMatch = content.match(
  /\/\/[#@]\s*sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)\s*$/m
);
let mapJson = null;
if (dataUrlMatch) {
  const b64 = dataUrlMatch[1];
  const json = Buffer.from(b64, 'base64').toString('utf8');
  mapJson = JSON.parse(json);
} else {
  // Try to find sourceMappingURL in last 50kb
  const tail = content.slice(-50000);
  const match = tail.match(/sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/);
  if (match) {
    mapJson = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
  }
}
if (!mapJson) {
  console.error('inline sourcemap not found');
  process.exit(1);
}
const sources = mapJson.sources || [];
const contents = mapJson.sourcesContent || [];
const arr = [];
for (let i = 0; i < sources.length; i++) {
  const src = sources[i];
  const content = contents[i] || '';
  arr.push({ source: src, size: content.length });
}
arr.sort((a, b) => b.size - a.size);
fs.writeFileSync(
  path.join(__dirname, 'dist', 'bundle-top-sources.json'),
  JSON.stringify(arr.slice(0, 200), null, 2)
);
console.log('wrote dist/bundle-top-sources.json from', jsFile);
