# PayFlow 💸

A full-stack payment processing system built as a 1-week Agile Sprint project (July 29 - August 6, 2026).

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-green)
![React](https://img.shields.io/badge/React-18-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

---

## 📚 Documentation

To ensure clarity and maintainability, our documentation is structured into the following files:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: High-level System Design, Database Schema, and CI/CD pipelines.
- **[WORKFLOWS.md](./WORKFLOWS.md)**: Payment lifecycle state machines, retry/rollback logic, and authentication flows.
- **[API_REFERENCE.md](./API_REFERENCE.md)**: Full REST API contract, endpoints, payload examples, and error codes.
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Developer onboarding, project directory structure, team breakdown, and test execution.
- **[AI_USAGE.md](./AI_USAGE.md)**: How Generative AI was used during our Agile sprint, and where the team deliberately relied on human judgment instead.
- **[RISK_AND_COMPLIANCE.md](./RISK_AND_COMPLIANCE.md)**: OWASP Top 10 mapping, current mitigations, next-sprint security plans, and Indian regulatory considerations (demo-only disclaimer).
- **[FUTURE_SPRINT_PLAN.md](./FUTURE_SPRINT_PLAN.md)**: Sprint 2 backlog in Scrum format — user stories, story points, DoD, and ceremony schedule for upcoming security hardening work.

---

## 📋 Core Features

- **User Authentication** — JWT login with single-user mode.
- **Payment CRUD** — Create, read, list, and search payments.
- **State Machine** — CREATED → VALIDATED → SENT → COMPLETED/FAILED.
- **Idempotency & Retries** — Duplicate detection and auto-retries (max 3).
- **Audit Trail & Rollbacks** — Full history of status changes and transactional rollbacks via Spring `@Transactional`.
- **Dockerized** — One command to spin up the React frontend, Spring backend, and MySQL database.

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Run everything (one command)

```bash
git clone https://github.com/Neueda-Learning/114-PayFlow.git
cd 114-PayFlow
docker compose up --build
```

That's it! Open:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8081/api
- **Swagger UI**: http://localhost:3000/swagger-ui/index.html

### Stop & Reset

```bash
# Stop containers
docker compose down

# Reset database entirely
docker compose down -v
docker compose up --build
```

---

## 🔮 Future Improvements

- [ ] Email notifications on payment status change
- [ ] Admin dashboard with analytics
- [ ] Payment search by date range
- [ ] Export payments to CSV
- [ ] Pagination for payment list
- [ ] Real payment gateway integration (Stripe/Razorpay)
- [ ] Password reset flow
- [ ] Rate limiting on API endpoints

---

## 📄 License

This project was built for educational purposes as part of a Software Engineering sprint exercise.
