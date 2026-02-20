import { Briefcase, Palette, Target } from "lucide-react";

export interface VoiceOption {
  value: string;
  label: string;
  description: string;
  isDefault: boolean;
  icon?: any;
  color?: string;
  userId?: string;
  databaseId?: string;
}

export const DEFAULT_VOICES: VoiceOption[] = [
  { value: "malcolm", label: "Malcolm", description: "Revolutionary thought leader", isDefault: true, icon: Briefcase, color: "from-blue-500 to-blue-600" },
  { value: "ana",     label: "Ana",     description: "Cultural analyst",             isDefault: true, icon: Palette,   color: "from-purple-500 to-pink-500" },
  { value: "winston", label: "Winston", description: "Strategic narrator",           isDefault: true, icon: Target,    color: "from-orange-500 to-red-500" },
];

export const VOICES_STORAGE_KEY = 'sole-custom-voices';
