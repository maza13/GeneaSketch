import fs from 'node:fs';
import path from 'node:path';

// Simple recursive walker
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}

const srcDir = path.resolve('src');
const allFiles = getAllFiles(srcDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

let violations = 0;
const forbidden = ['_journal', '_nextOpSeq'];

console.log(`Checking ${allFiles.length} files for internal property bypass...`);

for (const file of allFiles) {
    // Allow access within GSchemaGraph.ts itself
    if (file.endsWith('GSchemaGraph.ts')) continue;

    const content = fs.readFileSync(file, 'utf8');
    for (const prop of forbidden) {
        // Look for .prop access
        if (content.includes(`.${prop}`)) {
            console.error(`VIOLATION in ${file}: Direct access to ${prop} detected.`);
            violations++;
        }
    }
}

if (violations > 0) {
    console.error(`\nFAILED: Found ${violations} unauthorized internal property accesses.`);
    process.exit(1);
} else {
    console.log('SUCCESS: No unauthorized internal property accesses found.');
    process.exit(0);
}
