export type PersonInput = {
  name: string;
  surname?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residence?: string;
  sex?: "M" | "F" | "U";
  lifeStatus?: "alive" | "deceased";
  photoDataUrl?: string | null;
};

export type PersonPatch = {
  name?: string;
  surname?: string;
  surnamePaternal?: string;
  surnameMaternal?: string;
  surnameOrder?: "paternal_first" | "maternal_first" | "single";
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residence?: string;
  isPlaceholder?: boolean;
  sex?: "M" | "F" | "U";
  lifeStatus?: "alive" | "deceased";
  photoDataUrl?: string | null;
  notesAppend?: string[];
  notesReplace?: string[];
  notesInlineReplace?: string[];
};
