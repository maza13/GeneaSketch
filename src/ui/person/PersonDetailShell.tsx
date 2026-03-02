import type { ReactNode } from "react";
import { PERSON_DETAIL_SECTIONS, type PersonDetailSectionId } from "@/ui/person/personDetailSections";
import { StandardModal } from "../common/StandardModal";

type Props = {
  title: string;
  activeTab: PersonDetailSectionId;
  onChangeTab: (tab: PersonDetailSectionId) => void;
  onClose: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
  children: ReactNode;
};

export function PersonDetailShell({
  title,
  activeTab,
  onChangeTab,
  onClose,
  onPrimaryAction,
  primaryActionLabel,
  children
}: Props) {
  const tabs = PERSON_DETAIL_SECTIONS
    .filter((s) => s.enabled)
    .map((s) => ({
      id: s.id,
      label: s.label,
      icon: s.icon // Assuming s has icon, if not it will be undefined and StandardModal handles it
    }));

  return (
    <StandardModal
      open={true} // Shell is only rendered if open
      title={title}
      onClose={onClose}
      size="xl"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(id) => onChangeTab(id as PersonDetailSectionId)}
      footer={
        <button className="accent-solid" onClick={onPrimaryAction}>
          {primaryActionLabel}
        </button>
      }
    >
      {children}
    </StandardModal>
  );
}
