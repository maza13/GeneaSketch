import { useState, useCallback } from "react";
import { useAppStore, type AppState } from "@/state/store";
import { useShallow } from "zustand/react/shallow";
import { FileIOService } from "@/io/fileIOService";
import { gschemaToDocument, documentToGSchema } from "@/core/gschema/GedcomBridge";
import { GSchemaGraph } from "@/core/gschema/GSchemaGraph";
import { extractSubTree, type ExtractDirection } from "@/core/edit/generators";
import { downloadBlob } from "@/utils/download";
import { exportSvgAsPdf, exportSvgAsRaster } from "@/utils/svgExport";
import type { RecentPayloadV2, SourceGedVersion, GedExportVersion } from "@/types/domain";
import type { GraphDocument, GraphSource } from "@/core/read-model/types";
import { projectGraphDocument } from "@/core/read-model/selectors";
import type { ColorThemeConfig } from "@/types/editor";
import type { FileLoadRuntime, LegacyGskMeta } from "@/hooks/useFileLoadRuntime";

export type PdfExportState = {
  scope: "viewport" | "full";
  paperSize: "LETTER" | "LEGAL" | "TABLOID" | "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "CUSTOM";
  orientation: "PORTRAIT" | "LANDSCAPE";
  margin: number;
  scale: number;
  customWidth: number;
  customHeight: number;
};

export function hasMeaningfulTree(graph: import("@/core/gschema/GSchemaGraph").GSchemaGraph | null): boolean {
  if (!graph) return false;
  const nodes = graph.allNodes();
  let personCount = 0;
  let unionCount = 0;
  let rootName = "";

  for (const node of nodes) {
    if (node.type === "Person") {
      personCount++;
      if (personCount === 1) {
        rootName = graph.getValue<{ text: string }>(node.uid, "NAME_GIVEN")?.text || "(Sin nombre)";
      }
    }
    if (node.type === "Union") unionCount++;
  }

  if (personCount > 1 || unionCount > 0) return true;
  if (personCount === 0) return false;
  return rootName !== "(Sin nombre)";
}

function mergeProvenance(document: GraphDocument, fileName: string, sourceVersion: SourceGedVersion): GraphDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      importProvenance: [
        ...(document.metadata.importProvenance || []),
        {
          fileName,
          sourceFormat: document.metadata.sourceFormat,
          sourceGedVersion: sourceVersion,
          importedAt: new Date().toISOString(),
        },
      ],
    },
  };
}

function makeRecentPayload(
  graph: import("@/core/gschema/GSchemaGraph").GSchemaGraph,
  fileName: string,
  kind: "open" | "import",
  sourceVersion: SourceGedVersion,
): RecentPayloadV2 {
  return {
    graph: {
      data: graph.toData(),
      journal: [...graph.getJournal()],
    },
    sourceVersion,
    fileName,
    kind,
    importedAt: new Date().toISOString(),
  };
}

function inferSourceByFileName(fileName: string): GraphSource {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".gsk")) return "gsk";
  if (lower.endsWith(".ged")) return "ged";
  return "session";
}

function projectOrNull(graph: import("@/core/gschema/GSchemaGraph").GSchemaGraph | null): GraphDocument | null {
  return projectGraphDocument(graph);
}

export function useGskFile(
  graphSvgRef: React.RefObject<SVGSVGElement | null>,
  colorTheme: ColorThemeConfig,
  runtime: FileLoadRuntime,
) {
  const [status, setStatus] = useState("Listo");
  const [exportWarnings, setExportWarnings] = useState<string[]>([]);
  const [importIncomingDoc, setImportIncomingDoc] = useState<GraphDocument | null>(null);
  const [pdfOptions, setPdfOptions] = useState<PdfExportState>({
    scope: "viewport",
    paperSize: "A4",
    orientation: "LANDSCAPE",
    margin: 36,
    scale: 1,
    customWidth: 842,
    customHeight: 595,
  });

  const gschemaGraph = useAppStore((state) => state.gschemaGraph);

  const { setParseErrors, setParseWarnings, addRecentFile, openRecentFile } = useAppStore(
    useShallow((state: AppState) => ({
      setParseErrors: state.setParseErrors,
      setParseWarnings: state.setParseWarnings,
      addRecentFile: state.addRecentFile,
      openRecentFile: state.openRecentFile,
    })),
  );

  const parseInputFile = useCallback(
    async (
      file: File,
    ): Promise<{
      graph: import("@/core/gschema/GSchemaGraph").GSchemaGraph | null;
      source: GraphSource;
      errors: Array<{ line: number; entity?: string; message: string }>;
      warnings: Array<{ code: string; message: string }>;
      sourceVersion?: SourceGedVersion;
      gskMeta?: LegacyGskMeta;
    } | null> => {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".ged")) {
        const gedRes = await FileIOService.importGedAnyVersion(file);
        const sourceVersion = gedRes.sourceVersion ?? "unknown";
        const enrichedDoc = gedRes.document
          ? mergeProvenance(gedRes.document as GraphDocument, file.name, sourceVersion)
          : null;
        const versionForBridge = sourceVersion.startsWith("7") ? "7.0.x" : "5.5.1";
        const graph = enrichedDoc ? documentToGSchema(enrichedDoc, versionForBridge).graph : null;
        return {
          graph,
          source: "ged",
          errors: gedRes.errors,
          warnings: gedRes.warnings,
          sourceVersion,
        };
      }
      if (lower.endsWith(".gsk")) {
        const parsed = await FileIOService.importGsk(file);
        return {
          graph: parsed.graph,
          source: "gsk",
          errors: [],
          warnings: parsed.warnings.map((message) => ({ code: "GSK_IMPORT_WARN", message })),
          sourceVersion: "7.0.x",
          gskMeta: parsed.meta,
        };
      }
      return null;
    },
    [],
  );

  const openAndReplace = useCallback(
    async (file: File, onColorThemeLoad?: (theme: ColorThemeConfig) => void) => {
      setStatus(`Abriendo ${file.name}...`);
      try {
        if (hasMeaningfulTree(gschemaGraph)) {
          const ok = window.confirm("¿Seguro que deseas cerrar el árbol actual y abrir uno nuevo? Se perderán cambios no guardados.");
          if (!ok) {
            setStatus("Apertura cancelada.");
            return;
          }
        }

        const parsed = await parseInputFile(file);
        if (!parsed) {
          setParseErrors(["Solo se soportan .gsk y .ged"]);
          setStatus("Formato no soportado.");
          return;
        }

        setParseWarnings(parsed.warnings.map((warning) => `${warning.code}: ${warning.message}`));
        if (parsed.errors.length || !parsed.graph) {
          setParseErrors(parsed.errors.map((error) => `L${error.line} ${error.entity ? `[${error.entity}] ` : ""}${error.message}`));
          setStatus("Error de importación (.ged/.gsk).");
          return;
        }

        setParseErrors([]);
        const loadedTheme = await runtime.applyLoadedPayload({
          graph: parsed.graph,
          source: parsed.source,
          gskMeta: parsed.gskMeta || null,
        });
        setStatus(`Cargado: ${file.name} (${parsed.sourceVersion ?? "unknown"})`);
        if (loadedTheme && onColorThemeLoad) {
          onColorThemeLoad(loadedTheme);
        }

        addRecentFile(
          { name: file.name, kind: "open" },
          makeRecentPayload(parsed.graph, file.name, "open", parsed.sourceVersion ?? "unknown"),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Invalid .gsk integrity")) {
          setParseErrors([`Archivo .gsk inválido: ${message}`]);
          setStatus("Error de integridad en .gsk");
          return;
        }
        setStatus(`Error crítico: ${message}`);
      }
    },
    [gschemaGraph, parseInputFile, setParseErrors, setParseWarnings, runtime, addRecentFile],
  );

  const importForMerge = useCallback(
    async (file: File, onColorThemeLoad?: (theme: ColorThemeConfig) => void) => {
      if (!gschemaGraph || !hasMeaningfulTree(gschemaGraph)) {
        await openAndReplace(file, onColorThemeLoad);
        return;
      }
      setStatus(`Importando ${file.name}...`);
      try {
        const parsed = await parseInputFile(file);
        if (!parsed || !parsed.graph) {
          setStatus("Error al importar o formato no soportado.");
          return;
        }
        const baseDoc = projectOrNull(parsed.graph);
        if (!baseDoc) {
          setStatus("No se pudo proyectar el grafo importado.");
          return;
        }
        const incoming = mergeProvenance(baseDoc, file.name, parsed.sourceVersion ?? "unknown");
        setImportIncomingDoc(incoming);
        addRecentFile(
          { name: file.name, kind: "import" },
          makeRecentPayload(parsed.graph, file.name, "import", parsed.sourceVersion ?? "unknown"),
        );
        setStatus("Resolviendo coincidencias de personas...");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Invalid .gsk integrity")) {
          setParseErrors([`Archivo .gsk inválido: ${message}`]);
          setStatus("Error de integridad en .gsk");
          return;
        }
        setStatus(`Error crítico: ${message}`);
      }
    },
    [gschemaGraph, openAndReplace, parseInputFile, addRecentFile, setParseErrors],
  );

  const saveGsk = useCallback(
    async (_customTheme?: ColorThemeConfig) => {
      if (!gschemaGraph) return;
      try {
        const blob = await FileIOService.exportGsk(gschemaGraph);
        downloadBlob(blob, "geneasketch.gsk");
        setStatus("Guardado .gsk");
      } catch (error) {
        setStatus(`No se pudo guardar .gsk: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    [gschemaGraph],
  );

  const exportGed = useCallback(
    async (version: GedExportVersion = "7.0.3") => {
      if (!gschemaGraph) return;
      const targetVer: SourceGedVersion = version.startsWith("7") ? "7.0.x" : "5.5.1";
      const result = await FileIOService.exportGed(gschemaToDocument(gschemaGraph, targetVer), { version });
      const suffix = version === "5.5.1" ? "-5.5.1" : "";
      downloadBlob(result.blob, `geneasketch-export${suffix}.ged`);
      if (result.warnings.length > 0) {
        setExportWarnings(result.warnings.map((warning) => `${warning.code}: ${warning.message}`));
        setStatus(`Exportado GED ${version} con ${result.warnings.length} advertencias.`);
        return;
      }
      setExportWarnings([]);
      setStatus(`Exportado GED ${version}`);
    },
    [gschemaGraph],
  );

  const exportBranchGsk = useCallback(
    async (personId: string, direction: ExtractDirection, _customTheme?: ColorThemeConfig) => {
      if (!gschemaGraph) {
        setStatus("Grafo no disponible para exportar.");
        return;
      }
      setStatus("Extrayendo rama...");
      const legacyDoc = gschemaToDocument(gschemaGraph);
      const branchDocument = extractSubTree(legacyDoc, personId, direction);
      const branchGraph = documentToGSchema(branchDocument, "7.0.x").graph;
      const blob = await FileIOService.exportGsk(branchGraph);
      downloadBlob(blob, `Rama_${direction}.gsk`);
      setStatus("Rama extraída y descargada");
    },
    [gschemaGraph],
  );

  const exportRaster = useCallback(
    (format: "png" | "jpg", backgroundColor?: string) => {
      const svg = graphSvgRef.current;
      if (!svg) {
        setStatus("No hay grafo visible para exportar.");
        return;
      }
      const bg = backgroundColor || colorTheme.background;
      exportSvgAsRaster(svg, format, bg, 2)
        .then((blob) => {
          downloadBlob(blob, `geneasketch-${format}.${format}`);
          setStatus(`Exportado ${format.toUpperCase()}`);
        })
        .catch(() => setStatus(`No se pudo exportar ${format.toUpperCase()}.`));
    },
    [graphSvgRef, colorTheme.background],
  );

  const exportPdfNow = useCallback(
    async (backgroundColor?: string) => {
      const svg = graphSvgRef.current;
      if (!svg) {
        setStatus("No hay grafo visible para exportar.");
        return;
      }
      const bg = backgroundColor || colorTheme.background;

      const blob = await exportSvgAsPdf(svg, bg, {
        paperSize: pdfOptions.paperSize,
        orientation: pdfOptions.orientation,
        margin: Math.max(0, Math.round(pdfOptions.margin / Math.max(0.25, pdfOptions.scale))),
        scale: pdfOptions.scale,
        customWidth: pdfOptions.customWidth,
        customHeight: pdfOptions.customHeight,
      });

      const suffix = pdfOptions.scope === "full" ? "full" : "viewport";
      downloadBlob(blob, `geneasketch-${suffix}.pdf`);
      setStatus("Exportado PDF");
      return true;
    },
    [graphSvgRef, pdfOptions, colorTheme.background],
  );

  const openRecentItem = useCallback(
    (entryId: string, onColorThemeLoad?: (theme: ColorThemeConfig) => void) => {
      const opened = openRecentFile(entryId);
      if (!opened) {
        setStatus("No se pudo abrir el elemento reciente.");
        return;
      }

      const recentGraph = GSchemaGraph.fromData(opened.payload.graph.data, opened.payload.graph.journal);

      if (opened.entry.kind === "open") {
        void (async () => {
          const loadedTheme = await runtime.applyLoadedPayload({
            graph: recentGraph,
            source: inferSourceByFileName(opened.entry.name),
          });
          if (loadedTheme && onColorThemeLoad) {
            onColorThemeLoad(loadedTheme);
          }
          setStatus(`Abierto reciente: ${opened.entry.name}`);
        })();
        return;
      }

      if (!gschemaGraph || !hasMeaningfulTree(gschemaGraph)) {
        void (async () => {
          const loadedTheme = await runtime.applyLoadedPayload({
            graph: recentGraph,
            source: inferSourceByFileName(opened.entry.name),
          });
          if (loadedTheme && onColorThemeLoad) {
            onColorThemeLoad(loadedTheme);
          }
          setStatus(`Abierto reciente para reemplazo: ${opened.entry.name}`);
        })();
        return;
      }

      const incomingDoc = projectOrNull(recentGraph);
      if (!incomingDoc) {
        setStatus("No se pudo preparar el reciente para importación.");
        return;
      }
      setImportIncomingDoc(incomingDoc);
      setStatus(`Importado reciente: ${opened.entry.name}`);
    },
    [gschemaGraph, openRecentFile, runtime],
  );

  const handleMergeApply = useCallback(
    (nextDoc: GraphDocument, stats: { addedPersons: number; updatedPersons: number; addedFamilies: number }) => {
      runtime.applyMergedDocument(nextDoc);
      setImportIncomingDoc(null);
      setStatus(`Fusión completada: +${stats.addedPersons} personas, ${stats.updatedPersons} actualizadas y +${stats.addedFamilies} familias.`);
    },
    [runtime],
  );

  return {
    status,
    setStatus,
    exportWarnings,
    setExportWarnings,
    importIncomingDoc,
    setImportIncomingDoc,
    pdfOptions,
    setPdfOptions,
    openAndReplace,
    importForMerge,
    saveGsk,
    exportGed,
    exportBranchGsk,
    exportRaster,
    exportPdfNow,
    openRecentItem,
    handleMergeApply,
  };
}

