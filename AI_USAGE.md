# 🤖 GenAI Usage Report — PayFlow

This document records how Generative AI (GitHub Copilot / Copilot Chat) was used during our 1-week Agile Sprint (July 29 – August 6, 2026), mapped against our sprint ceremonies. The goal is transparency: what AI assisted with, what remained human-driven, and the measurable efficiency gained — without the team becoming dependent on it for design decisions, code correctness, or review judgment.

---

## 🎯 Guiding Principle

> AI was treated as a **pair-programmer / accelerator**, not a decision-maker.

Every AI-assisted change went through the same Agile quality gates as human-written code: sprint backlog ticket → implementation → self/peer review → test run → commit. No AI output was merged without a team member validating logic, security, and test coverage first.

---

## 🗓️ Usage Mapped to Sprint Ceremonies

### 1. Sprint Planning & Backlog Grooming
- Used AI to quickly **summarize acceptance criteria** into checklists and to draft initial user-story breakdowns (e.g., splitting "Payment Lifecycle" epic into CRUD, state machine, retry/rollback sub-tasks).
- **Not used for**: prioritization or scope decisions — those remained a team/Product Owner call based on business value.

### 2. Daily Development (Sprint Execution)
| Task | AI Involvement | Human Ownership |
|---|---|---|
| Boilerplate (DTOs, repositories, config classes) | AI-generated first draft | Reviewed field types, validation, naming against our schema |
| Spring Security / JWT config | AI suggested filter chain structure | Team verified auth rules, CORS origins, and endpoint permissions manually |
| React components & Axios API layer | AI scaffolded component structure | Team wired up real state management, styling, and edge cases |
| Debugging (Docker networking, CORS, SSH tunneling) | AI helped diagnose root cause (e.g., port mapping mismatch, missing CORS origin) | Team applied fixes, rebuilt containers, and verified via `curl`/browser before considering it resolved |
| Unit/Integration tests | AI suggested test case skeletons | Team wrote actual assertions and business-logic edge cases |

### 3. Code Review
- AI was used to get a **first-pass explanation** of unfamiliar error stack traces (e.g., Hikari connection issues, CORS preflight failures) to speed up triage.
- All actual code review, approval, and merge decisions were done by teammates — AI was never a reviewer of record.

### 4. Sprint Review / Demo Prep
- AI assisted in drafting documentation structure (README sections, this usage report) for readability.
- Final content, accuracy of claims, and demo script were authored/verified by the team.

### 5. Retrospective
- Team reflected on where AI **saved time** (boilerplate, config scaffolding, error triage) vs. where it added **no value or required correction** (business-specific state machine rules, security policy specifics), to calibrate usage for future sprints.

---

## ⏱️ Efficiency Gained

- Reduced time spent on repetitive boilerplate (entities, DTOs, controller skeletons), freeing time for the payment state-machine and retry/rollback logic — the actual complex, business-critical part of the sprint.
- Faster root-cause identification for infrastructure issues (Docker port mapping, CORS misconfiguration) — turned multi-hour debugging into a shorter, guided investigation.
- Helped keep documentation (`ARCHITECTURE.md`, `WORKFLOWS.md`, `API_REFERENCE.md`) consistent in structure across a 1-week timeline with limited resourcing.

## 🚫 Where We Deliberately Did NOT Rely on AI

- **Business logic correctness** (payment state transitions, idempotency rules, rollback conditions) — designed and verified by the team.
- **Security-sensitive decisions** (JWT secret handling, password hashing strategy, CORS allow-list contents) — every AI suggestion here was manually cross-checked against OWASP-style concerns before being accepted.
- **Final test validation** — all AI-suggested code had to pass the existing Maven/JUnit test suite (see `backend/target/surefire-reports/`) and manual smoke-testing before being committed.
- **Architectural decisions** — service boundaries, database schema, and deployment topology (`docker-compose.yml`, Dockerfile strategy) were designed by the team; AI was only used to validate/explain, not originate, these decisions.

---

## ✅ Summary

AI usage in PayFlow was **targeted and supervised**: it accelerated repetitive/boilerplate work and sped up debugging, while all core business logic, security decisions, and final validation remained fully owned by the team — consistent with responsible AI-assisted development inside an Agile workflow.
