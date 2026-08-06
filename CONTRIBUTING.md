# 🤝 Contributing & Developer Guide

Welcome to PayFlow! This document outlines how to navigate the codebase, run tests, and understand team contributions.

## 📁 Project Structure

```
FlowPay/
├── backend/
│   ├── src/main/java/com/flowpay/
│   │   ├── controller/       # REST endpoints
│   │   ├── service/          # Business logic
│   │   ├── repository/       # JPA repositories
│   │   ├── model/            # Entities & enums
│   │   ├── dto/              # Request/Response objects
│   │   ├── config/           # Security, Swagger, CORS
│   │   ├── security/         # JWT filter & utility
│   │   └── exception/        # Custom exceptions & handler
│   ├── src/test/             # Unit tests
│   ├── Dockerfile
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios client & endpoints
│   │   ├── components/       # Navbar, ProtectedRoute
│   │   ├── context/          # AuthContext
│   │   └── pages/            # Login, Register, Dashboard, Payments
│   ├── Dockerfile
│   └── package.json
├── .env                      # Environment config (committed for portability)
├── .github/workflows/ci.yml  # CI pipeline
├── docker-compose.yml        # One-command startup
└── README.md
```

---

## 🧪 Running Tests

To run the Java backend tests:

```bash
cd backend
./mvnw test
```

---

## 👥 Team & Contributions

This project was built as a 1-week Agile Sprint project (July 29 - August 6, 2026) by a team of 3 junior software engineers.

| Member | Role | Commits (incl. merges) |
|--------|------|---------|
| **Dhruv Sharma** | Lead & Backend — setup, Auth, Security, Docker, rollback/search features | 24 commits |
| **Anu Sree** | Backend — Payment APIs, encryption, tests, password-change feature | 9 commits |
| **Chaitanya** | Frontend, UI integration, payment list filters | 7 commits |

### Git History Context

```
initial backend setup, added spring security and jwt (Dhruv Sharma)
login and register api done with jwt working (Anu Sree)
frontend setup done, login register pages added (Chaitanya)
added all payment models and repositories (Dhruv Sharma)
payment service and apis done, added encryption for account details (Anu Sree)
all pages done and connected to backend (Chaitanya)
added docker (Dhruv Sharma)
added tests for auth and payment service (Anu Sree)
Add deterministic failure simulation with automatic rollback and refund logging (Dhruv Sharma)
Add payment search endpoint with status, amount range, and date range filters (Dhruv Sharma)
Add isolated backend password change feature (Anu Sree)
add agile sprint documentation and architectural specs (Dhruv Sharma)
Add amount and date range filters to payment list page (Chaitanya)
Rename com.flowpay to com.payflow, show rollback stages in payment history, add combined Docker image (Dhruv Sharma)
Fix port config to 8081, rollback history display, package rename, add Docker files (Dhruv Sharma)
Allow CORS origin http://localhost:8080 for SSH-tunneled frontend access (Dhruv Sharma)
```

*(Condensed from full `git log`; merge commits and revert/re-apply commits omitted for readability.)*

