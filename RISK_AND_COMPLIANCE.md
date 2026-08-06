# 🛡️ Risk & Compliance Report — PayFlow

> **⚠️ Status: This is a DEMO / academic sprint project — NOT a production-ready payment system.**
> It has not undergone a security audit, penetration test, or regulatory certification. Do not use with real money, real bank account data, or real user PII.

This document maps PayFlow against the **OWASP Top 10 (2021)** and relevant **Indian regulatory/compliance considerations**, documenting what is implemented today, known gaps, and planned mitigations for the next sprint.

---

## 🔟 OWASP Top 10 — Current State & Mitigation Plan

### A01:2021 – Broken Access Control
- **Implemented**: Spring Security with JWT-based stateless auth (`JwtAuthFilter`, [SecurityConfig.java](backend/src/main/java/com/payflow/config/SecurityConfig.java)); `/api/auth/**` and Swagger routes are explicitly `permitAll()`, everything else requires authentication (`.anyRequest().authenticated()`).
- **Gap**: Single-user mode — no role-based access control (RBAC)/ownership checks confirmed at the resource level (e.g., verifying a payment belongs to the requesting user before returning it).
- **Next sprint**: Add per-resource ownership checks and introduce roles (e.g., `USER`, `ADMIN`) with method-level `@PreAuthorize`.

### A02:2021 – Cryptographic Failures
- **Implemented**: Passwords hashed with BCrypt (`PasswordEncoder` bean). Sensitive fields (bank account numbers, IFSC codes) encrypted at rest with AES-256-GCM ([AesEncryptionUtil.java](backend/src/main/java/com/payflow/security/AesEncryptionUtil.java)).
- **Gap**: Both the JWT signing secret and the AES encryption key **fall back to hardcoded default values** ([application.yml](backend/src/main/resources/application.yml#L23), [AesEncryptionUtil.java](backend/src/main/java/com/payflow/security/AesEncryptionUtil.java#L25)) if env vars aren't set. MySQL connection uses `useSSL=false`.
- **Next sprint**: Remove hardcoded fallback secrets entirely (fail startup if not set), enforce TLS on the DB connection, and rotate/inject secrets via a secrets manager (AWS Secrets Manager/Vault) instead of `.env`.

### A03:2021 – Injection
- **Implemented**: Spring Data JPA/Hibernate (parameterized queries) — no raw SQL string concatenation observed. Request DTOs use `@Valid` for input validation ([AuthController.java](backend/src/main/java/com/payflow/controller/AuthController.java#L24), [PaymentController.java](backend/src/main/java/com/payflow/controller/PaymentController.java#L33), etc.).
- **Gap**: Validation coverage across all fields (e.g., IFSC/account number format, amount bounds) hasn't been fully audited.
- **Next sprint**: Add stricter Bean Validation constraints (regex for IFSC, `@Positive`/`@DecimalMax` for amounts) and centralize sanitization for any free-text fields.

### A04:2021 – Insecure Design
- **Implemented**: Idempotency checks and a defined payment state machine (`CREATED → VALIDATED → SENT → COMPLETED/FAILED`) to prevent duplicate/inconsistent transactions; max-3 retry limit.
- **Gap**: No rate limiting on auth endpoints (`/api/auth/login`, `/api/auth/register`) — vulnerable to brute-force/credential stuffing.
- **Next sprint**: Add rate limiting (e.g., Bucket4j) on auth endpoints and account lockout after repeated failed logins.

### A05:2021 – Security Misconfiguration
- **Implemented**: CSRF disabled deliberately (safe for stateless JWT APIs, not cookie-session based). CORS allow-list restricted to known dev origins ([SecurityConfig.java](backend/src/main/java/com/payflow/config/SecurityConfig.java#L66)).
- **Gap**: Swagger UI / OpenAPI docs (`/swagger-ui/**`, `/api-docs/**`) are publicly accessible with no auth — fine for a demo, risky in production. No security headers (CSP, HSTS, X-Frame-Options) configured in Nginx ([nginx.combined.conf](docker/nginx.combined.conf)).
- **Next sprint**: Disable/protect Swagger in non-dev profiles, add standard security headers via Nginx or Spring `HeaderWriterFilter`.

### A06:2021 – Vulnerable and Outdated Components
- **Implemented**: Recent stable versions pinned (Spring Boot 3.3, Java 21, React 18, MySQL 8.0).
- **Gap**: No automated dependency scanning (Dependabot/Snyk/OWASP Dependency-Check) currently wired into CI.
- **Next sprint**: Add a dependency-vulnerability scan step to the CI pipeline.

### A07:2021 – Identification and Authentication Failures
- **Implemented**: JWT expiration configured (`JWT_EXPIRATION`, default 24h); BCrypt password hashing.
- **Gap**: No password complexity policy enforced, no MFA, no refresh-token/token-revocation mechanism (a stolen JWT is valid until expiry).
- **Next sprint**: Add password strength rules, short-lived access tokens + refresh tokens, and a token blacklist/revocation store.

### A08:2021 – Software and Data Integrity Failures
- **Implemented**: Multi-stage Docker builds from official base images (`maven`, `node`, `eclipse-temurin`).
- **Gap**: No image signing/verification, no SBOM generation, no checksum verification of dependencies beyond Maven/npm lockfiles.
- **Next sprint**: Introduce lockfile integrity checks in CI and evaluate image signing for release builds.

### A09:2021 – Security Logging and Monitoring Failures
- **Implemented**: Standard Spring Boot logging; `GlobalExceptionHandler` centralizes error responses.
- **Gap**: No centralized/structured audit logging for security events (failed logins, permission denials), no alerting/monitoring integration.
- **Next sprint**: Add structured audit logs for auth events and payment state changes, ship logs to a central store (e.g., ELK/CloudWatch).

### A10:2021 – Server-Side Request Forgery (SSRF)
- **Implemented**: No outbound requests to user-supplied URLs exist in the current feature set (payments are internal state transitions, not external callouts).
- **Gap**: N/A today — flagged for review if future features (e.g., webhook callbacks, external payment gateway integration) are added.
- **Next sprint**: Apply SSRF protections (URL allow-listing) if/when outbound webhook integrations are introduced.

---

## 🇮🇳 Indian Regulatory & Compliance Considerations

**This section documents awareness, not certification.** PayFlow is a learning-sprint project and has **not** been assessed against any of the following in a formal/legal sense.

### Considered (conceptually, not fully implemented)
- **RBI Data Localization (Storage of Payment System Data, 2018 circular)** — real payment systems in India must store transaction data only within India. Our current setup (Dockerized MySQL) is architecturally compatible with in-country hosting, but **no actual data residency controls or hosting compliance have been verified**.
- **DPDP Act, 2023 (Digital Personal Data Protection Act)** — we are conceptually aware that user PII (names, bank details) would require a lawful basis for processing, breach notification, and a documented retention/deletion policy in production. We encrypt bank account/IFSC fields at rest as a basic control aligned with this principle.
- **RBI Guidelines on Payment Aggregators/Gateways** — concepts like transaction idempotency, audit trails, and reconciliation (which we do implement functionally) are inspired by real-world RBI expectations for payment systems, but this project does not seek or claim PA/PG authorization.

### Explicitly NOT Considered / Out of Scope
- **PCI-DSS compliance** — no real card data is processed or stored; if card payments were ever added, full PCI-DSS scope would apply and does not today.
- **RBI licensing (Payment Aggregator/PPI/etc.)** — PayFlow does not hold, and does not need, any RBI authorization since it processes no real money.
- **KYC/AML (Prevention of Money Laundering Act) obligations** — no identity verification, sanctions screening, or transaction monitoring for money laundering is implemented.
- **CERT-In incident reporting requirements** — no incident response/reporting process has been built, since this isn't a live production system handling real user data.
- **Data localization enforcement** — no verification of actual server/database physical location has been done; this is a local Docker/dev deployment.

### Why This Is Acceptable for a Demo
PayFlow's purpose is to demonstrate **application architecture, payment state-machine logic, and secure coding practices** within a 1-week Agile sprint — not to operate as a licensed financial product. All compliance items above are noted so that anyone evaluating this project (or extending it toward production) has a clear, honest checklist of what remains before it could be considered for real-world deployment.

---

## ✅ Summary

| Category | Status |
|---|---|
| OWASP Top 10 baseline controls | Partially implemented, gaps tracked above |
| Encryption of sensitive fields | Implemented (AES-256-GCM), key management needs hardening |
| Rate limiting / brute-force protection | Not implemented — planned next sprint |
| Indian financial/data regulations | Conceptually considered only — no certification, no legal compliance claimed |
| Production readiness | **Not production-ready** — demo/academic project only |
