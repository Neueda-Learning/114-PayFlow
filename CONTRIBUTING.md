# 🤝 Contributing & Developer Guide

Welcome to FlowPay! This document outlines how to navigate the codebase, run tests, and understand team contributions.

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

| Member | Role | Commits |
|--------|------|---------|
| **Member A** | Backend setup, Auth, Security | 5 commits |
| **Member B** | Payment APIs, Business Logic, Tests | 6 commits |
| **Member C** | Frontend, Docker, CI/CD, Docs | 6 commits |

### Git History Context

```
feat: init Spring Boot project with MySQL (Member A)
feat: add JWT auth + BCrypt password encoder (Member A)
feat: configure Spring Security, role-based access (Member A)
feat: user registration & login REST APIs (Member A)
fix: auth token expiration bug (Member A)
feat: create Payment entity, enums & JPA repo (Member B)
feat: payment CRUD endpoints + validation (Member B)
feat: simulate processing, random success/failure (Member B)
feat: retry endpoint + max-3 logic, rollback handling (Member B)
feat: audit-trail entity + history tracking (Member B)
test: service layer unit tests (~65% coverage) (Member B)
feat: scaffold React + Vite + Tailwind (Member C)
feat: login/register UI + auth context (Member C)
feat: dashboard, create-payment form, list page (Member C)
chore: Dockerfiles + docker-compose.yml (Member C)
ci: GitHub Actions workflow (build, test, docker) (Member C)
docs: README, mermaid diagrams, API tables (Member C)
```
