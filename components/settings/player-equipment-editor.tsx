"use client";

import Image from "next/image";
import { Plus, Trash2 } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { Button } from "@/components/ui/button";
import {
  PLAYER_EQUIPMENT_CATEGORIES,
  type PlayerEquipmentItem,
} from "@/lib/wiki/player-equipment";

export function newEquipmentItem(): PlayerEquipmentItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "racket",
    brand: "",
    notes: "",
  };
}

type PlayerEquipmentEditorProps = {
  items: PlayerEquipmentItem[];
  onChange: (items: PlayerEquipmentItem[]) => void;
  equipmentPreviews: Record<string, string>;
  onImageChange: (id: string, file: File | null) => void;
  signatureGearId: string | null;
  onSignatureChange: (id: string | null) => void;
};

export function PlayerEquipmentEditor({
  items,
  onChange,
  equipmentPreviews,
  onImageChange,
  signatureGearId,
  onSignatureChange,
}: PlayerEquipmentEditorProps) {
  const updateItem = (id: string, patch: Partial<PlayerEquipmentItem>) => {
    onChange(items.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeItem = (id: string) => {
    onChange(items.filter((e) => e.id !== id));
    if (signatureGearId === id) onSignatureChange(null);
  };

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-cp-muted">No equipment added yet.</p>
      ) : null}

      {items.map((item) => {
        const imageSrc = equipmentPreviews[item.id] ?? item.imageUrl ?? null;
        const isSignature = signatureGearId === item.id;

        return (
          <div
            key={item.id}
            className="rounded-xl border border-cp-border bg-cp-elevated/40 p-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-cp-border bg-cp-card sm:mx-0">
                {imageSrc ? (
                  <Image src={imageSrc} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-cp-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <AuthField label="Name" htmlFor={`eq-name-${item.id}`}>
                  <AuthInput
                    id={`eq-name-${item.id}`}
                    value={item.name}
                    maxLength={120}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    placeholder="e.g. Metalbone 3.3"
                  />
                </AuthField>
                <AuthField label="Category" htmlFor={`eq-cat-${item.id}`}>
                  <select
                    id={`eq-cat-${item.id}`}
                    value={item.category}
                    onChange={(e) =>
                      updateItem(item.id, {
                        category: e.target.value as PlayerEquipmentItem["category"],
                      })
                    }
                    className="h-11 w-full rounded-lg border border-cp-border bg-cp-bg-input px-3 text-sm text-foreground"
                  >
                    {PLAYER_EQUIPMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </AuthField>
                <AuthField label="Brand" htmlFor={`eq-brand-${item.id}`}>
                  <AuthInput
                    id={`eq-brand-${item.id}`}
                    value={item.brand ?? ""}
                    maxLength={80}
                    onChange={(e) => updateItem(item.id, { brand: e.target.value })}
                  />
                </AuthField>
                <AuthField label="Notes" htmlFor={`eq-notes-${item.id}`}>
                  <AuthInput
                    id={`eq-notes-${item.id}`}
                    value={item.notes ?? ""}
                    maxLength={500}
                    onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                    placeholder="Grip, tension, size…"
                  />
                </AuthField>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-cp-border px-3 py-1.5 text-xs font-medium hover:bg-cp-elevated">
                {imageSrc ? "Replace image" : "Add image"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => onImageChange(item.id, e.target.files?.[0] ?? null)}
                />
              </label>
              <button
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  isSignature
                    ? "border-cp-primary bg-cp-primary/10 text-cp-primary"
                    : "border-cp-border text-cp-muted hover:bg-cp-elevated"
                }`}
                onClick={() => onSignatureChange(isSignature ? null : item.id)}
                disabled={!item.name.trim()}
              >
                {isSignature ? "Signature gear" : "Set as signature"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        className="rounded-lg border-cp-border"
        onClick={() => onChange([...items, newEquipmentItem()])}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add equipment
      </Button>
    </div>
  );
}
