-- Kitchen display: optional filter by local Category ids (JSON array). Empty/null = show all orders.
ALTER TABLE "StoreConfig" ADD COLUMN "kitchenDisplayCategoryIds" TEXT;
