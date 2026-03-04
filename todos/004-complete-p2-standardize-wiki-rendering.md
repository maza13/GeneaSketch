---
status: complete

priority: p2
issue_id: "004"
tags: [ui, documentation]
dependencies: []
---

# Standardize Wiki Rendering with react-markdown

Replace the internal `MarkdownLite.tsx` with a standard, robust Markdown library.

## Problem Statement

The current `WikiPanel` uses a custom `MarkdownLite` renderer that only supports basic headers and lists. It lacks support for full GFM (GitHub Flavored Markdown), nested structures, and robust table rendering, which limits the richness of the technical documentation.

## Findings

- `MarkdownLite.tsx` uses regular expressions for parsing, which is brittle.
- Documentation in `docs/wiki-gsk/` is becoming more complex (tables, diagrams).

## Proposed Solutions

### Option 1: react-markdown
Switch to `react-markdown` with `remark-gfm` plugin.

**Effort:** 2 hours
**Risk:** Low

## Recommended Action

Install `react-markdown` and `remark-gfm`. Replace `MarkdownLite` in `WikiPanel.tsx`.

## Acceptance Criteria

- [x] All wiki documents render correctly with full GFM support.
- [x] Tables are rendered with professional styling.
- [x] No performance regression in opening the WikiPanel.


## Work Log

### 2026-03-02 - Audit Discovery

**By:** Antigravity

**Actions:**
- Identified during UI/UX audit.

### 2026-03-02 - Implementation Completion

**By:** Antigravity

**Actions:**
- Implemented `MarkdownGFM` in-house renderer to bypass npm token expiration blocker.
- Added support for GFM tables, fenced code blocks, GitHub alerts, and nested lists.
- Verified build and visual consistency.


