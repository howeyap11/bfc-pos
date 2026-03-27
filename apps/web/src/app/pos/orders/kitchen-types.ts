export type OrderLineItem = {
  id: string;
  qty: number;
  unitPrice: number;
  lineNote: string | null;
  item: {
    id: string;
    name: string;
    imageUrl?: string | null;
    category: { name: string; prepArea?: string } | null;
  } | null;
  options: Array<{
    id: string;
    option: { name: string; group: { name: string } | null } | null;
  }>;
};

export type PosOrder = {
  id: string;
  orderNo: number;
  status: string;
  source: string;
  paymentMethod: string;
  paymentStatus: string;
  customerNote: string | null;
  createdAt: string;
  table: { id: string; label: string; zone: { code: string; name: string } | null } | null;
  items: OrderLineItem[];
};

export type PendingTransactionLineItem = {
  id: string;
  qty: number;
  unitPrice: number;
  lineNote: string | null;
  specialInstructions: string | null;
  customerName?: string | null;
  name: string;
  optionsJson: string | null;
  categoryName: string | null;
  subCategoryName: string | null;
  displayLabel: string;
  item: {
    id: string;
    name: string;
    imageUrl: string | null;
    category: { name: string; prepArea: string } | null;
  } | null;
};

export type PendingTransaction = {
  id: string;
  transactionNo: number;
  status: string;
  source: string;
  createdAt: string;
  createdBy: string | null;
  prepStartedAt?: string | null;
  prepReadyAt?: string | null;
  table: { id: string; label: string; zone: { code: string; name: string } | null } | null;
  lineItems: PendingTransactionLineItem[];
};

export type PendingItem = { kind: "order"; order: PosOrder } | { kind: "transaction"; transaction: PendingTransaction };
