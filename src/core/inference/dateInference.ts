import { GeneaDocument, Person } from "../../types/domain";
import { InferenceResult, InferenceEvidence } from "./types";

// Utils
function getExactYearFromPerson(person: Person, eventType: string): number | undefined {
    const ev = person.events?.find(e => e.type === eventType);
    if (!ev?.date) return undefined;

    // Si contiene modificadores de estimación, la IGNORAMOS para no propagar el error en cadena
    const upperDate = ev.date.toUpperCase();
    if (upperDate.includes("EST") || upperDate.includes("ABT") || upperDate.includes("CAL") || upperDate.includes("AFT") || upperDate.includes("BEF") || upperDate.includes("~") || upperDate.includes("BET")) {
        return undefined;
    }

    const match = ev.date.match(/\b(\d{4})\b/);
    return match ? parseInt(match[1], 10) : undefined;
}

// Búsqueda de generaciones relativas (BFS) con distancias en aristas
function getRelativeGenerations(doc: GeneaDocument, startId: string): Record<string, { g: number, d: number }> {
    const genMap: Record<string, { g: number, d: number }> = {};
    const queue: { id: string, g: number, d: number }[] = [{ id: startId, g: 0, d: 0 }];
    genMap[startId] = { g: 0, d: 0 };

    let iterations = 0;
    while (queue.length > 0 && iterations < 50000) { // Safety break
        iterations++;
        const curr = queue.shift()!;
        const p = doc.persons[curr.id];
        if (!p) continue;

        // Padres (g + 1, d + 1)
        for (const famcId of p.famc) {
            const fam = doc.families[famcId];
            if (!fam) continue;
            [fam.husbandId, fam.wifeId].forEach(pid => {
                if (pid && genMap[pid] === undefined) {
                    genMap[pid] = { g: curr.g + 1, d: curr.d + 1 };
                    queue.push({ id: pid, g: curr.g + 1, d: curr.d + 1 });
                }
            });
            // Hermanos directos (g, d + 2) para darles prioridad
            fam.childrenIds.forEach(cid => {
                if (cid && genMap[cid] === undefined) {
                    genMap[cid] = { g: curr.g, d: curr.d + 2 };
                    queue.push({ id: cid, g: curr.g, d: curr.d + 2 });
                }
            });
        }

        // Parejas e Hijos
        for (const famsId of p.fams) {
            const fam = doc.families[famsId];
            if (!fam) continue;
            // Parejas (g, d + 1)
            const partnerId = fam.husbandId === curr.id ? fam.wifeId : fam.husbandId;
            if (partnerId && genMap[partnerId] === undefined) {
                genMap[partnerId] = { g: curr.g, d: curr.d + 1 };
                queue.push({ id: partnerId, g: curr.g, d: curr.d + 1 });
            }
            // Hijos (g - 1, d + 1)
            fam.childrenIds.forEach(cid => {
                if (cid && genMap[cid] === undefined) {
                    genMap[cid] = { g: curr.g - 1, d: curr.d + 1 };
                    queue.push({ id: cid, g: curr.g - 1, d: curr.d + 1 });
                }
            });
        }
    }
    return genMap;
}

// Stats para contemporáneos ponderados por cercanía
function getDemographicStats(doc: GeneaDocument, sex: "M" | "F" | "U", genLevels: Record<string, { g: number, d: number }>) {
    let sumMarrAge = 0; let weightMarrAge = 0; let countMarrAge = 0;
    let sumFirstChildAge = 0; let weightFirstChildAge = 0; let countFirstChildAge = 0;

    for (const pId in doc.persons) {
        const p = doc.persons[pId];
        if (sex !== "U" && p.sex !== sex) continue;
        const bYear = getExactYearFromPerson(p, "BIRT");
        if (!bYear) continue;

        const net = genLevels[pId];
        const w = net ? Math.exp(-0.35 * net.d) : 0.05;

        let minChildBirth = Infinity;
        for (const fId of p.fams) {
            const f = doc.families[fId];
            if (!f) continue;

            const mYearRaw = f.events?.find(e => e.type === "MARR");
            if (mYearRaw?.date && !mYearRaw.date.toUpperCase().match(/EST|ABT|CAL|~|BEF|AFT|BET/)) {
                const match = mYearRaw.date.match(/\b(\d{4})\b/);
                if (match) {
                    const mYear = parseInt(match[1], 10);
                    if (mYear >= bYear + 12 && mYear <= bYear + 80) {
                        sumMarrAge += (mYear - bYear) * w;
                        weightMarrAge += w;
                        countMarrAge++;
                    }
                }
            }
            for (const cId of f.childrenIds) {
                const cb = getExactYearFromPerson(doc.persons[cId], "BIRT");
                if (cb !== undefined) minChildBirth = Math.min(minChildBirth, cb);
            }
        }
        if (minChildBirth !== Infinity && minChildBirth >= bYear + 12 && minChildBirth <= bYear + 80) {
            sumFirstChildAge += (minChildBirth - bYear) * w;
            weightFirstChildAge += w;
            countFirstChildAge++;
        }
    }

    const fallbackMarr = sex === "M" ? 28 : (sex === "F" ? 24 : 26);
    const fallbackChild = sex === "M" ? 30 : (sex === "F" ? 25 : 28);

    return {
        avgMarrAge: weightMarrAge > 0 && countMarrAge >= 1 ? Math.round(sumMarrAge / weightMarrAge) : fallbackMarr,
        avgFirstChildAge: weightFirstChildAge > 0 && countFirstChildAge >= 1 ? Math.round(sumFirstChildAge / weightFirstChildAge) : fallbackChild,
        hasDataMarr: countMarrAge >= 2,
        hasDataChild: countFirstChildAge >= 2,
        countMarr: countMarrAge,
        countChild: countFirstChildAge
    };
}

export function estimatePersonBirthYear(personId: string, doc: GeneaDocument): InferenceResult | null {
    const person = doc.persons[personId];
    if (!person) return null;

    const evidences: InferenceEvidence[] = [];
    let absoluteMin = -Infinity;

    // El límite estricto superior termodinámico obvio: no se puede nacer en el mañana (por ej. 2072).
    let absoluteMax = new Date().getFullYear();

    // --- EVIDENCIAS COMO HIJO/A (FAMC) ---
    // Analizamos los padres biológicos
    for (const famcId of person.famc) {
        const fam = doc.families[famcId];
        if (!fam) continue;

        if (fam.husbandId && doc.persons[fam.husbandId]) {
            const father = doc.persons[fam.husbandId];
            const fatherBirth = getExactYearFromPerson(father, "BIRT");
            const fatherDeath = getExactYearFromPerson(father, "DEAT");

            if (fatherBirth !== undefined) {
                // Edad biológica probable del padre: 15 a 80 años
                const minChildBirth = fatherBirth + 15;
                const maxChildBirth = fatherBirth + 80;
                absoluteMin = Math.max(absoluteMin, minChildBirth);
                absoluteMax = Math.min(absoluteMax, maxChildBirth);

                evidences.push({
                    type: "contextual",
                    sourceId: father.id,
                    message: `Padre biológico nacido en ${fatherBirth} (edad fértil hombre ~15 a 80 años)`,
                    suggestedRange: [minChildBirth, maxChildBirth],
                    minLimit: minChildBirth,
                    maxLimit: maxChildBirth
                });
            }

            if (fatherDeath !== undefined) {
                // Un hijo/a puede nacer máximo aprox. 9 meses / 1 año después de que muera el padre (embarazo póstumo)
                const limitMax = fatherDeath + 1;
                absoluteMax = Math.min(absoluteMax, limitMax);
                evidences.push({
                    type: "strict_limit",
                    sourceId: father.id,
                    message: `Padre fallecido en ${fatherDeath} (nacimiento imposible después de ${limitMax})`,
                    maxLimit: limitMax
                });
            }
        }

        if (fam.wifeId && doc.persons[fam.wifeId]) {
            const mother = doc.persons[fam.wifeId];
            const motherBirth = getExactYearFromPerson(mother, "BIRT");
            const motherDeath = getExactYearFromPerson(mother, "DEAT");

            if (motherBirth !== undefined) {
                // Edad reproductiva de la madre: ventana mucho más estricta (aprox 14 - 50)
                const minChildBirth = motherBirth + 14;
                const maxChildBirth = motherBirth + 50;
                absoluteMin = Math.max(absoluteMin, minChildBirth);
                absoluteMax = Math.min(absoluteMax, maxChildBirth);

                evidences.push({
                    type: "contextual",
                    sourceId: mother.id,
                    message: `Madre biológica nacida en ${motherBirth} (ventana maternidad ~14 a 50 años)`,
                    suggestedRange: [minChildBirth, maxChildBirth],
                    minLimit: minChildBirth,
                    maxLimit: maxChildBirth
                });
            }

            if (motherDeath !== undefined) {
                // Nacer antes o en el preciso instante de la muerte de la madre (parto)
                const limitMax = motherDeath;
                absoluteMax = Math.min(absoluteMax, limitMax);
                evidences.push({
                    type: "strict_limit",
                    sourceId: mother.id,
                    message: `Madre fallecida en ${motherDeath} (imposible nacer más tarde)`,
                    maxLimit: limitMax
                });
            }
        }
    }

    // --- EVIDENCIAS DE HERMANOS (FAMC Compartidos) ---
    const siblingsBirths: number[] = [];
    for (const famcId of person.famc) {
        const fam = doc.families[famcId];
        if (fam) {
            for (const childId of fam.childrenIds) {
                if (childId !== personId) {
                    const sb = getExactYearFromPerson(doc.persons[childId], "BIRT");
                    if (sb !== undefined) siblingsBirths.push(sb);
                }
            }
        }
    }

    if (siblingsBirths.length > 0) {
        // En promedio, los hermanos biológicos suelen nacer en una ventana de ~20-25 años como mucho
        const minSiblingYear = Math.min(...siblingsBirths);
        const maxSiblingYear = Math.max(...siblingsBirths);

        // Ajustamos la ventana familiar (+/- 15 años respecto a los extremos conocidos de los hermanos)
        const minVal = minSiblingYear - 15;
        const maxVal = maxSiblingYear + 15;
        absoluteMin = Math.max(absoluteMin, minVal);
        absoluteMax = Math.min(absoluteMax, maxVal);

        evidences.push({
            type: "contextual",
            sourceId: personId,
            message: `Hermanos biológicos nacidos entre ${minSiblingYear} y ${maxSiblingYear} (ventana familiar estimada ~${minVal}-${maxVal})`,
            suggestedRange: [minVal, maxVal]
        });
    }


    // --- EVIDENCIAS COMO CONYUGE (FAMS) Y DESCENDENCIA AGRUPADA ---
    const genLevels = getRelativeGenerations(doc, personId);
    const stats = getDemographicStats(doc, person.sex, genLevels);
    const marriagesYears: number[] = [];
    const childrenBirths: number[] = [];
    const partnerBirths: number[] = [];

    for (const famsId of person.fams) {
        const fam = doc.families[famsId];
        if (!fam) continue;

        // Recolectar bodas
        const marrRaw = fam.events?.find(e => e.type === "MARR");
        if (marrRaw?.date && !marrRaw.date.toUpperCase().match(/EST|ABT|CAL|~|BEF|AFT|BET/)) {
            const marrYearMatch = marrRaw.date.match(/\b(\d{4})\b/);
            if (marrYearMatch) marriagesYears.push(parseInt(marrYearMatch[1], 10));
        }

        // Cónyuges
        const partnerId = fam.husbandId === personId ? fam.wifeId : fam.husbandId;
        if (partnerId && doc.persons[partnerId]) {
            const pb = getExactYearFromPerson(doc.persons[partnerId], "BIRT");
            if (pb !== undefined) partnerBirths.push(pb);
        }

        // Hijos
        for (const childId of fam.childrenIds) {
            const cb = getExactYearFromPerson(doc.persons[childId], "BIRT");
            if (cb !== undefined) childrenBirths.push(cb);
        }
    }

    // Procesar Matrimonios
    if (marriagesYears.length > 0) {
        const firstMarr = Math.min(...marriagesYears);
        const limitMax = firstMarr - 14;
        const limitMin = firstMarr - 80;
        absoluteMax = Math.min(absoluteMax, limitMax);

        evidences.push({
            type: "strict_limit",
            sourceId: "marr_bounds",
            message: `Matrimonio más antiguo es documentado en ${firstMarr}. (Imposible nacer antes de ~80 años o después de 14 años de la fecha)`,
            suggestedRange: [limitMin, limitMax],
            maxLimit: limitMax
        });

        const contextMin = firstMarr - stats.avgMarrAge - 8;
        const contextMax = firstMarr - stats.avgMarrAge + 8;
        const label = stats.hasDataMarr ? `estadística del árbol genealógico (${stats.countMarr} muestras de tu mismo género y nivel)` : `demografía estándar`;
        evidences.push({
            type: "contextual",
            sourceId: "stats_marr",
            message: `Según la ${label}, la edad promedio al matrimonio es ~${stats.avgMarrAge} años. Sesgando el probable nacimiento en el rango ~${contextMin}/${contextMax}.`,
            suggestedRange: [contextMin, contextMax]
        });
    } else {
        evidences.push({
            type: "info",
            sourceId: "info_marr",
            message: "Mencion de Demografia: No posee datos de matrimonios exactos para sesgar o acotar de manera certera."
        });
    }

    // Procesar Cónyuges Contemporáneos
    if (partnerBirths.length > 0) {
        const avgPartner = Math.round(partnerBirths.reduce((a, b) => a + b, 0) / partnerBirths.length);
        const minPar = avgPartner - 20;
        const maxPar = avgPartner + 20;
        evidences.push({
            type: "contextual",
            sourceId: "partners",
            message: `Contemporaneidad comprobada con ${partnerBirths.length} cónyuge(s) exacto(s) (Promedio Nac. ${avgPartner}). Diferencia de edad usual (~ ±20 años) sitúa la posibilidad en ~${minPar}-${maxPar}.`,
            suggestedRange: [minPar, maxPar]
        });
    } else {
        evidences.push({
            type: "info",
            sourceId: "info_partners",
            message: "Contemporáneos directos: No documenta la fecha exacta de nacimiento en cónyuges para realizar cruces generacionales."
        });
    }

    // Procesar Hijos en Conjunto
    if (childrenBirths.length > 0) {
        const minChildBirth = Math.min(...childrenBirths);
        const maxChildBirth = Math.max(...childrenBirths);
        const isMother = person.sex === "F";

        const offsetMin = isMother ? 14 : 15;
        const offsetMax = isMother ? 50 : 80;

        const maxMaxYear = minChildBirth - offsetMin; // Lo más joven que pudo ser al iniciar descendencia
        const minMaxYear = maxChildBirth - offsetMax; // Lo más de viejo que pudo ser al terminar su descendencia

        absoluteMax = Math.min(absoluteMax, maxMaxYear);
        absoluteMin = Math.max(absoluteMin, minMaxYear);

        let msg = `Tiene ${childrenBirths.length} hijo/a(s) documentado(s) nacido(s) `;
        msg += childrenBirths.length === 1 ? `exactamente en el ${minChildBirth}.` : `en un abanico exacto desde ${minChildBirth} hasta ${maxChildBirth}.`;
        msg += ` (La ventana reproductiva estricta como ${isMother ? 'madre' : 'padre'} lo bloquea naciendo inamoviblemente entre > ${minMaxYear} y < ${maxMaxYear})`;

        evidences.push({
            type: "strict_limit",
            sourceId: "children_bounds",
            message: msg,
            suggestedRange: [minMaxYear, maxMaxYear],
            minLimit: minMaxYear,
            maxLimit: maxMaxYear
        });

        // Sesgo Estadístico Primer Hijo
        const contextMin = minChildBirth - stats.avgFirstChildAge - 7;
        const contextMax = minChildBirth - stats.avgFirstChildAge + 7;
        const label = stats.hasDataChild ? `estadística robusta del árbol (${stats.countChild} contemporáneos o previas generaciones)` : `demografía predeterminada`;

        evidences.push({
            type: "contextual",
            sourceId: "stats_child",
            message: `Evaluando a sus hijos: según ${label}, la edad más típica al tener el 1er hijo/a es en torno a ~${stats.avgFirstChildAge} años. Esto centra un sesgo estadístico poblacional en aprox ${contextMin}-${contextMax}.`,
            suggestedRange: [contextMin, contextMax]
        });
    } else {
        evidences.push({
            type: "info",
            sourceId: "info_children",
            message: "Descendencia: No posee años exactos de sus hijos asimilables como para poder reducir la gran ventana biológica."
        });
    }


    // --- EVIDENCIAS PROPIAS ---
    const personDeath = getExactYearFromPerson(person, "DEAT");
    if (personDeath !== undefined) {
        // No puede nacer después de morir
        absoluteMax = Math.min(absoluteMax, personDeath);
        // Esperanza de vida maxima humana razonable 110
        const minBorn = personDeath - 110;
        absoluteMin = Math.max(absoluteMin, minBorn);

        evidences.push({
            type: "strict_limit",
            sourceId: personId,
            message: `Persona fallecida explícitamente en ${personDeath}. (Biológicamente debe haber nacido entre > ${minBorn} y <= ${personDeath})`,
            minLimit: minBorn,
            maxLimit: personDeath
        });
    }

    // --- ANÁLISIS DE COHORTE GENERACIONAL DEL GRAFO EXTENDIDO ---
    // Agrupa a todo el árbol conectado en niveles ponderando la cercanía familiar (pesos más altos a hermanos, hijos directos, etc)
    const cohortData: Record<number, { sum: number, weight: number, count: number }> = {
        0: { sum: 0, weight: 0, count: 0 },
        1: { sum: 0, weight: 0, count: 0 },
        "-1": { sum: 0, weight: 0, count: 0 }
    };

    for (const id in genLevels) {
        if (id === personId) continue;
        const bYear = getExactYearFromPerson(doc.persons[id], "BIRT");
        if (bYear !== undefined) {
            const net = genLevels[id];
            const g = net.g;
            if (Math.abs(g) <= 1) {
                if (!cohortData[g]) cohortData[g] = { sum: 0, weight: 0, count: 0 };
                // Usamos un decaimiento agresivo para dar extremo poder de decisión a su familia cercana (distancia d=1,2,3)
                // y que un pariente lejano de la misma generación afecte mínimamente.
                const w = Math.exp(-0.4 * net.d);
                cohortData[g].sum += bYear * w;
                cohortData[g].weight += w;
                cohortData[g].count++;
            }
        }
    }

    const currentYear = new Date().getFullYear();

    // 1. Contemporáneos Ponderados (Nivel Gen 0)
    const c0 = cohortData[0];
    if (c0 && c0.count > 0) {
        const agAvg = Math.round(c0.sum / c0.weight);
        const minCohort = agAvg - 20;
        const maxCohort = Math.min(agAvg + 20, currentYear);
        evidences.push({
            type: "contextual",
            sourceId: "cohort_0",
            message: `Cohorte de Nivel 0 (Contemporáneos, priorizando su familia directa, ${c0.count} individuos): Promedio ponderado de nacimiento hacia ${agAvg}. Sugiere un rango probable de ${minCohort} - ${maxCohort}.`,
            suggestedRange: [minCohort, maxCohort]
        });
    } else {
        evidences.push({ type: "info", sourceId: "cohort_0", message: "Inferencia Generacional: Nivel 0 (contemporáneos directos) carece de años comprobados." });
    }

    // 2. Generación Ancestro Ponderado (Nivel 1)
    const c1 = cohortData[1];
    if (c1 && c1.count > 0) {
        const agAvg = Math.round(c1.sum / c1.weight);
        const expectedMin = agAvg + 15;
        const expectedMax = Math.min(agAvg + 60, currentYear);
        evidences.push({
            type: "contextual",
            sourceId: "cohort_1",
            message: `Cohorte de Nivel +1 (Generación Padres, priorizando los propios y tíos, ${c1.count} individuos): Promedio ponderado hacia ${agAvg}. Usualmente su nivel inferior nace entre ${expectedMin} - ${expectedMax}.`,
            suggestedRange: [expectedMin, expectedMax]
        });
    }

    // 3. Generación Descendencia Extendida Ponderada (Nivel -1)
    const cm1 = cohortData["-1"];
    if (cm1 && cm1.count > 0) {
        const agAvg = Math.round(cm1.sum / cm1.weight);
        const expectedMin = agAvg - 60;
        const expectedMax = agAvg - 15;
        evidences.push({
            type: "contextual",
            sourceId: "cohort_-1",
            message: `Cohorte de Nivel -1 (Generación Hijos, priorizando los propios y sobrinos, ${cm1.count} individuos): Promedio ponderado hacia ${agAvg}. Usualmente la generación padre (tu nivel) debió nacer entre ${expectedMin} - ${expectedMax}.`,
            suggestedRange: [expectedMin, expectedMax]
        });
    }


    if (evidences.length === 0) {
        return { evidences: [], isImpossible: false };
    }

    const hasRealMin = absoluteMin !== -Infinity;
    const hasRealMax = absoluteMax !== Infinity;

    // Calculo Sugerido Estadístico (Rangos y Medios):
    let finalSuggestedMin = -Infinity;
    let finalSuggestedMax = Infinity;

    // Buscar una intersección general (soft/contextual bounds) a lo largo de las sugerencias
    for (const e of evidences) {
        if (e.suggestedRange) {
            finalSuggestedMin = Math.max(finalSuggestedMin, e.suggestedRange[0]);
            finalSuggestedMax = Math.min(finalSuggestedMax, e.suggestedRange[1]);
        }
    }

    // Si los soft bounds (basados en intersección de ventanas de vida) se contradicen,
    // significa que el rango es más amplio, por ende hacemos un ensanchamiento fallback
    if (finalSuggestedMin > finalSuggestedMax || finalSuggestedMin === -Infinity) {
        finalSuggestedMin = absoluteMin !== -Infinity ? absoluteMin : undefined as any;
        finalSuggestedMax = absoluteMax !== Infinity ? absoluteMax : undefined as any;
    }

    // Forzar siempre a que respeten los absolute duros de la vida termodinámica y biológica
    if (hasRealMax && finalSuggestedMax !== undefined && finalSuggestedMax > absoluteMax) finalSuggestedMax = absoluteMax;
    if (hasRealMin && finalSuggestedMin !== undefined && finalSuggestedMin < absoluteMin) finalSuggestedMin = absoluteMin;
    if (hasRealMax && finalSuggestedMin !== undefined && finalSuggestedMin > absoluteMax) finalSuggestedMin = absoluteMax;
    if (hasRealMin && finalSuggestedMax !== undefined && finalSuggestedMax < absoluteMin) finalSuggestedMax = absoluteMin;

    const suggestedRangeResult: [number, number] | undefined = (finalSuggestedMin !== undefined && finalSuggestedMax !== undefined && finalSuggestedMin !== -Infinity && finalSuggestedMax !== Infinity)
        ? [finalSuggestedMin, finalSuggestedMax]
        : undefined;

    let suggestedYear = undefined;
    if (suggestedRangeResult && suggestedRangeResult[0] <= suggestedRangeResult[1]) {
        suggestedYear = Math.round((suggestedRangeResult[0] + suggestedRangeResult[1]) / 2);
    } else if (hasRealMin && hasRealMax && absoluteMin <= absoluteMax) {
        suggestedYear = Math.round((absoluteMin + absoluteMax) / 2);
    } else if (hasRealMax) {
        suggestedYear = absoluteMax - 30; // 30 es un fallback si no hay NADA más que su fecha máxima tope
    } else if (hasRealMin) {
        suggestedYear = absoluteMin + 30; // 30 es un fallback
    }


    return {
        isImpossible: hasRealMin && hasRealMax && (absoluteMin > absoluteMax),
        minYear: hasRealMin ? absoluteMin : undefined,
        maxYear: hasRealMax ? absoluteMax : undefined,
        suggestedYear,
        suggestedRange: suggestedRangeResult,
        evidences
    };
}
