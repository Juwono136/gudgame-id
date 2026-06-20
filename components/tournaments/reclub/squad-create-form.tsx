"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RECLUB_SQUAD_NAME_MAX,
  validateReclubSquadName,
} from "@/lib/tournaments/reclub/squad-names";
import { cn } from "@/lib/utils";

type SquadCreateFormProps = {
  onSubmit: (name: string) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
};

export function SquadCreateForm({
  onSubmit,
  onCancel,
  disabled,
  className,
}: SquadCreateFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCancel = () => {
    setName("");
    setError(null);
    onCancel?.();
  };

  const handleSubmit = async () => {
    const validationError = validateReclubSquadName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(name.trim());
      setName("");
      onCancel?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create squad");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = disabled || submitting;

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">New squad</p>
      <p className="mt-0.5 text-xs text-cp-muted">
        Pick a name your group will recognize. You can rename it later before a round starts.
      </p>

      <div className="mt-3 space-y-2">
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value.slice(0, RECLUB_SQUAD_NAME_MAX));
            setError(null);
          }}
          placeholder="e.g. Friday Night Aces"
          disabled={busy}
          maxLength={RECLUB_SQUAD_NAME_MAX}
          className="border-cp-border bg-cp-bg-input"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSubmit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              handleCancel();
            }
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "squad-create-error" : undefined}
        />
        <div className="flex items-center justify-between gap-2 text-xs text-cp-muted">
          <span>{name.length}/{RECLUB_SQUAD_NAME_MAX}</span>
          {error ? (
            <span id="squad-create-error" className="text-right text-red-400">
              {error}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500"
          disabled={busy || !name.trim()}
          onClick={() => void handleSubmit()}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Create squad
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-cp-border"
          disabled={busy}
          onClick={handleCancel}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
