import { useEffect, useState } from "react";
import type { FamilyPatch } from "@/core/edit/commands";
import type { AiSettings } from "@/types/ai";
import type { GraphDocument, PendingRelationType } from "@/types/domain";
import type { PersonEditorPatch } from "@/types/editor";
import { PersonDetailShell } from "@/ui/person/PersonDetailShell";
import { type PersonDetailSectionId } from "@/ui/person/personDetailSections";
import { PersonIdentitySection } from "@/ui/person/sections/PersonIdentitySection";
import { PersonEventsSection } from "@/ui/person/sections/PersonEventsSection";
import { PersonFamiliesSection } from "@/ui/person/sections/PersonFamiliesSection";
import { PersonSourcesSection } from "@/ui/person/sections/PersonSourcesSection";
import { PersonNotesSection } from "@/ui/person/sections/PersonNotesSection";
import { PersonMediaSection } from "@/ui/person/sections/PersonMediaSection";
import { PersonAuditSection } from "@/ui/person/sections/PersonAuditSection";
import { PersonExtensionsSection } from "@/ui/person/sections/PersonExtensionsSection";
import { PersonTimelineSection } from "@/ui/person/sections/PersonTimelineSection";
import { PersonAnalysisSection } from "@/ui/person/sections/PersonAnalysisSection";
import { PersonHistorySection } from "@/ui/person/sections/PersonHistorySection";
import { getPersonLabel } from "@/ui/person/personDetailUtils";

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

function getInitialTab(): PersonDetailSectionId {
  try {
    const value = window.localStorage.getItem("geneasketch.personFicha.lastTab.v1");
    if (!value) return "identity";
    return value as PersonDetailSectionId;
  } catch {
    return "identity";
  }
}


export function PersonWorkspacePanel({
  document,
  personId,
  aiSettings,
  onClose,
  onSelectPerson,
  onSetAsFocus,
  onSavePerson,
  onSaveFamily,
  onCreatePerson,
  onQuickAddRelation
}: Props) {
  const person = document.persons[personId];
  const [tab, setTab] = useState<PersonDetailSectionId>(getInitialTab);

  useEffect(() => {
    if (!person) return;
    setTab(getInitialTab());
  }, [personId, person]);

  useEffect(() => {
    try {
      window.localStorage.setItem("geneasketch.personFicha.lastTab.v1", tab);
    } catch {
      // noop
    }
  }, [tab]);


  if (!person) return null;


  const renderTabContent = () => {
    if (tab === "identity") {
      return <PersonIdentitySection person={person} document={document} onSavePerson={onSavePerson} />;
    }
    if (tab === "family_links") {
      return (
        <PersonFamiliesSection
          personId={person.id}
          document={document}
          onSelectPerson={onSelectPerson}
          onSaveFamily={onSaveFamily}
          onCreatePerson={onCreatePerson}
          onQuickAddRelation={onQuickAddRelation}
        />
      );
    }
    if (tab === "events") {
      return <PersonEventsSection person={person} document={document} aiSettings={aiSettings} onSavePerson={onSavePerson} />;
    }
    if (tab === "sources") {
      return <PersonSourcesSection person={person} document={document} onSavePerson={onSavePerson} />;
    }
    if (tab === "notes") {
      return <PersonNotesSection person={person} document={document} onSavePerson={onSavePerson} />;
    }
    if (tab === "media") {
      return <PersonMediaSection person={person} document={document} onSavePerson={onSavePerson} />;
    }
    if (tab === "audit") {
      return <PersonAuditSection person={person} />;
    }
    if (tab === "extensions") {
      return <PersonExtensionsSection person={person} document={document} />;
    }
    if (tab === "timeline") {
      return <PersonTimelineSection document={document} personId={person.id} onSelectPerson={onSelectPerson} />;
    }
    if (tab === "analysis") {
      return <PersonAnalysisSection document={document} person={person} onSelectPerson={onSelectPerson} />;
    }
    return <PersonHistorySection />;
  };

  return (
    <PersonDetailShell
      title={`Expediente de persona: ${getPersonLabel(person)}`}
      activeTab={tab}
      onChangeTab={setTab}
      onClose={onClose}
      onPrimaryAction={() => {
        onSetAsFocus(person.id);
        onClose();
      }}
      primaryActionLabel="Seleccionar persona"
    >
      {renderTabContent()}
    </PersonDetailShell>
  );
}

