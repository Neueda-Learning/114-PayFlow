# 🏛️ Architecture & System Design

## Overview
FlowPay is built using a modern, scalable architecture splitting the frontend and backend into distinct layers, communicating via RESTful APIs.

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        UI[React Pages]
        CTX[Auth Context]
        API[Axios API Client]
    end

    subgraph Backend["Backend (Spring Boot)"]
        CTRL[REST Controllers]
        SVC[Service Layer]
        SEC[Spring Security + JWT]
        REPO[JPA Repositories]
    end

    subgraph Database["Database"]
        DB[(MySQL 8.0)]
    end

    UI --> CTX --> API
    API -->|HTTP + JWT| SEC
    SEC --> CTRL --> SVC --> REPO --> DB
```

---

## 🗄️ Database Schema

The database relies on MySQL 8.0 with JPA/Hibernate managing the entities.

```mermaid
erDiagram
    USERS ||--o{ PAYMENTS : creates
    PAYMENTS ||--o{ PAYMENT_HISTORY : has

    USERS {
        bigint id PK
        varchar email UK
        varchar password
        varchar full_name
        enum role
        datetime created_at
    }

    PAYMENTS {
        bigint id PK
        varchar idempotency_key UK
        decimal amount
        varchar currency
        varchar sender_account
        varchar receiver_account
        enum payment_method
        enum status
        varchar failure_code
        varchar failure_message
        int retry_count
        bigint user_id FK
        datetime created_at
        datetime updated_at
    }

    PAYMENT_HISTORY {
        bigint id PK
        bigint payment_id FK
        enum old_status
        enum new_status
        varchar reason
      varchar triggered_by
      enum trigger_type
        datetime timestamp
    }
```

---

## 🚀 CI Pipeline

Automated checks and deployments via GitHub Actions.

```mermaid
flowchart LR
    A[Push to main] --> B[Build Backend]
    B --> C[Run Unit Tests]
    A --> D[Build Frontend]
    C --> E[Docker Build]
    D --> E
```
