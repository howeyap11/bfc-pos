# Staff System (UTAK-Style)

## Purpose
Provide a lightweight local-first staff session that:
- Allows customers to browse/build cart without staff
- Requires staff session for payment and other sensitive actions

## Session rules
- Exactly one active staff per terminal session.
- Stored locally in `localStorage` key `bfc_active_staff`.

Stored value:
```json
{ "id": "...", "name": "Andrea", "role": "ADMIN" }