import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AiSettings } from "@/types/ai";
import type { Event, GeneaDocument, Person } from "@/types/domain";
import type { PersonEditorPatch } from "@/types/editor";
import { BirthRangeRefinementCard } from "@/ui/person/BirthRangeRefinementCard";
import { GedcomDateInput } from "@/ui/person/events/GedcomDateInput";
import { SuggestionInput } from "@/ui/components/SuggestionInput";
import { getPlaceSuggestions, normalizePlace } from "@/core/edit/suggestions";
import {
  EVENT_FIELD_META,
  EVENT_TYPE_META,
  getAddableEventFields,
  getEventTypeMeta,
  getInitialVisibleEventFields,
  isBaseEventField,
  isEventEffectivelyEmpty,
  type EventFieldKey
} from "@/ui/person/personDetailUtils";
import { SectionCard, SectionSubtitle } from "../../common/StandardModal";

type Props = {
  person: Person;
  document: GeneaDocument;
  aiSettings: AiSettings;
  onSavePerson: (personId: string, patch: PersonEditorPatch) => void;
};

type HelpTarget = { targetId: string };
type PendingRemoveField = { eventId: string; fieldKey: EventFieldKey };

const EVENT_TYPES: Array<Event["type"]> = ["BIRT", "DEAT", "MARR", "DIV", "CHR", "BAPM", "BURI", "CENS", "RESI", "NOTE", "OTHER"];

function normalizeEvent(event: Event, index: number): Event {
  return {
    ...event,
    id: event.id || `evt-${index + 1}`,
    sourceRefs: event.sourceRefs || [],
    mediaRefs: event.mediaRefs || [],
    notesInline: event.notesInline || [],
    noteRefs: event.noteRefs || []
  };
}

function buildVisibleFieldsMap(inputEvents: Event[]): Record<string, EventFieldKey[]> {
  const map: Record<string, EventFieldKey[]> = {};
  for (const event of inputEvents) {
    if (!event.id) continue;
    map[event.id] = getInitialVisibleEventFields(event);
  }
  return map;
}

function fieldAppliesToEvent(fieldKey: EventFieldKey, eventType: Event["type"]): boolean {
  const meta = EVENT_FIELD_META[fieldKey];
  return meta.appliesTo.includes("all") || meta.appliesTo.includes(eventType);
}

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ContextAnchorHelp({
  targetId,
  title,
  description,
  activeHelpTarget,
  onSetActiveHelp,
  children,
  className
}: {
  targetId: string;
  title: string;
  description: string;
  activeHelpTarget: HelpTarget | null;
  onSetActiveHelp: (next: HelpTarget | null) => void;
  children: ReactNode;
  className?: string;
}) {
  const open = activeHelpTarget?.targetId === targetId;
  return (
    <span
      className={className || "event-help-anchor"}
      onMouseEnter={() => onSetActiveHelp({ targetId })}
      onMouseLeave={() => onSetActiveHelp(null)}
      onFocus={() => onSetActiveHelp({ targetId })}
      onBlur={() => onSetActiveHelp(null)}
      onClick={() => onSetActiveHelp(open ? null : { targetId })}
      tabIndex={0}
      role="button"
      aria-label={`Ayuda: ${title}`}
    >
      {children}
      {open ? (
        <div className="event-help-card" role="note">
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      ) : null}
    </span>
  );
}

function EventFieldLabel({
  eventId,
  fieldKey,
  activeHelpTarget,
  onSetActiveHelp
}: {
  eventId: string;
  fieldKey: EventFieldKey;
  activeHelpTarget: HelpTarget | null;
  onSetActiveHelp: (next: HelpTarget | null) => void;
}) {
  const meta = EVENT_FIELD_META[fieldKey];
  return (
    <ContextAnchorHelp
      targetId={`${eventId}:${fieldKey}`}
      title={`${meta.labelHuman} (${meta.gedcomTag})`}
      description={meta.description}
      activeHelpTarget={activeHelpTarget}
      onSetActiveHelp={onSetActiveHelp}
      className="gs-fact-label"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span>{meta.labelHuman}</span>
        <span className="gs-fact-tag" style={{ fontSize: '10px', opacity: 0.6 }}>{meta.gedcomTag}</span>
      </div>
    </ContextAnchorHelp>
  );
}

export function PersonEventsSection({ person, document, aiSettings, onSavePerson }: Props) {
  // Persistence state
  const [events, setEvents] = useState<Event[]>(
    (person.events || []).map((event, index) => normalizeEvent(event, index))
  );

  // Draft state for granular editing
  const [eventDraftsById, setEventDraftsById] = useState<Record<string, Event>>({});
  const [eventBaselineById, setEventBaselineById] = useState<Record<string, Event>>({});
  const [fieldDirtyByEventId, setFieldDirtyByEventId] = useState<Record<string, Partial<Record<EventFieldKey, boolean>>>>({});

  const [message, setMessage] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [pendingNotesAppend, setPendingNotesAppend] = useState<string[]>([]);
  const [visibleFieldsByEventId, setVisibleFieldsByEventId] = useState<Record<string, EventFieldKey[]>>(() =>
    buildVisibleFieldsMap((person.events || []).map((event, index) => normalizeEvent(event, index)))
  );
  const [activeHelpTarget, setActiveHelpTarget] = useState<HelpTarget | null>(null);
  const [pendingRemoveField, setPendingRemoveField] = useState<PendingRemoveField | null>(null);
  const [fieldToAddByEventId, setFieldToAddByEventId] = useState<Record<string, EventFieldKey | "">>({});
  const [addTypeMenuOpen, setAddTypeMenuOpen] = useState(false);
  const [addTypeActiveIndex, setAddTypeActiveIndex] = useState(0);

  useEffect(() => {
    const normalized = (person.events || []).map((event, index) => normalizeEvent(event, index));
    setEvents(normalized);
    setVisibleFieldsByEventId(buildVisibleFieldsMap(normalized));

    // Reset drafts and baselines when person changes
    const drafts: Record<string, Event> = {};
    const baselines: Record<string, Event> = {};
    for (const ev of normalized) {
      if (ev.id) {
        drafts[ev.id] = { ...ev };
        baselines[ev.id] = { ...ev };
      }
    }
    setEventDraftsById(drafts);
    setEventBaselineById(baselines);
    setFieldDirtyByEventId({});

    setExpandedIds({});
    setPendingNotesAppend([]);
    setActiveHelpTarget(null);
    setPendingRemoveField(null);
    setFieldToAddByEventId({});
    setAddTypeMenuOpen(false);
    setAddTypeActiveIndex(0);
    setMessage("");
  }, [person.id, person.events]);

  const sortedEvents = useMemo(() => {
    const priority: Record<Event["type"], number> = {
      BIRT: 0,
      DEAT: 1,
      MARR: 2,
      DIV: 3,
      CHR: 4,
      BAPM: 5,
      BURI: 6,
      CENS: 7,
      RESI: 8,
      NOTE: 9,
      OTHER: 10
    };
    return [...events].sort((a, b) => {
      const pa = priority[a.type] ?? 99;
      const pb = priority[b.type] ?? 99;
      if (pa !== pb) return pa - pb;
      const ai = Number((a.id || "").match(/(\d+)/)?.[1] || "0");
      const bi = Number((b.id || "").match(/(\d+)/)?.[1] || "0");
      return ai - bi;
    });
  }, [events]);

  const emptyEventIds = useMemo(
    () => events.filter((event) => isEventEffectivelyEmpty(event) && event.type !== "BIRT" && event.type !== "DEAT").map((event) => event.id || ""),
    [events]
  );

  function createEventByType(type: Event["type"]) {
    const base: Event = {
      id: `evt-new-${Date.now()}`,
      type,
      sourceRefs: [],
      mediaRefs: [],
      notesInline: [],
      noteRefs: []
    };
    const normalized = normalizeEvent(base, events.length + 1);
    setEvents((prev) => [...prev, normalized]);
    if (normalized.id) {
      setVisibleFieldsByEventId((prev) => ({ ...prev, [normalized.id!]: getInitialVisibleEventFields(normalized) }));
      setExpandedIds((prev) => ({ ...prev, [normalized.id!]: true }));
      setFieldToAddByEventId((prev) => ({ ...prev, [normalized.id!]: "" }));
      // Also add to drafts
      setEventDraftsById(prev => ({ ...prev, [normalized.id!]: normalized }));
      setEventBaselineById(prev => ({ ...prev, [normalized.id!]: normalized }));
    }
    setAddTypeMenuOpen(false);
  }

  function updateDraftField(eventId: string, field: EventFieldKey, value: any) {
    setEventDraftsById(prev => {
      const draft = prev[eventId];
      if (!draft) return prev;
      const next = { ...draft, [field]: value };

      // Update dirty state
      const baseline = eventBaselineById[eventId];
      const isDirty = JSON.stringify(next[field]) !== JSON.stringify(baseline?.[field]);

      setFieldDirtyByEventId(d => ({
        ...d,
        [eventId]: { ...d[eventId], [field]: isDirty }
      }));

      return { ...prev, [eventId]: next };
    });
  }

  const cancelField = (eventId: string, field: EventFieldKey) => {
    const baseline = eventBaselineById[eventId];
    if (!baseline) return;

    setEventDraftsById(prev => ({
      ...prev,
      [eventId]: { ...prev[eventId], [field]: baseline[field] }
    }));
    setFieldDirtyByEventId(prev => ({
      ...prev,
      [eventId]: { ...prev[eventId], [field]: false }
    }));
  };

  async function saveEvent(eventId: string) {
    const draft = eventDraftsById[eventId];
    if (!draft) return;

    // Normalize before save
    const normalizedEvent = normalizeEvent(draft, 0);

    // Update local events list for state mapping (UI order etc)
    const updatedEvents = events.map(ev => ev.id === eventId ? normalizedEvent : ev);
    setEvents(updatedEvents);

    // Immediate Persistence
    onSavePerson(person.id, {
      events: updatedEvents
    });

    // Reset dirty and baseline
    setEventBaselineById(prev => ({ ...prev, [eventId]: normalizedEvent }));
    setEventDraftsById(prev => ({ ...prev, [eventId]: normalizedEvent }));
    setFieldDirtyByEventId(prev => ({ ...prev, [eventId]: {} }));

    setMessage(`Evento ${eventId} guardado.`);
    setTimeout(() => setMessage(""), 3000);
  }

  function cancelEvent(eventId: string) {
    const baseline = eventBaselineById[eventId];
    if (!baseline) return;

    setEventDraftsById(prev => ({ ...prev, [eventId]: { ...baseline } }));
    setFieldDirtyByEventId(prev => ({ ...prev, [eventId]: {} }));
  }

  function updateEvent(eventId: string, updater: (event: Event) => Event) {
    // Legacy support or internal reorder logic
    setEvents((prev) => prev.map((event) => (event.id === eventId ? updater(event) : event)));
    // Also update draft
    setEventDraftsById(prev => {
      const d = prev[eventId];
      if (!d) return prev;
      return { ...prev, [eventId]: updater(d) };
    });
  }

  function addFieldToEvent(eventId: string, fieldKey: EventFieldKey) {
    setVisibleFieldsByEventId((prev) => {
      const current = prev[eventId] || [];
      if (current.includes(fieldKey)) return prev;
      return { ...prev, [eventId]: [...current, fieldKey] };
    });
  }

  function requestRemoveField(eventId: string, fieldKey: EventFieldKey) {
    setPendingRemoveField({ eventId, fieldKey });
  }

  function confirmRemoveField() {
    if (!pendingRemoveField) return;
    const { eventId, fieldKey } = pendingRemoveField;
    // Clearing a field via remove counts as an update to draft
    updateDraftField(eventId, fieldKey, undefined);

    setVisibleFieldsByEventId((prev) => {
      const current = prev[eventId] || [];
      return { ...prev, [eventId]: current.filter((field) => field !== fieldKey) };
    });
    setPendingRemoveField(null);
  }

  return (
    <div className="gs-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* --- Global Event Actions --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <SectionSubtitle>Cronología de Eventos</SectionSubtitle>
        <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
          {emptyEventIds.length > 0 && (
            <button
              className="secondary-ghost"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => {
                setEvents((prev) => prev.filter((event) => !emptyEventIds.includes(event.id || "")));
                setMessage(`Se eliminaron ${emptyEventIds.length} eventos vacíos.`);
              }}
            >
              Eliminar {emptyEventIds.length} vacíos
            </button>
          )}

          <button
            className="accent-solid"
            onClick={() => setAddTypeMenuOpen(!addTypeMenuOpen)}
            style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px' }}
          >
            + Añadir Evento
          </button>

          {addTypeMenuOpen ? (
            <div
              className="gs-dropdown-menu"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                zIndex: 100,
                width: 240,
                background: 'var(--bg-card)',
                border: '1px solid var(--line)',
                borderRadius: 12,
                boxShadow: 'var(--gs-glass-shadow)',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAddTypeMenuOpen(false);
                if (e.key === "ArrowDown") { e.preventDefault(); setAddTypeActiveIndex((prev) => (prev + 1) % EVENT_TYPES.length); }
                if (e.key === "ArrowUp") { e.preventDefault(); setAddTypeActiveIndex((prev) => (prev - 1 + EVENT_TYPES.length) % EVENT_TYPES.length); }
                if (e.key === "Enter") { e.preventDefault(); createEventByType(EVENT_TYPES[addTypeActiveIndex]); }
              }}
              tabIndex={0}
            >
              {EVENT_TYPES.map((type, idx) => {
                const meta = EVENT_TYPE_META[type];
                const active = idx === addTypeActiveIndex;
                return (
                  <div
                    key={type}
                    className={active ? "gs-dropdown-item active" : "gs-dropdown-item"}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--ink-1)'
                    }}
                    onMouseEnter={() => setAddTypeActiveIndex(idx)}
                    onClick={() => createEventByType(type)}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{meta.labelHuman}</span>
                    <span style={{ fontSize: '10px', opacity: 0.6 }}>{type}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--ink-muted)', padding: '0 4px', marginBottom: -12, fontStyle: 'italic' }}>
        DATE/PLAC aceptan texto libre GEDCOM. La validación es orientativa.
      </div>

      {sortedEvents.map((evBase, index) => {
        const eventId = evBase.id || `evt-${index + 1}`;
        const event = eventDraftsById[eventId] || evBase;
        const isExpanded = expandedIds[eventId] ?? true;
        const eventMeta = getEventTypeMeta(event.type);
        const visibleFields = (visibleFieldsByEventId[eventId] || getInitialVisibleEventFields(event)).filter((field) =>
          fieldAppliesToEvent(field, event.type)
        );
        const addableFields = getAddableEventFields(event, visibleFields).filter((field) => fieldAppliesToEvent(field, event.type));
        const pendingRemovalForEvent = pendingRemoveField?.eventId === eventId ? pendingRemoveField.fieldKey : null;

        const eventDirty = fieldDirtyByEventId[eventId] && Object.values(fieldDirtyByEventId[eventId]).some(Boolean);

        const renderFieldActions = (field: EventFieldKey) => {
          if (!fieldDirtyByEventId[eventId]?.[field]) return null;
          return (
            <div className="event-field-actions">
              <button
                className="panel-icon-btn"
                onClick={() => cancelField(eventId, field)}
                title="Descartar cambios"
              >
                undo
              </button>
            </div>
          );
        };

        return (
          <SectionCard
            key={eventId}
            title={eventMeta.labelHuman}
            icon={eventMeta.icon}
            headerAction={
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="secondary-ghost"
                  style={{ width: 28, height: 28, padding: 0 }}
                  onClick={() =>
                    setEvents((prev) => {
                      const idx = prev.findIndex((item) => item.id === eventId);
                      if (idx <= 0) return prev;
                      const copy = [...prev];
                      const [picked] = copy.splice(idx, 1);
                      copy.splice(idx - 1, 0, picked);
                      return copy;
                    })
                  }
                  title="Subir"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_upward</span>
                </button>
                <button
                  className="secondary-ghost"
                  style={{ width: 28, height: 28, padding: 0 }}
                  onClick={() =>
                    setEvents((prev) => {
                      const idx = prev.findIndex((item) => item.id === eventId);
                      if (idx < 0 || idx >= prev.length - 1) return prev;
                      const copy = [...prev];
                      const [picked] = copy.splice(idx, 1);
                      copy.splice(idx + 1, 0, picked);
                      return copy;
                    })
                  }
                  title="Bajar"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_downward</span>
                </button>
                <button
                  className="secondary-ghost danger"
                  style={{ width: 28, height: 28, padding: 0 }}
                  onClick={() => {
                    if (eventDirty) {
                      if (!confirm("Este evento tiene cambios sin guardar. ¿Seguro que quieres eliminarlo?")) return;
                    }
                    setEvents((prev) => prev.filter((item) => item.id !== eventId));
                  }}
                  title="Eliminar"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
                <button
                  className="secondary-ghost"
                  style={{ width: 28, height: 28, padding: 0 }}
                  onClick={() => setExpandedIds((prev) => ({ ...prev, [eventId]: !isExpanded }))}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isExpanded ? 'expand_less' : 'expand_more'}</span>
                </button>
              </div>
            }
          >
            {isExpanded ? (
              <div className="gs-facts-grid" style={{ marginTop: 4 }}>
                <div className="gs-fact-row" style={{ border: 'none', marginBottom: 8 }}>
                  <span className="gs-fact-label">Tipo de Evento</span>
                  <select
                    style={{ width: 'auto', minWidth: 160 }}
                    value={event.type}
                    onChange={(e) => {
                      const nextType = e.target.value as Event["type"];
                      updateEvent(eventId, (item) => ({ ...item, type: nextType }));
                      const nextEvent = { ...event, type: nextType };
                      setVisibleFieldsByEventId((prev) => ({
                        ...prev,
                        [eventId]: getInitialVisibleEventFields(nextEvent).concat((prev[eventId] || []).filter((field) => fieldAppliesToEvent(field, nextType)))
                      }));
                      setFieldToAddByEventId((prev) => ({ ...prev, [eventId]: "" }));
                    }}
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>{`${EVENT_TYPE_META[type].labelHuman} (${type})`}</option>
                    ))}
                  </select>
                </div>

                <div className="event-field-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {visibleFields.map((field) => {
                    const fieldMeta = EVENT_FIELD_META[field];
                    const removable = !isBaseEventField(event.type, field);
                    return (
                      <span key={`${eventId}-${field}`} className="gs-tab-capsule" style={{ height: 24, padding: '0 10px', fontSize: '11px' }}>
                        {fieldMeta.labelHuman}
                        {removable ? (
                          <button
                            type="button"
                            style={{ marginLeft: 6, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.6 }}
                            onClick={() => requestRemoveField(eventId, field)}
                          >
                            ×
                          </button>
                        ) : null}
                      </span>
                    );
                  })}

                  {addableFields.length > 0 ? (
                    <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                      <select
                        style={{ height: 24, fontSize: '11px', padding: '0 4px' }}
                        value={fieldToAddByEventId[eventId] || ""}
                        onChange={(e) =>
                          setFieldToAddByEventId((prev) => ({
                            ...prev,
                            [eventId]: e.target.value as EventFieldKey | ""
                          }))
                        }
                      >
                        <option value="">Añadir campo...</option>
                        {addableFields.map((field) => (
                          <option key={`${eventId}-field-${field}`} value={field}>
                            {EVENT_FIELD_META[field].labelHuman}
                          </option>
                        ))}
                      </select>
                      <button
                        className="secondary-ghost"
                        style={{ height: 24, padding: '0 8px', fontSize: '11px' }}
                        onClick={() => {
                          const field = fieldToAddByEventId[eventId];
                          if (!field) return;
                          addFieldToEvent(eventId, field);
                          setFieldToAddByEventId((prev) => ({ ...prev, [eventId]: "" }));
                        }}
                      >
                        OK
                      </button>
                    </div>
                  ) : null}
                </div>

                {pendingRemovalForEvent ? (
                  <div className="gs-alert gs-alert--warning" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>¿Quitar <strong>{EVENT_FIELD_META[pendingRemovalForEvent].labelHuman}</strong>?</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="secondary-ghost" onClick={() => setPendingRemoveField(null)}>No</button>
                      <button className="accent-solid danger" style={{ backgroundColor: 'var(--tree-danger)' }} onClick={confirmRemoveField}>Sí, quitar</button>
                    </div>
                  </div>
                ) : null}

                {visibleFields.includes("subType") && event.type === "OTHER" ? (
                  <div className="gs-fact-row">
                    <EventFieldLabel eventId={eventId} fieldKey="subType" activeHelpTarget={activeHelpTarget} onSetActiveHelp={setActiveHelpTarget} />
                    <input
                      style={{ flex: 1, marginLeft: 16 }}
                      value={event.subType || ""}
                      onChange={(e) => updateDraftField(eventId, "subType", e.target.value)}
                    />
                    {renderFieldActions("subType")}
                  </div>
                ) : null}

                {visibleFields.includes("date") ? (
                  <div className="gs-fact-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                      <EventFieldLabel eventId={eventId} fieldKey="date" activeHelpTarget={activeHelpTarget} onSetActiveHelp={setActiveHelpTarget} />
                      {renderFieldActions("date")}
                    </div>
                    <GedcomDateInput
                      label="Fecha del Evento"
                      value={event.date || ""}
                      onChange={(next) => updateDraftField(eventId, "date", next)}
                      showBirthAssistant={event.type === "BIRT"}
                      birthAssistantSlot={event.type === "BIRT" ? (
                        <BirthRangeRefinementCard
                          document={document}
                          personId={person.id}
                          aiSettings={aiSettings}
                          onApplyBirthGedcom={(gedcom) => updateDraftField(eventId, "date", gedcom)}
                          onAppendNote={(note) => setPendingNotesAppend((prev) => [...prev, note])}
                        />
                      ) : null}
                    />
                  </div>
                ) : null}

                {visibleFields.includes("place") ? (
                  <div className="gs-fact-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                      <EventFieldLabel eventId={eventId} fieldKey="place" activeHelpTarget={activeHelpTarget} onSetActiveHelp={setActiveHelpTarget} />
                      {renderFieldActions("place")}
                    </div>
                    <SuggestionInput
                      value={event.place || ""}
                      onChange={(next) => updateDraftField(eventId, "place", next)}
                      onBlur={() => updateDraftField(eventId, "place", normalizePlace(event.place || ""))}
                      suggestions={getPlaceSuggestions(document, event.place || "")}
                      placeholder="Municipio, Estado, Pais"
                    />
                  </div>
                ) : null}

                {/* --- Notes and Refs wrapped in a tighter layout --- */}
                {['notesInline', 'noteRefs', 'sourceRefs', 'mediaRefs'].map(fKey => {
                  const fieldKey = fKey as EventFieldKey;
                  if (!visibleFields.includes(fieldKey)) return null;
                  return (
                    <div key={fieldKey} className="gs-fact-row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                        <EventFieldLabel eventId={eventId} fieldKey={fieldKey} activeHelpTarget={activeHelpTarget} onSetActiveHelp={setActiveHelpTarget} />
                        {renderFieldActions(fieldKey)}
                      </div>
                      <textarea
                        rows={fieldKey === 'notesInline' ? 3 : 2}
                        style={{ width: '100%' }}
                        value={fieldKey === 'sourceRefs'
                          ? (event.sourceRefs || []).map((ref) => ref.id).join("\n")
                          : (event[fieldKey] as string[] || []).join("\n")}
                        onChange={(e) => {
                          const lines = parseLines(e.target.value);
                          updateDraftField(eventId, fieldKey, fieldKey === 'sourceRefs' ? lines.map((id: string) => ({ id })) : lines);
                        }}
                      />
                    </div>
                  );
                })}

                {visibleFields.includes("quality") ? (
                  <div className="gs-fact-row">
                    <EventFieldLabel eventId={eventId} fieldKey="quality" activeHelpTarget={activeHelpTarget} onSetActiveHelp={setActiveHelpTarget} />
                    <select
                      value={event.quality || ""}
                      onChange={(e) => {
                        const next = e.target.value as "0" | "1" | "2" | "3" | "";
                        updateDraftField(eventId, "quality", next || undefined);
                      }}
                    >
                      <option value="">Sin definir</option>
                      <option value="0">0 - No evaluada</option>
                      <option value="1">1 - Baja</option>
                      <option value="2">2 - Media</option>
                      <option value="3">3 - Alta</option>
                    </select>
                    {renderFieldActions("quality")}
                  </div>
                ) : null}

                {eventDirty ? (
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '12px', background: 'var(--bg-elev-2)', borderRadius: 12 }}>
                    <button className="secondary-ghost" onClick={() => cancelEvent(eventId)}>Descartar</button>
                    <button className="accent-solid" style={{ backgroundColor: 'var(--gs-success)' }} onClick={() => saveEvent(eventId)}>Guardar Cambios del Evento</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </SectionCard>
        );
      })}

      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 20 }}>
        <button
          className="accent-solid"
          style={{ width: 220, height: 44, fontSize: '15px' }}
          onClick={() => {
            const normalized = events.map((ev, index) => {
              const draft = eventDraftsById[ev.id || ""];
              return normalizeEvent(draft || ev, index);
            });
            onSavePerson(person.id, {
              events: normalized,
              ...(pendingNotesAppend.length > 0 ? { notesAppend: pendingNotesAppend } : {})
            });
            setPendingNotesAppend([]);
            if (emptyEventIds.length > 0) {
              setMessage(`Eventos guardados. Aviso: ${emptyEventIds.length} evento(s) vacíos.`);
            } else {
              setMessage("Eventos guardados exitosamente.");
            }
          }}
        >
          Guardar Todo
        </button>
      </div>
      {message ? <div className="gs-alert gs-alert--success">{message}</div> : null}
    </div>
  );
}
