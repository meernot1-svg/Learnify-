export type OrganismCategory =
  | 'human'
  | 'mammals'
  | 'birds'
  | 'reptiles'
  | 'marine'
  | 'insects'
  | 'plants'
  | 'microbes';

export interface OrganPartInfo {
  id: string;
  name: string;
  system: string;
  summary: string;
  functionality: string;
  keyFacts: string[];
  accentHex: string;
}

export interface OrganismDefinition {
  id: string;
  name: string;
  scientificName: string;
  category: OrganismCategory;
  summary: string;
  defaultCamera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  parts: OrganPartInfo[];
}

export const CATEGORY_META: { id: OrganismCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Models' },
  { id: 'human', label: 'Human Anatomy' },
  { id: 'mammals', label: 'Mammals' },
  { id: 'birds', label: 'Birds' },
  { id: 'reptiles', label: 'Reptiles & Amphibians' },
  { id: 'marine', label: 'Fish & Marine' },
  { id: 'insects', label: 'Insects & Arachnids' },
  { id: 'plants', label: 'Plants & Fungi' },
  { id: 'microbes', label: 'Cells & Microbes' },
];
