import { useEffect, useMemo, useState } from "react";
import type {
  PersonWorkspaceV3SectionDescriptor,
  PersonWorkspaceV3SectionId,
  PersonWorkspaceViewModel,
  ShellFeaturesFacade,
} from "@/app-shell/facade/types";
import { StandardModal, type StandardModalTab } from "@/ui/common/StandardModal";
import { getPersonLabel } from "@/ui/person/personDetailUtils";
import { splitPersonFamilies } from "@/ui/person/sections/PersonFamiliesSection";
import { PersonAnalysisSection } from "@/ui/person/sections/PersonAnalysisSection";
import { PersonAuditSection } from "@/ui/person/sections/PersonAuditSection";
import { PersonEventsSection } from "@/ui/person/sections/PersonEventsSection";
import { PersonExtensionsSection } from "@/ui/person/sections/PersonExtensionsSection";
import { PersonFamiliesSection } from "@/ui/person/sections/PersonFamiliesSection";
import { PersonIdentitySection } from "@/ui/person/sections/PersonIdentitySection";
import { PersonMediaSection } from "@/ui/person/sections/PersonMediaSection";
import { PersonNotesSection } from "@/ui/person/sections/PersonNotesSection";
import { PersonSourcesSection } from "@/ui/person/sections/PersonSourcesSection";
import { PersonTimelineSection } from "@/ui/person/sections/PersonTimelineSection";

type Props = {
  viewModel: PersonWorkspaceViewModel;
  commands: ShellFeaturesFacade["personWorkspaceV3"]["commands"];
};

const TAB_STORAGE_KEY = "geneasketch.personWorkspaceV3.lastTab";
const FULLSCREEN_STORAGE_KEY = "geneasketch.personWorkspaceV3.fullscreen";

function readStoredTab(
  sections: PersonWorkspaceV3SectionDescriptor[],
  fallback: PersonWorkspaceV3SectionId,
): PersonWorkspaceV3SectionId {
  try {
    const raw = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (!raw) return fallback;
    if (sections.some((section) => section.id === raw)) {
      return raw as PersonWorkspaceV3SectionId;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function readStoredFullscreen(fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(FULLSCREEN_STORAGE_KEY);
    if (raw == null) return fallback;
    return raw === "true";
  } catch {
    return fallback;
  }
}

function buildStatusLabel(status: PersonWorkspaceV3SectionDescriptor["status"]) {
  if (status === "operativo") return "Operativo";
  if (status === "parcial") return "Parcial";
  return "Proximamente";
}

function WorkspacePlaceholder({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="person-workspace-v3-placeholder">
      <div className="person-workspace-v3-placeholder__icon">
        <span className="material-symbols-outlined">inventory_2</span>
      </div>
      <div className="person-workspace-v3-placeholder__title">{title}</div>
      <p className="person-workspace-v3-placeholder__message">{message}</p>
    </div>
  );
}

export function PersonWorkspacePanelV3({
  viewModel,
  commands,
}: Props) {
  const { personId, person, documentView: document, sections, v3Sections } = viewModel;
  const {
    onClose,
    onSelectPerson,
    onSetAsFocus,
    onSavePerson,
    onSaveFamily,
    onCreatePerson,
    onQuickAddRelation,
    onOpenAiAssistant,
  } = commands;

  const initialTab = v3Sections[0]?.id ?? "identity";
  const [activeTab, setActiveTab] = useState<PersonWorkspaceV3SectionId>(initialTab);
  const [isFullscreen, setIsFullscreen] = useState(viewModel.layoutMode === "fullscreen");

  useEffect(() => {
    setActiveTab(readStoredTab(v3Sections, v3Sections[0]?.id ?? "identity"));
    setIsFullscreen(readStoredFullscreen(viewModel.layoutMode === "fullscreen"));
  }, [personId, v3Sections, viewModel.layoutMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch {
      // noop
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FULLSCREEN_STORAGE_KEY, String(isFullscreen));
    } catch {
      // noop
    }
  }, [isFullscreen]);

  const heroData = useMemo(() => {
    if (!person) return null;

    const birthEvent = person.events?.find((event) => event.type === "BIRT");
    const deathEvent = person.events?.find((event) => event.type === "DEAT");
    const birthDate = person.birthDate || birthEvent?.date || "Desconocido";
    const deathDate = person.deathDate || deathEvent?.date || (person.lifeStatus === "alive" ? "Presente" : "Desconocido");
    const { originFamilies, ownFamilies } = splitPersonFamilies(person.id, document);
    const totalRelations =
      originFamilies.reduce(
        (count, family) =>
          count
          + (family.husbandId && family.husbandId !== person.id ? 1 : 0)
          + (family.wifeId && family.wifeId !== person.id ? 1 : 0),
        0,
      )
      + ownFamilies.reduce((count, family) => {
        const spouseId = family.husbandId === person.id ? family.wifeId : family.husbandId;
        return count + (spouseId ? 1 : 0) + family.childrenIds.filter((childId) => childId !== person.id).length;
      }, 0);

    return {
      lifeDates: `${birthDate} - ${deathDate}`,
      relations: totalRelations,
      events: person.events?.length || 0,
      sources: person.sourceRefs?.length || 0,
      notes: (Array.isArray(person.rawTags?.NOTE) ? person.rawTags.NOTE.length : 0) + (person.noteRefs?.length || 0),
      media: person.mediaRefs?.length || 0,
    };
  }, [document, person]);

  const modalTabs = useMemo<StandardModalTab[]>(
    () => v3Sections.map((section) => ({ id: section.id, label: section.label, icon: section.icon })),
    [v3Sections],
  );

  const activeSection = useMemo(
    () => v3Sections.find((section) => section.id === activeTab) ?? v3Sections[0] ?? null,
    [activeTab, v3Sections],
  );

  const workbenchSections = useMemo(
    () => [...v3Sections]
      .filter((section) => (section.contextRole === "analysis" || section.contextRole === "future") && typeof section.workbenchPriority === "number")
      .sort((left, right) => (left.workbenchPriority ?? 999) - (right.workbenchPriority ?? 999)),
    [v3Sections],
  );

  if (!person || !heroData || !activeSection) return null;

  const layoutMode = isFullscreen ? "fullscreen" : "window";
  const sexIcon = person.sex === "M" ? "male" : person.sex === "F" ? "female" : "person";
  const sexLabel = person.sex === "M" ? "Masculino" : person.sex === "F" ? "Femenino" : "No especificado";
  const lifeLabel = person.lifeStatus === "alive" ? "Persona viva" : "Persona fallecida";
  const avatarColor = person.sex === "M"
    ? "var(--node-male)"
    : person.sex === "F"
      ? "var(--node-female)"
      : "var(--surface-subtle)";

  const renderSectionBody = (section: PersonWorkspaceV3SectionDescriptor) => {
    if (section.entryMode === "placeholder") {
      return (
        <WorkspacePlaceholder
          title={`${section.label} en preparacion`}
          message={section.summary}
        />
      );
    }

    if (section.id === "identity") {
      return <PersonIdentitySection viewModel={sections.identity} onSavePerson={onSavePerson} />;
    }
    if (section.id === "family_links") {
      return (
        <PersonFamiliesSection
          viewModel={sections.familyLinks}
          onSelectPerson={onSelectPerson}
          onSaveFamily={onSaveFamily}
          onCreatePerson={onCreatePerson}
          onQuickAddRelation={onQuickAddRelation}
        />
      );
    }
    if (section.id === "events") {
      return <PersonEventsSection viewModel={sections.events} onSavePerson={onSavePerson} />;
    }
    if (section.id === "sources") {
      return <PersonSourcesSection viewModel={sections.sources} onSavePerson={onSavePerson} />;
    }
    if (section.id === "notes") {
      return <PersonNotesSection viewModel={sections.notes} onSavePerson={onSavePerson} />;
    }
    if (section.id === "media") {
      return <PersonMediaSection viewModel={sections.media} onSavePerson={onSavePerson} />;
    }
    if (section.id === "timeline") {
      return <PersonTimelineSection viewModel={sections.timeline} onSelectPerson={onSelectPerson} />;
    }
    if (section.id === "analysis") {
      return <PersonAnalysisSection viewModel={sections.analysis} onSelectPerson={onSelectPerson} />;
    }
    if (section.id === "audit") {
      return <PersonAuditSection person={person} />;
    }
    if (section.id === "extensions") {
      return <PersonExtensionsSection viewModel={sections.extensions} />;
    }
    return null;
  };

  return (
    <StandardModal
      open={true}
      title={`Expediente: ${getPersonLabel(person)}`}
      onClose={onClose}
      size="xl"
      tabs={modalTabs}
      activeTab={activeSection.id}
      onTabChange={(tabId) => setActiveTab(tabId as PersonWorkspaceV3SectionId)}
      fullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((current) => !current)}
      className={`person-v3-panel person-workspace-v3-modal person-workspace-v3-modal--${layoutMode}`}
      headerActions={
        layoutMode === "fullscreen" ? (
          <div className="person-workspace-v3-actions">
            <button className="secondary-ghost" onClick={() => onOpenAiAssistant(personId)}>
              <span className="material-symbols-outlined">auto_awesome</span>
              AncestrAI
            </button>
          </div>
        ) : null
      }
      footer={
        <div className="person-workspace-v3-footer">
          {layoutMode === "window" ? (
            <button className="secondary-ghost" onClick={() => onOpenAiAssistant(personId)}>
              <span className="material-symbols-outlined">auto_awesome</span>
              AncestrAI
            </button>
          ) : null}
          <button className="panel-header-btn" onClick={() => onSetAsFocus(personId)}>
            <span className="material-symbols-outlined">center_focus_strong</span>
            Seleccionar persona
          </button>
        </div>
      }
    >
      <div className={`person-workspace-v3 person-workspace-v3--${layoutMode}`} data-layout-mode={layoutMode}>
        {layoutMode === "window" ? (
          <section className="person-workspace-v3-window-header" data-testid="person-workspace-window-header">
            <div className="person-workspace-v3-window-header__identity">
              <div className="v2-avatar v3-avatar-sm person-workspace-v3-window-header__avatar" style={{ background: avatarColor }}>
                <span className="material-symbols-outlined v2-avatar-icon">{sexIcon}</span>
              </div>
              <div className="person-workspace-v3-window-header__copy">
                <span className="v2-gedcom-id">{person.id}</span>
                <h2 className="person-workspace-v3-window-header__name">{getPersonLabel(person)}</h2>
                <div className="person-workspace-v3-window-header__meta">
                  <span>{heroData.lifeDates}</span>
                  <span aria-hidden="true">|</span>
                  <span>{sexLabel}</span>
                  <span aria-hidden="true">|</span>
                  <span>{lifeLabel}</span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="person-workspace-v3-workbench" data-testid="person-workspace-workbench">
            <div className="person-workspace-v3-workbench__hero">
              <div className="person-workspace-v3-workbench__identity">
                <div className="v2-avatar v3-avatar-sm person-workspace-v3-workbench__avatar" style={{ background: avatarColor }}>
                  <span className="material-symbols-outlined v2-avatar-icon">{sexIcon}</span>
                </div>
                <div className="person-workspace-v3-workbench__copy">
                  <span className="person-workspace-v3-workbench__eyebrow">Modo workbench</span>
                  <h2 className="person-workspace-v3-workbench__name">{getPersonLabel(person)}</h2>
                  <div className="person-workspace-v3-workbench__meta">
                    <span>{heroData.lifeDates}</span>
                    <span aria-hidden="true">|</span>
                    <span>{sexLabel}</span>
                    <span aria-hidden="true">|</span>
                    <span>{lifeLabel}</span>
                  </div>
                </div>
              </div>

              <div className="person-workspace-v3-workbench__stats">
                <div className="person-workspace-v3-stat">
                  <span className="person-workspace-v3-stat__value">{heroData.relations}</span>
                  <span className="person-workspace-v3-stat__label">Vinculos</span>
                </div>
                <div className="person-workspace-v3-stat">
                  <span className="person-workspace-v3-stat__value">{heroData.sources}</span>
                  <span className="person-workspace-v3-stat__label">Fuentes</span>
                </div>
                <div className="person-workspace-v3-stat">
                  <span className="person-workspace-v3-stat__value">{heroData.notes}</span>
                  <span className="person-workspace-v3-stat__label">Notas</span>
                </div>
                <div className="person-workspace-v3-stat">
                  <span className="person-workspace-v3-stat__value">{heroData.events}</span>
                  <span className="person-workspace-v3-stat__label">Eventos</span>
                </div>
              </div>
            </div>

            <div className="person-workspace-v3-workbench__strip">
              <div className="person-workspace-v3-workbench__actions">
                {workbenchSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`person-workspace-v3-workbench__chip ${activeSection.id === section.id ? "is-active" : ""}`}
                    onClick={() => setActiveTab(section.id)}
                  >
                    <span className="material-symbols-outlined">{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </div>
              <div className="person-workspace-v3-workbench__future">
                <span className="material-symbols-outlined">experiment</span>
                Carriles futuros: claims, journal, validacion de evidencia
              </div>
            </div>
          </section>
        )}

        <div className="person-workspace-v3-layout">
          <section className="person-workspace-v3-main">
            <div
              className={`person-workspace-v3-section-frame person-workspace-v3-section-frame--${activeSection.status} person-workspace-v3-section-frame--${layoutMode}`}
            >
              <header className="person-workspace-v3-section-frame__header">
                <div className="person-workspace-v3-section-frame__heading">
                  <span className="material-symbols-outlined person-workspace-v3-section-frame__icon">{activeSection.icon}</span>
                  <div className="person-workspace-v3-section-frame__copy">
                    <div className="person-workspace-v3-section-frame__title-row">
                      <h3 className="person-workspace-v3-section-frame__title">{activeSection.label}</h3>
                      <span className={`person-workspace-v3-section-frame__status person-workspace-v3-section-frame__status--${activeSection.status}`}>
                        {buildStatusLabel(activeSection.status)}
                      </span>
                      {typeof activeSection.badgeCount === "number" ? (
                        <span className="person-workspace-v3-section-frame__count">{activeSection.badgeCount}</span>
                      ) : null}
                    </div>
                    <p className="person-workspace-v3-section-frame__summary">{activeSection.summary}</p>
                  </div>
                </div>
                {layoutMode === "fullscreen" ? (
                  <div className="person-workspace-v3-section-frame__mode">
                    <span className="material-symbols-outlined">screen_search_desktop</span>
                    Workspace profundo
                  </div>
                ) : null}
              </header>

              <div className="person-workspace-v3-section-frame__body">
                {renderSectionBody(activeSection)}
              </div>
            </div>
          </section>

          {layoutMode === "fullscreen" ? (
            <aside className="person-workspace-v3-sidecar" data-testid="person-workspace-sidecar">
              <section className="person-workspace-v3-context-card">
                <div className="person-workspace-v3-context-card__header">
                  <h4>Contexto analitico</h4>
                  <span>Resumen operativo del expediente</span>
                </div>
                <div className="person-workspace-v3-context-list">
                  <div className="person-workspace-v3-context-list__item">
                    <span className="material-symbols-outlined">groups</span>
                    <div>
                      <strong>{heroData.relations}</strong>
                      <span>Vinculos inmediatos</span>
                    </div>
                  </div>
                  <div className="person-workspace-v3-context-list__item">
                    <span className="material-symbols-outlined">description</span>
                    <div>
                      <strong>{heroData.notes}</strong>
                      <span>Notas disponibles</span>
                    </div>
                  </div>
                  <div className="person-workspace-v3-context-list__item">
                    <span className="material-symbols-outlined">image</span>
                    <div>
                      <strong>{heroData.media}</strong>
                      <span>Objetos multimedia</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="person-workspace-v3-context-card">
                <div className="person-workspace-v3-context-card__header">
                  <h4>Analisis futuro</h4>
                  <span>Reservas visibles del workbench</span>
                </div>
                <div className="person-workspace-v3-future-list">
                  {v3Sections.filter((section) => section.futureAnalysis).map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className="person-workspace-v3-future-list__item"
                      onClick={() => setActiveTab(section.id)}
                    >
                      <span className="material-symbols-outlined">{section.icon}</span>
                      <div>
                        <strong>{section.label}</strong>
                        <span>{section.summary}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="person-workspace-v3-context-card">
                <div className="person-workspace-v3-context-card__header">
                  <h4>Acciones rapidas</h4>
                  <span>Sin salir del expediente</span>
                </div>
                <div className="person-workspace-v3-sidecar__actions">
                  <button type="button" className="panel-header-btn" onClick={() => onSetAsFocus(personId)}>
                    <span className="material-symbols-outlined">center_focus_strong</span>
                    Centrar persona
                  </button>
                  <button type="button" className="secondary-ghost" onClick={() => onOpenAiAssistant(personId)}>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    AncestrAI contextual
                  </button>
                </div>
              </section>
            </aside>
          ) : null}
        </div>
      </div>
    </StandardModal>
  );
}
