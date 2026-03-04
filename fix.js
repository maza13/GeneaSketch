const fs = require('fs');
let c = fs.readFileSync('src/tests/store.test.ts', 'utf8');
c = c.replace(/\.setDocument\(([^)]+)\)/g, '.loadFromImport({ document: $1 })');
c = c.replace(/document: null,/g, 'gschemaGraph: null,');
c = c.replace(/state\.document\?\./g, '(state.gschemaGraph ? require("@/core/gschema/GedcomBridge").gschemaToDocument(state.gschemaGraph) : undefined)?.');
c = c.replace(/useAppStore\.getState\(\)\.document\?\./g, '(useAppStore.getState().gschemaGraph ? require("@/core/gschema/GedcomBridge").gschemaToDocument(useAppStore.getState().gschemaGraph) : undefined)?.');
c = c.replace(/state\.document/g, '(state.gschemaGraph ? require("@/core/gschema/GedcomBridge").gschemaToDocument(state.gschemaGraph) : undefined)');
fs.writeFileSync('src/tests/store.test.ts', c);
