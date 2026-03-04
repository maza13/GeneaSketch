import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { WikiPanel } from "@/ui/WikiPanel";

describe("WikiPanel fallback render", () => {
  it("muestra mensaje cuando el documento no tiene contenido", () => {
    const html = renderToStaticMarkup(
      <WikiPanel
        open
        onClose={() => undefined}
        filesByTab={{
          software: [{ id: "empty.md", name: "Empty", path: "/docs/wiki-software/empty.md", content: "" }],
          tech: [],
          ux: [],
        }}
      />
    );
    expect(html).toContain("Documento no encontrado");
  });
});
