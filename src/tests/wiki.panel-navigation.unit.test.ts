import { describe, it, expect, vi } from "vitest";
import { buildWikiIndex, parseInline, resolveWikiTarget } from "@/ui/WikiPanel.helpers";

const files = {
  software: [
    {
      id: "README.md",
      name: "README",
      path: "/docs/wiki-software/README.md",
      content: "# README\n[Go Internal](./01_intro.md)\n[Go Tech](../wiki-gsk/tech.md)\n[Jump](#deep-section)\n## Deep Section\nTexto",
    },
    {
      id: "01_intro.md",
      name: "Intro",
      path: "/docs/wiki-software/01_intro.md",
      content: "# Intro\nContenido",
    },
  ],
  tech: [
    { id: "tech.md", name: "Tech", path: "/docs/wiki-gsk/tech.md", content: "# Tech Doc\nContenido" },
  ],
  ux: [
    { id: "ux.md", name: "UX", path: "/docs/wiki-uxdesign/ux.md", content: "# UX Doc\nContenido" },
  ],
} as const;

const index = buildWikiIndex(files as any);

describe("WikiPanel navigation helpers", () => {
  it("resuelve enlaces relativos dentro de la misma pestaña", () => {
    const target = resolveWikiTarget(files.software[0], "./01_intro.md", index);
    expect(target?.tab).toBe("software");
    expect(target?.file.id).toBe("01_intro.md");
    expect(target?.hash).toBeUndefined();
  });

  it("resuelve enlaces cruzados a la wiki técnica", () => {
    const target = resolveWikiTarget(files.software[0], "../wiki-gsk/tech.md", index);
    expect(target?.tab).toBe("tech");
    expect(target?.file.id).toBe("tech.md");
  });

  it("normaliza anclas dentro del mismo documento", () => {
    const target = resolveWikiTarget(files.software[0], "#Deep-Section!", index);
    expect(target?.file.id).toBe("README.md");
    expect(target?.hash).toBe("deep-section");
  });

  it("normaliza anclas combinadas con archivo relativo", () => {
    const target = resolveWikiTarget(files.software[0], "./01_intro.md#Sec 1", index);
    expect(target?.file.id).toBe("01_intro.md");
    expect(target?.hash).toBe("sec-1");
  });

  it("devuelve null si el destino no existe", () => {
    const target = resolveWikiTarget(files.software[0], "./missing.md", index);
    expect(target).toBeNull();
  });

  it("intercepta enlaces wiki-like en parseInline", () => {
    const handler = vi.fn();
    const nodes = parseInline("Visita [intro](./01_intro.md)", "k", handler);
    const link = nodes.find((n: any) => n?.props?.href === "./01_intro.md" && n?.props?.["data-href"] === undefined) as any;
    const prevent = vi.fn();
    const stop = vi.fn();
    link.props.onClick({ preventDefault: prevent, stopPropagation: stop });
    expect(prevent).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith("./01_intro.md");
  });

  it("no intercepta enlaces externos", () => {
    const handler = vi.fn();
    const nodes = parseInline("Ir a [web](https://example.com)", "k2", handler);
    const link = nodes.find((n: any) => n?.props?.href === "https://example.com") as any;
    const prevent = vi.fn();
    const stop = vi.fn();
    link.props.onClick({ preventDefault: prevent, stopPropagation: stop });
    expect(prevent).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
});
