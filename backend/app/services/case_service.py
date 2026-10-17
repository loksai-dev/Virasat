"""Service orchestrating case entity mutations, validations, optimistic locking, and audit logging."""

import logging
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from app.db.bitemporal import now_utc
from app.db.repositories import (
    AssetRepo,
    CasesRepo,
    ConsentRepo,
    HistoryRepo,
    NomineeRepo,
    PersonRepo,
    RelationshipRepo,
    WillRepo,
)
from app.engines.audit import list_audit_entries, verify as verify_audit_chain
from app.errors import Conflict, Forbidden, NotFound, ValidationFailed
from app.services.events import publish_case_event

logger = logging.getLogger(__name__)

VALID_REL_TYPES = {"SPOUSE", "CHILD", "PARENT", "SIBLING"}
VALID_ASSET_TYPES = {
    "SAVINGS", "FD", "DEMAT", "MF", "POLICY",
    "EPF", "PPF", "LOCKER", "PROPERTY", "LOAN", "VEHICLE"
}


def check_case_access(
    case_id: str,
    uid: str,
    if_match: str | None = None,
    for_mutation: bool = False,
    is_entity_lookup: bool = False,
) -> dict[str, Any]:
    """Verify ownership and optimistic concurrency for a case."""
    case = CasesRepo.get(case_id)
    if not case:
        raise NotFound(f"Case {case_id} not found")

    # Master seed templates are read-only for all users
    is_master_seed = (
        case.get("owner_uid") == "SEED"
        or case_id in ("seed-sharma", "seed-mehta")
        or case_id.startswith("seed-")
    )
    if is_master_seed:
        if for_mutation:
            raise Forbidden("Seed templates are read-only")
    elif case.get("owner_uid") != uid:
        if is_entity_lookup:
            raise NotFound(f"Resource not found in case {case_id}")
        raise Forbidden(f"User {uid} does not have access to case {case_id}")

    # Optimistic concurrency check
    if if_match is not None and for_mutation:
        clean_match = if_match.strip().strip('"').lstrip("W/")
        try:
            expected_ver = int(clean_match)
        except ValueError:
            raise ValidationFailed(f"Invalid If-Match header value: {if_match}") from None

        current_ver = case.get("data_version", 1)
        if expected_ver != current_ver:
            raise Conflict(f"Resource version conflict: current version is {current_ver}, If-Match was {expected_ver}")

    return case


def _parse_date(val: Any) -> date | None:
    if val is None:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        val_str = val.strip()
        if not val_str:
            return None
        return date.fromisoformat(val_str.split("T")[0])
    return None


# ---------------------------------------------------------------------------
# People Service
# ---------------------------------------------------------------------------
def list_people(case_id: str, uid: str) -> list[dict[str, Any]]:
    check_case_access(case_id, uid, for_mutation=False)
    return PersonRepo.list_by_case(case_id)


def create_person(
    case_id: str,
    data: dict[str, Any],
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    case = check_case_access(case_id, uid, if_match=if_match, for_mutation=True)

    full_name = data.get("full_name") or data.get("name")
    if not full_name:
        raise ValidationFailed("Person full_name is required")

    role = data.get("role", "HEIR").upper()
    if role not in ("DECEASED", "HEIR", "CLAIMANT"):
        raise ValidationFailed(f"Invalid role: {role}")

    # Validate at most one DECEASED person
    existing_people = PersonRepo.list_by_case(case_id)
    if role == "DECEASED":
        if any(p["role"] == "DECEASED" for p in existing_people):
            raise ValidationFailed("A case cannot have more than one deceased person")

    dob = _parse_date(data.get("dob"))
    dod = _parse_date(data.get("dod"))
    if dob and dod and dod < dob:
        raise ValidationFailed("Date of death cannot be before date of birth")

    is_alive = data.get("alive", True)
    if role == "DECEASED" or dod is not None:
        is_alive = False

    actor = f"user:{uid}"
    person_row = {
        "person_id": data.get("person_id", str(uuid.uuid4())),
        "case_id": case_id,
        "full_name": full_name,
        "role": role,
        "sex": data.get("sex", "M"),
        "dob": dob,
        "dod": dod,
        "personal_law": data.get("personal_law", "hindu"),
        "alive": is_alive,
        "eligibility": data.get("eligibility", "CLASS_I" if role == "HEIR" else None),
        "notes": data.get("notes"),
    }

    created = PersonRepo.create(person_row, actor=actor)
    updated_case = CasesRepo.get(case_id)
    new_version = updated_case["data_version"] if updated_case else case["data_version"] + 1

    publish_case_event(case_id, "case_changed", {"action": "person_created", "person_id": created["person_id"]})
    return {"entity": created, "case_version": new_version, "stale": True}


def update_person(
    person_id: str,
    updates: dict[str, Any],
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    person = PersonRepo.get(person_id)
    if not person or person.get("deleted"):
        raise NotFound(f"Person {person_id} not found")

    case_id = person["case_id"]
    check_case_access(case_id, uid, if_match=if_match, for_mutation=True, is_entity_lookup=True)

    cleaned_updates: dict[str, Any] = {}
    if "name" in updates and "full_name" not in updates:
        cleaned_updates["full_name"] = updates["name"]
    elif "full_name" in updates:
        cleaned_updates["full_name"] = updates["full_name"]

    if "role" in updates:
        new_role = updates["role"].upper()
        if new_role not in ("DECEASED", "HEIR", "CLAIMANT"):
            raise ValidationFailed(f"Invalid role: {new_role}")
        if new_role == "DECEASED" and person["role"] != "DECEASED":
            existing = PersonRepo.list_by_case(case_id)
            if any(p["role"] == "DECEASED" and p["person_id"] != person_id for p in existing):
                raise ValidationFailed("A case cannot have more than one deceased person")
        cleaned_updates["role"] = new_role

    if "dob" in updates:
        cleaned_updates["dob"] = _parse_date(updates["dob"])
    if "dod" in updates:
        cleaned_updates["dod"] = _parse_date(updates["dod"])

    final_dob = cleaned_updates.get("dob", person.get("dob"))
    final_dod = cleaned_updates.get("dod", person.get("dod"))
    if final_dob and final_dod and final_dod < final_dob:
        raise ValidationFailed("Date of death cannot be before date of birth")

    for k in ("sex", "personal_law", "alive", "eligibility", "notes"):
        if k in updates:
            cleaned_updates[k] = updates[k]

    if "is_alive" in updates and "alive" not in updates:
        cleaned_updates["alive"] = updates["is_alive"]

    actor = uid
    updated_person, next_ver = PersonRepo.update(case_id, person_id, cleaned_updates, actor=actor)

    publish_case_event(case_id, "case_changed", {"action": "person_updated", "person_id": person_id})
    return {"entity": updated_person, "case_version": next_ver, "stale": True}


def delete_person(
    person_id: str,
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    person = PersonRepo.get(person_id)
    if not person or person.get("deleted"):
        raise NotFound(f"Person {person_id} not found")

    case_id = person["case_id"]
    check_case_access(case_id, uid, if_match=if_match, for_mutation=True, is_entity_lookup=True)

    actor = f"user:{uid}"
    next_ver = PersonRepo.soft_delete(case_id, person_id, actor=actor)

    publish_case_event(case_id, "case_changed", {"action": "person_deleted", "person_id": person_id})
    return {"entity": {"person_id": person_id, "deleted": True}, "case_version": next_ver, "stale": True}


# ---------------------------------------------------------------------------
# Relationships Service
# ---------------------------------------------------------------------------
def create_relationship(
    case_id: str,
    data: dict[str, Any],
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    case = check_case_access(case_id, uid, if_match=if_match, for_mutation=True)

    from_id = data.get("from_id")
    to_id = data.get("to_id")
    rel_type = (data.get("rel_type") or "").upper()

    if not from_id or not to_id or not rel_type:
        raise ValidationFailed("from_id, to_id, and rel_type are required")

    if from_id == to_id:
        raise ValidationFailed("A person cannot be their own relative")

    if rel_type not in VALID_REL_TYPES:
        raise ValidationFailed(f"Invalid relationship type: {rel_type}. Must be one of {VALID_REL_TYPES}")

    p_from = PersonRepo.get(from_id)
    p_to = PersonRepo.get(to_id)
    if not p_from or p_from.get("deleted") or p_from["case_id"] != case_id:
        raise ValidationFailed(f"Person {from_id} does not exist in this case")
    if not p_to or p_to.get("deleted") or p_to["case_id"] != case_id:
        raise ValidationFailed(f"Person {to_id} does not exist in this case")

    valid_from_str = data.get("valid_from")
    valid_from_ts = datetime.fromisoformat(valid_from_str.replace("Z", "+00:00")) if valid_from_str else None

    actor = f"user:{uid}"
    rel_data = {
        "from_id": from_id,
        "to_id": to_id,
        "rel_type": rel_type,
        "case_id": case_id,
    }
    RelationshipRepo.insert(rel_data, actor=actor, valid_from=valid_from_ts)

    updated_case = CasesRepo.get(case_id)
    new_version = updated_case["data_version"] if updated_case else case["data_version"] + 1

    publish_case_event(case_id, "case_changed", {"action": "relationship_created", "from_id": from_id, "to_id": to_id})
    return {
        "entity": {
            "id": f"{from_id}:{to_id}:{rel_type}",
            "from_id": from_id,
            "to_id": to_id,
            "rel_type": rel_type,
            "case_id": case_id,
        },
        "case_version": new_version,
        "stale": True,
    }


def _parse_rid(rid: str) -> tuple[str, str, str | None]:
    parts = rid.split(":")
    if len(parts) >= 3:
        return parts[0], parts[1], parts[2]
    if len(parts) == 2:
        return parts[0], parts[1], None
    raise ValidationFailed(f"Invalid relationship id format: {rid}. Expected 'from_id:to_id' or 'from_id:to_id:rel_type'")


def update_relationship(
    rid: str,
    data: dict[str, Any],
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    from_id, to_id, old_rel_type = _parse_rid(rid)
    p_from = PersonRepo.get(from_id)
    if not p_from or p_from.get("deleted"):
        raise NotFound(f"Relationship {rid} not found")

    case_id = p_from["case_id"]
    check_case_access(case_id, uid, if_match=if_match, for_mutation=True, is_entity_lookup=True)

    new_rel_type = (data.get("rel_type") or "").upper()
    if not new_rel_type or new_rel_type not in VALID_REL_TYPES:
        raise ValidationFailed(f"Invalid or missing replacement rel_type: {new_rel_type}")

    active_rels = RelationshipRepo.list_by_case(case_id)
    matching = [r for r in active_rels if r["from_id"] == from_id and r["to_id"] == to_id]
    if old_rel_type:
        matching = [r for r in matching if r["rel_type"] == old_rel_type]
    if not matching:
        raise NotFound(f"Active relationship {rid} not found")

    target_old_type = matching[0]["rel_type"]
    actor = f"user:{uid}"
    valid_from_str = data.get("valid_from")
    eff_date = datetime.fromisoformat(valid_from_str.replace("Z", "+00:00")) if valid_from_str else now_utc()

    new_edge = {
        "from_id": from_id,
        "to_id": to_id,
        "rel_type": new_rel_type,
        "case_id": case_id,
    }
    RelationshipRepo.supersede(
        case_id=case_id,
        from_id=from_id,
        to_id=to_id,
        rel_type=target_old_type,
        new_data=new_edge,
        actor=actor,
        effective_date=eff_date,
    )

    updated_case = CasesRepo.get(case_id)
    new_version = updated_case["data_version"] if updated_case else 1

    publish_case_event(case_id, "case_changed", {"action": "relationship_updated", "from_id": from_id, "to_id": to_id})
    return {
        "entity": {
            "id": f"{from_id}:{to_id}:{new_rel_type}",
            "from_id": from_id,
            "to_id": to_id,
            "rel_type": new_rel_type,
            "case_id": case_id,
        },
        "case_version": new_version,
        "stale": True,
    }


def delete_relationship(
    rid: str,
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    from_id, to_id, target_rel_type = _parse_rid(rid)
    p_from = PersonRepo.get(from_id)
    if not p_from or p_from.get("deleted"):
        raise NotFound(f"Relationship {rid} not found")

    case_id = p_from["case_id"]
    check_case_access(case_id, uid, if_match=if_match, for_mutation=True, is_entity_lookup=True)

    active_rels = RelationshipRepo.list_by_case(case_id)
    matching = [r for r in active_rels if r["from_id"] == from_id and r["to_id"] == to_id]
    if target_rel_type:
        matching = [r for r in matching if r["rel_type"] == target_rel_type]
    if not matching:
        raise NotFound(f"Active relationship {rid} not found")

    rel_to_close = matching[0]["rel_type"]
    actor = f"user:{uid}"
    next_ver = RelationshipRepo.close(case_id, from_id, to_id, rel_to_close, actor=actor)

    publish_case_event(case_id, "case_changed", {"action": "relationship_deleted", "rid": rid})
    return {"entity": {"rid": rid, "deleted": True}, "case_version": next_ver, "stale": True}


# ---------------------------------------------------------------------------
# Assets Service
# ---------------------------------------------------------------------------
def list_assets(case_id: str, uid: str) -> list[dict[str, Any]]:
    check_case_access(case_id, uid, for_mutation=False)
    assets = AssetRepo.list_by_case(case_id)
    # Populate current nominees per asset
    nominees = NomineeRepo.list_by_case(case_id)
    nominee_map: dict[str, list[dict[str, Any]]] = {}
    for n in nominees:
        nominee_map.setdefault(n["asset_id"], []).append(n)

    for a in assets:
        a["nominees"] = nominee_map.get(a["asset_id"], [])
    return assets


def get_asset(asset_id: str, uid: str) -> dict[str, Any]:
    asset = AssetRepo.get(asset_id)
    if not asset or asset.get("deleted"):
        raise NotFound(f"Asset {asset_id} not found")
    case_id = asset["case_id"]
    check_case_access(case_id, uid, for_mutation=False, is_entity_lookup=True)

    # Attach current nominees
    nominees = NomineeRepo.list_by_case(case_id)
    asset["nominees"] = [n for n in nominees if n["asset_id"] == asset_id]
    return asset


def create_asset(
    case_id: str,
    data: dict[str, Any],
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    case = check_case_access(case_id, uid, if_match=if_match, for_mutation=True)

    asset_type = (data.get("type") or "SAVINGS").upper()
    if asset_type not in VALID_ASSET_TYPES:
        raise ValidationFailed(f"Invalid asset type: {asset_type}. Must be one of {VALID_ASSET_TYPES}")

    raw_val = data.get("estimated_value_inr") or data.get("est_value_inr") or 0
    try:
        val_dec = Decimal(str(raw_val))
    except Exception:
        raise ValidationFailed("Asset value must be a valid decimal") from None

    if asset_type == "LOAN" and val_dec > Decimal("0"):
        raise ValidationFailed("LOAN assets must have value <= 0")
    elif asset_type != "LOAN" and val_dec < Decimal("0"):
        raise ValidationFailed("Non-loan assets must have value >= 0")

    actor = f"user:{uid}"
    label = data.get("label") or f"{data.get('institution', 'Asset')} ({data.get('account_number_masked', '')})"
    asset_row = {
        "asset_id": data.get("asset_id", str(uuid.uuid4())),
        "case_id": case_id,
        "institution_id": data.get("institution_id") or data.get("institution"),
        "type": asset_type,
        "label": label,
        "account_ref_masked": data.get("account_number_masked") or data.get("account_ref_masked"),
        "est_value_inr": val_dec,
        "ownership": data.get("ownership", "SOLE"),
        "source_doc_id": data.get("source_doc_id"),
        "extraction_confidence": data.get("extraction_confidence", 0.95),
        "status": data.get("status", "LOCATED"),
    }
    created = AssetRepo.create(asset_row, actor=actor)
    updated_case = CasesRepo.get(case_id)
    new_version = updated_case["data_version"] if updated_case else case["data_version"] + 1

    publish_case_event(case_id, "case_changed", {"action": "asset_created", "asset_id": created["asset_id"]})
    return {"entity": created, "case_version": new_version, "stale": True}


def update_asset(
    asset_id: str,
    updates: dict[str, Any],
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    asset = AssetRepo.get(asset_id)
    if not asset or asset.get("deleted"):
        raise NotFound(f"Asset {asset_id} not found")

    case_id = asset["case_id"]
    check_case_access(case_id, uid, if_match=if_match, for_mutation=True, is_entity_lookup=True)

    cleaned_updates: dict[str, Any] = {}
    if "type" in updates:
        t = updates["type"].upper()
        if t not in VALID_ASSET_TYPES:
            raise ValidationFailed(f"Invalid asset type: {t}")
        cleaned_updates["type"] = t

    target_type = cleaned_updates.get("type", asset["type"])

    raw_val = updates.get("estimated_value_inr") or updates.get("est_value_inr")
    if raw_val is not None:
        try:
            val_dec = Decimal(str(raw_val))
        except Exception:
            raise ValidationFailed("Asset value must be a valid decimal") from None

        if target_type == "LOAN" and val_dec > Decimal("0"):
            raise ValidationFailed("LOAN assets must have value <= 0")
        elif target_type != "LOAN" and val_dec < Decimal("0"):
            raise ValidationFailed("Non-loan assets must have value >= 0")
        cleaned_updates["est_value_inr"] = val_dec

    for k in ("label", "account_ref_masked", "ownership", "status", "institution_id"):
        if k in updates:
            cleaned_updates[k] = updates[k]
    if "account_number_masked" in updates:
        cleaned_updates["account_ref_masked"] = updates["account_number_masked"]

    actor = f"user:{uid}"
    updated_asset, next_ver = AssetRepo.update(case_id, asset_id, cleaned_updates, actor=actor)

    publish_case_event(case_id, "case_changed", {"action": "asset_updated", "asset_id": asset_id})
    return {"entity": updated_asset, "case_version": next_ver, "stale": True}


def delete_asset(
    asset_id: str,
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    asset = AssetRepo.get(asset_id)
    if not asset or asset.get("deleted"):
        raise NotFound(f"Asset {asset_id} not found")

    case_id = asset["case_id"]
    check_case_access(case_id, uid, if_match=if_match, for_mutation=True, is_entity_lookup=True)

    actor = f"user:{uid}"
    next_ver = AssetRepo.soft_delete(case_id, asset_id, actor=actor)

    publish_case_event(case_id, "case_changed", {"action": "asset_deleted", "asset_id": asset_id})
    return {"entity": {"asset_id": asset_id, "deleted": True}, "case_version": next_ver, "stale": True}


def update_nominees(
    asset_id: str,
    nominees_list: list[dict[str, Any]],
    uid: str,
    if_match: str | None = None,
    valid_from: datetime | None = None,
) -> dict[str, Any]:
    asset = AssetRepo.get(asset_id)
    if not asset or asset.get("deleted"):
        raise NotFound(f"Asset {asset_id} not found")

    case_id = asset["case_id"]
    check_case_access(case_id, uid, if_match=if_match, for_mutation=True, is_entity_lookup=True)

    # Validation: nominee shares per asset total exactly 100 or the list is empty
    if nominees_list:
        total_share = Decimal("0")
        for n in nominees_list:
            pid = n.get("person_id")
            if not pid:
                raise ValidationFailed("Nominee person_id is required")
            person = PersonRepo.get(pid)
            if not person or person.get("deleted") or person["case_id"] != case_id:
                raise ValidationFailed(f"Nominee person {pid} does not exist in this case")

            try:
                pct = Decimal(str(n.get("share_pct", 0)))
            except Exception:
                raise ValidationFailed("Nominee share_pct must be numeric") from None

            if pct <= Decimal("0"):
                raise ValidationFailed("Nominee share_pct must be greater than 0")
            total_share += pct

        if total_share != Decimal("100"):
            raise ValidationFailed(f"Nominee shares must total exactly 100%, got {total_share}%")

    actor = f"user:{uid}"
    eff_date = valid_from if valid_from is not None else now_utc()
    saved_nominees, next_ver = NomineeRepo.replace_all_for_asset(
        case_id=case_id,
        asset_id=asset_id,
        nominees=nominees_list,
        actor=actor,
        effective_date=eff_date,
    )

    publish_case_event(case_id, "case_changed", {"action": "nominees_replaced", "asset_id": asset_id})
    return {"entity": {"asset_id": asset_id, "nominees": saved_nominees}, "case_version": next_ver, "stale": True}


# ---------------------------------------------------------------------------
# Will Service
# ---------------------------------------------------------------------------
def get_will(case_id: str, uid: str) -> dict[str, Any]:
    check_case_access(case_id, uid, for_mutation=False)
    will = WillRepo.get_by_case(case_id)
    if not will:
        return {"case_id": case_id, "has_will": False, "status": "NONE", "bequests": []}
    return {
        "case_id": case_id,
        "has_will": will["status"] != "NONE",
        "will_id": will["will_id"],
        "status": will["status"],
        "executed_on": will["executed_on"],
        "bequests": will["bequests"] or [],
    }


def update_will(
    case_id: str,
    data: dict[str, Any],
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    check_case_access(case_id, uid, if_match=if_match, for_mutation=True)

    status = (data.get("status") or "DRAFT").upper()
    executed_on = _parse_date(data.get("executed_on") or data.get("execution_date"))
    bequests = data.get("bequests") or []

    # Validation: residuary total in (0, 100], every person and asset exists
    existing_people = {p["person_id"]: p for p in PersonRepo.list_by_case(case_id)}
    existing_assets = {a["asset_id"]: a for a in AssetRepo.list_by_case(case_id)}

    residuary_total = Decimal("0")
    has_residuary = False

    for b in bequests:
        pid = b.get("person_id")
        aid = b.get("asset_id")

        if not pid or pid not in existing_people:
            raise ValidationFailed(f"Will bequest references unknown person {pid}")

        if aid is not None and aid not in existing_assets:
            raise ValidationFailed(f"Will bequest references unknown asset {aid}")

        try:
            pct = Decimal(str(b.get("share_pct", 0)))
        except Exception:
            raise ValidationFailed("Bequest share_pct must be numeric") from None

        if pct <= Decimal("0"):
            raise ValidationFailed("Bequest share_pct must be greater than 0")

        if aid is None:
            has_residuary = True
            residuary_total += pct

    if has_residuary and not (Decimal("0") < residuary_total <= Decimal("100")):
        raise ValidationFailed(f"Residuary bequests total must be in (0, 100], got {residuary_total}%")

    actor = f"user:{uid}"
    saved_will, next_ver = WillRepo.upsert(
        case_id=case_id,
        status=status,
        executed_on=executed_on,
        bequests=bequests,
        actor=actor,
    )

    publish_case_event(case_id, "case_changed", {"action": "will_updated", "case_id": case_id})
    return {"entity": saved_will, "case_version": next_ver, "stale": True}


# ---------------------------------------------------------------------------
# Consent Service
# ---------------------------------------------------------------------------
def get_consent(case_id: str, uid: str) -> dict[str, Any]:
    check_case_access(case_id, uid, for_mutation=False)
    consents = ConsentRepo.list_by_case(case_id)
    people = PersonRepo.list_by_case(case_id)
    consent_map = {c["person_id"]: c["status"] for c in consents}

    parties = []
    given_count = 0
    for p in people:
        if p["role"] in ("HEIR", "CLAIMANT"):
            st = consent_map.get(p["person_id"], "PENDING")
            if st == "GIVEN":
                given_count += 1
            parties.append({
                "person_id": p["person_id"],
                "party_id": p["person_id"],
                "name": p["full_name"],
                "role": p["role"],
                "status": st,
            })

    return {
        "case_id": case_id,
        "parties": parties,
        "total_required": len(parties),
        "total_given": given_count,
    }


def update_consent(
    case_id: str,
    data: dict[str, Any],
    uid: str,
    if_match: str | None = None,
) -> dict[str, Any]:
    check_case_access(case_id, uid, if_match=if_match, for_mutation=True)

    person_id = data.get("party_id") or data.get("person_id")
    if not person_id:
        raise ValidationFailed("person_id or party_id is required")

    person = PersonRepo.get(person_id)
    if not person or person.get("deleted") or person["case_id"] != case_id:
        raise ValidationFailed(f"Person {person_id} does not exist in case {case_id}")

    if "status" in data:
        st = data["status"].upper()
    elif "given" in data:
        st = "GIVEN" if data["given"] else "DECLINED"
    else:
        st = "PENDING"

    if st not in ("PENDING", "GIVEN", "DECLINED"):
        raise ValidationFailed(f"Invalid consent status: {st}")

    actor = f"user:{uid}"
    saved_consent, next_ver = ConsentRepo.upsert_status(case_id, person_id, st, actor=actor)

    publish_case_event(case_id, "case_changed", {"action": "consent_updated", "person_id": person_id})
    return {"entity": saved_consent, "case_version": next_ver, "stale": True}


# ---------------------------------------------------------------------------
# History and Audit Service
# ---------------------------------------------------------------------------
def get_history(
    case_id: str,
    entity: str | None,
    entity_id: str | None,
    uid: str,
) -> list[dict[str, Any]]:
    check_case_access(case_id, uid, for_mutation=False)
    return HistoryRepo.get_history(case_id, entity=entity, entity_id=entity_id)


def get_audit(case_id: str, uid: str) -> list[dict[str, Any]]:
    check_case_access(case_id, uid, for_mutation=False)
    return list_audit_entries(case_id)


def verify_audit(case_id: str, uid: str) -> dict[str, Any]:
    check_case_access(case_id, uid, for_mutation=False)
    return verify_audit_chain(case_id)
