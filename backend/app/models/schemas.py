from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------
# Health & Readiness Schemas
# ---------------------------------------------------------
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.1"
    commit: str = "379d382"


class ReadyModelConfig(BaseModel):
    pro: str
    flash: str
    embed: str
    embed_dim: int


class ReadyResponse(BaseModel):
    status: str
    spanner: str
    vertex: str
    models: ReadyModelConfig


# ---------------------------------------------------------
# Sessions & Case Management Schemas
# ---------------------------------------------------------
class SessionCreateRequest(BaseModel):
    role: str = "claimant"
    scenario: Literal["sharma", "mehta"]
    mode: Literal["prefilled", "from_documents"] = "prefilled"


class SessionResponse(BaseModel):
    case_id: str


class ResetResponse(BaseModel):
    case_id: str
    status: str


# ---------------------------------------------------------
# Overview Schemas (from PROJECT_CONTEXT.md)
# ---------------------------------------------------------
class AssetTypeValue(BaseModel):
    type: str
    value_inr: Decimal


class NextAction(BaseModel):
    title: str
    cta: str
    target_route: str


class ConsentSummary(BaseModel):
    given: int
    total: int


class Overview(BaseModel):
    case_id: str
    deceased_name: str
    status: str
    estate_value_inr: Decimal
    assets_found: int
    claims_filed: int
    claims_total: int
    est_settlement_days: int
    baseline_days: int
    risk_label: str
    by_type: list[AssetTypeValue] = []
    next_actions: list[NextAction] = []
    alerts: list[dict[str, Any]] = []
    timeline: list[dict[str, Any]] = []
    consent: ConsentSummary
    stale: bool = False


class CaseDetail(BaseModel):
    id: str
    owner_uid: str
    deceased_name: str
    date_of_death: str | None = None
    place_of_death: str | None = None
    data_version: int = 1
    status: str = "in_progress"
    synthetic: bool = True


# ---------------------------------------------------------
# People Schemas
# ---------------------------------------------------------
class PersonCreateRequest(BaseModel):
    name: str
    relationship_to_deceased: str
    pan: str | None = None
    aadhaar_last4: str | None = None
    is_alive: bool = True
    dob: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class PersonUpdateRequest(BaseModel):
    name: str | None = None
    relationship_to_deceased: str | None = None
    pan: str | None = None
    aadhaar_last4: str | None = None
    is_alive: bool | None = None
    dob: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class PersonResponse(BaseModel):
    id: str
    case_id: str
    name: str
    relationship_to_deceased: str
    pan_masked: str | None = None
    aadhaar_last4: str | None = None
    is_alive: bool = True
    dob: str | None = None


# ---------------------------------------------------------
# Relationships Schemas
# ---------------------------------------------------------
class RelationshipCreateRequest(BaseModel):
    from_id: str
    to_id: str
    rel_type: str
    valid_from: str | None = None


class RelationshipUpdateRequest(BaseModel):
    rel_type: str | None = None
    valid_to: str | None = None


class RelationshipResponse(BaseModel):
    id: str
    case_id: str
    from_id: str
    to_id: str
    rel_type: str
    valid_from: str
    valid_to: str
    recorded_from: str
    recorded_to: str


# ---------------------------------------------------------
# Assets Schemas
# ---------------------------------------------------------
class AssetCreateRequest(BaseModel):
    type: str  # bank, fd, demat, mf, insurance, epf, ppf, property
    institution: str
    account_number_masked: str
    estimated_value_inr: Decimal
    identifier: str | None = None


class AssetUpdateRequest(BaseModel):
    institution: str | None = None
    account_number_masked: str | None = None
    estimated_value_inr: Decimal | None = None
    status: str | None = None


class NomineeShare(BaseModel):
    person_id: str
    share_pct: Decimal


class NomineesUpdateRequest(BaseModel):
    nominees: list[NomineeShare]


class AssetResponse(BaseModel):
    id: str
    case_id: str
    type: str
    institution: str
    account_number_masked: str
    estimated_value_inr: Decimal
    nominees: list[NomineeShare] = []
    status: str = "active"
    synthetic: bool = True


# ---------------------------------------------------------
# Will Schemas
# ---------------------------------------------------------
class WillUpdateRequest(BaseModel):
    is_registered: bool = False
    registration_number: str | None = None
    execution_date: str | None = None
    content_summary: str | None = None
    status: str = "submitted"


class WillResponse(BaseModel):
    case_id: str
    has_will: bool = False
    is_registered: bool = False
    registration_number: str | None = None
    execution_date: str | None = None
    content_summary: str | None = None
    clauses: list[dict[str, Any]] = []


# ---------------------------------------------------------
# Documents Schemas
# ---------------------------------------------------------
class DocumentUpdateRequest(BaseModel):
    doc_type: str | None = None
    status: str | None = None
    extracted: dict[str, Any] | None = None
    field_confidence: dict[str, float] | None = None
    verified: bool | None = None

    model_config = {"extra": "allow"}


class DocumentResponse(BaseModel):
    id: str
    doc_id: str | None = None
    case_id: str
    filename: str
    doc_type: str | None = None
    storage_uri: str
    status: str = "PENDING"
    extracted_metadata: dict[str, Any] = {}
    extracted: dict[str, Any] = {}
    field_confidence: dict[str, float] = {}
    verified: bool = False
    degraded: bool = False
    download_url: str | None = None
    signed_url: str | None = None
    uploaded_at: str | None = None


# ---------------------------------------------------------
# Graph Schemas (from PROJECT_CONTEXT.md)
# ---------------------------------------------------------
class GraphNode(BaseModel):
    id: str
    label: str
    kind: Literal["person", "asset", "institution"]
    eligibility: str | None = None
    disputed: bool = False


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    valid_from: str | None = None
    valid_to: str | None = None


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


# ---------------------------------------------------------
# Shares Schemas (from PROJECT_CONTEXT.md)
# ---------------------------------------------------------
class ShareFlow(BaseModel):
    source: str
    target: str
    value: Decimal


class PersonShare(BaseModel):
    person_id: str
    name: str
    relationship: str
    share_pct: Decimal
    amount_inr: Decimal
    clause_ids: list[str] = []
    docs_status: str = "pending"


class ShareReasoning(BaseModel):
    step: int
    text: str
    citations: list[str] = []


class SharesResponse(BaseModel):
    flows: list[ShareFlow]
    shares: list[PersonShare]
    reasoning: list[ShareReasoning]
    confidence: float
    scenario: str
    stale: bool = False


# ---------------------------------------------------------
# Runs & Events Schemas (from PROJECT_CONTEXT.md)
# ---------------------------------------------------------
class RunCreateRequest(BaseModel):
    scenario: str | None = "current"
    stages: list[str] | None = None


class RunResponse(BaseModel):
    run_id: str
    case_id: str
    status: str
    created_at: str
    degraded: bool = False
    metrics: dict[str, Any] = {}


class AgentEvent(BaseModel):
    seq: int
    type: str
    agent: str
    message: str
    progress: float
    citations: list[str] = []
    degraded: bool = False


# ---------------------------------------------------------
# WhatIf Schemas
# ---------------------------------------------------------
class WhatIfRequest(BaseModel):
    changes: list[dict[str, Any]] = []
    hypothetical_nodes: list[dict[str, Any]] = []
    hypothetical_edges: list[dict[str, Any]] = []
    scenario_override: str | None = None


class WhatIfDiffItem(BaseModel):
    person_id: str
    name: str
    baseline_pct: Decimal = Decimal("0")
    whatif_pct: Decimal = Decimal("0")
    diff_pct: Decimal = Decimal("0")
    baseline_amount_inr: Decimal = Decimal("0")
    whatif_amount_inr: Decimal = Decimal("0")
    diff_amount_inr: Decimal = Decimal("0")


class WhatIfResponse(BaseModel):
    case_id: str
    simulated: bool = True
    shares: list[PersonShare] = []
    baseline_shares: list[PersonShare] = []
    diff: list[WhatIfDiffItem] = []
    claim_readiness: dict[str, Any] = {}
    delta_explanation: str = ""
    confidence: float = 1.0


# ---------------------------------------------------------
# Claims Schemas
# ---------------------------------------------------------
class ClaimKpi(BaseModel):
    total_claimed: Decimal | float
    total_settled: Decimal | float
    avg_days: float
    blocked: int


class ClaimBoardResponse(BaseModel):
    board: dict[str, list[dict[str, Any]]]
    readiness_by_institution: dict[str, float]
    kpi: ClaimKpi
    claims: list[dict[str, Any]] = []


class ClaimResponse(BaseModel):
    claim_id: str
    case_id: str
    asset_id: str
    institution_id: str
    route: str
    status: str
    status_reason: str | None = None
    amount_inr: Decimal | None = None
    packet: dict[str, Any] = {}


class ClaimPacketResponse(BaseModel):
    claim_id: str
    institution: str
    status: str
    packet_pdf_url: str | None = None
    checklist: list[dict[str, Any]] = []
    pre_filled_form: dict[str, Any] = {}
    signers: list[dict[str, Any]] = []
    deadline: str | None = None
    affidavits: list[dict[str, Any]] = []


class ClaimApproveResponse(BaseModel):
    claim_id: str
    approved: bool
    status: str
    submitted_at: str | None = None
    due_at: str | None = None


class ClaimAdvanceResponse(BaseModel):
    claim_id: str
    old_status: str
    new_status: str
    status_reason: str | None = None
    simulated: bool = True


# ---------------------------------------------------------
# ---------------------------------------------------------
# Disputes Schemas
# ---------------------------------------------------------
class DisputeResponse(BaseModel):
    dispute_id: str
    id: str | None = None
    case_id: str
    kind: str
    severity: str
    title: str
    evidence: dict[str, Any] | list[Any] = {}
    evidence_hash: str = ""
    recommended_action: str = ""
    status: str = "OPEN"
    computed_for_version: int | None = None

    def model_post_init(self, __context: Any) -> None:
        if not self.id:
            self.id = self.dispute_id


class DisputeResolveRequest(BaseModel):
    action: Literal["RESOLVE", "ESCALATE", "REQUEST_DOCS"] | None = None
    note: str | None = None
    resolution: str | None = None
    justification: str | None = None


class DocRequestResponse(BaseModel):
    request_id: str
    case_id: str
    claim_id: str | None = None
    doc_name: str
    status: str
    created_at: str


class DisputesOverviewResponse(BaseModel):
    case_id: str
    disputes: list[DisputeResponse]
    risk_score: float
    risk_label: str
    contributing_factors: list[str] = []
    timeline: list[dict[str, Any]] = []


# ---------------------------------------------------------
# Chat Schemas
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    case_id: str
    message: str
    language: Literal["en", "hi", "te"] = "en"


class ChatResponse(BaseModel):
    reply: str
    citations: list[str] = []
    language: str
    degraded: bool = False


# ---------------------------------------------------------
# Audit Schemas
# ---------------------------------------------------------
class AuditLogEntry(BaseModel):
    entry_id: str
    case_id: str
    action: str
    timestamp: str
    hash: str
    prev_hash: str


class AuditVerifyResponse(BaseModel):
    case_id: str
    is_valid: bool
    verified_entries: int
    last_verified_hash: str


# ---------------------------------------------------------
# Consent Schemas
# ---------------------------------------------------------
class ConsentUpdateRequest(BaseModel):
    party_id: str
    given: bool


class ConsentResponse(BaseModel):
    case_id: str
    parties: list[dict[str, Any]]
    total_required: int
    total_given: int


# ---------------------------------------------------------
# Institution Dashboard Schemas
# ---------------------------------------------------------
class InstitutionDashboardResponse(BaseModel):
    total_claims: int = 0
    open_claims: int = 0
    pending_verification: int = 0
    fraud_flags: int = 0
    avg_processing_days: float = 0.0
    stp_percentage: float = 0.0
    cost_saved_inr: Decimal = Decimal("0")
    cost_assumptions: dict[str, Any] = Field(default_factory=dict)
    funnel: list[dict[str, Any]] = Field(default_factory=list)
    before_vs_after: dict[str, Any] = Field(default_factory=dict)
    claims_by_type: list[dict[str, Any]] = Field(default_factory=list)
    regional_split: list[dict[str, Any]] = Field(default_factory=list)
    synthetic: bool = True


class InstitutionSavingsResponse(BaseModel):
    claims_per_year: int
    estimated_hours_saved: float
    estimated_rupees_saved: Decimal
    cost_assumptions: dict[str, Any] = Field(default_factory=dict)
    synthetic: bool = True


# ---------------------------------------------------------
# Impact Schemas
# ---------------------------------------------------------
class MarketStatItem(BaseModel):
    key: str
    title: str
    value: float | int | str | None = None
    unit: str | None = None
    source_name: str | None = None
    source_url: str | None = None
    note: str | None = None


class ImpactResponse(BaseModel):
    cases_resolved: int = 0
    total_wealth_unlocked_inr: Decimal = Decimal("0")
    litigation_prevented_est: int = 0
    avg_time_reduction_pct: float = 0.0
    hero: dict[str, Any] = Field(default_factory=dict)
    before_vs_after_timeline: list[dict[str, Any]] = Field(default_factory=list)
    market: list[MarketStatItem] = Field(default_factory=list)
    synthetic: bool = True


class AdminCleanupResponse(BaseModel):
    deleted_sessions: int
    status: str


# ---------------------------------------------------------
# GraphRAG & Chat Schemas
# ---------------------------------------------------------
class ClauseItem(BaseModel):
    clause_id: str
    source: str
    section: str = ""
    topic: str = ""
    text: str
    official_url: str = ""


class GraphFactItem(BaseModel):
    fact_id: str
    text: str


class EntityLinkItem(BaseModel):
    entity_id: str
    entity_type: str
    name: str
    score: float


class GraphRAGContext(BaseModel):
    clauses: list[dict[str, Any]] = Field(default_factory=list)
    graph_facts: list[dict[str, Any]] = Field(default_factory=list)
    entity_links: list[dict[str, Any]] = Field(default_factory=list)


class GraphRAGAnswer(BaseModel):
    answer: str
    steps: list[str] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    needs_lawyer: bool = Field(default=False)
    degraded: bool = Field(default=False)


class ChatRequest(BaseModel):
    case_id: str
    message: str
    language: str = "en"
