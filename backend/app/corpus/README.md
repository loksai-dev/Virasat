# Virasat Legal Corpus

This directory contains paraphrased legal summaries, statutory succession rules, and institutional settlement procedures for Virasat's GraphRAG engine.

> [!IMPORTANT]
> **MANDATORY HUMAN VERIFICATION NOTICE**
> A human legal reviewer must verify every chunk in this corpus against the official gazette, statute, or institutional master circular text before production deployment or formal demonstration. 
> All chunks are currently marked with `needs_review: true`.
> The output provided by Virasat is strictly guidance, not legal advice.

## Corpus Sources and Chunks

The corpus covers 47 chunks across 8 core source documents:
1. `hindu_succession_act.md`: Hindu Succession Act, 1956 (Intestate succession for males and females, Class I & Class II heirs, coparcenary devolution)
2. `indian_succession_act.md`: Indian Succession Act, 1925 (Wills, testamentary capacity, attestation formalities, probate, succession certificates, letters of administration)
3. `rbi_deceased_depositors.md`: Reserve Bank of India Master Directives (Deceased depositors claims with/without nominee, timelines, locker access, nominee as custodian)
4. `insurance_act_nomination.md`: Insurance Act, 1938 & IRDAI Guidelines (Section 39 nomination, beneficial nominees, death claim documents)
5. `sebi_transmission_regulations.md`: SEBI Regulations (Demat share transmission with/without nominee, documentation, SLAs)
6. `epf_ppf_rules.md`: EPF & PPF Statutory Schemes (Employees' provident fund settlement, EDLI benefits, public provident fund death claims)
7. `property_vehicle_transfer.md`: Immovable Property & Motor Vehicles (Municipal mutation, registered wills, RTO vehicle transmission)
8. `estate_claim_procedures.md`: Standard BFSI Claim Procedures (Legal heir certificate, indemnity bonds, death certificates, KYC verification, consent affidavits)

## Front-Matter Specification

Each chunk contains YAML front-matter:
```yaml
---
clause_id: HSA-1956-S8
source: "Hindu Succession Act, 1956"
section: "8"
jurisdiction: "India"
topic: "General Rules of Succession in the Case of Males"
needs_review: true
official_url: "https://www.indiacode.nic.in/handle/123456789/1622"
---
```
Sections are populated only when strictly certain from the underlying statute; otherwise left empty (`""`). No artificial circular numbers or arbitrary promulgation dates are introduced.
