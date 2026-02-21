import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { DEFAULT_VOICES, VOICES_STORAGE_KEY, type VoiceOption } from "@/constants/voices";
import { supabase } from "@/integrations/supabase/client";

type CustomVoice = VoiceOption;

interface VoicesContextValue {
  voices: CustomVoice[];
  addVoice: (voice: CustomVoice) => void;
  updateVoice: (oldValue: string, updated: Partial<CustomVoice>) => void;
  removeVoice: (value: string) => void;
  reloadVoices: () => void;
}

const VoicesContext = createContext<VoicesContextValue | null>(null);

export function useVoices() {
  const ctx = useContext(VoicesContext);
  if (!ctx) throw new Error("useVoices must be used within VoicesProvider");
  return ctx;
}

export function VoicesProvider({ children }: { children: ReactNode }) {
  const [voices, setVoices] = useState<CustomVoice[]>(DEFAULT_VOICES);

  const loadVoices = useCallback(() => {
    const stored = localStorage.getItem(VOICES_STORAGE_KEY);
    if (stored) {
      try {
        let customVoices = JSON.parse(stored);
        // Clean up old voice profiles with "My Voice Profile" label
        const cleaned = customVoices.filter((v: CustomVoice) => v.label !== "My Voice Profile");
        if (cleaned.length !== customVoices.length) {
          localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(cleaned));
          customVoices = cleaned;
        }
        setVoices([...DEFAULT_VOICES, ...customVoices]);
      } catch {
        setVoices(DEFAULT_VOICES);
      }
    } else {
      setVoices(DEFAULT_VOICES);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  // Listen for cross-tab storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === VOICES_STORAGE_KEY) loadVoices();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loadVoices]);

  const persist = (allVoices: CustomVoice[]) => {
    const customOnly = allVoices.filter((v) => !v.isDefault);
    localStorage.setItem(VOICES_STORAGE_KEY, JSON.stringify(customOnly));
  };

  const addVoice = useCallback((voice: CustomVoice) => {
    setVoices((prev) => {
      const next = [...prev, voice];
      persist(next);
      return next;
    });
  }, []);

  const updateVoice = useCallback((oldValue: string, updated: Partial<CustomVoice>) => {
    setVoices((prev) => {
      const next = prev.map((v) =>
        v.value === oldValue ? { ...v, ...updated } : v
      );
      persist(next);
      return next;
    });
  }, []);

  const removeVoice = useCallback((value: string) => {
    setVoices((prev) => {
      const next = prev.filter((v) => v.value !== value);
      persist(next);
      return next;
    });
  }, []);

  return (
    <VoicesContext.Provider value={{ voices, addVoice, updateVoice, removeVoice, reloadVoices: loadVoices }}>
      {children}
    </VoicesContext.Provider>
  );
}
