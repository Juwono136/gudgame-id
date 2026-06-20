"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { Button } from "@/components/ui/button";
import { GearSearchPicker } from "@/components/wiki/gear-search-picker";
import {
  GEAR_CATEGORIES,
  GEAR_CATEGORY_LABELS,
  type GearCategory,
} from "@/lib/wiki/gear/constants";
import { extractApiErrorMessage } from "@/lib/api/extract-api-error";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import type { GearSearchListItem } from "@/lib/wiki/gear/mapper";
import {
  PLAYER_EQUIPMENT_CATEGORIES,
  type PlayerEquipmentItem,
} from "@/lib/wiki/player-equipment";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

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
  sportSlug: string;
  items: PlayerEquipmentItem[];
  onChange: (items: PlayerEquipmentItem[]) => void;
  equipmentPreviews: Record<string, string>;
  onImageChange: (id: string, file: File | null) => void;
  signatureGearId: string | null;
  onSignatureChange: (id: string | null) => void;
};

type AddMode = "catalog" | "create";

const emptyNewGear = () => ({
  displayName: "",
  brand: "",
  gearCategory: "racket" as GearCategory,
  priceIdr: "",
  notes: "",
});

export function PlayerEquipmentEditor({
  sportSlug,
  items,
  onChange,
  equipmentPreviews,
  onImageChange,
  signatureGearId,
  onSignatureChange,
}: PlayerEquipmentEditorProps) {
  const { confirm } = useConfirmDialog();
  const [addMode, setAddMode] = useState<AddMode>("catalog");
  const [creating, setCreating] = useState(false);
  const [newGear, setNewGear] = useState(emptyNewGear);
  const [newGearImage, setNewGearImage] = useState<File | null>(null);
  const [newGearImagePreview, setNewGearImagePreview] = useState<string | null>(null);
  const newGearImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (newGearImagePreview) URL.revokeObjectURL(newGearImagePreview);
    };
  }, [newGearImagePreview]);

  const updateItem = (id: string, patch: Partial<PlayerEquipmentItem>) => {
    onChange(items.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeItem = async (id: string, label: string) => {
    const ok = await confirm({
      title: "Remove equipment?",
      description: `Remove "${label || "this item"}" from your equipment list?`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    onChange(items.filter((e) => e.id !== id));
    if (signatureGearId === id) onSignatureChange(null);
  };

  const addFromCatalog = (gear: GearSearchListItem) => {
    if (items.some((i) => i.gearEntityId === gear.id)) {
      toast.info("This gear is already in your list");
      return;
    }
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        gearEntityId: gear.id,
        name: gear.displayName,
        brand: gear.brand ?? "",
        category: gear.gearCategory,
        imageUrl: gear.primaryImageUrl ?? "",
      },
    ]);
    toast.success("Gear added to your equipment");
  };

  const resetNewGearForm = useCallback(() => {
    setNewGear(emptyNewGear());
    setNewGearImage(null);
    if (newGearImagePreview) URL.revokeObjectURL(newGearImagePreview);
    setNewGearImagePreview(null);
  }, [newGearImagePreview]);

  const handleNewGearImage = (file: File | null) => {
    if (newGearImagePreview) URL.revokeObjectURL(newGearImagePreview);
    setNewGearImage(file);
    setNewGearImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const removeNewGearImage = () => {
    handleNewGearImage(null);
  };

  const createAndLinkGear = async () => {
    if (!newGear.displayName.trim() || !newGear.brand.trim()) {
      toast.error("Name and brand are required");
      return;
    }
    setCreating(true);
    try {
      const formData = new FormData();
      formData.set("displayName", newGear.displayName.trim());
      formData.set("brand", newGear.brand.trim());
      formData.set("gearCategory", newGear.gearCategory);
      if (newGear.priceIdr.trim()) {
        formData.set("priceIdr", newGear.priceIdr.replace(/[^\d]/g, ""));
      }
      if (newGear.notes.trim()) formData.set("notes", newGear.notes.trim());
      if (newGearImage) formData.set("image", newGearImage);

      const res = await fetch("/api/account/player/gear", {
        method: "POST",
        body: formData,
      });
      const json = await parseJsonResponse<{
        success: boolean;
        data: { item: GearSearchListItem };
        error?: unknown;
      }>(res);
      if (!res.ok) {
        throw new Error(extractApiErrorMessage(json, "Failed to create gear"));
      }
      const gear = json.data?.item;
      if (!gear) throw new Error("Invalid response");
      addFromCatalog(gear);
      resetNewGearForm();
      toast.success("Gear published to catalog and added to your equipment");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create gear");
    } finally {
      setCreating(false);
    }
  };

  const linkedIds = items.map((i) => i.gearEntityId).filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-cp-muted">No equipment added yet.</p>
      ) : null}

      {items.map((item) => {
        const imageSrc = equipmentPreviews[item.id] ?? item.imageUrl ?? null;
        const isSignature = signatureGearId === item.id;
        const linked = Boolean(item.gearEntityId);

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
              <div className="min-w-0 flex-1">
                {linked ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <span className="rounded-full border border-cp-primary/30 bg-cp-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cp-primary">
                        Catalog
                      </span>
                    </div>
                    {item.brand ? (
                      <p className="text-sm text-cp-muted">{item.brand}</p>
                    ) : null}
                    {item.category ? (
                      <p className="text-xs capitalize text-cp-text-dim">{item.category}</p>
                    ) : null}
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
                ) : (
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <AuthField label="Name" htmlFor={`eq-name-${item.id}`}>
                      <AuthInput
                        id={`eq-name-${item.id}`}
                        value={item.name ?? ""}
                        maxLength={120}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        placeholder="e.g. Metalbone 3.3"
                      />
                    </AuthField>
                    <AuthField label="Category" htmlFor={`eq-cat-${item.id}`}>
                      <select
                        id={`eq-cat-${item.id}`}
                        value={item.category ?? "racket"}
                        onChange={(e) =>
                          updateItem(item.id, {
                            category: e.target.value as PlayerEquipmentItem["category"],
                          })
                        }
                        className="h-11 w-full rounded-lg border border-cp-border bg-cp-bg-input px-3 text-sm text-foreground"
                      >
                        {PLAYER_EQUIPMENT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {GEAR_CATEGORY_LABELS[c]}
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
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!linked ? (
                <label className="cursor-pointer rounded-lg border border-cp-border px-3 py-1.5 text-xs font-medium hover:bg-cp-elevated">
                  {imageSrc ? "Replace image" : "Add image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => onImageChange(item.id, e.target.files?.[0] ?? null)}
                  />
                </label>
              ) : null}
              <button
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  isSignature
                    ? "border-cp-primary bg-cp-primary/10 text-cp-primary"
                    : "border-cp-border text-cp-muted hover:bg-cp-elevated"
                }`}
                onClick={() => onSignatureChange(isSignature ? null : item.id)}
                disabled={!item.name?.trim() && !item.gearEntityId}
              >
                {isSignature ? "Signature gear" : "Set as signature"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                onClick={() => void removeItem(item.id, item.name ?? "")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        );
      })}

      <div className="rounded-xl border border-dashed border-cp-border p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAddMode("catalog")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              addMode === "catalog"
                ? "border-cp-primary bg-cp-primary/10 text-cp-primary"
                : "border-cp-border text-cp-muted"
            }`}
          >
            From catalog
          </button>
          <button
            type="button"
            onClick={() => setAddMode("create")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              addMode === "create"
                ? "border-cp-primary bg-cp-primary/10 text-cp-primary"
                : "border-cp-border text-cp-muted"
            }`}
          >
            Add new gear
          </button>
        </div>

        {addMode === "catalog" ? (
          <div className="mt-4">
            <GearSearchPicker
              sportSlug={sportSlug}
              excludeIds={linkedIds}
              onSelect={addFromCatalog}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-cp-border bg-cp-card sm:mx-0">
                {newGearImagePreview ? (
                  <Image
                    src={newGearImagePreview}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-cp-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 self-center sm:self-start">
                <input
                  ref={newGearImageInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleNewGearImage(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-cp-border text-xs"
                  onClick={() => newGearImageInputRef.current?.click()}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  {newGearImagePreview ? "Edit" : "Add image"}
                </Button>
                {newGearImagePreview ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 border-destructive/40 text-xs text-destructive hover:bg-destructive/10"
                    onClick={removeNewGearImage}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AuthField label="Product name *" htmlFor="new-gear-name">
                <AuthInput
                  id="new-gear-name"
                  value={newGear.displayName}
                  maxLength={200}
                  onChange={(e) => setNewGear((p) => ({ ...p, displayName: e.target.value }))}
                />
              </AuthField>
              <AuthField label="Brand *" htmlFor="new-gear-brand">
                <AuthInput
                  id="new-gear-brand"
                  value={newGear.brand}
                  maxLength={80}
                  onChange={(e) => setNewGear((p) => ({ ...p, brand: e.target.value }))}
                />
              </AuthField>
              <AuthField label="Category" htmlFor="new-gear-category">
                <select
                  id="new-gear-category"
                  value={newGear.gearCategory}
                  onChange={(e) =>
                    setNewGear((p) => ({
                      ...p,
                      gearCategory: e.target.value as GearCategory,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-cp-border bg-cp-bg-input px-3 text-sm"
                >
                  {GEAR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {GEAR_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </AuthField>
              <AuthField label="Price (IDR)" htmlFor="new-gear-price">
                <AuthInput
                  id="new-gear-price"
                  value={newGear.priceIdr}
                  inputMode="numeric"
                  onChange={(e) => setNewGear((p) => ({ ...p, priceIdr: e.target.value }))}
                />
              </AuthField>
              <div className="sm:col-span-2">
                <AuthField label="Notes" htmlFor="new-gear-notes">
                  <AuthInput
                    id="new-gear-notes"
                    value={newGear.notes}
                    maxLength={500}
                    onChange={(e) => setNewGear((p) => ({ ...p, notes: e.target.value }))}
                  />
                </AuthField>
              </div>
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                className="border-cp-border"
                disabled={creating}
                onClick={() => void createAndLinkGear()}
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create & add to equipment
              </Button>
              <p className="mt-2 text-xs text-cp-muted">
                Saved to the shared gear catalog (same as admin wiki entries) so other players
                can find it via search.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
