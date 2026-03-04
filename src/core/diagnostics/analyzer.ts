import { GraphDocument } from "../../types/domain";
import { DiagnosticIssue, DiagnosticReport, DiagnosticCategory } from "./types";
import { planDiagnosticFixOptions } from "./fixPlanner";

// Helper function to extract year from BIRT/DEAT/MARR etc dates
// Useful for chronology checks.
function getYearFromEvent(events: { type: string; date?: string }[] | undefined, type: string): number | undefined {
    const ev = events?.find(e => e.type === type);
    if (!ev?.date) return undefined;
    const match = ev.date.match(/\b(\d{4})\b/);
    return match ? parseInt(match[1], 10) : undefined;
}

export function analyzeGeneaDocument(doc: GraphDocument): DiagnosticReport {
    const issues: DiagnosticIssue[] = [];

    const categoryCounts: Record<DiagnosticCategory, number> = {
        structural: 0,
        chronological: 0,
        data_quality: 0,
        relationships: 0
    };

    const addIssue = (
        code: string,
        category: DiagnosticCategory,
        severity: "error" | "warning" | "info",
        entityId: string,
        message: string,
        relatedEntityId?: string,
        suggestedFix?: string
    ) => {
        const id = `${code}_${entityId}_${relatedEntityId || "none"}_${issues.length}`;
        const issue: DiagnosticIssue = { id, code, category, severity, entityId, relatedEntityId, message, suggestedFix };
        issue.fixOptions = planDiagnosticFixOptions(issue, doc);
        issues.push(issue);
        categoryCounts[category]++;
    };

    // Maps and Sets for O(1) lookups
    const personIds = new Set(Object.keys(doc.persons));
    const familyIds = new Set(Object.keys(doc.families));

    // --- PASS 1: Persons ---
    for (const [pId, person] of Object.entries(doc.persons)) {
        if (!person.name || person.name.trim() === "" || person.name === "(Sin nombre)") {
            addIssue("INFO_EMPTY_NAME", "data_quality", "info", pId, "La persona no tiene un nombre definido o usa un placeholder temporario.");
        } else if (/\d/.test(person.name)) {
            // New rule: Name contains numbers
            addIssue("WARN_NAME_CONTAINS_NUMBERS", "data_quality", "warning", pId, `El nombre "${person.name}" contiene nÃºmeros.`);
        }

        if (person.famc.length === 0 && person.fams.length === 0) {
            addIssue("INFO_ORPHAN_PERSON", "structural", "info", pId, "La persona estÃ¡ aislada en el Ã¡rbol (no tiene padres ni parejas/hijos).");
        }

        // Check for multiple BIRT/DEAT
        const birtCount = person.events?.filter(e => e.type === "BIRT").length || 0;
        const deatCount = person.events?.filter(e => e.type === "DEAT").length || 0;
        if (birtCount > 1) {
            addIssue("WARN_MULTIPLE_BIRT", "data_quality", "warning", pId, `La persona tiene ${birtCount} eventos de nacimiento.`);
        }
        if (deatCount > 1) {
            addIssue("WARN_MULTIPLE_DEAT", "data_quality", "warning", pId, `La persona tiene ${deatCount} eventos de defunciÃ³n.`);
        }

        const seenFamc = new Set<string>();
        for (const famId of person.famc) {
            if (!familyIds.has(famId)) {
                addIssue("ERR_PERSON_MISSING_FAMC", "structural", "error", pId, `La persona apunta a la familia de origen ${famId}, pero esa familia no existe en el documento.`, famId);
            } else {
                if (seenFamc.has(famId)) {
                    addIssue("ERR_DUP_FAM_IN_PERSON", "structural", "error", pId, `La persona lista a la familia ${famId} mÃ¡s de una vez como 'famc'.`, famId);
                }
                seenFamc.add(famId);

                // A.Symmetry Check
                const fam = doc.families[famId];
                if (fam && !fam.childrenIds.includes(pId)) {
                    addIssue("ERR_ASYM_FAMC_MISSING_CHILD", "structural", "error", pId, `La persona declara provenir de la familia ${famId}, pero la familia no la incluye en su lista de hijos.`, famId);
                }
            }
        }

        const seenFams = new Set<string>();
        for (const famId of person.fams) {
            if (!familyIds.has(famId)) {
                addIssue("ERR_PERSON_MISSING_FAMS", "structural", "error", pId, `La persona apunta a la familia conyugal ${famId}, pero esa familia no existe en el documento.`, famId);
            } else {
                if (seenFams.has(famId)) {
                    addIssue("ERR_DUP_FAM_IN_PERSON", "structural", "error", pId, `La persona lista a la familia ${famId} mÃ¡s de una vez como 'fams'.`, famId);
                }
                seenFams.add(famId);

                const fam = doc.families[famId];
                if (fam && fam.husbandId !== pId && fam.wifeId !== pId) {
                    addIssue("ERR_ASYM_FAMS_MISSING_SPOUSE", "structural", "error", pId, `La persona declara ser padre/madre en la familia ${famId}, pero la familia no le asigna el rol de Husband ni Wife.`, famId);
                }
            }
        }

        // Role Conflicts
        let isHusbandInSomeFam = false;
        let isWifeInSomeFam = false;

        for (const famId of person.fams) {
            const fam = doc.families[famId];
            if (fam) {
                if (fam.husbandId === pId) isHusbandInSomeFam = true;
                if (fam.wifeId === pId) isWifeInSomeFam = true;
            }
        }

        if (person.sex === "M" && isWifeInSomeFam) {
            addIssue("WARN_CONFLICTING_ROLES", "data_quality", "warning", pId, "La persona tiene sexo Masculino pero figura como 'Wife' en al menos una familia.");
        }
        if (person.sex === "F" && isHusbandInSomeFam) {
            addIssue("WARN_CONFLICTING_ROLES", "data_quality", "warning", pId, "La persona tiene sexo Femenino pero figura como 'Husband' en al menos una familia.");
        }
        if (isHusbandInSomeFam && isWifeInSomeFam) {
            addIssue("WARN_CONFLICTING_ROLES", "data_quality", "warning", pId, "La persona actÃºa de 'Husband' en una familia y de 'Wife' en otra, roles conflictivos.");
        }

        // Chronology within person
        const birtYear = getYearFromEvent(person.events, "BIRT");
        const deatYear = getYearFromEvent(person.events, "DEAT");

        if (birtYear && deatYear) {
            if (deatYear < birtYear) {
                addIssue("WARN_CHRONOLOGY_DEAT_BEFORE_BIRT", "chronological", "warning", pId, `La fecha de defunciÃ³n (aprox. ${deatYear}) es anterior a la fecha de nacimiento (aprox. ${birtYear}).`);
            } else if (deatYear - birtYear > 120) {
                addIssue("WARN_CHRONOLOGY_TOO_OLD", "chronological", "warning", pId, `La persona viviÃ³ al menos ${deatYear - birtYear} aÃ±os (naciÃ³ ${birtYear}, muriÃ³ ${deatYear}), asumiendo un mÃ¡ximo de 120 aÃ±os humanos es inusual.`);
            }
        } else if (birtYear && !deatYear && person.lifeStatus !== "deceased") {
            const currentYear = new Date().getFullYear();
            if (currentYear - birtYear > 120) {
                addIssue("INFO_CHRONOLOGY_LIKELY_DEAD", "chronological", "info", pId, `La persona no tiene defunciÃ³n registrada ni estÃ¡ marcada como fallecida, pero naciÃ³ hace ${currentYear - birtYear} aÃ±os. Probablemente haya fallecido.`);
            }
        }
    }

    // --- PASS 2: Families ---
    for (const [fId, fam] of Object.entries(doc.families)) {
        if (!fam.husbandId && !fam.wifeId && fam.childrenIds.length === 0) {
            addIssue("INFO_EMPTY_FAMILY", "data_quality", "info", fId, "La familia estÃ¡ completamente vacÃ­a (sin cÃ³nyuges ni hijos).");
        } else if ((fam.husbandId || fam.wifeId) && fam.childrenIds.length === 0 && !fam.events?.some(e => e.type === "MARR")) {
            addIssue("INFO_ORPHAN_FAMILY", "structural", "info", fId, "La familia tiene cÃ³nyuges pero no tiene fecha de matrimonio ni hijos.");
        }

        if (fam.husbandId) {
            if (!personIds.has(fam.husbandId)) {
                addIssue("ERR_FAM_MISSING_HUSB", "structural", "error", fId, `El esposo (Husband) referenciado ${fam.husbandId} no existe en el documento.`, fam.husbandId);
            } else {
                const p = doc.persons[fam.husbandId];
                if (p && !p.fams.includes(fId)) {
                    addIssue("ERR_ASYM_SPOUSE_MISSING_FAMS", "structural", "error", fId, `La familia tiene a ${fam.husbandId} como Husband, pero esa persona no incluye esta familia en sus FAMS.`, fam.husbandId);
                }
            }
        }

        if (fam.wifeId) {
            if (!personIds.has(fam.wifeId)) {
                addIssue("ERR_FAM_MISSING_WIFE", "structural", "error", fId, `La esposa (Wife) referenciada ${fam.wifeId} no existe en el documento.`, fam.wifeId);
            } else {
                const p = doc.persons[fam.wifeId];
                if (p && !p.fams.includes(fId)) {
                    addIssue("ERR_ASYM_SPOUSE_MISSING_FAMS", "structural", "error", fId, `La familia tiene a ${fam.wifeId} como Wife, pero esa persona no incluye esta familia en sus FAMS.`, fam.wifeId);
                }
            }
        }

        if (fam.husbandId && fam.wifeId && fam.husbandId === fam.wifeId) {
            addIssue("ERR_SELF_REF_PARENT", "relationships", "error", fId, `La misma persona ${fam.husbandId} ocupa el rol de esposo y esposa en la misma familia.`, fam.husbandId);
        }

        // Sibling marriage check (endogamy explicit)
        if (fam.husbandId && fam.wifeId) {
            const husb = doc.persons[fam.husbandId];
            const wife = doc.persons[fam.wifeId];
            if (husb && wife) {
                // If they share at least one parent's family
                const sharedFamc = husb.famc.filter(fc => wife.famc.includes(fc));
                if (sharedFamc.length > 0) {
                    addIssue("WARN_SIBLING_MARRIAGE", "relationships", "warning", fId, `Posible matrimonio entre hermanos (comparten familia de origen: ${sharedFamc.join(", ")}).`);
                }
            }
        }

        // Marriage chronology
        const marrYear = getYearFromEvent(fam.events, "MARR");
        if (marrYear !== undefined) {
            if (fam.husbandId && doc.persons[fam.husbandId]) {
                const hBirt = getYearFromEvent(doc.persons[fam.husbandId].events, "BIRT");
                const hDeat = getYearFromEvent(doc.persons[fam.husbandId].events, "DEAT");
                if (hBirt !== undefined && marrYear < hBirt + 13) {
                    addIssue("WARN_CHRONOLOGY_MARR_TOO_EARLY", "chronological", "warning", fId, `Matrimonio en ${marrYear}, el esposo naciÃ³ en ${hBirt} (tendrÃ­a ${marrYear - hBirt} aÃ±os).`, fam.husbandId);
                }
                if (hDeat !== undefined && marrYear > hDeat) {
                    addIssue("WARN_CHRONOLOGY_MARR_AFTER_DEAT", "chronological", "warning", fId, `Matrimonio en ${marrYear}, pero el esposo falleciÃ³ en ${hDeat}.`, fam.husbandId);
                }
            }
            if (fam.wifeId && doc.persons[fam.wifeId]) {
                const wBirt = getYearFromEvent(doc.persons[fam.wifeId].events, "BIRT");
                const wDeat = getYearFromEvent(doc.persons[fam.wifeId].events, "DEAT");
                if (wBirt !== undefined && marrYear < wBirt + 13) {
                    addIssue("WARN_CHRONOLOGY_MARR_TOO_EARLY", "chronological", "warning", fId, `Matrimonio en ${marrYear}, la esposa naciÃ³ en ${wBirt} (tendrÃ­a ${marrYear - wBirt} aÃ±os).`, fam.wifeId);
                }
                if (wDeat !== undefined && marrYear > wDeat) {
                    addIssue("WARN_CHRONOLOGY_MARR_AFTER_DEAT", "chronological", "warning", fId, `Matrimonio en ${marrYear}, pero la esposa falleciÃ³ en ${wDeat}.`, fam.wifeId);
                }
            }
        }


        const seenChildren = new Set<string>();
        for (const childId of fam.childrenIds) {
            if (seenChildren.has(childId)) {
                addIssue("ERR_DUP_CHILD_IN_FAM", "structural", "error", fId, `El hijo ${childId} aparece listado mÃºltiples veces en la misma familia.`, childId);
            }
            seenChildren.add(childId);

            if (!personIds.has(childId)) {
                addIssue("ERR_FAM_MISSING_CHIL", "structural", "error", fId, `El hijo referenciado ${childId} no existe en el documento.`, childId);
            } else {
                const p = doc.persons[childId];
                if (p) {
                    if (!p.famc.includes(fId)) {
                        addIssue("ERR_ASYM_CHILD_MISSING_FAMC", "structural", "error", fId, `La familia declara al hijo ${childId}, pero el hijo no incluye esta familia en sus FAMC.`, childId);
                    }

                    if (childId === fam.husbandId || childId === fam.wifeId) {
                        addIssue("ERR_SELF_REF_PARENT", "relationships", "error", fId, `La persona ${childId} figura como hijo y como esposo/esposa en la misma familia.`, childId);
                    }

                    // Chronology parent vs child
                    const childBirt = getYearFromEvent(p.events, "BIRT");

                    if (childBirt !== undefined) {
                        if (fam.husbandId && doc.persons[fam.husbandId]) {
                            const hBirt = getYearFromEvent(doc.persons[fam.husbandId].events, "BIRT");
                            const hDeat = getYearFromEvent(doc.persons[fam.husbandId].events, "DEAT");

                            if (hBirt !== undefined) {
                                if (hBirt >= childBirt) {
                                    addIssue("ERR_CHRONOLOGY_PARENT_BIRT_AFTER_CHILD", "chronological", "error", fId, `La fecha de nacimiento del padre (${hBirt}) es posterior o igual a la del hijo ${childId} (${childBirt}).`, fam.husbandId);
                                } else if (childBirt - hBirt < 12) {
                                    addIssue("WARN_CHRONOLOGY_PARENT_TOO_YOUNG", "chronological", "warning", fId, `El padre tenÃ­a ${childBirt - hBirt} aÃ±os al nacer su hijo ${childId}.`, fam.husbandId);
                                } else if (childBirt - hBirt > 80) {
                                    addIssue("WARN_CHRONOLOGY_PARENT_TOO_OLD", "chronological", "warning", fId, `El padre tenÃ­a ${childBirt - hBirt} aÃ±os al nacer su hijo ${childId}.`, fam.husbandId);
                                }
                            }
                            // Father deat check (+9 months)
                            if (hDeat !== undefined && childBirt > hDeat + 1) { // +1 year leeway for posthumous birth
                                addIssue("ERR_CHRONOLOGY_CHILD_BIRT_AFTER_DEAT", "chronological", "error", fId, `El hijo ${childId} naciÃ³ en ${childBirt}, mÃ¡s de un aÃ±o despuÃ©s de la defunciÃ³n del padre en ${hDeat}.`, fam.husbandId);
                            }
                        }
                        if (fam.wifeId && doc.persons[fam.wifeId]) {
                            const wBirt = getYearFromEvent(doc.persons[fam.wifeId].events, "BIRT");
                            const wDeat = getYearFromEvent(doc.persons[fam.wifeId].events, "DEAT");

                            if (wBirt !== undefined) {
                                if (wBirt >= childBirt) {
                                    addIssue("ERR_CHRONOLOGY_PARENT_BIRT_AFTER_CHILD", "chronological", "error", fId, `La fecha de nacimiento de la madre (${wBirt}) es posterior o igual a la del hijo ${childId} (${childBirt}).`, fam.wifeId);
                                } else if (childBirt - wBirt < 12) {
                                    addIssue("WARN_CHRONOLOGY_PARENT_TOO_YOUNG", "chronological", "warning", fId, `La madre tenÃ­a ${childBirt - wBirt} aÃ±os al nacer su hijo ${childId}.`, fam.wifeId);
                                } else if (childBirt - wBirt > 55) {
                                    addIssue("WARN_CHRONOLOGY_PARENT_TOO_OLD", "chronological", "warning", fId, `La madre tenÃ­a ${childBirt - wBirt} aÃ±os al nacer su hijo ${childId}.`, fam.wifeId);
                                }
                            }
                            if (wDeat !== undefined && childBirt > wDeat) {
                                addIssue("ERR_CHRONOLOGY_CHILD_BIRT_AFTER_DEAT", "chronological", "error", fId, `El hijo ${childId} naciÃ³ en ${childBirt}, despuÃ©s de la defunciÃ³n de la madre en ${wDeat}.`, fam.wifeId);
                            }
                        }
                    }
                }
            }
        }
    }

    // --- PASS 3: Cycle Detection (DFS) ---
    // Detects if someone is their own ancestor.
    const visited = new Set<string>();
    const currentStack = new Set<string>();

    const dfsCycle = (pId: string): boolean => {
        // Return true if cycle found
        if (currentStack.has(pId)) {
            addIssue("ERR_CYCLE_DETECTED", "relationships", "error", pId, `MÃºltiples relaciones apuntan en ciclo. La persona ${pId} termina siendo su propio ancestro.`);
            return true;
        }
        if (visited.has(pId)) return false;

        visited.add(pId);
        currentStack.add(pId);

        const p = doc.persons[pId];
        if (p) {
            for (const famcId of p.famc) {
                const fam = doc.families[famcId];
                if (fam) {
                    if (fam.husbandId && dfsCycle(fam.husbandId)) return true;
                    if (fam.wifeId && dfsCycle(fam.wifeId)) return true;
                }
            }
        }

        currentStack.delete(pId);
        return false;
    };

    for (const pId of personIds) {
        if (!visited.has(pId)) {
            dfsCycle(pId);
        }
    }

    const report: DiagnosticReport = {
        issues,
        counts: {
            error: issues.filter(i => i.severity === "error").length,
            warning: issues.filter(i => i.severity === "warning").length,
            info: issues.filter(i => i.severity === "info").length,
        },
        categoryCounts
    };

    return report;
}

