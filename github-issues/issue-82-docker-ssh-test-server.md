# GitHub Issue #82: Docker-based SSH/SFTP Test Server (Option C)

**Title**: Add Docker-based SSH/SFTP test server for integration/E2E
**Type**: Feature Request
**Parent**: Issue #74 - Functional/Blackbox Testing
**Priority**: P1 - High
**Epic**: Issue #76 - Functional/Blackbox Testing Infrastructure
**Status**: Open
**Created**: December 14, 2025
**Target**: v2.0 testing pipeline

---

## 📋 Description
Implement a realistic SSH/SFTP test target using Docker so integration and future protocol tests run against a real OpenSSH server instead of mocked skips. This enables command execution, SFTP, permissions, and concurrency scenarios aligned with production behavior.

---

## 🎯 Goals
- [ ] Provide repeatable Dockerized SSH/SFTP server (LinuxServer OpenSSH)
- [ ] Standardize test credentials/ports for CI and local
- [ ] npm scripts for start/stop/status and integration test run
- [ ] Update integration tests to run against the Docker server (no skips when server is up)
- [ ] Document workflow in TESTING-GUIDE and README

---

## 🛠️ Implementation Plan
1) **Container setup**
   - Image: `ghcr.io/linuxserver/openssh-server:latest`
   - Container name: `quantumxfer-ssh-test`
   - Port: host 2222 -> container 2222
   - User: `testuser` / `testpass`
   - Env: `PASSWORD_ACCESS=true`, `USER_NAME`, `USER_PASSWORD`, `PUID=1000`, `PGID=1000`, `TZ=UTC`
   - Volume: ephemeral; data lives in container for tests

2) **Tooling**
   - Node helper script `tests/scripts/ssh-test-server.js` with `start|stop|status`
   - npm scripts: `test:ssh-up`, `test:ssh-down`, `test:integration:ssh`

3) **Tests**
   - Keep early-return guard for non-Docker runs, but document Docker profile to enforce server availability
   - Add wait/retry for server readiness in the helper

4) **Docs**
   - Add workflow to TESTING-GUIDE and README (local + CI)

---

## ✅ Interim Updates
- 2025-12-14: Created issue and plan.
- 2025-12-14: Added Docker helper (`tests/scripts/ssh-test-server.js`), npm scripts (`test:ssh-up`, `test:ssh-down`, `test:integration:ssh`), and documented workflow in TESTING-GUIDE. Next: wire integration tests to enforce Docker profile in CI and add readiness wait if needed.

---

## 📅 Milestones
- Docker helper + npm scripts: Dec 15, 2025
- Tests running against container locally: Dec 16, 2025
- CI job using container: Dec 18, 2025

---

## 🔗 References
- Issue #76: Functional/Blackbox Testing Infrastructure
- TESTING-GUIDE.md
- tests/integration/*.test.js
