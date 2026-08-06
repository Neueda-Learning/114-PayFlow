# 🏃 Future Sprint Plan — PayFlow (Sprint 2)

**Format**: Scrum | **Duration**: 1 week | **Team**: 3 engineers | **Dates**: TBD (after Sprint 1: Jul 29 – Aug 6, 2026)

Continues directly from the "Next sprint" gaps identified in [RISK_AND_COMPLIANCE.md](./RISK_AND_COMPLIANCE.md).

---

## 🎯 Sprint Goal

> Harden PayFlow's security posture and close the highest-priority OWASP Top 10 gaps from Sprint 1, without adding new business features.

---

## 📋 Sprint Backlog

| ID | User Story (short) | Points | Priority | Owner |
|----|---|--------|----------|-------|
| S2-01 | Remove hardcoded JWT/AES secret fallbacks; fail startup if missing | 3 | P0 | Dhruv Sharma |
| S2-02 | Add RBAC (`USER`/`ADMIN` roles + `@PreAuthorize`) | 5 | P0 | Dhruv Sharma |
| S2-03 | Short-lived access tokens + refresh token/revocation store | 8 | P0 | Dhruv Sharma |
| S2-04 | Rate limiting on auth endpoints (anti brute-force) | 5 | P0 | Anu Sree |
| S2-05 | Stricter field validation (IFSC, amount bounds) | 3 | P1 | Anu Sree |
| S2-06 | Structured audit logging (auth + payment events) | 5 | P1 | Anu Sree |
| S2-07 | Lock down Swagger/OpenAPI outside dev profile | 2 | P1 | Chaitanya |
| S2-08 | Add security headers (CSP, HSTS, X-Frame-Options) | 2 | P1 | Chaitanya |
| S2-09 | Add dependency vulnerability scanning to CI | 3 | P1 | Chaitanya |

**Total Points**: 36

---

## ✅ Definition of Done

- Peer-reviewed PR merged; tests added/updated and passing (`./mvnw test`)
- No new secrets committed; docs updated where relevant
- Manually verified in local Docker Compose before marking "Done"

---

## 📅 Ceremonies

Daily standup (15 min) · Mid-sprint backlog refinement · Sprint Review/Demo (final day) · Retrospective (final day)

---

## ⚠️ Key Risk

S2-02 and S2-03 both touch `SecurityConfig`/`JwtUtil` — same owner (Dhruv Sharma) to avoid merge conflicts. Security hardening this sprint means less room for new features — accepted trade-off per Sprint Goal.

**Out of scope**: PCI-DSS/RBI licensing, MFA, SBOM/image signing — deferred to future sprints (see [RISK_AND_COMPLIANCE.md](./RISK_AND_COMPLIANCE.md)).

