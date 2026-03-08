-- Manual migration to rename GCASH_MANUAL to GCASH
-- This updates all existing records in the database

-- Update SalePayment records
UPDATE SalePayment 
SET method = 'GCASH' 
WHERE method = 'GCASH_MANUAL';

-- Update Order records (if any exist with GCASH_MANUAL)
UPDATE "Order" 
SET paymentMethod = 'GCASH' 
WHERE paymentMethod = 'GCASH_MANUAL';

-- Update StoreConfig records (JSON field)
UPDATE StoreConfig 
SET enabledPaymentMethods = REPLACE(enabledPaymentMethods, 'GCASH_MANUAL', 'GCASH')
WHERE enabledPaymentMethods LIKE '%GCASH_MANUAL%';

UPDATE StoreConfig 
SET paymentMethodOrder = REPLACE(paymentMethodOrder, 'GCASH_MANUAL', 'GCASH')
WHERE paymentMethodOrder LIKE '%GCASH_MANUAL%';
