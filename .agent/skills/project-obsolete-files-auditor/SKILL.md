---
name: project-obsolete-files-auditor
description: Analyze the repository to detect obsolete, unused, or stale files (source code, assets, documentation, and dependencies). Proposed cleanups without deleting files automatically. Trigger when the user asks to clean up the repo, find unused files, optimize project size, or audit stale documentation.
---

# Project Obsolete Files Auditor

This skill helps maintain repository health by identifying files that are no longer needed. It performs a deterministic audit using local search and specialized tools, with an optional AI semantic check for documentation.

## Capabilities

- **Inventory Audit**: Lists all files tracked by git or the filesystem.
- **Reference Indexing**: Detects where files are referenced (imports, docs, configs).
- **Unused Code Detection**: Identifies unimported source files and unused exports.
- **Asset Cleanup**: Finds orphan images, icons, and other assets.
- **Stale Docs Analysis**: Heuristics + AI to find obsolete plans and notes.
- **Dependency Audit**: Lists unused/missing npm dependencies.

## Usage

Run the auditor via the bundled script:

```bash
npx tsx .agents/skills/project-obsolete-files-auditor/scripts/auditor.ts
```

### Configuration

Customize the audit in `tools/obsolete-audit.config.json`:

```json
{
  "includeGlobs": ["src/**/*", "docs/**/*"],
  "excludeGlobs": ["node_modules/**/*", "dist/**/*", "build/**/*"],
  "entrypoints": ["src/main.tsx"],
  "docFolders": ["docs", "plans"],
  "thresholds": { "score": 70 }
}
```

## Report Artifacts

The skill generates:
- `reports/obsolete_audit.json`: Machine-readable results for automation.
- `reports/obsolete_audit.md`: Human-readable summary and suggestions.

## Ethics & Safety

- **Read-Only**: This skill NEVER deletes or moves files automatically. It only suggests actions.
- **Privacy**: AI classification only uses small document snippets and high-level project metadata.
