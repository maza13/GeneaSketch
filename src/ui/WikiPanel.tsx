import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const techWikiFiles = import.meta.glob("/docs/wiki-gsk/*.md", { query: "?raw", eager: true });
const softwareWikiFiles = import.meta.glob("/docs/wiki-software/*.md", { query: "?raw", eager: true });
const uxWikiFiles = import.meta.glob("/docs/wiki-uxdesign/*.md", { query: "?raw", eager: true });

type WikiTab = "software" | "tech" | "ux";

type WikiFile = {
  id: string;
  name: string;
  content: string;
  path: string;
};

type TocEntry = {
  id: string;
  level: 1 | 2 | 3;
  text: string;
};

function formatFileName(filename: string): string {
  // Remove .md extension
  let name = filename.replace(".md", "");
  // Remove numeric prefix like "01_", "02_", "01 ", etc.
  name = name.replace(/^\d+[_\s-]+/, "");
  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]/g, " ");
  // Capitalize first letter of each word
  name = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return name;
}

function processFiles(glob: Record<string, unknown>): WikiFile[] {
  return Object.entries(glob)
    .map(([path, module]) => {
      const filename = path.split("/").pop() || "";
      return {
        id: filename,
        name: formatFileName(filename),
        content: (module as { default: string }).default,
        path,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

const FILES_TECH = processFiles(techWikiFiles);
const FILES_SOFTWARE = processFiles(softwareWikiFiles);
const FILES_UX = processFiles(uxWikiFiles);

type FilesByTab = Record<WikiTab, WikiFile[]>;

type WikiIndex = {
  byPath: Map<string, { file: WikiFile; tab: WikiTab }>;
};

function normalizePosix(path: string): string {
  const out: string[] = [];
  const parts = path.split("/");
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") { out.pop(); continue; }
    out.push(part);
  }
  return "/" + out.join("/");
}

function dirnamePosix(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || "/";
}

function buildWikiIndex(filesByTab: FilesByTab): WikiIndex {
  const byPath = new Map<string, { file: WikiFile; tab: WikiTab }>();
  (Object.keys(filesByTab) as WikiTab[]).forEach((tab) => {
    filesByTab[tab].forEach((file) => byPath.set(file.path, { file, tab }));
  });
  return { byPath };
}

function normalizeHash(hash?: string | null) {
  if (!hash) return undefined;
  return hash.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function resolveWikiTarget(currentFile: WikiFile, href: string, index: WikiIndex) {
  const trimmed = href.trim();
  if (!trimmed || trimmed === "." || trimmed === "./") return null;

  const hashMatch = trimmed.match(/#(.+)$/);
  const hash = normalizeHash(hashMatch ? hashMatch[1] : undefined);
  const pathPart = trimmed.split("#")[0].split("?")[0];

  // Intra-page anchor
  if (!pathPart || pathPart.startsWith("#")) {
    const self = index.byPath.get(currentFile.path);
    if (!self) return null;
    return { tab: self.tab, file: self.file, hash };
  }

  const baseDir = dirnamePosix(currentFile.path);
  const absolute = pathPart.startsWith("/") ? normalizePosix(pathPart) : normalizePosix(`${baseDir}/${pathPart}`);
  const candidate = absolute.endsWith(".md") ? absolute : `${absolute}.md`;

  const found =
    index.byPath.get(absolute) ||
    index.byPath.get(candidate);

  if (!found) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[WikiPanel] Link target not found", { href, absolute, candidate });
    }
    return null;
  }

  return { tab: found.tab, file: found.file, hash };
}

function extractToc(content: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
    if (inCodeBlock) continue;
    const m = line.match(/^\s*(#{1,3})\s+(.+)/);
    if (m) {
      const level = m[1].length as 1 | 2 | 3;
      const text = m[2].trim();
      const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      entries.push({ id, level, text });
    }
  }
  return entries;
}

function parseInline(
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
      const cleanHref = href.split("#")[0].split("?")[0];
      const isWikiLike = href.startsWith("#") || cleanHref.endsWith(".md") || cleanHref.startsWith("/docs/") || href.startsWith("./") || href.startsWith("../");
      const attrHref = isWikiLike ? "#" : href;
      parts.push(
        <a
          key={key}
          href={attrHref}
          data-href={isWikiLike ? href : undefined}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          onClick={(e) => {
            if (external) return;
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

function parseMarkdown(raw: string, onLinkNavigate: (href: string) => void): React.ReactNode[] {
  const lines = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      nodes.push(
        <div key={`cb-${i}`} className="wiki-code-block">
          {lang && <div className="wiki-code-lang">{lang}</div>}
          <pre><code>{codeLines.join("\n")}</code></pre>
        </div>
      );
      i++;
      continue;
    }

    if (line.startsWith("> [!")) {
      const alertMatch = line.match(/^> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      const alertType = alertMatch ? alertMatch[1].toLowerCase() : "note";
      const bodyLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith("> ")) { bodyLines.push(lines[i].slice(2)); i++; }
      nodes.push(
        <blockquote key={`alert-${i}`} className={`wiki-alert wiki-alert--${alertType}`}>
          <div className="wiki-alert-label">{alertType.toUpperCase()}</div>
          <div className="wiki-alert-body">{bodyLines.map((l, j) => <p key={j}>{parseInline(l, `alert-${i}-${j}`, onLinkNavigate)}</p>)}</div>
        </blockquote>
      );
      continue;
    }

    if (line.startsWith("> ")) {
      const qLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) { qLines.push(lines[i].slice(2)); i++; }
      nodes.push(
        <blockquote key={`bq-${i}`} className="wiki-blockquote">
          {qLines.map((l, j) => <p key={j}>{parseInline(l, `bq-${i}-${j}`, onLinkNavigate)}</p>)}
        </blockquote>
      );
      continue;
    }

    const headingMatch = line.match(/^\s*(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      const id = headingMatch[2].toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      nodes.push(<Tag key={`h-${i}`} id={id} className={`wiki-h${level}`}>{parseInline(headingMatch[2], `h-${i}`, onLinkNavigate)}</Tag>);
      i++;
      continue;
    }

    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      nodes.push(<hr key={`hr-${i}`} className="wiki-hr" />);
      i++;
      continue;
    }

    if (line.includes("|") && line.trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].match(/^\|[\s|:-]+\|$/)) {
      const headers = line.split("|").filter((c) => c.trim()).map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].split("|").filter((c) => c.trim()).map((c) => c.trim()));
        i++;
      }
      nodes.push(
        <div key={`tbl-${i}`} className="wiki-table-wrapper">
          <table className="wiki-table">
            <thead><tr>{headers.map((h, j) => <th key={j}>{parseInline(h, `th-${i}-${j}`, onLinkNavigate)}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => (<tr key={ri}>{row.map((cell, ci) => <td key={ci}>{parseInline(cell, `td-${i}-${ri}-${ci}`, onLinkNavigate)}</td>)}</tr>))}</tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.match(/^(\s*)[-*+]\s/)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^(\s*)[-*+]\s/)) {
        const indentMatch = lines[i].match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        const content = lines[i].replace(/^\s*[-*+]\s/, "");
        const cbMatch = content.match(/^\[(x| )\]\s+(.*)/i);
        if (cbMatch) {
          listItems.push(
            <li key={i} style={{ marginLeft: `${indent * 0.75}em` }} className="wiki-li wiki-li--checkbox">
              <input type="checkbox" readOnly checked={cbMatch[1].toLowerCase() === "x"} />
              <span>{parseInline(cbMatch[2], `cb-${i}`, onLinkNavigate)}</span>
            </li>
          );
        } else {
          listItems.push(
            <li key={i} style={{ marginLeft: `${indent * 0.75}em` }} className="wiki-li">
              {parseInline(content, `li-${i}`, onLinkNavigate)}
            </li>
          );
        }
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="wiki-ul">{listItems}</ul>);
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        const content = lines[i].replace(/^\d+\.\s/, "");
        listItems.push(<li key={i} className="wiki-li">{parseInline(content, `ol-${i}`, onLinkNavigate)}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="wiki-ol">{listItems}</ol>);
      continue;
    }

    if (line.trim() === "") { i++; continue; }

    nodes.push(<p key={`p-${i}`} className="wiki-p">{parseInline(line, `p-${i}`, onLinkNavigate)}</p>);
    i++;
  }

  return nodes;
}

function MarkdownGFM({ content, onLinkNavigate }: { content: string; onLinkNavigate: (href: string) => void }) {
  const nodes = useMemo(() => parseMarkdown(content, onLinkNavigate), [content, onLinkNavigate]);
  return <div className="wiki-markdown">{nodes}</div>;
}

export type WikiPanelProps = {
  open: boolean;
  onClose: () => void;
  filesByTab?: Partial<FilesByTab>;
};

const DEFAULT_FILES_BY_TAB: FilesByTab = {
  software: FILES_SOFTWARE,
  tech: FILES_TECH,
  ux: FILES_UX,
};

export function WikiPanel({ open, onClose, filesByTab }: WikiPanelProps) {
  const effectiveFilesByTab = useMemo<FilesByTab>(() => ({
    software: filesByTab?.software ?? DEFAULT_FILES_BY_TAB.software,
    tech: filesByTab?.tech ?? DEFAULT_FILES_BY_TAB.tech,
    ux: filesByTab?.ux ?? DEFAULT_FILES_BY_TAB.ux,
  }), [filesByTab]);

  const wikiIndex = useMemo(() => buildWikiIndex(effectiveFilesByTab), [effectiveFilesByTab]);
  const [activeTab, setActiveTab] = useState<WikiTab>("software");
  const [search, setSearch] = useState("");
  const [activeTocId, setActiveTocId] = useState<string>("");
  const [tocOpen, setTocOpen] = useState(true);
  const contentRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const initialPathRef = useRef<string>(typeof window !== "undefined" ? window.location.pathname : "");

  const currentFiles = activeTab === "software" ? effectiveFilesByTab.software : activeTab === "tech" ? effectiveFilesByTab.tech : effectiveFilesByTab.ux;

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return currentFiles;
    const q = search.toLowerCase();
    return currentFiles.filter((f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q));
  }, [currentFiles, search]);

  const [selectedFile, setSelectedFile] = useState<WikiFile>(currentFiles[0] || { id: "none", name: "Empty", content: "", path: "" });
  const hasContent = selectedFile.content.trim().length > 0;

  useEffect(() => {
    const files = activeTab === "software" ? effectiveFilesByTab.software : activeTab === "tech" ? effectiveFilesByTab.tech : effectiveFilesByTab.ux;
    if (!files.find((f) => f.path === selectedFile.path)) {
      setSelectedFile(files[0] || { id: "none", name: "Empty", content: "", path: "" });
    }
  }, [activeTab, effectiveFilesByTab, selectedFile.path]);

  // When WikiPanel opens/closes or initial mount, we leave state preserved.
  // The cross-tab resetting bug is now fixed by not using an effect to force file[0].

  const toc = useMemo(() => extractToc(selectedFile.content), [selectedFile]);

  // ScrollSpy: watch visible headings in the content area
  useEffect(() => {
    if (!contentRef.current || toc.length === 0) return;
    const root = contentRef.current;
    const headingEls = toc
      .map(({ id }) => root.querySelector(`#${id}`) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];

    if (headingEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveTocId(visible[0].target.id);
        }
      },
      { root, rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );

    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc, selectedFile]);

  const handleTocClick = useCallback((id: string) => {
    const el = contentRef.current?.querySelector(`#${id}`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveTocId(id);
    }
  }, []);

  const handleLinkNavigate = useCallback(
    (href: string) => {
      // 1. Handle intra-page anchor
      const target = resolveWikiTarget(selectedFile, href, wikiIndex);
      if (!target) return;

      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[WikiPanel] navigate", { from: selectedFile.id, href, to: target.file.id, tab: target.tab, hash: target.hash });
      }

      if (target.tab !== activeTab) {
        setActiveTab(target.tab);
      }
      setSelectedFile(target.file);

      if (target.hash) {
        setTimeout(() => handleTocClick(target.hash!), 150);
      } else {
        contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
      }

      if (import.meta.env.DEV) {
        const nowPath = typeof window !== "undefined" ? window.location.pathname : "";
        if (initialPathRef.current && nowPath !== initialPathRef.current) {
          // eslint-disable-next-line no-console
          console.warn("[WikiPanel] Navigation attempted to leave SPA", { from: initialPathRef.current, to: nowPath, href });
        }
      }
    },
    [activeTab, handleTocClick, selectedFile, wikiIndex]
  );

  // Global guard: avoid navigation to raw .md links when panel está abierto
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      const external = /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
      if (external) return;
      const cleanHref = href.split("#")[0].split("?")[0];
      const isWikiLike = href.startsWith("#") || cleanHref.endsWith(".md") || cleanHref.startsWith("/docs/") || href.startsWith("./") || href.startsWith("../");
      if (!isWikiLike) return;
      event.preventDefault();
      event.stopPropagation();
      handleLinkNavigate(href);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [handleLinkNavigate, open]);

  if (!open) return null;

  const TAB_LABELS: Record<WikiTab, { icon: string; label: string; files: WikiFile[] }> = {
    software: { icon: "menu_book", label: "Usuario", files: effectiveFilesByTab.software },
    tech: { icon: "settings_suggest", label: "Técnica", files: effectiveFilesByTab.tech },
    ux: { icon: "palette", label: "UX/UI", files: effectiveFilesByTab.ux },
  };

  const activeTabMeta = TAB_LABELS[activeTab];

  const handleContainerClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest("a") as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.dataset.href || anchor.getAttribute("href") || "";
    const external = /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
    if (external) return;
    const cleanHref = href.split("#")[0].split("?")[0];
    const isWikiLike = href.startsWith("#") || cleanHref.endsWith(".md") || cleanHref.startsWith("/docs/") || href.startsWith("./") || href.startsWith("../");
    if (!isWikiLike) return;
    event.preventDefault();
    event.stopPropagation();
    handleLinkNavigate(href);
  }, [handleLinkNavigate]);

  return (
    <div className="wiki-fullscreen-container">
      <div className="wiki-shell" ref={rootRef} onClickCapture={handleContainerClickCapture}>
        {/* Header */}
        <div className="gs-modal-header wiki-header">
          <div className="wiki-header-title">
            <span className="material-symbols-outlined accent icon-xl wiki-header-icon">{activeTabMeta.icon}</span>
            <div className="wiki-header-text">
              <span className="wiki-header-eyebrow">Documentación Oficial</span>
              <h3 className="wiki-header-h3">{selectedFile.name}</h3>
            </div>
          </div>
          <div className="wiki-header-actions">
            <button
              className="wiki-toc-toggle"
              onClick={() => setTocOpen((v) => !v)}
              title={tocOpen ? "Ocultar tabla de contenidos" : "Mostrar tabla de contenidos"}
            >
              <span className="material-symbols-outlined">{tocOpen ? "menu_open" : "toc"}</span>
            </button>
            <button onClick={onClose} className="wiki-close-btn-minimal">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

      {/* Body */}
      <div className="wiki-container">

        {/* Sidebar */}
        <aside className="wiki-sidebar">
          {/* Tab switcher */}
          <div className="wiki-nav-tabs-row">
            {(Object.keys(TAB_LABELS) as WikiTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`wiki-tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(tab);
                  setSearch("");
                  setActiveTocId("");
                  const filesForTab = tab === "software" ? effectiveFilesByTab.software : tab === "tech" ? effectiveFilesByTab.tech : effectiveFilesByTab.ux;
                  setSelectedFile(filesForTab[0] || { id: "none", name: "Empty", content: "", path: "" });
                }}
                title={TAB_LABELS[tab].label}
              >
                <span className="material-symbols-outlined">{TAB_LABELS[tab].icon}</span>
                <span className="wiki-tab-label">{TAB_LABELS[tab].label}</span>
                <span className="wiki-tab-badge">{TAB_LABELS[tab].files.length}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="wiki-search-wrap">
            <span className="material-symbols-outlined wiki-search-icon">search</span>
            <input
              className="wiki-search-input"
              type="text"
              placeholder="Filtrar documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="wiki-search-clear" onClick={() => setSearch("")} title="Limpiar">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* File list */}
          <div className="wiki-sidebar-content">
            {filteredFiles.length === 0 ? (
              <div className="wiki-no-results">
                <span className="material-symbols-outlined">search_off</span>
                <span>Sin resultados</span>
              </div>
            ) : (
              <nav className="wiki-nav-list">
                {filteredFiles.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    className={`wiki-nav-item ${selectedFile.id === file.id ? "active" : ""}`}
                    onClick={() => { setSelectedFile(file); setActiveTocId(""); }}
                  >
                    <span className="material-symbols-outlined wiki-nav-icon">
                      {selectedFile.id === file.id ? "article" : "description"}
                    </span>
                    <span className="wiki-nav-name">{file.name}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Content */}
        <main className="wiki-content gs-content-area" ref={contentRef}>
          <div className="wiki-content-inner">
            <div className="wiki-file-header">
              <div className="wiki-breadcrumb">
                <span className="material-symbols-outlined">folder_open</span>
                <span>{activeTabMeta.label}</span>
                <span className="wiki-breadcrumb-sep">/</span>
                <span className="wiki-breadcrumb-file">{selectedFile.name}</span>
              </div>
              <h1 className="wiki-file-title">{selectedFile.name}</h1>
            </div>
            {hasContent ? (
              <MarkdownGFM content={selectedFile.content} onLinkNavigate={handleLinkNavigate} />
            ) : (
              <div className="wiki-fallback">
                <span className="material-symbols-outlined wiki-fallback-icon">error</span>
                <div className="wiki-fallback-text">
                  <h4>Documento no encontrado</h4>
                  <p>El enlace apunta a un archivo que no está cargado en el panel. Usa la lista lateral o el tab correcto para continuar.</p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Table of Contents */}
        {tocOpen && toc.length > 0 && (
          <aside className="wiki-toc">
            <div className="wiki-toc-header">
              <span className="material-symbols-outlined">toc</span>
              En esta página
            </div>
            <nav className="wiki-toc-nav">
              {toc.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`wiki-toc-item wiki-toc-item--h${entry.level} ${activeTocId === entry.id ? "active" : ""}`}
                  onClick={() => handleTocClick(entry.id)}
                  title={entry.text}
                >
                  {entry.text}
                </button>
              ))}
            </nav>
          </aside>
        )}
        </div>
      </div>
    </div>
  );
}
