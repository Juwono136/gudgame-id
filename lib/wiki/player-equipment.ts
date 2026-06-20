import { z } from "zod";
import { GEAR_CATEGORIES } from "@/lib/wiki/gear/constants";

export const PLAYER_EQUIPMENT_CATEGORIES = GEAR_CATEGORIES;

export type PlayerEquipmentCategory = (typeof PLAYER_EQUIPMENT_CATEGORIES)[number];

export const playerEquipmentItemSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    gearEntityId: z.string().uuid().optional(),
    name: z.string().trim().max(120).optional().or(z.literal("")),
    category: z.enum(PLAYER_EQUIPMENT_CATEGORIES).optional(),
    brand: z.string().trim().max(80).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    imageUrl: z.string().max(2048).optional().or(z.literal("")),
    imageStorageKey: z.string().max(512).optional().or(z.literal("")),
    gearSlug: z.string().max(120).optional(),
    gearPublicUrl: z.string().max(512).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.gearEntityId && !data.name?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Equipment name is required when not linked to catalog",
        path: ["name"],
      });
    }
    if (!data.gearEntityId && !data.category) {
      ctx.addIssue({
        code: "custom",
        message: "Category is required when not linked to catalog",
        path: ["category"],
      });
    }
  });

export type PlayerEquipmentItem = z.infer<typeof playerEquipmentItemSchema>;

export const playerEquipmentListSchema = z
  .array(playerEquipmentItemSchema)
  .max(20, "Maximum 20 equipment items");

export function parsePlayerEquipment(value: unknown): PlayerEquipmentItem[] {
  const parsed = playerEquipmentListSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function equipmentFromAttributes(
  attributes: Record<string, unknown>,
): PlayerEquipmentItem[] {
  return parsePlayerEquipment(attributes.equipment);
}

export function mergeEquipmentIntoAttributes(
  attributes: Record<string, unknown>,
  equipment: PlayerEquipmentItem[],
): Record<string, unknown> {
  const { equipment: _removed, ...rest } = attributes;
  return {
    ...rest,
    equipment,
  };
}

export function collectEquipmentStorageRefs(
  equipment: PlayerEquipmentItem[],
): string[] {
  return equipment.flatMap((item) =>
    [item.imageStorageKey, item.imageUrl].filter(Boolean) as string[],
  );
}
