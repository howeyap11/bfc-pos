# API Contracts (Summary)

This file is a non-authoritative reference. The authoritative POS rules are in `/docs/pos/pos-register-spec.md`.

## POS
- POST /pos/sales
- POST /pos/sales/:id/payments
- GET /pos/sales/:id/receipt

## Staff
- GET /staff
- POST /staff/login

## Store Config
- GET /store-config
- PUT /store-config (protected by x-staff-key)

## QR
- POST /orders (create QR order)
- POST /qr/orders/:id/accept (accept QR order into POS flow)