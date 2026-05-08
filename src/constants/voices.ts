import type { ComponentType } from "react";
import { Briefcase, Palette, Target, Users, BookOpen, Shield, Cpu, Telescope } from "lucide-react";

export interface VoiceOption {
  value: string;
  label: string;
  description: string;
  tooltip?: string;
  isDefault: boolean;
  icon?: ComponentType;
  color?: string;
  userId?: string;
  databaseId?: string;
}

export const DEFAULT_VOICES: VoiceOption[] = [
  {
    value: "cultural-oracle",
    label: "The Cultural Oracle",
    description: "Poetic, emotive, aesthetic",
    tooltip: "Speaks through feeling, imagery, and cultural memory. Best for creative essays, art & music commentary, and identity-forward storytelling.",
    isDefault: true,
    icon: Palette,
    color: "from-violet-500 to-fuchsia-500",
    databaseId: "1a436a57-317f-4b88-aa79-f3007456c30b",
  },
  {
    value: "optimistic-operator",
    label: "Optimistic Operator",
    description: "Pragmatic, entrepreneurial, encouraging",
    tooltip: "Focuses on practical usage, business models, and real-world execution. Best for founder stories, tool breakdowns, and opportunity-first takes.",
    isDefault: true,
    icon: Briefcase,
    color: "from-amber-500 to-orange-500",
    databaseId: "31721b7f-68c6-4c73-a38c-1ccf60bb0680",
  },
  {
    value: "connector-builder",
    label: "Connector / Community Builder",
    description: "Supportive, inclusive, grounded",
    tooltip: "Highlights community wins and collective action. Best for access & inclusion angles, collaboration stories, and grassroots movement coverage.",
    isDefault: true,
    icon: Users,
    color: "from-teal-500 to-emerald-500",
    databaseId: "648e601b-ac0e-4001-a566-ca7dd0bca03d",
  },
  {
    value: "archivist-historian",
    label: "Archivist / Historian",
    description: "Thoughtful, contextual, patient",
    tooltip: "Connects past, present, and future to reveal patterns. Best for preserving overlooked histories and adding long-view context to current events.",
    isDefault: true,
    icon: BookOpen,
    color: "from-amber-700 to-yellow-600",
    databaseId: "66492b3a-2de8-49b1-8e75-18f3ee21083c",
  },
  {
    value: "tech-skeptic",
    label: "Tech Skeptic / Accountability Lens",
    description: "Sharp, critical, justice-forward",
    tooltip: "Covers AI harm, bias, regulation, and surveillance with a solutions-forward framing. Best for critique pieces and accountability reporting.",
    isDefault: true,
    icon: Shield,
    color: "from-rose-500 to-red-600",
    databaseId: "6b8569d9-2be2-4532-81fa-8ea5f313e6ee",
  },
  {
    value: "engineer-translator",
    label: "Engineer Translator",
    description: "Curious, explanatory, accessible",
    tooltip: "Breaks down complex systems clearly without dumbing them down. Best for explainers, technical deep-dives, and how-it-works pieces.",
    isDefault: true,
    icon: Cpu,
    color: "from-sky-500 to-blue-600",
    databaseId: "87a86882-7ba9-46d3-b296-25001296f9a7",
  },
  {
    value: "the-scout",
    label: "The Scout",
    description: "Direct, clear, practical",
    tooltip: "Gets straight to the point. Best for quick-start guides, tool roundups, and action-oriented posts that show readers exactly what to do next.",
    isDefault: true,
    icon: Target,
    color: "from-orange-500 to-amber-500",
    databaseId: "b6862375-4012-48d7-943f-01839618aa3e",
  },
  {
    value: "visionary-strategist",
    label: "Visionary Strategist",
    description: "Visionary, strategic, narrative-led",
    tooltip: "Frames big-picture futures, power shifts, and emerging paradigms. Best for long-form essays, trend analysis, and thought-leadership pieces.",
    isDefault: true,
    icon: Telescope,
    color: "from-indigo-500 to-purple-600",
    databaseId: "ef11385f-a58f-429c-84f3-ab89fe7e050e",
  },
];

export const VOICES_STORAGE_KEY = 'sole-custom-voices';
