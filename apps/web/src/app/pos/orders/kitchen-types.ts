export type OrderLineItem = {
  id: string;
  qty: number;
  unitPrice: number;
  lineNote: string | null;
  item: {
    id: string;
    name: string;
    imageUrl?: string | null;
    category: { id: string; name: string; prepArea?: string; cloudCategoryId?: string | null } | null;
  } | null;
  options: Array<{
    id: string;
    option: { name: string; group: { name: string } | null } | null;
  }>;
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
    category: { id: string; name: string; prepArea: string; cloudCategoryId?: string | null } | null;
  } | null;
};

export type PendingTransaction = {
  id: string;
  transactionNo: number;
  status: string;
  source: string;
  createdAt: string;
  createdBy: string | null;
  serviceType?: string;
  prepStartedAt?: string | null;
  prepReadyAt?: string | null;
  table: { id: string; label: string; zone: { code: string; name: string } | null } | null;
  lineItems: PendingTransactionLineItem[];
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
  /** When this order has a linked paid transaction (pending tab), tablet print/reprint can use it. */
  linkedTransaction?: PendingTransaction | null;
};

export type PendingItem = { kind: "order"; order: PosOrder } | { kind: "transaction"; transaction: PendingTransaction };
