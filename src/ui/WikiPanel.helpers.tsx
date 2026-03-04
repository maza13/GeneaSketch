import type React from "react";

export type WikiTab = "software" | "tech" | "ux";

export type WikiFile = {
  id: string;
  name: string;
  content: string;
  path: string;
};

export type FilesByTab = Record<WikiTab, WikiFile[]>;

export type TocEntry = {
  id: string;
  level: 1 | 2 | 3;
  text: string;
};

type WikiIndex = {
  byPath: Map<string, { file: WikiFile; tab: WikiTab }>;
};

export function normalizePosix(path: string): string {
  const out: string[] = [];
  const parts = path.split("/");
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return "/" + out.join("/");
}

function dirnamePosix(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "/";
}

function normalizeHash(hash?: string | null) {
  if (!hash) return undefined;
  return hash.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function buildWikiIndex(filesByTab: FilesByTab): WikiIndex {
  const byPath = new Map<string, { file: WikiFile; tab: WikiTab }>();
  (Object.keys(filesByTab) as WikiTab[]).forEach((tab) => {
    filesByTab[tab].forEach((file) => byPath.set(file.path, { file, tab }));
  });
  return { byPath };
}

export function resolveWikiTarget(currentFile: WikiFile, href: string, index: WikiIndex) {
  const trimmed = href.trim();
  if (!trimmed || trimmed === "." || trimmed === "./") return null;

  const hashMatch = trimmed.match(/#(.+)$/);
  const hash = normalizeHash(hashMatch ? hashMatch[1] : undefined);
  const pathPart = trimmed.split("#")[0].split("?")[0];

  if (!pathPart || pathPart.startsWith("#")) {
    const self = index.byPath.get(currentFile.path);
    if (!self) return null;
    return { tab: self.tab, file: self.file, hash };
  }

  const baseDir = dirnamePosix(currentFile.path);
  const absolute = pathPart.startsWith("/") ? normalizePosix(pathPart) : normalizePosix(`${baseDir}/${pathPart}`);
  const candidate = absolute.endsWith(".md") ? absolute : `${absolute}.md`;

  const found = index.byPath.get(absolute) || index.byPath.get(candidate);
  if (!found) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[WikiPanel] Link target not found", { href, absolute, candidate });
    }
    return null;
  }

  return { tab: found.tab, file: found.file, hash };
}

export function extractToc(content: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const m = line.match(/^\s*(#{1,3})\s+(.+)/);
    if (!m) continue;
    const level = m[1].length as 1 | 2 | 3;
    const text = m[2].trim();
    const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    entries.push({ id, level, text });
  }
  return entries;
}

export function parseInline(
  text: string,
  keyPrefix: string,
  onLinkNavigate: (href: string) => void
): React.ReactNode[] {
  const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const key = `${keyPrefix}-il-${i++}`;
    if (match[2]) parts.push(<strong key={key}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={key}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={key} className="wiki-inline-code">{match[4]}</code>);
    else if (match[5]) {
      const href = match[6];
      const external = /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
      parts.push(
        <a
          key={key}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          onClick={(e) => {
            if (external) return;
            const cleanHref = href.split("#")[0].split("?")[0];
            const isWikiLike =
              href.startsWith("#") ||
              cleanHref.endsWith(".md") ||
              cleanHref.startsWith("/docs/") ||
              href.startsWith("./") ||
              href.startsWith("../");
            if (!isWikiLike) return;
            e.preventDefault();
            e.stopPropagation();
            onLinkNavigate(href);
          }}
        >
          {match[5]}
        </a>
      );
    }
    last = pattern.lastIndex;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
