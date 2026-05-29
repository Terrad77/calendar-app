const fs = require('fs');
const path = require('path');
// 1x1 transparent PNG base64 (very small, compatible as favicon in modern browsers)
const b64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const buf = Buffer.from(b64, 'base64');
const out = path.join(__dirname, 'dist', 'favicon.ico');
fs.writeFileSync(out, buf);
console.log('Wrote', out, '(', buf.length, 'bytes )');
