"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RECLUB_SQUAD_NAME_MAX,
  validateReclubSquadName,
} from "@/lib/tournaments/reclub/squad-names";
import { cn } from "@/lib/utils";

type SquadNameEditorProps = {
  name: string;
  canEdit: boolean;
  saving?: boolean;
  onSave: (name: string) => Promise<void>;
  className?: string;
};

export function SquadNameEditor({
  name,
  canEdit,
  saving = false,
  onSave,
  className,
}: SquadNameEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    if (!canEdit || saving) return;
    setDraft(name);
    setError(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(name);
    setError(null);
    setEditing(false);
  };

  const submit = async () => {
    const trimmed = draft.trim();
    if (trimmed === name) {
      cancelEditing();
      return;
    }

    const validationError = validateReclubSquadName(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename squad");
    }
  };

  if (editing) {
    return (
      <div className={cn("min-w-0 flex-1 space-y-1", className)}>
        <div className="flex min-w-0 items-center gap-1">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value.slice(0, RECLUB_SQUAD_NAME_MAX));
              setError(null);
            }}
            disabled={saving}
            className="h-8 min-w-0 border-cp-border bg-cp-bg-input text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEditing();
              }
            }}
            aria-invalid={Boolean(error)}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={saving}
            onClick={() => void submit()}
            title="Save name"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <Check className="h-4 w-4 text-emerald-400" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            disabled={saving}
            onClick={cancelEditing}
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {canEdit ? (
        <button
          type="button"
          className="min-w-0 truncate text-left font-semibold text-foreground transition-colors hover:text-emerald-300"
          onClick={startEditing}
          title="Click to rename squad"
        >
          {name}
        </button>
      ) : (
        <h3 className="truncate font-semibold text-foreground">{name}</h3>
      )}
      {canEdit ? (
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-cp-muted transition-colors hover:bg-cp-elevated hover:text-emerald-400"
          onClick={startEditing}
          title="Rename squad"
          aria-label="Rename squad"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
