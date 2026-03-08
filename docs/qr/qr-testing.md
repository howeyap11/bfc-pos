# QR Acceptance Testing Guide

## Prerequisites
- API running
- Web running
- DB seeded with sample orders

## Test URLs
Seed script outputs:
- PAYMONGO URL: /pos/register?qrOrderId=<id>
- CASH URL: /pos/register?qrOrderId=<id>

## Scenario 1: PAYMONGO
Expected:
- accept runs
- sale created immediately
- navigate to transaction success
- receipt data loads correctly

## Scenario 2: CASH
Expected:
- accept runs
- cart payload loads into POS cart
- cashier can pay with POS payment buttons
- sale created after payment
- sale linked to orderId
- navigate to transaction success

## Error scenarios
- invalid order id
- already accepted order
- missing x-staff-key (API should reject)