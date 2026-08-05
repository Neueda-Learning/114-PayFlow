# 📖 API Documentation

This document serves as the contract for the REST APIs provided by the FlowPay backend.

## Interactive Docs
Swagger/OpenAPI UI is available at:
`http://localhost:3000/swagger-ui/index.html` (or `http://localhost:8081/swagger-ui.html`)

---

## Auth Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/auth/register` | No | Register first and only user |
| POST | `/api/auth/login` | No | Login, get JWT |

### Register

```bash
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOi...",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "USER"
  },
  "timestamp": "2026-07-29T10:00:00"
}
```

### Login

```bash
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

## Payment Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/payments` | Yes | Create payment |
| GET | `/api/payments` | Yes | List all payments |
| GET | `/api/payments/{id}` | Yes | Get payment by ID |
| GET | `/api/payments/status/{status}` | Yes | Filter by status |
| GET | `/api/payments/{id}/history` | Yes | Get audit history |
| POST | `/api/payments/{id}/retry` | Yes | Retry failed payment |

### Create Payment

```bash
curl -X POST http://localhost:8081/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "amount": 100.00,
    "currency": "USD",
    "senderAccount": "1234567890",
    "receiverAccount": "0987654321",
    "paymentMethod": "CARD",
    "idempotencyKey": "unique-key-001"
  }'
```

**Response (201):**
```json
{
  "success": true,
  "message": "Payment created",
  "data": {
    "id": 1,
    "idempotencyKey": "unique-key-001",
    "amount": 100.00,
    "currency": "USD",
    "senderAccount": "1234567890",
    "receiverAccount": "0987654321",
    "paymentMethod": "CARD",
    "status": "COMPLETED",
    "failureCode": null,
    "failureMessage": null,
    "retryCount": 0,
    "createdAt": "2026-07-29T10:00:00",
    "updatedAt": "2026-07-29T10:00:01"
  },
  "timestamp": "2026-07-29T10:00:01"
}
```

---

## ❌ Error Codes

All error responses include a machine-readable `errorCode` field.

| Error Code | HTTP Status | Meaning |
|------------|-------------|---------|
| `INVALID_AMOUNT` | 400 | Amount is zero, negative, or invalid |
| `INVALID_ACCOUNT` | 400 | Account format invalid or sender=receiver |
| `INVALID_CURRENCY` | 400 | Currency code is not supported |
| `INVALID_STATUS_TRANSITION` | 400 | Payment transition is not allowed |
| `MAX_RETRY_EXCEEDED` | 400 | Failed payment exceeded retry limit |
| `SINGLE_USER_MODE` | 400 | Registration blocked after first account |
| `AUTHENTICATION_FAILED` | 401 | Invalid credentials or token |
| `PAYMENT_NOT_FOUND` | 404 | Payment ID does not exist |
| `DUPLICATE_RESOURCE` | 409 | Duplicate registration/email |
| `PROCESSING_ERROR` | 500 | Internal processing failure |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

Example error response:
```json
{
  "success": false,
  "message": "Invalid status transition: COMPLETED -> CREATED",
  "errorCode": "INVALID_STATUS_TRANSITION",
  "timestamp": "2026-07-29T12:15:10"
}
```
