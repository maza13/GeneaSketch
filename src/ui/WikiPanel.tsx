import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildWikiIndex,
  extractToc,
  parseInline,
  resolveWikiTarget,
  type FilesByTab,
  type TocEntry,
  type WikiFile,
  type WikiTab,
} from "@/ui/WikiPanel.helpers";
import { StandardModal } from "@/ui/common/StandardModal";

// --- Markdown Parsers (Extracted from WikiPanel for V3 usage) ---
const techWikiFiles = import.meta.glob("/docs/wiki-gsk/*.md", { query: "?raw", eager: true });
const softwareWikiFiles = import.meta.glob("/docs/wiki-software/*.md", { query: "?raw", eager: true });
const uxWikiFiles = import.meta.glob("/docs/wiki-uxdesign/*.md", { query: "?raw", eager: true });

function formatFileName(filename: string): string {
  let name = filename.replace(".md", "");
  name = name.replace(/^\d+[_\s-]+/, "");
  name = name.replace(/[_-]/g, " ");
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

const DEFAULT_FILES_BY_TAB: FilesByTab = {
  software: processFiles(softwareWikiFiles),
  tech: processFiles(techWikiFiles),
  ux: processFiles(uxWikiFiles),
};

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
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <div key={`cb-${i}`} className="wiki-code-block">
          {lang ? <div className="wiki-code-lang">{lang}</div> : null}
          <pre>
            <code>{codeLines.join("\n")}</code>
          </pre>
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
      while (i < lines.length && lines[i].startsWith("> ")) {
        bodyLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote key={`alert-${i}`} className={`wiki-alert wiki-alert--${alertType}`}>
          <div className="wiki-alert-label">{alertType.toUpperCase()}</div>
          <div className="wiki-alert-body">
            {bodyLines.map((l, j) => (
              <p key={j}>{parseInline(l, `alert-${i}-${j}`, onLinkNavigate)}</p>
            ))}
          </div>
        </blockquote>
      );
      continue;
    }

    if (line.startsWith("> ")) {
      const qLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        qLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote key={`bq-${i}`} className="wiki-blockquote">
          {qLines.map((l, j) => (
            <p key={j}>{parseInline(l, `bq-${i}-${j}`, onLinkNavigate)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    const headingMatch = line.match(/^\s*(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      const id = headingMatch[2].toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      nodes.push(
        <Tag key={`h-${i}`} id={id} className={`wiki-h${level}`}>
          {parseInline(headingMatch[2], `h-${i}`, onLinkNavigate)}
        </Tag>
      );
      i++;
      continue;
    }

    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      nodes.push(<hr key={`hr-${i}`} className="wiki-hr" />);
      i++;
      continue;
    }

    if (line.includes("|") && line.trim().startsWith("|") && i + 1 < lines.length && lines[i + 1].match(/^\|[\s|:-]+\|$/)) {
      const headers = line
        .split("|")
        .filter((c) => c.trim())
        .map((c) => c.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        rows.push(
          lines[i]
            .split("|")
            .filter((c) => c.trim())
            .map((c) => c.trim())
        );
        i++;
      }
      nodes.push(
        <div key={`tbl-${i}`} className="wiki-table-wrapper">
          <table className="wiki-table">
            <thead>
              <tr>{headers.map((h, j) => <th key={j}>{parseInline(h, `th-${i}-${j}`, onLinkNavigate)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{parseInline(cell, `td-${i}-${ri}-${ci}`, onLinkNavigate)}</td>)}</tr>
              ))}
            </tbody>
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
      nodes.push(
        <ul key={`ul-${i}`} className="wiki-ul">
          {listItems}
        </ul>
      );
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        const content = lines[i].replace(/^\d+\.\s/, "");
        listItems.push(<li key={i} className="wiki-li">{parseInline(content, `ol-${i}`, onLinkNavigate)}</li>);
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="wiki-ol">
          {listItems}
        </ol>
      );
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    nodes.push(
      <p key={`p-${i}`} className="wiki-p">
        {parseInline(line, `p-${i}`, onLinkNavigate)}
      </p>
    );
    i++;
  }

  return nodes;
}

function MarkdownGFM({ content, onLinkNavigate }: { content: string; onLinkNavigate: (href: string) => void }) {
  const nodes = useMemo(() => parseMarkdown(content, onLinkNavigate), [content, onLinkNavigate]);
  return <div className="wiki-markdown">{nodes}</div>;
}

const WIKI_TABS = [
  { id: "software" as const, label: "Guía de Usuario", icon: "menu_book" },
  { id: "tech" as const, label: "Ingeniería / GSchema", icon: "settings_suggest" },
  { id: "ux" as const, label: "UX / Diseño", icon: "palette" },
];

export type WikiPanelProps = {
  open: boolean;
  onClose: () => void;
  filesByTab?: Partial<FilesByTab>;
};

export function WikiPanel({ open, onClose, filesByTab }: WikiPanelProps) {
  const effectiveFilesByTab = useMemo<FilesByTab>(
    () => ({
      software: filesByTab?.software ?? DEFAULT_FILES_BY_TAB.software,
      tech: filesByTab?.tech ?? DEFAULT_FILES_BY_TAB.tech,
      ux: filesByTab?.ux ?? DEFAULT_FILES_BY_TAB.ux,
    }),
    [filesByTab]
  );

  const [activeTab, setActiveTab] = useState<WikiTab>("software");
  const [search, setSearch] = useState("");
  const [activeTocId, setActiveTocId] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [isTocOpen, setIsTocOpen] = useState(true);

  const contentRef = useRef<HTMLDivElement>(null);

  const currentFiles = activeTab === "software"
    ? effectiveFilesByTab.software
    : activeTab === "tech"
      ? effectiveFilesByTab.tech
      : effectiveFilesByTab.ux;

  const emptyFile: WikiFile = { id: "none", name: "Sin documentos", content: "", path: "" };

  // Attempt to load last viewed file from storage, or use default
  const [selectedFile, setSelectedFile] = useState<WikiFile>(currentFiles[0] || emptyFile);

  const wikiIndex = useMemo(() => buildWikiIndex(effectiveFilesByTab), [effectiveFilesByTab]);

  // Reset selected file when tab changes
  useEffect(() => {
    if (!currentFiles.find((f) => f.path === selectedFile.path)) {
      setSelectedFile(currentFiles[0] || emptyFile);
    }
  }, [currentFiles, selectedFile.path]);

  const filteredFiles = useMemo(() => {
    if (!search.trim()) return currentFiles;
    const q = search.toLowerCase();
    return currentFiles.filter((f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q));
  }, [currentFiles, search]);

  const toc = useMemo<TocEntry[]>(() => extractToc(selectedFile.content), [selectedFile.content]);

  const handleTocClick = useCallback((id: string) => {
    const el = contentRef.current?.querySelector(`[id="${id}"]`) as HTMLElement | null;
    if (el && contentRef.current) {
      const parent = contentRef.current;
      const scrollPos = el.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop;
      parent.scrollTo({ top: Math.max(0, scrollPos - 24), behavior: "smooth" });
      setActiveTocId(id);
    }
  }, []);

  // Intersection observer for automated TOC highlighting
  useEffect(() => {
    if (!contentRef.current || toc.length === 0) return;
    const root = contentRef.current;
    const headingEls = toc
      .map(({ id }) => root.querySelector(`[id="${id}"]`) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];
    if (headingEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveTocId(visible[0].target.id);
      },
      { root, rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );

    headingEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc, selectedFile]);

  const handleLinkNavigate = useCallback(
    (href: string) => {
      const target = resolveWikiTarget(selectedFile, href, wikiIndex);
      if (!target) return;
      if (target.tab !== activeTab) setActiveTab(target.tab);
      setSelectedFile(target.file);
      setActiveTocId("");

      if (target.hash) {
        setTimeout(() => handleTocClick(target.hash!), 120);
      } else {
        contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
      }
    },
    [activeTab, handleTocClick, selectedFile, wikiIndex]
  );

  if (!open) return null;

  const hasContent = selectedFile.content.trim().length > 0;

  return (
    <StandardModal
      open={open}
      title={`Wiki Base de Conocimiento`}
      onClose={onClose}
      size="xl"
      tabs={WIKI_TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as WikiTab)}
      className={`wiki-v3-modal ${isFullscreen ? "wiki-fullscreen" : ""}`}
      headerActions={
        <>
          <button
            className="icon-btn"
            onClick={() => setIsNavOpen(!isNavOpen)}
            title={isNavOpen ? "Ocultar explorador" : "Mostrar explorador"}
          >
            <span className="material-symbols-outlined" style={{ opacity: isNavOpen ? 1 : 0.4 }}>
              dock_to_right
            </span>
          </button>

          <button
            className="icon-btn"
            onClick={() => setIsTocOpen(!isTocOpen)}
            title={isTocOpen ? "Ocultar índice" : "Mostrar índice"}
          >
            <span className="material-symbols-outlined" style={{ opacity: isTocOpen ? 1 : 0.4 }}>
              format_list_bulleted
            </span>
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 8px' }} />

          <button
            className="icon-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Minimizar" : "Pantalla completa"}
          >
            <span className="material-symbols-outlined">
              {isFullscreen ? "fullscreen_exit" : "fullscreen"}
            </span>
          </button>
        </>
      }
    >
      <style>{`
        .wiki-fullscreen {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          border-radius: 0 !important;
          border: none !important;
          margin: 0 !important;
        }

        /* ── Premium UX Markdown Render Styles ── */
        .wiki-markdown {
          font-family: var(--gs-font-ui);
          font-size: 15px;
          line-height: 1.6;
          color: var(--ink-0);
        }
        
        .wiki-markdown h1, .wiki-markdown h2, .wiki-markdown h3 {
          margin-top: 2em;
          margin-bottom: 0.75em;
          font-family: var(--gs-font-header);
          font-weight: 600;
          color: var(--ink-0);
        }
        
        .wiki-markdown h1 { font-size: 24px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
        .wiki-markdown h2 { font-size: 20px; border-bottom: 1px solid var(--line); padding-bottom: 6px; }
        .wiki-markdown h3 { font-size: 18px; }

        .wiki-markdown p { margin-bottom: 1.25em; }

        .wiki-markdown strong { font-weight: 600; color: var(--ink-0); }
        .wiki-markdown em { font-style: italic; }

        .wiki-markdown a {
          color: var(--accent);
          text-decoration: none;
          font-weight: 500;
        }
        .wiki-markdown a:hover { text-decoration: underline; }

        .wiki-markdown ul, .wiki-markdown ol {
          margin-top: 0;
          margin-bottom: 1.25em;
          padding-left: 2em;
        }
        
        .wiki-markdown li { margin-bottom: 0.5em; }

        .wiki-markdown blockquote {
          margin: 0 0 1.5em;
          padding: 0.5em 1em;
          border-left: 4px solid var(--line);
          color: var(--ink-muted);
          background: var(--bg-card);
          border-radius: 0 var(--gs-radius-md) var(--gs-radius-md) 0;
        }

        .wiki-markdown pre {
          background: var(--bg-card);
          border: 1px solid var(--line-soft);
          border-radius: var(--gs-radius-md);
          padding: 16px;
          overflow-x: auto;
          margin-bottom: 1.5em;
          font-family: var(--gs-font-mono);
          font-size: 13px;
        }

        .wiki-markdown code {
          font-family: var(--gs-font-mono);
          background: var(--bg-input);
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-size: 13px;
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--ink-0);
        }

        .wiki-markdown pre code {
          background: transparent;
          padding: 0;
          font-size: inherit;
          white-space: pre;
          color: var(--ink-0);
        }

        .wiki-markdown table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5em;
          background: var(--paper-0);
          border-radius: var(--gs-radius-md);
          overflow: hidden;
        }

        .wiki-markdown th, .wiki-markdown td {
          border: 1px solid var(--line);
          padding: 12px 16px;
          text-align: left;
          font-size: 14px;
        }

        .wiki-markdown th {
          background: var(--bg-card);
          font-weight: 600;
          color: var(--ink-0);
        }

        .wiki-alert {
          margin: 1.5em 0;
          padding: 16px;
          border-radius: var(--gs-radius-md);
          border-left: 4px solid;
          background: var(--bg-card);
        }
        .wiki-alert-label { font-size: 12px; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }
        .wiki-alert--note { border-left-color: var(--accent); }
        .wiki-alert--note .wiki-alert-label { color: var(--accent); }
        .wiki-alert--warning { border-left-color: #f59e0b; }
        .wiki-alert--warning .wiki-alert-label { color: #d97706; }
        .wiki-alert--danger, .wiki-alert--caution { border-left-color: var(--tree-danger); }
        .wiki-alert--danger .wiki-alert-label, .wiki-alert--caution .wiki-alert-label { color: var(--tree-danger); }

        .wiki-hr { height: 1px; background: var(--line); border: none; margin: 2em 0; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%', overflow: 'hidden', background: 'var(--body-bg)' }}>
        {/* ── Sidebar: Search & File List ── */}
        {isNavOpen && (
          <aside style={{
            width: 280,
            borderRight: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--paper-0)',
            flexShrink: 0
          }}>
            <div style={{ padding: '16px' }}>
              <div className="gs-input-group" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--line)', borderRadius: 'var(--gs-radius-md)', padding: '0 8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--ink-muted)' }}>search</span>
                <input
                  style={{ flex: 1, padding: '8px', background: 'transparent', border: 'none', color: 'var(--ink-0)', outline: 'none' }}
                  type="text"
                  placeholder="Buscar documentos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} style={{ background: 'transparent', border: 'none', color: 'var(--ink-muted)', cursor: 'pointer', display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredFiles.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.5, marginBottom: 8 }}>search_off</span>
                  <p>No se encontraron resultados</p>
                </div>
              ) : (
                <nav style={{ padding: '0 8px' }}>
                  {filteredFiles.map((file) => {
                    const isActive = selectedFile.path === file.path;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          setSelectedFile(file);
                          setActiveTocId("");
                          contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          margin: '2px 0',
                          borderRadius: 'var(--gs-radius-md)',
                          background: isActive ? 'var(--accent-soft)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--ink-0)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'var(--bg-card)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {isActive ? "article" : "description"}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: isActive ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
          </aside>
        )}

        {/* ── Main Content Area ── */}
        <main
          className="gs-content-area"
          style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}
        >
          <div
            ref={contentRef}
            style={{ flex: 1, padding: '48px 60px', overflowY: 'auto' }}
          >
            {hasContent ? (
              <div style={{ maxWidth: 840, margin: '0 auto' }}>
                <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 16, marginBottom: 24 }}>
                  <h1 style={{ margin: 0, fontSize: '28px', color: 'var(--ink-0)', fontWeight: 600, fontFamily: 'var(--gs-font-header)' }}>{selectedFile.name}</h1>
                </div>
                <MarkdownGFM content={selectedFile.content} onLinkNavigate={handleLinkNavigate} />
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--ink-muted)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.5, marginBottom: 16 }}>error</span>
                <h4>Documento no encontrado</h4>
                <p>El archivo no existe en esta pestaña o no tiene contenido.</p>
              </div>
            )}
          </div>

          {/* ── Right TOC Sidebar ── */}
          {(toc.length > 0 && isTocOpen) && (
            <aside style={{ width: 260, borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column', background: 'var(--paper-1)', flexShrink: 0 }}>
              <div style={{ padding: '16px 20px', fontWeight: 600, fontSize: '14px', color: 'var(--ink-0)', borderBottom: '1px solid var(--line)' }}>
                En este artículo
              </div>
              <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
                {toc.map((entry) => {
                  const isActive = activeTocId === entry.id;
                  const indent = (entry.level - 1) * 12;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleTocClick(entry.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 8px',
                        marginLeft: indent,
                        fontSize: '13px',
                        color: isActive ? 'var(--accent)' : 'var(--ink-muted)',
                        background: 'transparent',
                        border: 'none',
                        borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                        cursor: 'pointer',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.color = 'var(--ink-0)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.color = 'var(--ink-muted)';
                      }}
                    >
                      {entry.text}
                    </button>
                  );
                })}
              </nav>
            </aside>
          )}
        </main>
      </div>
    </StandardModal>
  );
}
