# 🔄 Workflows & State Machines

This document outlines the core business logic, lifecycle states, and security flows in PayFlow.

## 🔐 Authentication Flow

Stateless JWT authentication handles all secure access.

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as MySQL

    U->>F: Enter credentials
    F->>B: POST /api/auth/login
    B->>DB: Verify user
    DB-->>B: User data
    B->>B: Generate JWT
    B-->>F: JWT + user info
    F->>F: Store in localStorage
    F->>B: GET /api/payments (Bearer token)
    B->>B: Validate JWT
    B-->>F: Payment data
```

---

## 🔄 Payment Lifecycle

A strict state machine governs all payments.

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> VALIDATED: Validation passes
    VALIDATED --> SENT: Transmitted to destination system
    SENT --> COMPLETED: Success (70%)
    SENT --> FAILED: Failure (30%)
    FAILED --> CREATED: Retry (max 3)
    COMPLETED --> [*]
```

---

## 🔁 Retry Flow

Handling transient failures with a capped retry mechanism.

```mermaid
flowchart TD
    A[Payment FAILED] --> B{Retry count < 3?}
    B -->|Yes| C[Reset to CREATED]
    C --> D[Re-validate]
    D --> E[Re-process]
    E --> F{Success?}
    F -->|Yes| G[COMPLETED]
    F -->|No| H[FAILED again]
    H --> A
    B -->|No| I[Max retries reached - reject]
```

---

## 🔄 Rollback Flow

Ensuring data consistency via Spring `@Transactional`.

```mermaid
flowchart TD
    A[Create Payment] --> B[Begin Transaction]
    B --> C[Validate Payment]
    C --> D[Process Payment]
    D --> E{Processing OK?}
    E -->|Yes| F[Commit - COMPLETED]
    E -->|No| G[Save FAILED status + reason]
    G --> H[Commit failure record]
    C -->|Validation fails| I[Rollback transaction]
    I --> J[Throw exception]
```
