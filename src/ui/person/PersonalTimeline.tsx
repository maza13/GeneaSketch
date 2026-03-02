import { useMemo, useState } from "react";
import type { GeneaDocument, Person } from "@/types/domain";
import { normalizeGedcomTimelineDate, NormalizedTimelineDate } from "@/core/timeline/dateNormalization";
import { getPersonLabel } from "@/ui/person/personDetailUtils";
import { findKinship } from "@/core/graph/kinship";

interface PersonalTimelineProps {
  document: GeneaDocument;
  personId: string;
  onSelectPerson: (personId: string) => void;
}

interface TimelineEvent {
  id: string;
  date: string;
  focusAge?: string;
  sortTimestamp: number;
  type: string;
  title: string;
  subtitle?: string;
  icon?: string;
  personId?: string;
}

function getFirstName(person: Person): string {
  return person.name.split(" ")[0] || person.name;
}

export function PersonalTimeline({ document, personId, onSelectPerson }: PersonalTimelineProps) {
  const person = document.persons[personId];
  const [viewMode, setViewMode] = useState<"nuclear" | "extended">("nuclear");

  const timelineEvents = useMemo(() => {
    if (!person) return [];

    const events: TimelineEvent[] = [];
    const processedPersonIds = new Set<string>();

    const pBirth = person.events?.find((e: any) => e.type === "BIRT");
    const pBirthDate = normalizeGedcomTimelineDate(pBirth?.date || person.birthDate);
    const pDeath = person.events?.find((e: any) => e.type === "DEAT");
    const pDeathDate = normalizeGedcomTimelineDate(pDeath?.date || person.deathDate);

    const isDuringLifetime = (date: NormalizedTimelineDate) => {
      if (date.undated) return false;
      if (pBirthDate.sortTimestamp && date.sortTimestamp! < pBirthDate.sortTimestamp) return false;
      if (pDeathDate.sortTimestamp && date.sortTimestamp! > pDeathDate.sortTimestamp) return false;
      return true;
    };

    const calculateAgeDisplay = (birthDateRaw: string | undefined, eventDateRaw: string): string => {
      const birth = normalizeGedcomTimelineDate(birthDateRaw);
      const event = normalizeGedcomTimelineDate(eventDateRaw);

      if (birth.undated || event.undated) return "";

      const bUpper = (birthDateRaw || "").toUpperCase();
      const eUpper = (eventDateRaw || "").toUpperCase();
      const isEstimated = bUpper.includes("ABT") || bUpper.includes("EST") || bUpper.includes("CAL") ||
        eUpper.includes("ABT") || eUpper.includes("EST") || eUpper.includes("CAL");

      // Handle ranges (BET ... AND)
      const parseRange = (raw: string) => {
        const match = raw.match(/BET\s+(.+?)\s+AND\s+(.+)$/i);
        if (!match) return null;
        const d1 = normalizeGedcomTimelineDate(match[1]);
        const d2 = normalizeGedcomTimelineDate(match[2]);
        if (d1.undated || d2.undated) return null;
        return { t1: d1.sortTimestamp!, t2: d2.sortTimestamp! };
      };

      const bRange = parseRange(birthDateRaw || "");
      const eRange = parseRange(eventDateRaw);

      const msInYear = 365.25 * 24 * 60 * 60 * 1000;

      if (bRange || eRange) {
        const bMin = bRange ? bRange.t1 : birth.sortTimestamp!;
        const bMax = bRange ? bRange.t2 : birth.sortTimestamp!;
        const eMin = eRange ? eRange.t1 : event.sortTimestamp!;
        const eMax = eRange ? eRange.t2 : event.sortTimestamp!;

        const ageMin = Math.floor((eMin - bMax) / msInYear);
        const ageMax = Math.floor((eMax - bMin) / msInYear);

        if (ageMin === ageMax) return `${ageMin} años`;
        return `${Math.max(0, ageMin)}-${ageMax} años`;
      }

      const years = (event.sortTimestamp! - birth.sortTimestamp!) / msInYear;
      const age = Math.floor(years);
      return `${isEstimated ? "aprox. " : ""}${age} años`;
    };

    const getBirthOrderInfo = (ids: string[]) => {
      const chronology = ids
        .map(id => {
          const p = document.persons[id];
          if (!p) return null;
          const b = p.events.find(e => e.type === "BIRT")?.date || p.birthDate;
          return { id, date: normalizeGedcomTimelineDate(b) };
        })
        .filter((c): c is { id: string; date: NormalizedTimelineDate } => !!c && !c.date.undated)
        .sort((a, b) => a.date.sortTimestamp! - b.date.sortTimestamp!);

      return {
        firstId: chronology[0]?.id || null,
        lastId: chronology.length > 1 ? chronology[chronology.length - 1]?.id : null
      };
    };

    // Pre-calculate sets of children/grandchildren for context
    const ownChildrenIds: string[] = [];
    person.fams.forEach(fId => {
      const fam = document.families[fId];
      if (fam) ownChildrenIds.push(...fam.childrenIds);
    });
    const childrenOrder = getBirthOrderInfo(ownChildrenIds);

    const grandchildrenIds: string[] = [];
    ownChildrenIds.forEach(cId => {
      const child = document.persons[cId];
      if (child) child.fams.forEach(fId => {
        const fam = document.families[fId];
        if (fam) grandchildrenIds.push(...fam.childrenIds);
      });
    });
    const grandchildrenOrder = getBirthOrderInfo(grandchildrenIds);

    const addPersonLifeEvents = (p: Person, isSelf: boolean = false, recursive: boolean = false) => {
      if (processedPersonIds.has(p.id) && !isSelf) return;
      processedPersonIds.add(p.id);

      const kinship = findKinship(document, person.id, p.id);
      const relLabel = kinship?.relationshipText.toLowerCase() || "familia";

      const isChildOrDescendant = ownChildrenIds.includes(p.id) || grandchildrenIds.includes(p.id) || recursive;
      const name = isChildOrDescendant ? getFirstName(p) : getPersonLabel(p);

      // Birth
      const birth = p.events?.find((e: any) => e.type === "BIRT");
      const birthRaw = birth?.date || p.birthDate;
      const bDate = normalizeGedcomTimelineDate(birthRaw);
      if (!bDate.undated && (isSelf || isDuringLifetime(bDate))) {
        const focusAge = calculateAgeDisplay(pBirthDate.displayDate === "Sin fecha" ? undefined : pBirthDate.displayDate, bDate.displayDate);

        let title = "";
        if (isSelf) {
          title = "Nacimiento";
        } else {
          // Identify if first/last
          let milestone = "";
          if (ownChildrenIds.includes(p.id)) {
            if (p.id === childrenOrder.firstId) milestone = "primer ";
            else if (p.id === childrenOrder.lastId) milestone = "último ";
          } else if (grandchildrenIds.includes(p.id)) {
            if (p.id === grandchildrenOrder.firstId) milestone = "primer ";
            else if (p.id === grandchildrenOrder.lastId) milestone = "último ";
          }

          const isFeminine = p.sex === "F";
          const adjustedMilestone = milestone ? (isFeminine ? milestone.replace("primer ", "primera ").replace("último ", "última ") : milestone) : "";

          title = `Nació su ${adjustedMilestone}${relLabel} ${name}`;
        }

        events.push({
          id: `${p.id}-birt`,
          date: bDate.displayDate,
          focusAge,
          sortTimestamp: bDate.sortTimestamp!,
          type: "BIRT",
          title,
          subtitle: birth?.place || p.birthPlace,
          icon: isSelf ? "🍼" : "👶",
          personId: p.id
        });
      }

      // Death
      const death = p.events?.find((e: any) => e.type === "DEAT");
      const deathRaw = death?.date || p.deathDate;
      const dDate = normalizeGedcomTimelineDate(deathRaw);
      if (!dDate.undated && (isSelf || isDuringLifetime(dDate))) {
        const focusAge = calculateAgeDisplay(pBirthDate.displayDate === "Sin fecha" ? undefined : pBirthDate.displayDate, dDate.displayDate);
        const deathAge = calculateAgeDisplay(birthRaw, dDate.displayDate);
        const deathAgeTxt = deathAge ? ` a los ${deathAge}` : " (sin fecha de nac.)";

        let title = isSelf ? "Fallecimiento" : `Falleció su ${relLabel} ${name}${deathAgeTxt}`;

        events.push({
          id: `${p.id}-deat`,
          date: dDate.displayDate,
          focusAge,
          sortTimestamp: dDate.sortTimestamp!,
          type: "DEAT",
          title,
          subtitle: death?.place || p.deathPlace,
          icon: "⚰️",
          personId: p.id
        });
      }

      // Other individual events (only for self)
      if (isSelf) {
        p.events?.forEach((ev: any, idx: number) => {
          if (ev.type === "BIRT" || ev.type === "DEAT") return;
          const normalized = normalizeGedcomTimelineDate(ev.date);
          if (normalized.undated) return;

          const focusAge = calculateAgeDisplay(pBirthDate.displayDate === "Sin fecha" ? undefined : pBirthDate.displayDate, normalized.displayDate);

          let title = ev.type === "BURI" ? "Sepelio" :
            ev.type === "CHR" ? "Bautismo" :
              ev.type === "RESI" ? "Residencia" : ev.type;

          events.push({
            id: `ind-${idx}`,
            date: normalized.displayDate,
            focusAge,
            sortTimestamp: normalized.sortTimestamp!,
            type: ev.type,
            title,
            subtitle: ev.place,
            icon: "📍"
          });
        });
      }

      // Recursive descendants
      if (recursive) {
        p.fams.forEach((famId: string) => {
          const fam = document.families[famId];
          if (!fam) return;
          fam.childrenIds.forEach((childId) => {
            const child = document.persons[childId];
            if (child) addPersonLifeEvents(child, false, true);
          });
        });
      }
    };

    // 1. Self events
    addPersonLifeEvents(person, true);

    // 2. Parents (Family of Origin)
    person.famc.forEach((famId) => {
      const family = document.families[famId];
      if (!family) return;
      if (family.husbandId) {
        const father = document.persons[family.husbandId];
        if (father) addPersonLifeEvents(father);
      }
      if (family.wifeId) {
        const mother = document.persons[family.wifeId];
        if (mother) addPersonLifeEvents(mother);
      }

      // Siblings only in extended view
      if (viewMode === "extended") {
        family.childrenIds.forEach((childId) => {
          if (childId === personId) return;
          const sibling = document.persons[childId];
          if (sibling) addPersonLifeEvents(sibling);
        });
      }
    });

    // 3. Nuclear Families & Descendants
    person.fams.forEach((famId) => {
      const family = document.families[famId];
      if (!family) return;

      // Marriage/Divorce
      family.events.forEach((ev, idx) => {
        const normalized = normalizeGedcomTimelineDate(ev.date);
        if (normalized.undated) return;
        const spouseId = family.husbandId === personId ? family.wifeId : family.husbandId;
        const spouse = spouseId ? document.persons[spouseId] : null;

        const focusAge = calculateAgeDisplay(pBirthDate.displayDate === "Sin fecha" ? undefined : pBirthDate.displayDate, normalized.displayDate);
        const action = ev.type === "MARR" ? "Se casó" : ev.type === "DIV" ? "Se divorció" : ev.type;
        const spouseTxt = spouse ? ` con ${getPersonLabel(spouse)}` : "";

        events.push({
          id: `fam-ev-${famId}-${idx}`,
          date: normalized.displayDate,
          focusAge,
          sortTimestamp: normalized.sortTimestamp!,
          type: ev.type,
          title: `${action}${spouseTxt}`,
          subtitle: ev.place,
          icon: ev.type === "MARR" ? "💍" : "💔",
          personId: spouseId
        });
      });

      // Spouse birth/death
      const spouseId = family.husbandId === personId ? family.wifeId : family.husbandId;
      if (spouseId) {
        const spouse = document.persons[spouseId];
        if (spouse) addPersonLifeEvents(spouse);
      }

      // Children and recursion
      family.childrenIds.forEach((childId) => {
        const child = document.persons[childId];
        if (!child) return;
        addPersonLifeEvents(child, false, viewMode === "extended");
      });
    });

    return events.sort((a, b) => a.sortTimestamp - b.sortTimestamp);
  }, [document, person, personId, viewMode]);

  if (!person) return null;

  return (
    <div className="personal-timeline">
      <div className="timeline-view-selector">
        <button
          className={viewMode === "nuclear" ? "active" : ""}
          onClick={() => setViewMode("nuclear")}
        >
          Nuclear
        </button>
        <span className="separator">/</span>
        <button
          className={viewMode === "extended" ? "active" : ""}
          onClick={() => setViewMode("extended")}
        >
          Ampliada
        </button>
      </div>

      {timelineEvents.length === 0 ? (
        <div className="detail-placeholder">No hay eventos con fecha para graficar.</div>
      ) : (
        <div className="timeline-container">
          {timelineEvents.map((event) => (
            <div key={event.id} className="timeline-item">
              <div className="timeline-marker">
                <span className="timeline-icon">{event.icon}</span>
                <div className="timeline-line"></div>
              </div>
              <div className="timeline-content-card">
                <div className="timeline-header">
                  <div className="timeline-date-row">
                    <span className="timeline-date">{event.date}</span>
                    {event.focusAge && <span className="timeline-focus-age">({event.focusAge})</span>}
                  </div>
                  <h4 className="timeline-title">{event.title}</h4>
                </div>
                {event.subtitle && (
                  <div className="timeline-subtitle">
                    {event.personId ? (
                      <button
                        className="timeline-link-btn"
                        onClick={() => onSelectPerson(event.personId!)}
                      >
                        {event.subtitle}
                      </button>
                    ) : (
                      <span>{event.subtitle}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .personal-timeline { padding: 8px 8px 16px; }
        .timeline-view-selector { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; padding-left: 4px; }
        .timeline-view-selector button { border: none; background: none; padding: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--ink-3); cursor: pointer; transition: color 0.2s ease; font-weight: 500; }
        .timeline-view-selector button.active { color: var(--gs-accent); font-weight: 700; }
        .timeline-view-selector button:hover:not(.active) { color: var(--ink-1); }
        .timeline-view-selector .separator { color: var(--line); font-size: 10px; user-select: none; }
        .timeline-container { display: flex; flex-direction: column; gap: 0; }
        .timeline-item { display: flex; gap: 16px; }
        .timeline-marker { display: flex; flex-direction: column; align-items: center; width: 32px; }
        .timeline-icon { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--line-soft); border-radius: 50%; font-size: 14px; z-index: 1; }
        .timeline-line { flex: 1; width: 1px; background: var(--line-soft); margin: 4px 0; }
        .timeline-item:last-child .timeline-line { display: none; }
        .timeline-content-card { flex: 1; padding-bottom: 24px; }
        .timeline-header { display: flex; flex-direction: column; margin-bottom: 2px; }
        .timeline-date-row { display: flex; align-items: baseline; gap: 6px; }
        .timeline-date { font-size: 10px; color: var(--gs-accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.2px; }
        .timeline-focus-age { font-size: 10px; color: var(--ink-muted); font-weight: 500; }
        .timeline-title { margin: 0; font-size: 13px; color: var(--ink-0); font-weight: 600; line-height: 1.4; }
        .timeline-subtitle { font-size: 11px; color: var(--ink-muted); margin-top: 2px; }
        .timeline-link-btn { background: none; border: none; padding: 0; color: var(--gs-accent); text-decoration: underline; cursor: pointer; font-size: inherit; text-align: left; }
        .timeline-link-btn:hover { color: var(--gs-accent-hover); }
      `}</style>
    </div>
  );
}
