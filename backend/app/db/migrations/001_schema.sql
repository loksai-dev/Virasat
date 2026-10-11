-- Virasat Schema 001: Bi-temporal knowledge graph, succession rules, claims, consent & audit
-- Cloud Spanner GoogleSQL Dialect

CREATE TABLE Cases (
  case_id STRING(36) NOT NULL, owner_uid STRING(128) NOT NULL, seed_key STRING(16), mode STRING(16),
  title STRING(256), status STRING(16) NOT NULL, deceased_person_id STRING(36),
  data_version INT64 NOT NULL, created_at TIMESTAMP NOT NULL, expires_at TIMESTAMP
) PRIMARY KEY (case_id);

CREATE INDEX CasesByOwner ON Cases(owner_uid);

CREATE TABLE Person (
  person_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, full_name STRING(256) NOT NULL,
  role STRING(16) NOT NULL,            -- DECEASED | HEIR | CLAIMANT | BENEFICIARY
  sex STRING(1),                       -- M | F
  dob DATE, dod DATE, personal_law STRING(16),
  alive BOOL NOT NULL DEFAULT (TRUE), eligibility STRING(16), notes STRING(MAX),
  deleted BOOL NOT NULL DEFAULT (FALSE)
) PRIMARY KEY (person_id);

CREATE INDEX PersonByCase ON Person(case_id);

CREATE TABLE Institution (
  institution_id STRING(36) NOT NULL, name STRING(128) NOT NULL, kind STRING(32) NOT NULL,
  required_docs JSON, sla_days INT64
) PRIMARY KEY (institution_id);

CREATE TABLE Asset (
  asset_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, institution_id STRING(36),
  type STRING(16) NOT NULL,            -- SAVINGS|FD|DEMAT|MF|POLICY|EPF|PPF|LOCKER|PROPERTY|LOAN|VEHICLE
  label STRING(256), account_ref_masked STRING(32), est_value_inr NUMERIC, ownership STRING(8),
  source_doc_id STRING(36), extraction_confidence FLOAT64,
  status STRING(16) NOT NULL,          -- LOCATED|CLAIM_READY|FILED|IN_REVIEW|BLOCKED|SETTLED
  deleted BOOL NOT NULL DEFAULT (FALSE)
) PRIMARY KEY (asset_id);

CREATE INDEX AssetByCase ON Asset(case_id);

CREATE TABLE HeldAt (
  asset_id STRING(36) NOT NULL, institution_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL
) PRIMARY KEY (asset_id, institution_id);

CREATE TABLE Relationship (
  from_id STRING(36) NOT NULL, to_id STRING(36) NOT NULL,
  rel_type STRING(16) NOT NULL,        -- SPOUSE|CHILD|PARENT|SIBLING ; from_id IS THE rel_type OF to_id
  case_id STRING(36) NOT NULL,
  valid_from TIMESTAMP NOT NULL, valid_to TIMESTAMP NOT NULL DEFAULT (TIMESTAMP '9999-12-31T23:59:59Z'),
  recorded_from TIMESTAMP NOT NULL, recorded_to TIMESTAMP NOT NULL DEFAULT (TIMESTAMP '9999-12-31T23:59:59Z')
) PRIMARY KEY (from_id, to_id, rel_type, valid_from, recorded_from);

CREATE INDEX RelationshipByCase ON Relationship(case_id);

CREATE TABLE Nominee (
  person_id STRING(36) NOT NULL, asset_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, share_pct FLOAT64,
  valid_from TIMESTAMP NOT NULL, valid_to TIMESTAMP NOT NULL DEFAULT (TIMESTAMP '9999-12-31T23:59:59Z'),
  recorded_from TIMESTAMP NOT NULL, recorded_to TIMESTAMP NOT NULL DEFAULT (TIMESTAMP '9999-12-31T23:59:59Z')
) PRIMARY KEY (asset_id, person_id, valid_from, recorded_from);

CREATE INDEX NomineeByCase ON Nominee(case_id);

CREATE TABLE Owns (
  person_id STRING(36) NOT NULL, asset_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL,
  valid_from TIMESTAMP NOT NULL, valid_to TIMESTAMP NOT NULL DEFAULT (TIMESTAMP '9999-12-31T23:59:59Z'),
  recorded_from TIMESTAMP NOT NULL, recorded_to TIMESTAMP NOT NULL DEFAULT (TIMESTAMP '9999-12-31T23:59:59Z')
) PRIMARY KEY (person_id, asset_id, valid_from, recorded_from);

CREATE TABLE Will (
  will_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, doc_id STRING(36),
  status STRING(16) NOT NULL,          -- NONE|DRAFT|UNVERIFIED|VERIFIED|REGISTERED
  executed_on DATE, bequests JSON      -- [{person_id, asset_id|null, share_pct}]
) PRIMARY KEY (will_id);

CREATE INDEX WillByCase ON Will(case_id);

CREATE TABLE Document (
  doc_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, gcs_uri STRING(512) NOT NULL,
  doc_type STRING(24), original_name STRING(256), extracted JSON, field_confidence JSON,
  status STRING(16) NOT NULL,          -- PENDING|EXTRACTED|NEEDS_REVIEW|FAILED
  verified BOOL NOT NULL DEFAULT (FALSE), degraded BOOL NOT NULL DEFAULT (FALSE),
  uploaded_at TIMESTAMP NOT NULL, deleted BOOL NOT NULL DEFAULT (FALSE)
) PRIMARY KEY (doc_id);

CREATE INDEX DocumentByCase ON Document(case_id);

CREATE TABLE DocRequest (
  request_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, claim_id STRING(36),
  doc_name STRING(128) NOT NULL, status STRING(16) NOT NULL, created_at TIMESTAMP NOT NULL
) PRIMARY KEY (request_id);

CREATE INDEX DocRequestByCase ON DocRequest(case_id);

CREATE TABLE LegalClause (
  clause_id STRING(64) NOT NULL, source STRING(128) NOT NULL, section STRING(64), jurisdiction STRING(32),
  topic STRING(128), text STRING(MAX) NOT NULL, needs_review BOOL NOT NULL DEFAULT (TRUE),
  official_url STRING(512), embedding ARRAY<FLOAT32>(vector_length=>768)
) PRIMARY KEY (clause_id);

CREATE TABLE ShareResult (
  case_id STRING(36) NOT NULL, scenario STRING(16) NOT NULL, person_id STRING(36) NOT NULL,
  asset_key STRING(36) NOT NULL,       -- asset_id, or '-' for estate-level rows
  share_pct FLOAT64, amount_inr NUMERIC, route STRING(16), clause_ids JSON, rule_ids JSON, notes JSON,
  computed_for_version INT64 NOT NULL, run_id STRING(36)
) PRIMARY KEY (case_id, scenario, person_id, asset_key);

CREATE TABLE Claim (
  claim_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, asset_id STRING(36) NOT NULL,
  institution_id STRING(36) NOT NULL, route STRING(16),
  status STRING(16) NOT NULL,          -- READY|SUBMITTED|IN_REVIEW|NEEDS_ACTION|SETTLED
  status_reason STRING(MAX), amount_inr NUMERIC, packet JSON, packet_gcs_uri STRING(512),
  approved_by STRING(128), submitted_at TIMESTAMP, due_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL, computed_for_version INT64
) PRIMARY KEY (claim_id);

CREATE INDEX ClaimByCase ON Claim(case_id);

CREATE TABLE Dispute (
  dispute_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, kind STRING(32) NOT NULL,
  severity STRING(16), title STRING(256), evidence JSON, evidence_hash STRING(64),
  recommended_action STRING(MAX),
  status STRING(16) NOT NULL,          -- OPEN|RESOLVED|ESCALATED|DOCS_REQUESTED
  computed_for_version INT64
) PRIMARY KEY (dispute_id);

CREATE INDEX DisputeByCase ON Dispute(case_id);

CREATE TABLE Consent (
  case_id STRING(36) NOT NULL, person_id STRING(36) NOT NULL,
  status STRING(16) NOT NULL,          -- PENDING|GIVEN|DECLINED
  signed_at TIMESTAMP
) PRIMARY KEY (case_id, person_id);

CREATE TABLE AuditLog (
  case_id STRING(36) NOT NULL, seq INT64 NOT NULL, actor STRING(96) NOT NULL, action STRING(128) NOT NULL,
  payload JSON, prev_hash STRING(64), entry_hash STRING(64) NOT NULL, occurred_at TIMESTAMP NOT NULL
) PRIMARY KEY (case_id, seq);

CREATE TABLE ChangeLog (
  change_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, entity STRING(32) NOT NULL,
  entity_id STRING(64), field STRING(64), old_value STRING(MAX), new_value STRING(MAX),
  valid_at TIMESTAMP, recorded_at TIMESTAMP NOT NULL, actor STRING(96)
) PRIMARY KEY (change_id);

CREATE INDEX ChangeLogByCase ON ChangeLog(case_id, recorded_at);

CREATE TABLE AgentRun (
  run_id STRING(36) NOT NULL, case_id STRING(36) NOT NULL, trigger_kind STRING(16) NOT NULL,
  status STRING(16) NOT NULL,          -- QUEUED|RUNNING|DONE|FAILED
  degraded BOOL NOT NULL DEFAULT (FALSE), rerun_pending BOOL NOT NULL DEFAULT (FALSE),
  case_version INT64, started_at TIMESTAMP, finished_at TIMESTAMP, metrics JSON
) PRIMARY KEY (run_id);

CREATE INDEX AgentRunByCase ON AgentRun(case_id);

CREATE TABLE AgentEvent (
  run_id STRING(36) NOT NULL, seq INT64 NOT NULL, ts TIMESTAMP NOT NULL, agent STRING(32),
  event_type STRING(24) NOT NULL, message STRING(MAX), citations JSON, progress FLOAT64,
  degraded BOOL NOT NULL DEFAULT (FALSE), payload JSON
) PRIMARY KEY (run_id, seq);

CREATE TABLE ChatMessage (
  case_id STRING(36) NOT NULL, seq INT64 NOT NULL, role STRING(16) NOT NULL, content STRING(MAX),
  citations JSON, entity_links JSON, ts TIMESTAMP NOT NULL
) PRIMARY KEY (case_id, seq);

CREATE PROPERTY GRAPH EstateGraph
  NODE TABLES (Person, Asset, Institution)
  EDGE TABLES (
    Relationship SOURCE KEY (from_id) REFERENCES Person (person_id)
                 DESTINATION KEY (to_id) REFERENCES Person (person_id) LABEL RELATED_TO,
    Owns         SOURCE KEY (person_id) REFERENCES Person (person_id)
                 DESTINATION KEY (asset_id) REFERENCES Asset (asset_id) LABEL OWNS,
    Nominee      SOURCE KEY (person_id) REFERENCES Person (person_id)
                 DESTINATION KEY (asset_id) REFERENCES Asset (asset_id) LABEL NOMINATED_FOR,
    HeldAt       SOURCE KEY (asset_id) REFERENCES Asset (asset_id)
                 DESTINATION KEY (institution_id) REFERENCES Institution (institution_id) LABEL HELD_AT
  );
