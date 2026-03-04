import { useEffect, useMemo, useState } from "react";
import type { FamilyPatch } from "@/core/edit/commands";
import type { AiSettings } from "@/types/ai";
import type { GraphDocument, PendingRelationType } from "@/types/domain";
import type { PersonEditorPatch } from "@/types/editor";
import { getPersonLabel } from "@/ui/person/personDetailUtils";
import { StandardModal } from "@/ui/common/StandardModal";
import { splitPersonFamilies } from "@/ui/person/sections/PersonFamiliesSection";
import { PersonIdentitySection } from "@/ui/person/sections/PersonIdentitySection";
import { PersonFamiliesSection } from "@/ui/person/sections/PersonFamiliesSection";
import { PersonEventsSection } from "@/ui/person/sections/PersonEventsSection";

type PersonInput = {
    name: string;
    surname?: string;
    sex?: "M" | "F" | "U";
    birthDate?: string;
    deathDate?: string;
    lifeStatus?: "alive" | "deceased";
};

type Props = {
    document: GraphDocument;
    personId: string;
    aiSettings: AiSettings;
    onClose: () => void;
    onSelectPerson: (personId: string) => void;
    onSetAsFocus: (personId: string) => void;
    onSavePerson: (personId: string, patch: PersonEditorPatch) => void;
    onSaveFamily: (familyId: string, patch: FamilyPatch) => void;
    onCreatePerson: (input: PersonInput) => string | null;
    onQuickAddRelation: (anchorId: string, relationType: PendingRelationType) => void;
};

type V3Tab = "identity" | "family_links" | "events";

const TAB_CONFIG = [
    { id: "identity" as const, label: "Identidad", icon: "person" },
    { id: "family_links" as const, label: "Vínculos", icon: "groups" },
    { id: "events" as const, label: "Eventos", icon: "event" },
];

function getInitialV3Tab(): V3Tab {
    try {
        const value = window.localStorage.getItem("geneasketch.personFichaV3.lastTab");
        if (value === "identity" || value === "family_links" || value === "events") return value;
        return "identity";
    } catch {
        return "identity";
    }
}

export function PersonWorkspacePanelV3({
    document,
    personId,
    aiSettings,
    onClose,
    onSelectPerson,
    onSetAsFocus,
    onSavePerson,
    onSaveFamily,
    onCreatePerson,
    onQuickAddRelation,
}: Props) {
    const person = document.persons[personId];
    const [tab, setTab] = useState<V3Tab>(getInitialV3Tab);

    // Persist tab selection
    useEffect(() => {
        try { window.localStorage.setItem("geneasketch.personFichaV3.lastTab", tab); } catch { /* noop */ }
    }, [tab]);

    // Reset tab if person changes
    useEffect(() => {
        if (!person) return;
        setTab(getInitialV3Tab());
    }, [personId, person]);

    // Hero-level derived data
    const heroData = useMemo(() => {
        if (!person) return null;

        const bEvent = person.events?.find(e => e.type === "BIRT");
        const dEvent = person.events?.find(e => e.type === "DEAT");
        const bDate = person.birthDate || bEvent?.date || "";
        const dDate = person.deathDate || dEvent?.date || "";
        const displayBDate = bDate || "Desconocido";
        const displayDDate = dDate || (person.lifeStatus === "alive" ? "Presente" : "Desconocido");
        const lifeDates = `${displayBDate} — ${displayDDate}`;

        const { originFamilies, ownFamilies } = splitPersonFamilies(person.id, document);
        const totalRelations =
            originFamilies.reduce((n, f) => n + (f.husbandId && f.husbandId !== person.id ? 1 : 0) + (f.wifeId && f.wifeId !== person.id ? 1 : 0), 0) +
            ownFamilies.reduce((n, f) => {
                const spouseId = f.husbandId === person.id ? f.wifeId : f.husbandId;
                return n + (spouseId ? 1 : 0) + f.childrenIds.filter(c => c !== person.id).length;
            }, 0);

        return { lifeDates, totalRelations, totalEvents: person.events?.length || 0 };
    }, [person, document]);

    if (!person || !heroData) return null;

    const sexIcon = person.sex === "M" ? "male" : person.sex === "F" ? "female" : "person";
    const avatarColor = person.sex === "M"
        ? "var(--node-male, #1a3a6e)"
        : person.sex === "F"
            ? "var(--node-female, #4a2a6e)"
            : "var(--gs-paper-elevated, #1e293b)";
    const isAlive = person.lifeStatus === "alive";
    const sexLabel = person.sex === "M" ? "Masculino" : person.sex === "F" ? "Femenino" : "No especificado";

    // Subtitles for tabs with counts
    const tabsWithBadges = TAB_CONFIG.map(t => ({
        ...t,
        label: t.id === "family_links" && heroData.totalRelations > 0
            ? `Vínculos (${heroData.totalRelations})`
            : t.id === "events" && heroData.totalEvents > 0
                ? `Eventos (${heroData.totalEvents})`
                : t.label,
    }));

    const footer = (
        <div className="v3-footer-bar">
            <button
                className="panel-header-btn"
                onClick={() => { onSetAsFocus(personId); onClose(); }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>center_focus_strong</span>
                Seleccionar persona
            </button>
        </div>
    );

    const renderTabContent = () => {
        if (tab === "identity") {
            return <PersonIdentitySection person={person} document={document} onSavePerson={onSavePerson} />;
        }
        if (tab === "family_links") {
            return (
                <PersonFamiliesSection
                    personId={person.id}
                    document={document}
                    onSelectPerson={(id) => {
                        onSelectPerson(id);
                        // Also re-open this modal on the new person (navigation)
                    }}
                    onSaveFamily={onSaveFamily}
                    onCreatePerson={onCreatePerson}
                    onQuickAddRelation={onQuickAddRelation}
                />
            );
        }
        if (tab === "events") {
            return (
                <PersonEventsSection
                    person={person}
                    document={document}
                    aiSettings={aiSettings}
                    onSavePerson={onSavePerson}
                />
            );
        }
        return null;
    };

    return (
        <StandardModal
            open={true}
            title={`Expediente: ${getPersonLabel(person)}`}
            onClose={onClose}
            size="xl"
            tabs={tabsWithBadges}
            activeTab={tab}
            onTabChange={(id) => setTab(id as V3Tab)}
            footer={footer}
            className="person-v3-panel"
        >
            {/* ── Hero V2 (fixed above tabs content) ── */}
            <div className="v3-hero-strip">
                <div className="v2-avatar v3-avatar-sm" style={{ background: avatarColor }}>
                    <span className="material-symbols-outlined v2-avatar-icon" style={{ fontSize: 24 }}>{sexIcon}</span>
                </div>
                <div className="v3-hero-info">
                    <span className="v2-gedcom-id">{person.id}</span>
                    <span className="v3-hero-name">{getPersonLabel(person)}</span>
                    <span className="person-meta v2-life-dates">{heroData.lifeDates}</span>
                </div>
                <div className="v2-chips v3-chips-compact">
                    <span className="v2-chip v2-chip--sex">
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{sexIcon}</span>
                        {sexLabel}
                    </span>
                    <span className={`v2-chip ${isAlive ? "v2-chip--alive" : "v2-chip--deceased"}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                            {isAlive ? "favorite" : "deceased"}
                        </span>
                        {isAlive ? "Vivo/a" : "Fallecido/a"}
                    </span>
                </div>
            </div>

            {/* ── Active Tab Content ── */}
            {renderTabContent()}
        </StandardModal>
    );
}

