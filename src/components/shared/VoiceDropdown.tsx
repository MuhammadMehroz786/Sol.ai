/**
 * Shared Voice Dropdown
 * Used by: TodaysSignals, ContentGenerator, SocialAlchemist
 *
 * Renders a beautiful, grouped, accessible voice selector.
 * Default voices are grouped separately from user-created voices.
 * Sends databaseId (UUID) in payloads via resolvedVoiceId pattern.
 */

import { User, Sparkles, Trash2, Edit, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type VoiceOption } from "@/constants/voices";

interface VoiceDropdownProps {
  voices: VoiceOption[];
  value: string;
  onValueChange: (value: string) => void;
  onDelete?: (value: string) => void;
  onEdit?: (voice: VoiceOption) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function VoiceDropdown({
  voices,
  value,
  onValueChange,
  onDelete,
  onEdit,
  placeholder = "Select a voice...",
  triggerClassName,
}: VoiceDropdownProps) {
  const selected = voices.find((v) => v.value === value);
  const SelectedIcon = selected?.icon || User;

  const defaultVoices = voices.filter((v) => v.isDefault);
  const customVoices  = voices.filter((v) => !v.isDefault);

  return (
    <TooltipProvider delayDuration={200}>
    <Select value={value} onValueChange={onValueChange}>
      {/* ── Trigger ── */}
      <SelectTrigger
        className={cn(
          "h-11 bg-background border-2 border-border/60 hover:border-primary/50 focus:border-primary",
          "hover:shadow-md hover:shadow-primary/8 transition-all duration-200 font-medium rounded-xl",
          triggerClassName
        )}
      >
        <SelectValue placeholder={placeholder}>
          {selected && (
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br shadow-sm",
                  selected.color || "from-gray-400 to-gray-500"
                )}
              >
                <SelectedIcon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-sm truncate">{selected.label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>

      {/* ── Content ── */}
      <SelectContent position="popper" sideOffset={6} className="bg-popover/98 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl p-2 max-h-[300px] overflow-y-auto w-[var(--radix-select-trigger-width)]">

        {/* Default voices group */}
        {defaultVoices.length > 0 && (
          <>
            <div className="px-2 pb-1 pt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Default Voices
              </span>
            </div>
            {defaultVoices.map((voice) => {
              const Icon = voice.icon || User;
              return (
                <SelectItem
                  key={voice.value}
                  value={voice.value}
                  className={cn(
                    "rounded-xl cursor-pointer transition-all duration-150 my-0.5 px-2 py-1.5 w-full",
                    "focus:bg-primary/8 data-[highlighted]:bg-primary/8",
                    value === voice.value && "bg-primary/10"
                  )}
                >
                  <div className="flex items-center gap-3 w-full pr-1">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-md",
                        voice.color || "from-gray-400 to-gray-500"
                      )}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                        {voice.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                        {voice.description}
                      </p>
                    </div>
                    {voice.tooltip && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="ml-auto shrink-0 flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted/60 transition-colors"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          >
                            <Info className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-primary transition-colors" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="max-w-[220px] text-[12px] leading-snug"
                        >
                          {voice.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </>
        )}

        {/* Custom voices group */}
        {customVoices.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="px-2 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Your Voices
              </span>
            </div>
            {customVoices.map((voice) => {
              const Icon = voice.icon || User;
              return (
                <div key={voice.value} className="relative group/item">
                  <SelectItem
                    value={voice.value}
                    className={cn(
                      "rounded-xl cursor-pointer transition-all duration-150 my-0.5 px-2 py-1.5 pr-16",
                      "focus:bg-accent/10 data-[highlighted]:bg-accent/10",
                      value === voice.value && "bg-accent/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-md",
                          voice.color || "from-gray-400 to-gray-500"
                        )}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                          {voice.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          {voice.description}
                        </p>
                      </div>
                    </div>
                  </SelectItem>

                  {/* Edit / Delete actions */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
                    {onEdit && (
                      <button
                        type="button"
                        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-primary/15 transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(voice); }}
                      >
                        <Edit className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/15 transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(voice.value); }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Create voice action */}
        <Separator className="my-2" />
        <SelectItem
          value="create-voice-profile"
          className="rounded-xl cursor-pointer transition-all duration-150 px-2 py-2 focus:bg-primary/8 data-[highlighted]:bg-primary/8"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-primary leading-tight">Create Personal Voice</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Train on your own writing</p>
            </div>
          </div>
        </SelectItem>

      </SelectContent>
    </Select>
    </TooltipProvider>
  );
}
