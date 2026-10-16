# PatchPilot Demo & Evaluation Guide

This guide provides a rapid 3-minute walkthrough for hackathon judges and evaluators reviewing **PatchPilot** for **WeMakeDevs Graph Hacks (Track 01: Agents That Act on Connected Data)**.

---

## 1. Quick Setup

### Option A: Docker Compose (All-in-One)
```bash
cd patchpilot
docker compose up -d
```
- Frontend: `http://localhost:5173`
- Backend API Docs: `http://localhost:8000/docs`
- FalkorDB: `localhost:6379`

### Option B: Local Dev Setup
```bash
# 1. Start FalkorDB
docker run -p 6379:6379 -it --rm falkordb/falkordb:latest

# 2. Start Backend
cd patchpilot/backend
./venv/bin/uvicorn app.main:app --reload --port 8000

# 3. Start Frontend
cd patchpilot/frontend
npm run dev
```

---

## 2. Core Demo Scenarios

### Scenario 1: High CVSS vs. Low Blast Radius (False Urgency Debunked)
- **Target CVE**: `CVE-2023-38606`
- **CVSS Score**: 8.8 (High)
- **Triage Result**: **LOW Priority (Score: 28/100)**
- **Why connected data matters**:
  - The vulnerable library is isolated in an internal offline build tool.
  - Zero internet exposure (`exposure: isolated`), non-production asset (`environment: dev`).
  - Traditional scanners alert on CVSS 8.8 and interrupt engineering on-call.
  - PatchPilot's FalkorDB traversal proves zero production reachability.

### Scenario 2: Moderate CVSS with Critical Transitive Blast Radius (Log4Shell Style)
- **Target CVE**: `CVE-2021-44228` (Log4Shell)
- **CVSS Score**: 10.0 (Critical)
- **Triage Result**: **CRITICAL Priority (Score: 98/100)**
- **Why connected data matters**:
  - `log4j-core` is NOT imported directly by the main application!
  - It is pulled transitively: `payment-gateway` -> `spring-boot-starter-log4j2` -> `log4j-core`.
  - The application is deployed to `k8s-prod-payment-cluster` (`criticality: tier_1`, `exposure: public`).
  - Active wild exploit exists (`has_exploit: true`).
  - PatchPilot generates the multi-hop path visual evidence, identifies `Payments Core Team` on-call, and automatically formulates an atomic upgrade plan to `v2.17.1`.

### Scenario 3: Autonomous Remediation Dispatch
1. In the **Investigate** view, click **"Remediate"**.
2. Select remediation type:
   - `Upgrade vulnerable package` (recommended target version pre-populated from graph)
   - `Apply WAF / network rule` (virtual patch while release pipeline runs)
   - `Isolate affected asset`
3. Click **"Dispatch Action Plan"**.
4. Navigate to the **Remediations** tab to see the real-time lifecycle status persisted directly in FalkorDB.

---

## 3. Interactive Dependency Graph Canvas
1. Click **"Dependency Graph"** in the sidebar.
2. Select any vulnerability from the top selector.
3. The interactive canvas displays:
   - Vulnerability nodes (Red)
   - Affected Package nodes (Blue)
   - Impacted Applications (Green)
   - Runtime Infrastructure Assets (Purple)
   - Responsible Teams (Orange)
4. Click on any node to view real-time properties and relationships in the inspector pane.

---

## 4. Verification & Testing

To run the automated test suite verifying graph queries, prioritization algorithms, and agent fallback:

```bash
cd patchpilot/backend
./venv/bin/pytest -v
```
All 45 test cases test FalkorDB integration, scoring formulas, transitives, and API routes.
