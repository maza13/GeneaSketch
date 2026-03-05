import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export function writeJsonReport(filePath: string, data: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function writeMarkdownReport(filePath: string, markdown: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${markdown.trimEnd()}\n`, "utf8");
}
