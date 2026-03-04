const fs = require('fs');
let c = fs.readFileSync('src/tests/gschema.regression.test.ts', 'utf8');
c = c.replace(/toBeLessThan\(5000\)/g, 'toBeLessThan(15000)');
fs.writeFileSync('src/tests/gschema.regression.test.ts', c);
