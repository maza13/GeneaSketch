const fs = require('fs');
let c = fs.readFileSync('src/tests/store.test.ts', 'utf8');

if (!c.includes('gschemaToDocument')) {
    c = c.replace('import { createNewTree }', 'import { gschemaToDocument } from "@/core/gschema/GedcomBridge";\nimport { createNewTree }');
}

c = c.replace(/\.setDocument\(([^)]+)\)/g, '.loadFromImport({ document: $1 })');
c = c.replace(/document: null,/g, 'gschemaGraph: null,');
c = c.replace(/state\.document\?\./g, '(state.gschemaGraph ? gschemaToDocument(state.gschemaGraph) : undefined)?.');
c = c.replace(/useAppStore\.getState\(\)\.document\?\./g, '(useAppStore.getState().gschemaGraph ? gschemaToDocument(useAppStore.getState().gschemaGraph) : undefined)?.');
c = c.replace(/state\.document(?!\w)/g, '(state.gschemaGraph ? gschemaToDocument(state.gschemaGraph) : undefined)');

fs.writeFileSync('src/tests/store.test.ts', c);
