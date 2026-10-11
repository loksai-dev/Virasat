import uuid
from app.services.sessions import clone_seed
from app.services.claims import generate_claims_for_case
from app.db.repositories import CasesRepo

def test_claims_generation():
    uid = f"test-p10-{uuid.uuid4().hex[:8]}"
    for seed_key in ["sharma", "mehta"]:
        case_id = clone_seed(seed_key=seed_key, uid=uid, mode="prefilled")
        case = CasesRepo.get(case_id)
        if not case:
            print(f"Case {case_id} not found!")
            continue
        print(f"\n==========================================", flush=True)
        print(f"Testing claim generation for {case_id} ({case['title']})", flush=True)
        print(f"==========================================", flush=True)
        claims = generate_claims_for_case(case_id, actor="test_runner")
        print(f"Generated {len(claims)} claims:", flush=True)
        ready_count = 0
        needs_action_count = 0
        for c in claims:
            status = c["status"]
            reason = c.get("status_reason")
            route = c.get("route")
            aid = c.get("asset_id")
            inst = c.get("institution_id")
            if status == "READY":
                ready_count += 1
            else:
                needs_action_count += 1
            print(f"  [{status:12}] Asset: {aid:20} Route: {route:14} Inst: {inst:12} Reason: {reason}", flush=True)
        print(f"Summary: READY={ready_count}, NEEDS_ACTION={needs_action_count}", flush=True)

        if seed_key == "mehta":
            from app.db.repositories import DocumentRepo
            print("\n--> Testing Mehta: Adding verified LEGAL_HEIR_CERT...", flush=True)
            doc_id = f"doc-test-heir-{uuid.uuid4().hex[:6]}"
            DocumentRepo.create({
                "doc_id": doc_id,
                "case_id": case_id,
                "doc_type": "LEGAL_HEIR_CERT",
                "original_name": "succession_certificate.pdf",
                "verified": True,
                "status": "PROCESSED",
                "confidence": 1.0,
                "gcs_uri": f"gs://bucket/cases/{case_id}/docs/{doc_id}.pdf",
            }, actor="test_runner")

            print("--> Re-running claim generation for Mehta...", flush=True)
            refreshed_claims = generate_claims_for_case(case_id, actor="test_runner")
            for c in refreshed_claims:
                if "bob-fd" in c["asset_id"]:
                    print(f"--> After re-run, Bank of Baroda FD status: {c['status']} (reason: {c.get('status_reason')})", flush=True)
            mehta_ready = sum(1 for c in refreshed_claims if c["status"] == "READY")
            mehta_na = sum(1 for c in refreshed_claims if c["status"] == "NEEDS_ACTION")
            print(f"--> After re-run Mehta summary: READY={mehta_ready}, NEEDS_ACTION={mehta_na}", flush=True)

if __name__ == "__main__":
    test_claims_generation()
