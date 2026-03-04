const fs = require('fs');
let c = fs.readFileSync('src/tests/store.test.ts', 'utf8');
c = c.replace(/gschemaToDocument\(useAppStore\.getState\(\)\.gschemaGraph\)/g, 'gschemaToDocument(useAppStore.getState().gschemaGraph!)');
c = c.replace(/gschemaToDocument\(state\.gschemaGraph\)/g, 'gschemaToDocument(state.gschemaGraph!)');
fs.writeFileSync('src/tests/store.test.ts', c);
