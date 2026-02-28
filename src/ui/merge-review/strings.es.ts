export const MERGE_STRINGS_ES = {
  errorTitle: "Error en fusion asistida",
  errorUnknown: "Error desconocido en el flujo de fusion.",
  errorDetectedSafeClose: "Se detecto un error inesperado durante la revision de fusion y el proceso se cerro de forma segura.",
  errorNoDetail: "Sin detalle disponible.",
  closeAndContinue: "Cerrar y continuar",
  invalidDraftConfirm:
    "Se detecto una sesion de fusion incompatible o corrupta. ¿Deseas descartarla y continuar con una nueva revision?",
  restoreError: "Error inesperado al restaurar la fusion.",
  prepareError: "Error inesperado al preparar la revision de fusion.",
  cannotPrepareReview: "No se pudo preparar la revision de fusion con este archivo.",
  closeAndClearDraft: "Cerrar y limpiar borrador",
  stepLabels: {
    strategy: "Estrategia",
    inbox: "Bandeja",
    case_workbench: "Banco de casos",
    technical_conflicts: "Conflictos tecnicos",
    preview: "Vista previa",
    apply: "Aplicar"
  },
  detailLabels: {
    reason: "Razon",
    coverage: "Cobertura",
    caps: "Limites",
    blockers: "Bloqueadores",
    requiredActions: "Acciones requeridas",
    layer1: "Capa 1 identidad",
    layer2: "Capa 2 nucleo",
    layer3: "Capa 3 extendida",
    layer4: "Capa 4 global",
    propagation: "Soporte de propagacion",
    anchors: "Anclas de red"
  }
} as const;
