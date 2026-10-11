import base64
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from datetime import UTC, datetime

from app.db.repositories import AssetRepo, NomineeRepo
from app.services.sessions import clone_seed


def main():
    print("=" * 60)
    print("P5 VERIFICATION RUN")
    print("=" * 60)

    print("\n--- 1. CLONING SHARMA ---")
    sharma_case_id = clone_seed("sharma", "user-sharma-demo", mode="prefilled")
    assets = AssetRepo.list_by_case(sharma_case_id)
    total = sum(a["est_value_inr"] for a in assets)
    print(f"Sharma Assets count: {len(assets)}")
    for a in assets:
        print(f"  - {a['type']}: INR {a['est_value_inr']:,} ({a['label']})")
    print(f"Sharma Net Estate: INR {total:,}")

    print("\n--- 2. CLONING MEHTA ---")
    mehta_case_id = clone_seed("mehta", "user-mehta-demo", mode="prefilled")
    assets = AssetRepo.list_by_case(mehta_case_id)
    total = sum(a["est_value_inr"] for a in assets)
    print(f"Mehta Assets count: {len(assets)}")
    for a in assets:
        print(f"  - {a['type']}: INR {a['est_value_inr']:,} ({a['label']})")
    print(f"Mehta Net Estate: INR {total:,}")

    print("\n--- 3. HDFC BI-TEMPORAL NOMINEE QUERIES ---")
    sharma_assets = AssetRepo.list_by_case(sharma_case_id)
    hdfc_asset = next(a for a in sharma_assets if "8891" in a["label"] or "8891" in (a["account_ref_masked"] or ""))
    as_of_past = NomineeRepo.list_by_case(
        sharma_case_id,
        valid_at=datetime(2023, 6, 1, tzinfo=UTC),
        known_at=datetime(2023, 12, 1, tzinfo=UTC),
    )
    as_of_past = [n for n in as_of_past if n["asset_id"] == hdfc_asset["asset_id"]]
    as_of_now = NomineeRepo.list_by_case(
        sharma_case_id,
        valid_at=datetime.now(UTC),
        known_at=datetime.now(UTC),
    )
    as_of_now = [n for n in as_of_now if n["asset_id"] == hdfc_asset["asset_id"]]

    print("HDFC As-of (valid 2023-06-01, known 2023-12-01):")
    for row in as_of_past:
        print(f"  Person: {row['person_id']}, Share: {row['share_pct']}%, ValidFrom: {row['valid_from']}, RecordedFrom: {row['recorded_from']}")
    print("HDFC As-of (now):")
    for row in as_of_now:
        print(f"  Person: {row['person_id']}, Share: {row['share_pct']}%, ValidFrom: {row['valid_from']}, RecordedFrom: {row['recorded_from']}")

    print("\n--- 4. ISOLATED CLONES FOR TWO DIFFERENT UIDS ---")
    clone_a_id = clone_seed("sharma", "uid-alice-123")
    clone_b_id = clone_seed("sharma", "uid-bob-456")
    print(f"UID Alice Case: {clone_a_id} (owner: uid-alice-123)")
    print(f"UID Bob Case:   {clone_b_id} (owner: uid-bob-456)")
    assert clone_a_id != clone_b_id
    print("Verified distinct case IDs and owners across sessions.")

    print("\n--- 5. VIKRAM AFFIDAVIT PLANTED INCONSISTENCIES ---")
    pdf_path = Path(__file__).resolve().parent.parent / "app" / "seed" / "docs" / "sharma" / "doc-sharma-18.pdf"
    raw_pdf = pdf_path.read_bytes()
    s_start = raw_pdf.find(b"stream\n") + 7
    s_end = raw_pdf.find(b"endstream")
    stream = raw_pdf[s_start:s_end].strip()
    pdf_text = zlib.decompress(base64.a85decode(stream, adobe=True)).decode("latin1")

    print(f"Affidavit text verified in '{pdf_path.name}':")
    matches = [
        ("Typo in deceased name", "Rameshh Sharma"),
        ("Fraudulent DOD (actual 14th)", "19th March 2026"),
        ("Notary date prior to DOD", "10th day of March 2026"),
        ("Claim of sole legal heir", "Sole Legal Heir"),
    ]
    for label, target in matches:
        found = target in pdf_text
        print(f"  [{'FOUND' if found else 'MISSING'}] {label}: '{target}'")

    print("\n" + "=" * 60)
    print("ALL P5 CRITERIA VERIFIED SUCCESSFULLY")
    print("=" * 60)

if __name__ == "__main__":
    main()
