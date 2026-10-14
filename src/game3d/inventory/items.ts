export const INVENTORY_SIZE = 5;

export type InventoryItemId =
  | "overlay-sheet"
  | "small-gear"
  | "brass-key"
  | "seal-medal";

export type InventoryItemDefinition = {
  id: InventoryItemId;
  name: string;
  consumable: boolean;
};

export const INVENTORY_ITEMS: Record<
  InventoryItemId,
  InventoryItemDefinition
> = {
  "overlay-sheet": {
    id: "overlay-sheet",
    name: "透明板",
    consumable: true,
  },

  "small-gear": {
    id: "small-gear",
    name: "小さな歯車",
    consumable: true,
  },

  "brass-key": {
    id: "brass-key",
    name: "真鍮の鍵",
    consumable: true,
  },

  "seal-medal": {
    id: "seal-medal",
    name: "封印メダル",
    consumable: true,
  },
};

export function getInventoryItem(
  id: InventoryItemId,
) {
  return INVENTORY_ITEMS[id];
}
