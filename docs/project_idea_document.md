# PROJECT IDEA DOCUMENT (PID)

## PatchPilot: Graph-Powered Vulnerability Triage and Remediation Agent

**Hackathon:** WeMakeDevs Graph Hacks: Context for AI Agents  
**Track:** Track 01 — Agents That Act on Connected Data  
**Technology Partner:** FalkorDB  
**Team Size:** 2 members  
**Project Status:** Proposed implementation  
**Planned Development Period:** October 16–18, 2026  
**Document Type:** Project Idea Document

---

## 1. Abstract

Modern software applications rely on interconnected packages, libraries, services, infrastructure assets, and development teams. A vulnerability identified in one software component may affect multiple applications and critical assets through direct and indirect dependencies. However, security findings are often examined individually, making it difficult to determine which vulnerabilities deserve immediate attention and why.

PatchPilot is a graph-powered AI vulnerability triage agent designed to investigate security findings using connected software dependency data. It uses FalkorDB as its primary graph database to connect vulnerabilities, packages, applications, deployed assets, responsible teams, and remediation actions.

When a vulnerability is selected, PatchPilot traverses the dependency graph to identify affected applications and assets, evaluates their importance using transparent prioritization rules, and generates an evidence-backed remediation recommendation. It also records proposed actions and their supporting evidence for future inspection.

Unlike a conventional chatbot that generates recommendations from isolated text, PatchPilot uses graph traversal results as a central input to its decisions. Its primary objective is to make vulnerability prioritization more context-aware, explainable, and reproducible.

The prototype will use a controlled synthetic software environment containing known vulnerabilities and predefined dependency relationships. Its results will be evaluated against expected affected assets, remediation priorities, and evidence paths.

## 2. Problem Statement

Software projects frequently depend on numerous direct and indirect packages. A vulnerability in a shared dependency may affect several applications, including applications that developers do not immediately associate with the vulnerable component.

Security teams must determine:

- Which applications and assets are affected by a particular vulnerability?
- How does the vulnerability propagate through the dependency structure?
- Which affected assets have the greatest operational importance?
- Which team is responsible for addressing the issue?
- Which available evidence supports the recommended remediation?
- How can the resulting decision and action be audited?

A conventional vulnerability list may identify vulnerable packages and severity ratings, but it does not necessarily provide the complete relationship context required for effective prioritization.

PatchPilot addresses this problem by representing the software environment as a graph and allowing an AI agent to investigate connected entities before recommending an action.

**Problem statement:** How can a graph-powered AI agent use multi-hop dependency reasoning and connected asset context to prioritize software vulnerabilities, identify their potential impact, and produce explainable remediation recommendations?

## 3. Proposed Solution

PatchPilot will provide an interactive interface through which a user can select a vulnerability and initiate an investigation.

The system will use FalkorDB to retrieve connected information about vulnerable packages, dependent packages, applications, assets, and responsible teams. A bounded set of graph tools will expose this information to the agent.

The agent will combine graph evidence with deterministic prioritization rules to produce a structured investigation result. The interface will display the affected entities, the dependency path, the reason for the assigned priority, and the proposed remediation.

For the prototype, remediation will be simulated. The agent will create a remediation record in FalkorDB rather than modifying real software, infrastructure, or production systems.

### Example scenario

Suppose a synthetic security finding identifies a vulnerable package named `lib-example`.

The graph shows that:

1. A shared package depends on `lib-example`.
2. A payment application indirectly depends on the shared package.
3. The payment application is deployed on a high-criticality asset.
4. Another application also depends on the vulnerable package but runs on a lower-criticality asset.
5. The applications have different responsible teams.

PatchPilot traverses these relationships, compares the potential impact, and recommends prioritizing the vulnerability affecting the more critical asset.

The interface displays the graph path and the evidence used to justify the recommendation. If the available information is insufficient, the agent identifies the missing evidence rather than inventing a confirmed impact.

## 4. Project Objectives

The primary objectives are:

1. Build a working AI agent for vulnerability triage and remediation prioritization.
2. Integrate FalkorDB as the primary graph database.
3. Represent software dependencies, vulnerabilities, applications, assets, teams, and remediation records as connected graph entities.
4. Implement multi-hop Cypher queries to identify affected applications and assets.
5. Provide graph-based tools that the agent can select and invoke with validated parameters.
6. Apply transparent prioritization rules using vulnerability severity, asset criticality, dependency reach, and available exposure evidence.
7. Generate explanations containing the actual graph paths and supporting evidence.
8. Persist investigation results and simulated remediation actions in FalkorDB.
9. Build a dashboard for exploring vulnerabilities, graph relationships, priorities, and recommendations.
10. Evaluate the system using reproducible synthetic test cases.

## 5. Scope of the Project

### 5.1 In scope

- Synthetic software inventory and dependency data.
- Vulnerability-to-package relationships.
- Direct and indirect dependency traversal.
- Application and asset impact analysis.
- Team ownership lookup.
- Evidence-backed prioritization.
- Agent tool selection and execution.
- Persistent investigation and remediation records.
- Interactive graph visualization.
- Reproducible tests and setup instructions.

### 5.2 Out of scope

- Scanning arbitrary production infrastructure.
- Exploiting vulnerabilities or conducting penetration tests.
- Automatically patching packages or deploying software changes.
- Guaranteed detection of real-world exploitability.
- Enterprise-scale ingestion pipelines.
- A large multi-agent architecture.
- Claims of production-grade security or measured performance without supporting tests.

This limited scope is intentional. It allows the team to demonstrate the central graph reasoning capability within the hackathon period.

## 6. System Architecture

The system will consist of four principal components.

### 6.1 Frontend

**Proposed technology:** React, Vite, and a graph visualization library.

The frontend will provide:

- A vulnerability selection panel.
- An investigation trigger.
- An affected-asset and application view.
- An interactive dependency graph.
- A remediation priority and explanation panel.
- A record of previous investigations and proposed actions.

The interface will highlight the path supporting the current recommendation rather than displaying unrelated graph data.

### 6.2 Backend and Agent

**Proposed technology:** Python and FastAPI.

The backend will expose APIs for retrieving vulnerabilities, running investigations, retrieving evidence, and recording simulated remediation actions.

The agent will use a constrained set of tools, such as:

- `get_vulnerability_details`
- `trace_affected_applications`
- `analyze_asset_impact`
- `get_responsible_team`
- `get_remediation_options`
- `record_remediation_action`

Each tool will validate its inputs and execute predefined graph operations. The language model may select tools and synthesize the returned evidence, but it will not be trusted to invent graph relationships or independently assign unsupported facts.

### 6.3 Graph Database

**Primary database:** FalkorDB.

FalkorDB will store the connected software environment, support Cypher-based traversal, and retain investigation and remediation records.

It is central to the proposed system because the agent must discover indirect dependencies and connected impact paths that cannot be established reliably from an isolated vulnerability record.

### 6.4 Prioritization Engine

A deterministic prioritization component will evaluate the evidence returned by graph queries.

It will consider:

- Available vulnerability severity information.
- Criticality of affected assets.
- Number and importance of affected applications.
- Dependency depth and reach.
- Explicitly available exposure information.
- Completeness and reliability of supporting evidence.

The system will use a documented scoring rule and display the factors contributing to each recommendation. Missing evidence will be marked as unknown instead of being silently treated as a confirmed fact.

## 7. Graph Data Model

The proposed graph will contain the following node types.

| Node | Purpose | Example properties |
|---|---|---|
| `Vulnerability` | Represents a security issue | `id`, `severity`, `description` |
| `Package` | Represents a software package | `name`, `version`, `ecosystem` |
| `Application` | Represents a software application | `id`, `name`, `environment` |
| `Asset` | Represents a deployed or logical asset | `id`, `name`, `criticality` |
| `Team` | Represents the responsible team | `id`, `name` |
| `Finding` | Represents a detected security finding | `id`, `status`, `source` |
| `Investigation` | Records an investigation | `id`, `created_at`, `status` |
| `Remediation` | Records a proposed action | `id`, `action_type`, `status` |

### 7.1 Relationships

- `(:Vulnerability)-[:AFFECTS]->(:Package)`
- `(:Package)-[:DEPENDS_ON]->(:Package)`
- `(:Application)-[:USES]->(:Package)`
- `(:Application)-[:DEPLOYED_AS]->(:Asset)`
- `(:Application)-[:OWNED_BY]->(:Team)`
- `(:Finding)-[:IDENTIFIES]->(:Vulnerability)`
- `(:Investigation)-[:INVESTIGATES]->(:Vulnerability)`
- `(:Investigation)-[:FINDS]->(:Asset)`
- `(:Remediation)-[:ADDRESSES]->(:Finding)`
- `(:Remediation)-[:PROPOSED_FOR]->(:Team)`

Additional relationships may be introduced if they are required by the implemented scenarios.

The direction of dependency edges will be documented explicitly. For example, if package A depends on package B, the graph will contain an edge from A to B. Queries investigating reverse dependency impact must therefore traverse incoming dependency edges from the vulnerable package toward dependent packages.

## 8. Graph-Based Reasoning and Cypher Queries

The project will depend on real Cypher queries rather than a graph that is used only for visualization.

### 8.1 Vulnerability impact traversal

The primary query will:

1. Identify the package affected by a vulnerability.
2. Traverse reverse dependency relationships to find dependent packages.
3. Identify applications using the affected packages.
4. Connect applications to their deployed assets.
5. Retrieve asset criticality and responsible teams.
6. Return the relevant nodes and relationships for explanation.

The traversal depth will be bounded to prevent excessive exploration and to keep the demo predictable.

### 8.2 Candidate remediation ranking

The system will combine graph-derived impact information with a transparent scoring rule.

An illustrative scoring model is:

**Priority score = severity contribution + asset-criticality contribution + dependency-reach contribution + exposure contribution.**

Each component will have documented weights and a defined range. The final implementation will specify the exact formula and normalization method.

The score is a project-specific prioritization heuristic, not a replacement for an established security risk assessment.

### 8.3 Evidence-path retrieval

The system will return the actual dependency path connecting a vulnerability to an affected application or asset. The frontend will display this path and associate the recommendation with the corresponding evidence.

### 8.4 Action persistence

When the user approves a simulated remediation, the backend will create a remediation record in FalkorDB, including its target finding, recommended action, status, timestamp, and supporting investigation reference.

The implementation will retain enough information to reproduce why the recommendation was generated.

## 9. Agent Workflow

The intended workflow is:

1. **Input:** The user selects a vulnerability or finding.
2. **Context retrieval:** The agent requests vulnerability details from the graph.
3. **Tool selection:** The agent selects an appropriate approved graph tool.
4. **Graph traversal:** FalkorDB returns connected dependency and impact information.
5. **Evidence analysis:** The backend checks whether the required evidence is present.
6. **Prioritization:** The deterministic engine ranks the affected assets or remediation candidates.
7. **Explanation:** The agent produces a structured explanation referencing the retrieved evidence.
8. **User review:** The interface displays the proposed remediation and its supporting path.
9. **Action:** After approval, the backend records a simulated remediation action in FalkorDB.
10. **Audit:** The user can inspect the stored investigation and action record.

The agent must distinguish a plausible candidate cause or risk from a verified fact. It must not claim that a package is exploitable merely because a dependency relationship exists.

## 10. Technology Stack

| Component | Proposed technology |
|---|---|
| Frontend | React and Vite |
| Styling | CSS or a lightweight component library |
| Graph visualization | React-compatible graph visualization library |
| Backend | Python and FastAPI |
| Graph database | FalkorDB |
| Graph query language | Cypher |
| Database client | Official FalkorDB Python client |
| Agent reasoning | An LLM with constrained tool calling |
| Prioritization | Python-based deterministic scoring |
| API communication | HTTP and JSON |
| Version control | Git and GitHub |
| Deployment | A suitable hosted backend and frontend, subject to compatibility |
| Testing | Pytest and reproducible synthetic test fixtures |

The language model provider will be selected based on available access, reliability, and setup time. The project should retain a deterministic investigation path so that a missing API key or model service does not make the core demonstration impossible.

## 11. Implementation Plan

### Phase 1: Graph foundation

- Set up FalkorDB.
- Create the initial graph schema.
- Prepare synthetic package, vulnerability, application, asset, and team records.
- Load the data into the graph.
- Implement and test the primary impact traversal.

**Deliverable:** A verified query that returns the expected affected applications, assets, and dependency paths.

### Phase 2: Agent and prioritization

- Build the FastAPI service.
- Connect the backend to FalkorDB.
- Implement the approved graph-tool catalogue.
- Add deterministic prioritization.
- Generate structured evidence-backed investigation results.
- Persist investigations and remediation actions.

**Deliverable:** A working backend that investigates a vulnerability and produces a reproducible recommendation.

### Phase 3: Frontend integration

- Build the vulnerability selection interface.
- Connect the frontend to the backend APIs.
- Display affected applications and assets.
- Visualize the relevant graph path.
- Show priority factors and recommended actions.
- Add the simulated remediation workflow.

**Deliverable:** A complete end-to-end demonstration.

### Phase 4: Testing and submission

- Test known vulnerability scenarios.
- Test indirect dependencies and multiple affected applications.
- Test incomplete evidence and unknown ownership.
- Verify that simulated remediation records persist.
- Test the project from a clean setup.
- Complete documentation and record the demo video.
- Submit the public repository and project details.

The team will implement the graph, backend, and frontend in parallel where possible, using a shared API contract.

## 12. Team Responsibilities

### Team Member 1: Graph and Backend

Responsibilities:

- FalkorDB setup and connection.
- Graph schema and synthetic data.
- Cypher queries and dependency traversal.
- FastAPI endpoints.
- Agent tool execution.
- Prioritization and remediation persistence.
- Backend testing.

### Team Member 2: Frontend and Integration

Responsibilities:

- React application setup.
- Dashboard and vulnerability selection.
- Graph visualization.
- Evidence and recommendation panels.
- API integration.
- Deployment configuration.
- README, screenshots, and demo video.

Both members will review the graph model, primary queries, architecture, and final demonstration so that either member can explain the core technical decisions.

## 13. Testing and Evaluation

The prototype will be evaluated using a small set of predefined synthetic scenarios.

| Test case | Expected result |
|---|---|
| Vulnerability in a directly used package | Directly affected application is identified |
| Vulnerability in a transitive dependency | Reverse traversal identifies the dependent application |
| One vulnerability affects multiple assets | All expected assets are returned |
| Assets have different criticality | Priority reflects the documented scoring rules |
| Ownership is available | Correct responsible team is identified |
| Ownership is missing | Missing ownership is reported explicitly |
| Evidence is insufficient | The system avoids unsupported conclusions |
| Remediation is approved | A persistent action record is created |
| Investigation is repeated | Results are reproducible for unchanged input data |

### Evaluation metrics

- **Affected-asset recall:** Fraction of expected affected assets identified.
- **Affected-asset precision:** Fraction of identified assets that are expected to be affected under the test graph.
- **Priority agreement:** Agreement between the system's ranking and the predefined expected ranking.
- **Evidence-path validity:** Whether the displayed path exists in FalkorDB and supports the stated relationship.
- **Action persistence:** Whether the simulated remediation record can be retrieved after creation.
- **Reproducibility:** Whether the same graph state and inputs produce consistent prioritization results.

Results will be reported only after the corresponding tests have been executed. No performance or accuracy figures are assumed in advance.

## 14. Risks and Mitigation

| Risk | Mitigation |
|---|---|
| FalkorDB setup or connection problems | Validate the database and a basic Cypher query before building the agent |
| Incorrect dependency traversal | Document edge direction and test known multi-hop paths |
| LLM produces unsupported conclusions | Ground explanations in returned evidence and validate structured output |
| API integration delays | Agree on request and response schemas early |
| Excessive feature scope | Prioritize the core end-to-end investigation workflow |
| External model API becomes unavailable | Keep graph queries and deterministic scoring independently testable |
| Deployment fails near the deadline | Maintain a reproducible local setup and prepare the demo early |
| Risk score is misunderstood | Document the scoring formula and its limitations |
| Destructive actions create security concerns | Use simulated remediation only |

## 15. Expected Deliverables

The final submission is expected to contain:

1. A public source-code repository.
2. A working FalkorDB-backed vulnerability investigation agent.
3. A documented graph schema and relationship model.
4. The Cypher queries on which the product depends.
5. Synthetic data and reproducible investigation scenarios.
6. A frontend demonstrating vulnerability selection, graph traversal, evidence, and remediation.
7. Backend APIs and setup instructions.
8. Automated or repeatable tests.
9. A demonstration video showing the working implementation.
10. A documented live deployment or complete local setup instructions.
11. An explanation of the use of AI coding assistants, as required by the hackathon rules.

## 16. Demonstration Plan

The demonstration will use one carefully prepared vulnerability scenario.

**Step 1 — Select a vulnerability**

The user selects a synthetic security finding from the dashboard.

**Step 2 — Investigate connected dependencies**

The agent calls its graph tools and retrieves the vulnerable package's dependent packages, affected applications, associated assets, and responsible teams.

**Step 3 — Visualize the impact**

The interface highlights the dependency path and displays the affected entities.

**Step 4 — Explain the priority**

The system compares affected assets using the documented prioritization formula and explains the factors that influenced the ranking.

**Step 5 — Inspect evidence**

The judge can inspect the graph relationships supporting the recommendation.

**Step 6 — Record remediation**

The user approves a simulated remediation action. The backend persists the record in FalkorDB.

**Step 7 — Verify persistence**

The interface retrieves the recorded action and shows its status and supporting investigation reference.

The demonstration will emphasize that FalkorDB is performing actual dependency traversal and supplying the context used by the agent.

## 17. Innovation and Differentiation

PatchPilot's proposed contribution is the integration of graph-based software dependency reasoning, asset-context prioritization, evidence-backed explanations, and persistent remediation records in one focused workflow.

Its distinguishing characteristics are:

- Multi-hop traversal across direct and indirect dependencies.
- Impact analysis based on connected application and asset context.
- Deterministic, inspectable prioritization rules.
- Explicit evidence paths connecting findings to affected assets.
- A persistent record of proposed remediation.
- A reproducible test environment with known expected outcomes.

The project will be differentiated through its demonstrated behavior rather than claims of novelty that have not been established through a literature or competitor review.

## 18. Conclusion

PatchPilot proposes a practical application of graph-powered AI agents to software vulnerability triage. By using FalkorDB as its primary context and reasoning layer, the system can investigate relationships between vulnerable packages, dependent applications, assets, and responsible teams.

The project aims to demonstrate how graph traversal can support more informed prioritization, traceable recommendations, and auditable actions. Its controlled synthetic environment will make the results testable and the demonstration reproducible.

The implementation will focus on one complete workflow instead of attempting to build a comprehensive enterprise security platform. This scope aligns with Track 01's emphasis on agents that act on connected data, use graph queries as tools, and explain how their decisions were reached.

### References

1. WeMakeDevs, *Graph Hacks: Context for AI Agents — Official Hackathon Brief and Rules*. https://www.wemakedevs.org/hackathons/falkordb
2. WeMakeDevs, *Graph Hacks — Rules*. https://www.wemakedevs.org/hackathons/falkordb/rules
3. FalkorDB, *Getting Started and Client Libraries*. https://docs.falkordb.com/
4. FalkorDB, *Official Python Client*. https://github.com/FalkorDB/falkordb-py

*Document status: Proposed project plan. Implementation details, test results, and deployment status must be updated to reflect the work actually completed by the team.*