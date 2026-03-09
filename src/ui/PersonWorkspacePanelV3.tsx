import { useEffect, useMemo, useState } from "react";
import type {
  PersonWorkspaceV3SectionDescriptor,
  PersonWorkspaceV3SectionId,
  PersonWorkspaceViewModel,
  ShellFeaturesFacade,
  WorkspaceWindowState,
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
  windowState?: WorkspaceWindowState;
};

const TAB_STORAGE_KEY = "geneasketch.personWorkspaceV3.lastTab";

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
  windowState,
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
    setIsFullscreen(viewModel.layoutMode === "fullscreen");
  }, [personId, v3Sections, viewModel.layoutMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch {
      // noop
    }
  }, [activeTab]);

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

  const orderedSections = useMemo(
    () => [...v3Sections].sort((left, right) => (left.workbenchPriority ?? 999) - (right.workbenchPriority ?? 999)),
    [v3Sections],
  );

  const primaryRailSections = useMemo(
    () => orderedSections.filter((section) => !section.futureAnalysis),
    [orderedSections],
  );

  const primaryWorkbenchSections = useMemo(
    () => primaryRailSections.filter((section) => section.contextRole === "analysis"),
    [primaryRailSections],
  );

  const supportingWorkbenchSections = useMemo(
    () => primaryRailSections.filter((section) => section.contextRole !== "analysis"),
    [primaryRailSections],
  );

  const futureRailSections = useMemo(
    () => orderedSections.filter((section) => section.futureAnalysis),
    [orderedSections],
  );

  const analysisQuickActions = useMemo(
    () => orderedSections.filter((section) => ["analysis", "sources", "notes", "timeline", "audit"].includes(section.id)),
    [orderedSections],
  );

  if (!person || !heroData || !activeSection) return null;

  const layoutMode = isFullscreen ? "fullscreen" : "window";
  const windowRect = windowState ?? { x: 56, y: 40, width: 1120, height: 760 };
  const sexIcon = person.sex === "M" ? "male" : person.sex === "F" ? "female" : "person";
  const sexLabel = person.sex === "M" ? "Masculino" : person.sex === "F" ? "Femenino" : "No especificado";
  const lifeLabel = person.lifeStatus === "alive" ? "Persona viva" : "Persona fallecida";
  const avatarColor = person.sex === "M"
    ? "var(--node-male)"
    : person.sex === "F"
      ? "var(--node-female)"
      : "var(--surface-subtle)";
  const showStatusBadge = layoutMode === "fullscreen" || activeSection.status !== "operativo";

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

  const windowFooter = (
    <div className="person-workspace-v3-footer">
      <button className="secondary-ghost" onClick={() => onOpenAiAssistant(personId)}>
        <span className="material-symbols-outlined">auto_awesome</span>
        AncestrAI
      </button>
      <button className="panel-header-btn" onClick={() => onSetAsFocus(personId)}>
        <span className="material-symbols-outlined">center_focus_strong</span>
        Seleccionar persona
      </button>
    </div>
  );

  const content = (
    <div className={`person-workspace-v3 person-workspace-v3--${layoutMode}`} data-layout-mode={layoutMode}>
      {layoutMode === "window" ? (
        <section className="person-workspace-v3-window-header" data-testid="person-workspace-window-header">
          <div className="person-workspace-v3-window-header__identity">
            <div className="v2-avatar v3-avatar-sm person-workspace-v3-window-header__avatar" style={{ background: avatarColor }}>
              <span className="material-symbols-outlined v2-avatar-icon">{sexIcon}</span>
            </div>
            <div className="person-workspace-v3-window-header__copy">
              <span className="person-workspace-v3-window-header__eyebrow">Expediente</span>
              <h2 className="person-workspace-v3-window-header__name">{getPersonLabel(person)}</h2>
              <div className="person-workspace-v3-window-header__meta">
                <span>{person.id}</span>
                <span aria-hidden="true">|</span>
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
          <div className="person-workspace-v3-workbench__topbar" data-testid="person-workspace-workbench-header">
            <div className="person-workspace-v3-workbench__identity">
              <div className="v2-avatar v3-avatar-sm person-workspace-v3-workbench__avatar" style={{ background: avatarColor }}>
                <span className="material-symbols-outlined v2-avatar-icon">{sexIcon}</span>
              </div>
              <div className="person-workspace-v3-workbench__copy">
                <span className="person-workspace-v3-workbench__eyebrow">Workspace profundo</span>
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

            <div className="person-workspace-v3-workbench__summary-row">
              <div className="person-workspace-v3-summary-pill">
                <strong>{heroData.relations}</strong>
                <span>Vinculos</span>
              </div>
              <div className="person-workspace-v3-summary-pill">
                <strong>{heroData.sources}</strong>
                <span>Fuentes</span>
              </div>
              <div className="person-workspace-v3-summary-pill">
                <strong>{heroData.notes}</strong>
                <span>Notas</span>
              </div>
              <div className="person-workspace-v3-summary-pill">
                <strong>{heroData.events}</strong>
                <span>Eventos</span>
              </div>
            </div>
          </div>

          <div className="person-workspace-v3-workbench__strip" data-testid="person-workspace-workbench-quick-actions">
            <div className="person-workspace-v3-workbench__actions">
              {analysisQuickActions.map((section) => (
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
              Carriles futuros: claims, journal, evidencia, hipotesis
            </div>
          </div>
        </section>
      )}

      <div className="person-workspace-v3-layout">
        {layoutMode === "fullscreen" ? (
          <nav className="person-workspace-v3-rail" data-testid="person-workspace-workbench-nav">
            <div className="person-workspace-v3-rail__group">
              <div className="person-workspace-v3-rail__label">Trabajo profundo</div>
              {primaryWorkbenchSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`person-workspace-v3-rail__item ${activeSection.id === section.id ? "is-active" : ""}`}
                  onClick={() => setActiveTab(section.id)}
                >
                  <span className="material-symbols-outlined">{section.icon}</span>
                  <span>{section.label}</span>
                </button>
              ))}
            </div>

            <div className="person-workspace-v3-rail__group">
              <div className="person-workspace-v3-rail__label">Registro base</div>
              {supportingWorkbenchSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`person-workspace-v3-rail__item ${activeSection.id === section.id ? "is-active" : ""}`}
                  onClick={() => setActiveTab(section.id)}
                >
                  <span className="material-symbols-outlined">{section.icon}</span>
                  <span>{section.label}</span>
                </button>
              ))}
            </div>

            {futureRailSections.length > 0 ? (
              <div className="person-workspace-v3-rail__group">
                <div className="person-workspace-v3-rail__label">Proximamente</div>
                {futureRailSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`person-workspace-v3-rail__item person-workspace-v3-rail__item--future ${activeSection.id === section.id ? "is-active" : ""}`}
                    onClick={() => setActiveTab(section.id)}
                  >
                    <span className="material-symbols-outlined">{section.icon}</span>
                    <span>{section.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </nav>
        ) : null}

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
                    {showStatusBadge ? (
                      <span className={`person-workspace-v3-section-frame__status person-workspace-v3-section-frame__status--${activeSection.status}`}>
                        {buildStatusLabel(activeSection.status)}
                      </span>
                    ) : null}
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
                <span>Lectura rapida para investigacion activa</span>
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
                <h4>Herramientas</h4>
                <span>Trabajo profundo sin salir del expediente</span>
              </div>
              <div className="person-workspace-v3-sidecar__actions">
                <button type="button" className="panel-header-btn" onClick={() => onOpenAiAssistant(personId)}>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  Abrir AncestrAI
                </button>
                <button type="button" className="secondary-ghost" onClick={() => setActiveTab("analysis")}>
                  <span className="material-symbols-outlined">analytics</span>
                  Abrir analisis
                </button>
                <button type="button" className="secondary-ghost" onClick={() => setActiveTab("sources")}>
                  <span className="material-symbols-outlined">menu_book</span>
                  Revisar fuentes
                </button>
                <button type="button" className="secondary-ghost" onClick={() => setActiveTab("notes")}>
                  <span className="material-symbols-outlined">description</span>
                  Abrir notas
                </button>
                <button type="button" className="secondary-ghost" onClick={() => onSetAsFocus(personId)}>
                  <span className="material-symbols-outlined">center_focus_strong</span>
                  Centrar persona
                </button>
              </div>
            </section>

            <section className="person-workspace-v3-context-card">
              <div className="person-workspace-v3-context-card__header">
                <h4>Investigacion futura</h4>
                <span>Reservas visibles del workbench</span>
              </div>
              <div className="person-workspace-v3-future-list">
                {futureRailSections.map((section) => (
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
          </aside>
        ) : null}
      </div>
    </div>
  );

  if (layoutMode === "fullscreen") {
    return (
      <StandardModal
        open={true}
        title={`Expediente: ${getPersonLabel(person)}`}
        onClose={onClose}
        size="xl"
        fullscreen={true}
        onToggleFullscreen={() => setIsFullscreen(false)}
        className="person-v3-panel person-workspace-v3-modal person-workspace-v3-modal--fullscreen"
      >
        {content}
      </StandardModal>
    );
  }

  return (
    <div
      className="person-workspace-v3-window-shell"
      data-testid="person-workspace-floating-window"
      style={{
        left: `${windowRect.x}px`,
        top: `${windowRect.y}px`,
        width: `min(${windowRect.width}px, calc(100% - 48px))`,
        height: `min(${windowRect.height}px, calc(100% - 36px))`,
      }}
    >
      <div className="person-workspace-v3-window-shell__chrome">
        <div className="person-workspace-v3-window-shell__title-group">
          <span className="material-symbols-outlined">folder_shared</span>
          <div className="person-workspace-v3-window-shell__title-copy">
            <span className="person-workspace-v3-window-shell__eyebrow">Workspace</span>
            <strong>{getPersonLabel(person)}</strong>
          </div>
        </div>
        <div className="person-workspace-v3-window-shell__actions">
          <button className="icon-btn" onClick={() => setIsFullscreen(true)} aria-label="Pantalla completa">
            <span className="material-symbols-outlined">fullscreen</span>
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div className="gs-tab-nav" role="tablist">
        {modalTabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`gs-tab-capsule ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id as PersonWorkspaceV3SectionId)}
          >
            {tab.icon ? <span className="material-symbols-outlined">{tab.icon}</span> : null}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="person-workspace-v3-window-shell__content">
        {content}
      </div>

      <div className="gs-modal-footer person-workspace-v3-window-shell__footer">
        {windowFooter}
      </div>
    </div>
  );
}
