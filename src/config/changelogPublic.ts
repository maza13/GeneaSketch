export type PublicChangelogEntry = {
  heading: string;
  technicalVersion?: string | null;
  userChanges: string[];
};

export const PUBLIC_CHANGELOG: PublicChangelogEntry[] = [
  {
    "heading": "7 de marzo de 2026 - 0.4.5 (Beta GSchema, Shell Composition and Docs Sync)",
    "technicalVersion": "0.4.5",
    "userChanges": [
      "La shell queda mas ordenada internamente sin cambiar los flujos visibles de trabajo.",
      "La documentacion principal ahora describe mejor el estado real de la app, `.gsk` y `Kindra v3.1`.",
      "Se agregan tests para blindar la frontera entre App Shell, facade y features complejas."
    ]
  },
  {
    "heading": "6 de marzo de 2026 - 0.4.5 (Beta GSchema, Foundation Close, Desktop)",
    "technicalVersion": "0.4.5",
    "userChanges": [
      "Mayor estabilidad y consistencia del motor genealogico bajo el modelo directo.",
      "Mejor respuesta del arbol y del buscador en escenarios densos.",
      "Base arquitectonica y nomenclatura mas claras para separar motor, visualizacion y shell."
    ]
  },
  {
    "heading": "4 de marzo de 2026 - Nota de arquitectura (Cierre Kindra v3.1 065-072)",
    "technicalVersion": null,
    "userChanges": [
      "El render genealogico queda consolidado en la ruta V3.",
      "Se elimina la ruta de contingencia V2 para reducir complejidad operativa.",
      "La app mantiene apertura de datos legacy con migracion tolerante en segundo plano."
    ]
  },
  {
    "heading": "3 de marzo de 2026 - 0.4.4 (Beta GSchema, Desktop)",
    "technicalVersion": "0.4.4",
    "userChanges": [
      "Wiki de producto y wiki tecnica normalizadas con enlaces internos consistentes.",
      "Navegacion del panel Wiki mejorada para enlaces relativos y legacy `/docs/...`.",
      "Mayor claridad de contratos y glosario para evitar ambiguedades en uso diario."
    ]
  },
  {
    "heading": "2 de marzo de 2026 - 0.4.1 (Hard Cut: GSK-first)",
    "technicalVersion": "0.4.1",
    "userChanges": [
      "`.gsk` queda como formato nativo principal de trabajo.",
      "`.ged` se mantiene para interoperabilidad.",
      "Se retira soporte runtime de formatos legacy `.gsz/.gdz`."
    ]
  },
  {
    "heading": "2 de marzo de 2026 - 0.4.0 (GSchema: Cambio de Paradigma)",
    "technicalVersion": "0.4.0",
    "userChanges": [
      "Nuevo motor GSchema basado en grafo y claims.",
      "Nuevo contenedor `.gsk` con estado, journal y metadatos.",
      "Migracion transparente desde formatos anteriores."
    ]
  },
  {
    "heading": "2 de marzo de 2026 - 0.3.7 (Refactorizacion del Store y Estabilidad)",
    "technicalVersion": "0.3.7",
    "userChanges": [
      "Mayor estabilidad general en carga y navegacion.",
      "Correcciones de estado y sincronizacion visual."
    ]
  },
  {
    "heading": "28 de febrero de 2026 - 0.3.6 (Buscador Avanzado y Refinamiento IA)",
    "technicalVersion": "0.3.6",
    "userChanges": [
      "Busqueda semantica mejorada y ordenamiento de resultados.",
      "Refinamiento de nacimiento con asistencia IA."
    ]
  },
  {
    "heading": "27 de febrero de 2026 - 0.3.5 (Beta IA Assistant, Desktop)",
    "technicalVersion": "0.3.5",
    "userChanges": [
      "Generador de arboles mock reproducible por semilla.",
      "Mejor visualizacion de endogamia."
    ]
  },
  {
    "heading": "27 de febrero de 2026 - 0.3.0 (Beta IA Assistant, Desktop)",
    "technicalVersion": "0.3.0",
    "userChanges": [
      "Flujo inicial de asistente IA para proponer cambios auditables.",
      "Revision previa por lote antes de aplicar."
    ]
  }
] as PublicChangelogEntry[];

