-- Spanner GoogleSQL Schema for Virasat Estate Settlement Platform
-- Bi-temporal knowledge graph, institutions, assets, claims, consent & audit

CREATE TABLE Cases (
  case_id STRING(64) NOT NULL,
  owner_uid STRING(128) NOT NULL,
  scenario_name STRING(64) NOT NULL,
  deceased_name STRING(128) NOT NULL,
  deceased_date_of_death DATE,
  data_version INT64 NOT NULL,
  status STRING(32) NOT NULL,
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
  updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (case_id);

CREATE INDEX CasesByOwner ON Cases(owner_uid);

CREATE TABLE People (
  case_id STRING(64) NOT NULL,
  person_id STRING(64) NOT NULL,
  name STRING(128) NOT NULL,
  gender STRING(16),
  date_of_birth DATE,
  date_of_death DATE,
  is_deceased BOOL NOT NULL,
  religion STRING(32),
  is_eligible_heir BOOL NOT NULL,
  is_disputed BOOL NOT NULL,
  notes STRING(MAX),
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
  updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (person_id);

CREATE INDEX PeopleByCase ON People(case_id);

CREATE TABLE Institutions (
  institution_id STRING(64) NOT NULL,
  name STRING(128) NOT NULL,
  category STRING(32) NOT NULL,
  portal_url STRING(256),
  claim_requirements_json JSON,
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (institution_id);

CREATE TABLE Assets (
  case_id STRING(64) NOT NULL,
  asset_id STRING(64) NOT NULL,
  asset_type STRING(32) NOT NULL,
  institution_id STRING(64),
  identifier_masked STRING(64) NOT NULL,
  gross_value_inr NUMERIC NOT NULL,
  net_value_inr NUMERIC NOT NULL,
  debt_inr NUMERIC NOT NULL,
  status STRING(32) NOT NULL,
  dispute_status STRING(32) NOT NULL,
  metadata_json JSON,
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
  updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (asset_id);

CREATE INDEX AssetsByCase ON Assets(case_id);

-- Bi-temporal relationship edge: from_person_id IS THE rel_type OF to_person_id
CREATE TABLE Relationships (
  relationship_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  from_person_id STRING(64) NOT NULL,
  to_person_id STRING(64) NOT NULL,
  rel_type STRING(32) NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP NOT NULL,
  recorded_from TIMESTAMP NOT NULL,
  recorded_to TIMESTAMP NOT NULL
) PRIMARY KEY (relationship_id);

CREATE INDEX RelationshipsByCase ON Relationships(case_id);

-- Bi-temporal ownership edge: person_id owns asset_id with share_pct
CREATE TABLE Ownerships (
  ownership_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  person_id STRING(64) NOT NULL,
  asset_id STRING(64) NOT NULL,
  share_pct NUMERIC NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP NOT NULL,
  recorded_from TIMESTAMP NOT NULL,
  recorded_to TIMESTAMP NOT NULL
) PRIMARY KEY (ownership_id);

CREATE INDEX OwnershipsByCase ON Ownerships(case_id);

-- Bi-temporal nominee edge: person_id is nominee for asset_id with share_pct
CREATE TABLE Nominees (
  nominee_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  person_id STRING(64) NOT NULL,
  asset_id STRING(64) NOT NULL,
  share_pct NUMERIC NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP NOT NULL,
  recorded_from TIMESTAMP NOT NULL,
  recorded_to TIMESTAMP NOT NULL
) PRIMARY KEY (nominee_id);

CREATE INDEX NomineesByCase ON Nominees(case_id);

CREATE TABLE Wills (
  will_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  is_registered BOOL NOT NULL,
  registration_date DATE,
  executor_person_id STRING(64),
  will_text STRING(MAX),
  status STRING(32) NOT NULL,
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
  updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (will_id);

CREATE INDEX WillsByCase ON Wills(case_id);

CREATE TABLE Documents (
  document_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  doc_type STRING(32) NOT NULL,
  gcs_uri STRING(512) NOT NULL,
  file_name STRING(256) NOT NULL,
  mime_type STRING(64) NOT NULL,
  ocr_status STRING(32) NOT NULL,
  extracted_data_json JSON,
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (document_id);

CREATE INDEX DocumentsByCase ON Documents(case_id);

CREATE TABLE Claims (
  claim_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  asset_id STRING(64) NOT NULL,
  institution_id STRING(64) NOT NULL,
  claim_status STRING(32) NOT NULL,
  computed_for_version INT64 NOT NULL,
  packet_gcs_uri STRING(512),
  tracking_number STRING(64),
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
  updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (claim_id);

CREATE INDEX ClaimsByCase ON Claims(case_id);

CREATE TABLE Consents (
  consent_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  person_id STRING(64) NOT NULL,
  given BOOL NOT NULL,
  method STRING(32) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  hash_signature STRING(128) NOT NULL
) PRIMARY KEY (consent_id);

CREATE INDEX ConsentsByCase ON Consents(case_id);

CREATE TABLE Disputes (
  dispute_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  title STRING(128) NOT NULL,
  description STRING(MAX),
  claimant_person_id STRING(64) NOT NULL,
  disputed_asset_id STRING(64),
  status STRING(32) NOT NULL,
  resolution_notes STRING(MAX),
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
  updated_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (dispute_id);

CREATE INDEX DisputesByCase ON Disputes(case_id);

CREATE TABLE ShareResults (
  share_result_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  person_id STRING(64) NOT NULL,
  scenario STRING(32) NOT NULL,
  share_pct NUMERIC NOT NULL,
  amount_inr NUMERIC NOT NULL,
  reasoning_json JSON,
  computed_for_version INT64 NOT NULL,
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (share_result_id);

CREATE INDEX ShareResultsByCase ON ShareResults(case_id);

CREATE TABLE ChangeLog (
  change_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  data_version INT64 NOT NULL,
  entity_type STRING(32) NOT NULL,
  entity_id STRING(64) NOT NULL,
  operation STRING(16) NOT NULL,
  diff_json JSON,
  created_at TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true)
) PRIMARY KEY (change_id);

CREATE INDEX ChangeLogByCase ON ChangeLog(case_id, data_version);

CREATE TABLE AuditLog (
  audit_id STRING(64) NOT NULL,
  case_id STRING(64) NOT NULL,
  seq INT64 NOT NULL,
  timestamp TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp = true),
  actor_type STRING(32) NOT NULL,
  actor_id STRING(64) NOT NULL,
  action STRING(64) NOT NULL,
  details_json JSON,
  prev_hash STRING(128) NOT NULL,
  current_hash STRING(128) NOT NULL
) PRIMARY KEY (audit_id);

CREATE INDEX AuditLogByCase ON AuditLog(case_id, seq);

-- Spanner Property Graph Definition
CREATE PROPERTY GRAPH VirasatGraph
  NODE TABLES (
    People KEY (person_id) LABEL Person,
    Assets KEY (asset_id) LABEL Asset,
    Institutions KEY (institution_id) LABEL Institution
  )
  EDGE TABLES (
    Relationships
      KEY (relationship_id)
      SOURCE KEY (from_person_id) REFERENCES People (person_id)
      DESTINATION KEY (to_person_id) REFERENCES People (person_id)
      LABEL Relationship,
    Ownerships
      KEY (ownership_id)
      SOURCE KEY (person_id) REFERENCES People (person_id)
      DESTINATION KEY (asset_id) REFERENCES Assets (asset_id)
      LABEL Owns,
    Nominees
      KEY (nominee_id)
      SOURCE KEY (person_id) REFERENCES People (person_id)
      DESTINATION KEY (asset_id) REFERENCES Assets (asset_id)
      LABEL Nominee
  );
