# PatchPilot FalkorDB Cypher Query Reference

This document catalogs the Cypher queries executed in **FalkorDB** that power PatchPilot's dependency graph traversal, blast radius calculation, prioritization, and remediation.

---

## 1. Graph Traversal & Blast Radius

### 1.1 Find All Applications and Packages Impacted by a Vulnerability (Transitive)

Traverses through package dependencies up to running applications:

```cypher
MATCH (v:Vulnerability {id: $vuln_id})-[:AFFECTS]->(p_base:Package)
OPTIONAL MATCH (p_dependent:Package)-[:DEPENDS_ON*0..5]->(p_base)
OPTIONAL MATCH (app:Application)-[:USES]->(p_dependent)
RETURN DISTINCT 
    v.id AS vuln_id,
    p_base.name AS base_pkg,
    p_base.version AS base_version,
    p_dependent.name AS dependent_pkg,
    p_dependent.version AS dependent_version,
    app.id AS app_id,
    app.name AS app_name,
    app.tier AS app_tier
```

### 1.2 Infrastructure Blast Radius (Vulnerability to Impacted Assets)

Identifies runtime assets exposed to the vulnerability through deployed applications:

```cypher
MATCH (v:Vulnerability {id: $vuln_id})-[:AFFECTS]->(p_base:Package)
MATCH (p_dep:Package)-[:DEPENDS_ON*0..5]->(p_base)
MATCH (app:Application)-[:USES]->(p_dep)
MATCH (app)-[:DEPLOYS_TO]->(asset:Asset)
RETURN DISTINCT
    asset.id AS asset_id,
    asset.name AS asset_name,
    asset.type AS asset_type,
    asset.environment AS environment,
    asset.exposure AS exposure,
    asset.criticality AS criticality,
    app.name AS via_application
ORDER BY 
    CASE asset.criticality WHEN 'tier_1' THEN 1 WHEN 'tier_2' THEN 2 ELSE 3 END,
    CASE asset.exposure WHEN 'public' THEN 1 ELSE 2 END
```

### 1.3 Responsible Teams Lookup

Maps vulnerabilities directly to responsible engineering and infrastructure teams:

```cypher
MATCH (v:Vulnerability {id: $vuln_id})-[:AFFECTS]->(p_base:Package)
MATCH (p_dep:Package)-[:DEPENDS_ON*0..5]->(p_base)
MATCH (app:Application)-[:USES]->(p_dep)
MATCH (team:Team)-[:OWNS]->(app)
RETURN DISTINCT
    team.id AS team_id,
    team.name AS team_name,
    team.email AS email,
    team.slack_channel AS slack_channel,
    team.on_call AS on_call,
    collect(DISTINCT app.name) AS owned_applications
```

---

## 2. Shortest Dependency Path & Evidence Extraction

### 2.1 Multi-Hop Evidence Paths

Generates full chain from vulnerability to vulnerable asset for interactive visual proof:

```cypher
MATCH path = (v:Vulnerability {id: $vuln_id})-[:AFFECTS]->(:Package)<-[:DEPENDS_ON*0..4]-(:Package)<-[:USES]-(app:Application)-[:DEPLOYS_TO]->(asset:Asset)
RETURN 
    [node in nodes(path) | {id: id(node), label: labels(node)[0], name: coalesce(node.name, node.title, node.id), version: node.version}] AS path_nodes,
    length(path) AS hops,
    app.name AS app_name,
    asset.name AS asset_name,
    asset.exposure AS exposure,
    asset.criticality AS criticality
ORDER BY length(path) ASC
LIMIT 10
```

---

## 3. Threat Overview & Graph Metrics

### 3.1 Aggregated Vulnerability Portfolio Metrics

```cypher
MATCH (v:Vulnerability)
OPTIONAL MATCH (v)-[:AFFECTS]->(p:Package)<-[:DEPENDS_ON*0..5]-(:Package)<-[:USES]-(app:Application)-[:DEPLOYS_TO]->(asset:Asset)
RETURN
    count(DISTINCT v) AS total_vulnerabilities,
    count(DISTINCT p) AS total_packages_affected,
    count(DISTINCT app) AS total_apps_affected,
    count(DISTINCT asset) AS total_assets_affected,
    count(DISTINCT CASE WHEN asset.environment = 'production' AND asset.exposure = 'public' THEN asset END) AS public_prod_assets_at_risk
```

### 3.2 Subgraph Neighborhood for Interactive React Flow Canvas

```cypher
MATCH (v:Vulnerability {id: $vuln_id})
OPTIONAL MATCH path = (v)-[*1..3]-(connected)
WITH v, collect(path) AS paths
UNWIND (CASE WHEN size(paths) = 0 THEN [null] ELSE paths END) AS p
RETURN 
    collect(DISTINCT {id: coalesce(p.id, v.id), labels: labels(p)}) AS nodes,
    collect(DISTINCT relationships(p)) AS edges
```

---

## 4. Remediation Tracking Queries

### 4.1 Create Remediation Record and Link to Graph

```cypher
MATCH (v:Vulnerability {id: $vuln_id})
MATCH (t:Team {id: $team_id})
CREATE (r:Remediation {
    id: $remediation_id,
    action_type: $action_type,
    status: 'PENDING',
    target_package: $target_package,
    recommended_version: $recommended_version,
    description: $description,
    created_at: $created_at
})
CREATE (r)-[:REMEDIATES]->(v)
CREATE (t)-[:ASSIGNED_TO]->(r)
RETURN r.id AS remediation_id
```

### 4.2 Query Active Remediations with Team and Vulnerability Context

```cypher
MATCH (r:Remediation)-[:REMEDIATES]->(v:Vulnerability)
OPTIONAL MATCH (t:Team)-[:ASSIGNED_TO]->(r)
RETURN 
    r.id AS id,
    r.action_type AS action_type,
    r.status AS status,
    r.target_package AS target_package,
    r.recommended_version AS recommended_version,
    r.description AS description,
    r.created_at AS created_at,
    v.id AS vuln_id,
    v.severity AS vuln_severity,
    t.name AS assigned_team
ORDER BY r.created_at DESC
```
