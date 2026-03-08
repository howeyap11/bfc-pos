# Staff Testing Guide

## Setup
1. Seed DB with sample staff.
2. Start API server.
3. Start Next.js server.

## Sample credentials
- Andrea: 1000 (ADMIN)
- John: 1001 (CASHIER)
- Maria: 1002 (CASHIER)

## Scenarios

### 1) No staff → cart allowed
- Open `/pos/register`
- Add/edit items
- Verify cart works
- Attempt payment → must require staff

### 2) Login
- Login as Andrea
- Verify cart header shows staff
- Verify payment works

### 3) Switch staff
- Login as John while Andrea is active
- Verify John becomes active

### 4) Logout
- Logout / clear local session
- Verify payment is blocked again

### 5) Persistence
- Login
- Refresh
- Verify staff persists