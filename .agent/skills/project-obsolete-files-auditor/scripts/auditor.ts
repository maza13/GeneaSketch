import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface AuditConfig {
    includeGlobs: string[];
    excludeGlobs: string[];
    entrypoints: string[];
    docFolders: string[];
    keepFiles: string[];
    archiveFolder: string;
    thresholds: { score: number };
}

interface FileEntry {
    path: string;
    size: number;
    extension: string;
    mtime: Date;
    isBinary: boolean;
    content?: string;
}

interface Evidence {
    type: string;
    value: any;
    detail: string;
}

interface AuditItem {
    path: string;
    category: string;
    confidence: number;
    score: number;
    evidence: Evidence[];
    suggestedAction: 'KEEP' | 'UPDATE' | 'ARCHIVE' | 'DELETE_CANDIDATE';
    risk: 'low' | 'medium' | 'high';
    notes?: string;
}

const DEFAULT_CONFIG: AuditConfig = {
    includeGlobs: ['**/*'],
    excludeGlobs: ['node_modules', 'dist', 'build', '.git', 'release-dist', 'tsc.log'],
    entrypoints: ['src/index.tsx', 'src/main.tsx', 'src/App.tsx'],
    docFolders: ['docs', 'plans', 'design', 'notes'],
    keepFiles: ['package.json', 'tsconfig.json'],
    archiveFolder: '_archive',
    thresholds: { score: 50 },
};

async function main() {
    console.log('--- Starting Project Obsolete Files Audit (Native) ---');

    const rootDir = process.cwd();
    const config = loadConfig(rootDir);

    // Step 1: Inventory
    console.log('Step 1: Building inventory...');
    const inventory = getInventory(rootDir, config);
    console.log(`Inventory built: ${inventory.length} files.`);

    // Step 2: Reference Index
    console.log('Step 2: Building reference index...');
    const index = buildIndex(inventory);

    // Step 3: Tool Integration
    console.log('Step 3: Running external tools (depcheck)...');
    const toolResults = await runExternalTools(rootDir);

    // Step 4-5: Detection & Scoring
    console.log('Step 4-5: Analyzing files and scoring...');
    const items = analyzeFiles(inventory, index, toolResults, config);

    // Step 6: Reporting
    console.log('Step 6: Generating reports...');
    const report = generateReport(items, inventory, rootDir);

    writeReports(report, rootDir);
    console.log('--- Audit Complete ---');
}

function loadConfig(rootDir: string): AuditConfig {
    const configPath = path.join(rootDir, 'tools', 'obsolete-audit.config.json');
    if (fs.existsSync(configPath)) {
        try {
            const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return { ...DEFAULT_CONFIG, ...userConfig };
        } catch (e) {
            console.warn('Failed to parse config, using defaults.');
        }
    }
    return DEFAULT_CONFIG;
}

function getInventory(rootDir: string, config: AuditConfig): FileEntry[] {
    let filePaths: string[] = [];
    try {
        const output = execSync('git ls-files', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        filePaths = output.split('\n').map(p => p.trim()).filter(p => p !== '');
    } catch (e) {
        filePaths = walk(rootDir, rootDir, config.excludeGlobs);
    }

    const inventory: FileEntry[] = [];
    for (const p of filePaths) {
        const fullPath = path.join(rootDir, p);
        if (!fs.existsSync(fullPath)) continue;

        // Additional excludes check for git-provided list
        if (config.excludeGlobs.some(ex => p.includes(ex))) continue;

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) continue;

        const extension = path.extname(p).toLowerCase();
        const isBinary = isBinaryExtension(extension);

        inventory.push({
            path: p.replace(/\\/g, '/'),
            size: stats.size,
            extension,
            mtime: stats.mtime,
            isBinary,
            content: !isBinary && stats.size < 1024 * 512 ? fs.readFileSync(fullPath, 'utf8') : undefined,
        });
    }
    return inventory;
}

function walk(dir: string, rootDir: string, excludes: string[]): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        if (excludes.includes(file)) continue;
        const fullPath = path.resolve(dir, file);
        const relPath = path.relative(rootDir, fullPath);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath, rootDir, excludes));
        } else {
            results.push(relPath);
        }
    }
    return results;
}

function isBinaryExtension(ext: string): boolean {
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf', '.zip', '.exe', '.dll', '.so', '.dylib', '.node', '.ttf', '.woff', '.woff2', '.gltf', '.glb'];
    return binaryExtensions.includes(ext);
}

function buildIndex(inventory: FileEntry[]): Set<string> {
    const index = new Set<string>();
    for (const file of inventory) {
        if (file.content) {
            const tokens = file.content.match(/['"`][^'"`]+['"`]/g) || [];
            for (const token of tokens) {
                const cleanToken = token.slice(1, -1);
                index.add(cleanToken);
            }
            const words = file.content.split(/[\s/\\"'()<>\[\]{}]+/).filter(w => w.length > 3);
            for (const word of words) {
                index.add(word);
            }
        }
    }
    return index;
}

async function runExternalTools(rootDir: string): Promise<Map<string, Evidence[]>> {
    const toolResults = new Map<string, Evidence[]>();
    try {
        const depcheckOut = execSync('npx -y depcheck --json', { encoding: 'utf8', cwd: rootDir, stdio: ['pipe', 'pipe', 'ignore'] });
        const depcheckData = JSON.parse(depcheckOut);
        if (depcheckData.dependencies?.length) {
            const ev = { type: 'tool_depcheck', value: depcheckData.dependencies, detail: `Unused dependencies: ${depcheckData.dependencies.join(', ')}` };
            if (!toolResults.has('package.json')) toolResults.set('package.json', []);
            toolResults.get('package.json')!.push(ev);
        }
    } catch (e) { }
    return toolResults;
}

function analyzeFiles(inventory: FileEntry[], index: Set<string>, toolResults: Map<string, Evidence[]>, config: AuditConfig): AuditItem[] {
    const items: AuditItem[] = [];
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    for (const file of inventory) {
        if (config.keepFiles.some(k => file.path === k || file.path.endsWith(k))) continue;

        const evidence: Evidence[] = [];
        let score = 0;

        const toolEv = toolResults.get(file.path);
        if (toolEv) {
            evidence.push(...toolEv);
            score += 30;
        }

        const filename = path.basename(file.path);
        const pathWithoutExt = file.path.replace(/\.[^/.]+$/, '');
        const isReferenced = index.has(filename) || index.has(file.path) || index.has(pathWithoutExt);

        if (!isReferenced) {
            score += 40;
            evidence.push({ type: 'not_referenced', value: true, detail: 'No direct references found in search index.' });
        }

        if (file.mtime < sixMonthsAgo) {
            score += 15;
            evidence.push({ type: 'stale_mtime', value: file.mtime.toISOString(), detail: 'File hasn\'t been modified in > 6 months.' });
        }

        const isDoc = config.docFolders.some(f => file.path.startsWith(f)) || file.extension === '.md';
        const isStaleName = /plan|roadmap|todo|draft|v0|v1|old|deprecated|archive/i.test(file.path);

        let category = 'unusedSourceFile';
        if (isDoc) {
            category = isStaleName ? 'obsoletePlan' : 'staleDoc';
            if (isStaleName) { score += 25; evidence.push({ type: 'naming_convention', value: true, detail: 'Filename suggests obsolete content.' }); }
            if (score >= config.thresholds.score - 5) {
                evidence.push({ type: 'ai_check_required', value: true, detail: 'High score doc candidate for AI semantic audit.' });
            }
        } else if (file.isBinary) {
            category = 'orphanAsset';
        }

        if (score >= config.thresholds.score) {
            items.push({
                path: file.path,
                category,
                score,
                confidence: Math.min(score / 100, 1),
                evidence,
                suggestedAction: score > 75 ? 'ARCHIVE' : 'KEEP',
                risk: score > 85 ? 'low' : 'medium',
            });
        }
    }
    return items;
}

function generateReport(items: AuditItem[], inventory: FileEntry[], rootDir: string): any {
    return {
        meta: { timestamp: new Date().toISOString(), repoRoot: rootDir, mode: 'dry-run' },
        summary: {
            totalFiles: inventory.length,
            candidates: items.length,
            byCategory: items.reduce((acc, it) => { acc[it.category] = (acc[it.category] || 0) + 1; return acc; }, {} as Record<string, number>),
        },
        items,
    };
}

function writeReports(report: any, rootDir: string) {
    const reportsDir = path.join(rootDir, 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

    fs.writeFileSync(path.join(reportsDir, 'obsolete_audit.json'), JSON.stringify(report, null, 2));

    let md = `# Obsolete Files Audit Report\n\nGenerated: ${report.meta.timestamp}\n\n`;
    md += `## Summary\n- Total analyzed: ${report.summary.totalFiles}\n- Deletion/Archive candidates: ${report.summary.candidates}\n\n`;

    md += `## Top Candidates\n\n| Path | Category | Score | Action |\n| :--- | :--- | :--- | :--- |\n`;
    report.items.sort((a: any, b: any) => b.score - a.score).slice(0, 50).forEach((it: any) => {
        md += `| ${it.path} | ${it.category} | ${it.score} | ${it.suggestedAction} |\n`;
    });

    md += `\n## Details\n\n`;
    report.items.sort((a: any, b: any) => b.score - a.score).slice(0, 20).forEach((it: any) => {
        md += `### ${it.path}\n- **Action**: ${it.suggestedAction}\n- **Category**: ${it.category}\n- **Evidence**:\n`;
        it.evidence.forEach((ev: any) => md += `  - [${ev.type}] ${ev.detail}\n`);
        md += `\n`;
    });

    fs.writeFileSync(path.join(reportsDir, 'obsolete_audit.md'), md);
}

main().catch(console.error);
