export type DiagnosticSeverity = "error" | "warning" | "info";
export type DiagnosticCategory = "structural" | "chronological" | "data_quality" | "relationships";

export type DiagnosticFixRisk = "safe" | "review" | "critical";

export type DiagnosticFixAction =
  | { kind: "dedupe_person_family_refs"; personId: string; role: "famc" | "fams" }
  | { kind: "dedupe_family_children"; familyId: string }
  | { kind: "add_person_to_family_children"; familyId: string; personId: string }
  | { kind: "add_family_to_person_role"; personId: string; familyId: string; role: "famc" | "fams" }
  | { kind: "remove_family_from_person_role"; personId: string; familyId: string; role: "famc" | "fams" }
  | { kind: "remove_child_from_family"; familyId: string; childId: string }
  | { kind: "assign_family_spouse_role"; familyId: string; personId: string; role: "husband" | "wife" }
  | { kind: "clear_family_spouse_role"; familyId: string; role: "husband" | "wife" }
  | { kind: "create_placeholder_person"; personId: string; sex: "M" | "F" | "U" }
  | { kind: "create_placeholder_family"; familyId: string }
  | { kind: "mark_person_deceased"; personId: string }
  | { kind: "trim_person_birth_events"; personId: string; keep: "earliest" | "latest" | "first" }
  | { kind: "trim_person_death_events"; personId: string; keep: "earliest" | "latest" | "first" };

export type DiagnosticFixOption = {
  id: string;
  label: string;
  description: string;
  risk: DiagnosticFixRisk;
  requiresConfirmation: boolean;
  recommended: boolean;
  action: DiagnosticFixAction;
};

export type DiagnosticIssue = {
  id: string;
  code: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  entityId: string;
  relatedEntityId?: string;
  message: string;
  suggestedFix?: string;
  fixOptions?: DiagnosticFixOption[];
};

export type DiagnosticReport = {
  issues: DiagnosticIssue[];
  counts: {
    error: number;
    warning: number;
    info: number;
  };
  categoryCounts: Record<DiagnosticCategory, number>;
};

export type DiagnosticFixExecutionResult = {
  applied: number;
  skipped: number;
  errors: string[];
  touchedPersons: string[];
  touchedFamilies: string[];
};
