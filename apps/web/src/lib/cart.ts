export type CartOption = {
  optionId: string;
  name: string;
  priceDelta: number;
  groupName: string;
};

export type CartLine = {
  lineId: string; // client id
  itemId: string;
  name: string;
  qty: number;
  basePrice: number;
  options: CartOption[];
  note?: string;
};

const KEY = "bfc_cart_v1";

export function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartLine[];
  } catch {
    return [];
  }
}

export function saveCart(lines: CartLine[]) {
  localStorage.setItem(KEY, JSON.stringify(lines));
}
