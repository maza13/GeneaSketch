export type PublicChangelogEntry = {
  heading: string;
  technicalVersion?: string | null;
  userChanges: string[];
};

export const PUBLIC_CHANGELOG: PublicChangelogEntry[] = [
  {
    "heading": "2 de marzo de 2026 - 0.4.0 (GSchema: Cambio de Paradigma)",
    "technicalVersion": "0.4.0",
    "userChanges": [
      "**GSchema Engine** — Nuevo motor de datos basado en grafos que permite registrar cada cambio de forma auditable y granular.",
      "**Formato .gsk** — Nuevo archivo nativo superpotente que guarda todo tu árbol, imágenes y configuración en un solo paquete.",
      "**Journaling** — Historial de operaciones integrado para mayor seguridad y futura sincronización.",
      "**Migración Transparente** — Tus archivos antiguos se convierten automáticamente al nuevo motor sin perder un solo dato."
    ]
  },
  {
    "heading": "27 de February de 2026 - 0.3.5 (Beta IA Assistant, Desktop)",
    "technicalVersion": "0.3.5",
    "userChanges": [
      "**Generador de Arboles Mock** — Nueva herramienta para crear arboles genealogicos procedimentales y reproducibles (con semilla), ideal para pruebas y demostraciones.",
      "**Visualizacion de Endogamia Mejorada** — Se ha implementado un nuevo esquema de color bicromatico (de Amarillo a Rojo) para la vista de endogamia, resaltando los niveles de consanguinidad de forma clara."
    ]
  },
  {
    "heading": "27 de febrero de 2026 - 0.3.0 (Beta IA Assistant, Desktop)",
    "technicalVersion": "0.3.0",
    "userChanges": [
      "**Asistente IA para actualizar el arbol**: Ahora puedes pegar texto libre y obtener propuestas de cambios genealogicos auditables.",
      "**Dos formas de entrada**: flujo local por nodo (desde la persona seleccionada) y flujo global (desde `Edit`) para cargas mas amplias.",
      "**Revision antes de aplicar**: cada cambio propuesto se revisa por item antes de confirmar el lote.",
      "**Mayor seguridad de edicion**: eliminaciones en modo reversible (soft delete) con opcion de deshacer.",
      "Mejoras de estabilidad general en flujo desktop.",
      "Refinamientos de interfaz para configuracion y revision de propuestas IA.",
      "Mensajes de error mas accionables para diagnostico de ejecucion."
    ]
  },
  {
    "heading": "27 de febrero de 2026",
    "technicalVersion": null,
    "userChanges": [
      "**Experiencia Unificada** â€” Las vistas de CÃ¡lculo de Parentesco y AnÃ¡lisis GenÃ©tico se han fusionado en un Ãºnico modo interactivo: **\"AnÃ¡lisis de Parentesco\"**.",
      "**CÃ¡lculo con un Clic** â€” Ahora puedes calcular instantÃ¡neamente el parentesco y la ruta biolÃ³gica hacia cualquier persona simplemente haciendo clic en su nodo mientras la vista de anÃ¡lisis estÃ¡ activa.",
      "**OptimizaciÃ³n de Memoria (Memoization)** â€” Se ha implementado una capa de cachÃ© inteligente que evita recalcular el mapa genÃ©tico innecesariamente, haciendo que las consultas sucesivas sean instantÃ¡neas.",
      "**Skills EstratÃ©gicas del Agente** â€” Se han integrado skills de nivel profesional para visualizaciÃ³n con D3, gestiÃ³n de escritorio con Tauri y reportes de alta calidad para potenciar el desarrollo avanzado.",
      "**IluminaciÃ³n Universal de Rutas** â€” Todas las capas de resaltado (Parentesco, ADN-Y, ADN-mt y objetivos del Mapa de Calor) ahora iluminan la ruta biolÃ³gica completa, incluyendo los nodos de uniÃ³n familiar, para un flujo estructural mÃ¡s intuitivo.",
      "**Renderizado de Alto Rendimiento** â€” El Ã¡rbol ahora mantiene una fluidez estable de **60 FPS** tras eliminar fugas de cÃ¡lculos redundantes en el bucle de renderizado.",
      "**Interfaz de Parentesco Premium** â€” La insignia de resultado de parentesco ha sido rediseÃ±ada con un estilo mÃ¡s prominente, acentos dorados y tipografÃ­a profesional.",
      "**RestauraciÃ³n del Clic en Nodos** â€” Se solucionÃ³ un problema donde el activador del cÃ¡lculo de parentesco se habÃ­a perdido tras los Ãºltimos cambios en la interfaz.",
      "**ResoluciÃ³n de Identidad** â€” Se corrigiÃ³ un error donde los nodos alias o las copias del grÃ¡fico rompÃ­an el resaltado de las rutas.",
      "**PrecisiÃ³n de Tooltips** â€” Se solucionÃ³ un problema donde los marcadores de contemporaneidad a veces parpadeaban al pasar el cursor."
    ]
  },
  {
    "heading": "26 de febrero de 2026 (Alpha 0.2.x)",
    "technicalVersion": null,
    "userChanges": [
      "**Vista de Linaje Combinado** â€” Se aÃ±adiÃ³ un modo de \"Linaje PÃºrpura\" que resalta a individuos que portan tanto rasgos paternos (ADN-Y) como maternos (ADN-mt).",
      "**Mapa de Calor GenÃ©tico** â€” Se introdujo la visualizaciÃ³n base de contribuciÃ³n genÃ©tica con lÃ³gica recursiva (ahora evolucionada a *AnÃ¡lisis de Parentesco*).",
      "**DiseÃ±o de PedigrÃ­** â€” Se corrigieron problemas de espaciado entre hermanos y se centraron los nodos de familia con mayor precisiÃ³n entre los padres.",
      "**Panel de DiagnÃ³stico** â€” Se mejorÃ³ la detecciÃ³n de inconsistencias de datos en archivos GEDCOM grandes."
    ]
  }
] as PublicChangelogEntry[];
