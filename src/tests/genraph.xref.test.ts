import { describe, expect, it } from "vitest";
import { createXrefResolver } from "@/core/genraph/xref";

describe("genraph xref resolver", () => {
  it("preserves existing xrefs", () => {
    const resolver = createXrefResolver([["person-1", "@I1@"]]);
    expect(resolver.xrefOf("person-1", "I")).toBe("@I1@");
  });

  it("synthesizes stable prefixed xrefs when missing", () => {
    const resolver = createXrefResolver();
    expect(resolver.xrefOf("p-no-xref", "I")).toBe("IPNOXRE");
    expect(resolver.xrefOf("p-no-xref", "I")).toBe("IPNOXRE");
  });

  it("uses the requested prefix for different node kinds", () => {
    const resolver = createXrefResolver();
    expect(resolver.xrefOf("union-1234", "F")).toBe("FUNION12");
    expect(resolver.xrefOf("source-abc", "S")).toBe("SSOURCEA");
  });

  it("does not collide across different uids", () => {
    const resolver = createXrefResolver();
    expect(resolver.xrefOf("person-a", "I")).not.toBe(resolver.xrefOf("person-b", "I"));
  });
});
