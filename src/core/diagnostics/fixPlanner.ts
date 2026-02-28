import type { GeneaDocument } from "@/types/domain";
import type { DiagnosticFixOption, DiagnosticIssue } from "./types";

function makeOption(issue: DiagnosticIssue, partial: Omit<DiagnosticFixOption, "id">): DiagnosticFixOption {
  return {
    ...partial,
    id: `${issue.id}:${partial.action.kind}:${partial.label}`
  };
}

function isPersonId(id?: string): id is string {
  return Boolean(id && id.startsWith("@I"));
}

export function planDiagnosticFixOptions(issue: DiagnosticIssue, doc: GeneaDocument): DiagnosticFixOption[] {
  const options: DiagnosticFixOption[] = [];

  switch (issue.code) {
    case "ERR_PERSON_MISSING_FAMC":
      options.push(
        makeOption(issue, {
          label: "Crear familia placeholder",
          description: "Crea la familia faltante para mantener la referencia de origen.",
          risk: "safe",
          requiresConfirmation: false,
          recommended: true,
          action: { kind: "create_placeholder_family", familyId: issue.relatedEntityId || issue.entityId }
        }),
        makeOption(issue, {
          label: "Quitar referencia FAMC",
          description: "Elimina la referencia de familia faltante desde la persona.",
          risk: "review",
          requiresConfirmation: true,
          recommended: false,
          action: { kind: "remove_family_from_person_role", personId: issue.entityId, familyId: issue.relatedEntityId || issue.entityId, role: "famc" }
        })
      );
      break;
    case "ERR_PERSON_MISSING_FAMS":
      options.push(
        makeOption(issue, {
          label: "Crear familia placeholder",
          description: "Crea la familia faltante para mantener la referencia conyugal.",
          risk: "safe",
          requiresConfirmation: false,
          recommended: true,
          action: { kind: "create_placeholder_family", familyId: issue.relatedEntityId || issue.entityId }
        }),
        makeOption(issue, {
          label: "Quitar referencia FAMS",
          description: "Elimina la referencia conyugal faltante desde la persona.",
          risk: "review",
          requiresConfirmation: true,
          recommended: false,
          action: { kind: "remove_family_from_person_role", personId: issue.entityId, familyId: issue.relatedEntityId || issue.entityId, role: "fams" }
        })
      );
      break;
    case "ERR_FAM_MISSING_HUSB":
      if (issue.relatedEntityId) {
        options.push(
          makeOption(issue, {
            label: "Crear persona placeholder",
            description: "Crea la persona faltante y la mantiene como husband de la familia.",
            risk: "safe",
            requiresConfirmation: false,
            recommended: true,
            action: { kind: "create_placeholder_person", personId: issue.relatedEntityId, sex: "M" }
          }),
          makeOption(issue, {
            label: "Limpiar husband",
            description: "Quita el esposo faltante de la familia.",
            risk: "review",
            requiresConfirmation: true,
            recommended: false,
            action: { kind: "clear_family_spouse_role", familyId: issue.entityId, role: "husband" }
          })
        );
      }
      break;
    case "ERR_FAM_MISSING_WIFE":
      if (issue.relatedEntityId) {
        options.push(
          makeOption(issue, {
            label: "Crear persona placeholder",
            description: "Crea la persona faltante y la mantiene como wife de la familia.",
            risk: "safe",
            requiresConfirmation: false,
            recommended: true,
            action: { kind: "create_placeholder_person", personId: issue.relatedEntityId, sex: "F" }
          }),
          makeOption(issue, {
            label: "Limpiar wife",
            description: "Quita la esposa faltante de la familia.",
            risk: "review",
            requiresConfirmation: true,
            recommended: false,
            action: { kind: "clear_family_spouse_role", familyId: issue.entityId, role: "wife" }
          })
        );
      }
      break;
    case "ERR_FAM_MISSING_CHIL":
      if (issue.relatedEntityId) {
        options.push(
          makeOption(issue, {
            label: "Crear persona placeholder",
            description: "Crea el hijo faltante para conservar estructura.",
            risk: "safe",
            requiresConfirmation: false,
            recommended: true,
            action: { kind: "create_placeholder_person", personId: issue.relatedEntityId, sex: "U" }
          }),
          makeOption(issue, {
            label: "Quitar hijo faltante",
            description: "Remueve el hijo inexistente de la familia.",
            risk: "review",
            requiresConfirmation: true,
            recommended: false,
            action: { kind: "remove_child_from_family", familyId: issue.entityId, childId: issue.relatedEntityId }
          })
        );
      }
      break;
    case "ERR_DUP_FAM_IN_PERSON": {
      const role: "famc" | "fams" = issue.message.includes("'famc'") ? "famc" : "fams";
      options.push(
        makeOption(issue, {
          label: `Deduplicar ${role.toUpperCase()}`,
          description: "Elimina referencias repetidas de familia en la persona.",
          risk: "safe",
          requiresConfirmation: false,
          recommended: true,
          action: { kind: "dedupe_person_family_refs", personId: issue.entityId, role }
        })
      );
      break;
    }
    case "ERR_DUP_CHILD_IN_FAM":
      options.push(
        makeOption(issue, {
          label: "Deduplicar hijos",
          description: "Elimina IDs de hijos repetidos en la familia.",
          risk: "safe",
          requiresConfirmation: false,
          recommended: true,
          action: { kind: "dedupe_family_children", familyId: issue.entityId }
        })
      );
      break;
    case "ERR_ASYM_FAMC_MISSING_CHILD":
      if (issue.relatedEntityId) {
        options.push(
          makeOption(issue, {
            label: "Agregar persona a hijos de familia",
            description: "Sincroniza la familia para incluir a la persona en childrenIds.",
            risk: "safe",
            requiresConfirmation: false,
            recommended: true,
            action: { kind: "add_person_to_family_children", familyId: issue.relatedEntityId, personId: issue.entityId }
          }),
          makeOption(issue, {
            label: "Quitar FAMC de persona",
            description: "Elimina la referencia FAMC desde la persona.",
            risk: "review",
            requiresConfirmation: true,
            recommended: false,
            action: { kind: "remove_family_from_person_role", personId: issue.entityId, familyId: issue.relatedEntityId, role: "famc" }
          })
        );
      }
      break;
    case "ERR_ASYM_CHILD_MISSING_FAMC":
      if (issue.relatedEntityId) {
        options.push(
          makeOption(issue, {
            label: "Agregar FAMC al hijo",
            description: "Sincroniza al hijo agregando la familia en famc.",
            risk: "safe",
            requiresConfirmation: false,
            recommended: true,
            action: { kind: "add_family_to_person_role", personId: issue.relatedEntityId, familyId: issue.entityId, role: "famc" }
          }),
          makeOption(issue, {
            label: "Quitar hijo de familia",
            description: "Elimina al hijo de childrenIds en la familia.",
            risk: "review",
            requiresConfirmation: true,
            recommended: false,
            action: { kind: "remove_child_from_family", familyId: issue.entityId, childId: issue.relatedEntityId }
          })
        );
      }
      break;
    case "ERR_ASYM_FAMS_MISSING_SPOUSE": {
      const familyId = issue.relatedEntityId;
      const person = doc.persons[issue.entityId];
      const family = familyId ? doc.families[familyId] : undefined;
      if (familyId && person && family) {
        const preferredRole: "husband" | "wife" =
          person.sex === "F" ? "wife" : person.sex === "M" ? "husband" : (!family.husbandId ? "husband" : "wife");
        options.push(
          makeOption(issue, {
            label: "Asignar rol spouse",
            description: "Asigna a la persona como spouse de la familia si hay slot disponible.",
            risk: "review",
            requiresConfirmation: true,
            recommended: true,
            action: { kind: "assign_family_spouse_role", familyId, personId: issue.entityId, role: preferredRole }
          }),
          makeOption(issue, {
            label: "Quitar FAMS de persona",
            description: "Elimina la referencia conyugal desde la persona.",
            risk: "review",
            requiresConfirmation: true,
            recommended: false,
            action: { kind: "remove_family_from_person_role", personId: issue.entityId, familyId, role: "fams" }
          })
        );
      }
      break;
    }
    case "ERR_ASYM_SPOUSE_MISSING_FAMS":
      if (issue.relatedEntityId) {
        options.push(
          makeOption(issue, {
            label: "Agregar FAMS a persona",
            description: "Sincroniza la persona para incluir esta familia en fams.",
            risk: "safe",
            requiresConfirmation: false,
            recommended: true,
            action: { kind: "add_family_to_person_role", personId: issue.relatedEntityId, familyId: issue.entityId, role: "fams" }
          }),
          makeOption(issue, {
            label: "Limpiar spouse en familia",
            description: "Quita el spouse actual en la familia para resolver la asimetria.",
            risk: "review",
            requiresConfirmation: true,
            recommended: false,
            action: {
              kind: "clear_family_spouse_role",
              familyId: issue.entityId,
              role: issue.message.includes("Husband") ? "husband" : "wife"
            }
          })
        );
      }
      break;
    case "WARN_MULTIPLE_BIRT":
      options.push(
        makeOption(issue, {
          label: "Conservar nacimiento mas antiguo",
          description: "Mantiene un solo BIRT, el de anio minimo cuando existe.",
          risk: "review",
          requiresConfirmation: true,
          recommended: true,
          action: { kind: "trim_person_birth_events", personId: issue.entityId, keep: "earliest" }
        }),
        makeOption(issue, {
          label: "Conservar nacimiento mas reciente",
          description: "Mantiene un solo BIRT, el de anio maximo cuando existe.",
          risk: "review",
          requiresConfirmation: true,
          recommended: false,
          action: { kind: "trim_person_birth_events", personId: issue.entityId, keep: "latest" }
        }),
        makeOption(issue, {
          label: "Conservar primer BIRT",
          description: "Mantiene el primer evento en orden actual.",
          risk: "review",
          requiresConfirmation: true,
          recommended: false,
          action: { kind: "trim_person_birth_events", personId: issue.entityId, keep: "first" }
        })
      );
      break;
    case "WARN_MULTIPLE_DEAT":
      options.push(
        makeOption(issue, {
          label: "Conservar defuncion mas reciente",
          description: "Mantiene un solo DEAT, el de anio maximo cuando existe.",
          risk: "review",
          requiresConfirmation: true,
          recommended: true,
          action: { kind: "trim_person_death_events", personId: issue.entityId, keep: "latest" }
        }),
        makeOption(issue, {
          label: "Conservar defuncion mas antigua",
          description: "Mantiene un solo DEAT, el de anio minimo cuando existe.",
          risk: "review",
          requiresConfirmation: true,
          recommended: false,
          action: { kind: "trim_person_death_events", personId: issue.entityId, keep: "earliest" }
        }),
        makeOption(issue, {
          label: "Conservar primer DEAT",
          description: "Mantiene el primer evento en orden actual.",
          risk: "review",
          requiresConfirmation: true,
          recommended: false,
          action: { kind: "trim_person_death_events", personId: issue.entityId, keep: "first" }
        })
      );
      break;
    case "INFO_CHRONOLOGY_LIKELY_DEAD":
      options.push(
        makeOption(issue, {
          label: "Marcar como fallecido",
          description: "Actualiza lifeStatus a deceased sin forzar fecha de defuncion.",
          risk: "review",
          requiresConfirmation: true,
          recommended: true,
          action: { kind: "mark_person_deceased", personId: issue.entityId }
        })
      );
      break;
    case "ERR_SELF_REF_PARENT": {
      const relId = issue.relatedEntityId;
      if (issue.message.includes("hijo y como esposo") && relId && isPersonId(relId)) {
        options.push(
          makeOption(issue, {
            label: "Quitar hijo conflictivo",
            description: "Remueve el hijo conflictivo de la familia.",
            risk: "critical",
            requiresConfirmation: true,
            recommended: true,
            action: { kind: "remove_child_from_family", familyId: issue.entityId, childId: relId }
          })
        );
      } else {
        options.push(
          makeOption(issue, {
            label: "Limpiar rol wife",
            description: "Limpia wife para romper auto-referencia spouse.",
            risk: "critical",
            requiresConfirmation: true,
            recommended: true,
            action: { kind: "clear_family_spouse_role", familyId: issue.entityId, role: "wife" }
          })
        );
      }
      break;
    }
    default:
      break;
  }

  return options;
}
