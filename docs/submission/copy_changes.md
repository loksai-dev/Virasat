# Virasat: Copy Audit & Truthful Claims Log

Every claim on the Virasat landing page and public submission materials was audited for factual accuracy and product truthfulness. Below is the itemized record of every sentence altered, its previous wording, new wording, and the rationale for the change.

---

## Itemized Copy Changes

| Location | Prior Text (Before) | Truthful Text (After) | Audit Rationale |
| :--- | :--- | :--- | :--- |
| **Landing Page: Trust Strip Heading** | `Built on Google Cloud & National Digital Public Infrastructure` | `Built on Google Cloud` | Accurately describes deployed architecture (GCP Cloud Run, Spanner, Vertex AI, Firebase). Avoids implying government affiliation with DPI. |
| **Landing Page: Regulatory Guidance** | `Compliant with RBI Circular DBOD/2005 & IRDAI Deceased Claims Guidelines` | `Informed by public RBI and IRDAI claim-settlement guidance. Guidance, not legal advice.` | Distinguishes between being informed by public regulatory guidance and making an affirmative regulatory compliance guarantee. |
| **Landing Page: Firebase Badge** | `Real-time STP Pipeline` | `Authentication & Hosting` | Accurately represents the specific Google Cloud services provided by Firebase in Virasat (Firebase Auth & Firebase Hosting). |
| **Landing Page: Encrypted Vault Badge** | `AES-256 & DigiLocker SHA-256 seal` | `Encrypted at rest on Google Cloud. SHA-256 hash-chained audit log.` | Virasat uses Google Cloud native AES-256 KMS encryption and internal SHA-256 audit chaining; removes DigiLocker claim where direct API integration is not active. |
| **Landing Page: Audit Badge** | `Cryptographic tamper-evident docket` | `Tamper-evident audit trail & cryptographic verification` | Accurately highlights the real immutable audit log and `AnswerVerifier` verification system. |
| **Landing Page: Step 1 (Upload)** | `Upload death certificate or fetch instantly via DigiLocker. Virasat cryptographically validates municipal registry seals in seconds.` | `Upload death certificate or probate copy. Virasat cryptographically validates municipal registry seals and document integrity in seconds.` | Truthfully reflects the manual file upload and OCR verification capability without claiming a live external DigiLocker gateway. |
| **Landing Page: Ops Console Claims** | `100% Cryptographic verification: Eliminates paper forgery with DigiLocker and graph integrity.` | `100% Cryptographic verification: Eliminates paper forgery with tamper-evident SHA-256 audit trails and graph integrity.` | Correctly credits the internal SHA-256 bitemporal audit trail and property graph integrity. |
| **Landing Page: Security Vault Description** | `All death certificates, succession orders, and identity dockets are encrypted with AES-256 at rest and TLS 1.3 in transit with DigiLocker SHA-256 hashing.` | `All death certificates, succession orders, and identity dockets are encrypted with AES-256 at rest and TLS 1.3 in transit with SHA-256 hash-chained integrity verification.` | Replaces unintegrated DigiLocker hash claim with verified Cloud Spanner SHA-256 hash-chaining. |
| **Landing Page: Footer Link** | `Security & DigiLocker` | `Security & Audit Trail` | Consistent naming without unintegrated brand claim. |
| **Interactive Hero Card: Top Banner** | *(Missing notice)* | `Sample case, synthetic data` | Explicitly informs evaluators and judges that the card depicts synthetic demo data for the Sharma estate. |
| **Interactive Hero Card: Seal Footer** | `DigiLocker Cryptographic Seal Valid` | `SHA-256 Hash-Chained Audit Seal` | Reflects true mathematical hash-chain verification. |
| **Interactive Hero Card: Floating Badge 1** | `DigiLocker Certified SHA-256` | `Tamper-Evident SHA-256 Audit Seal` | Accurately reflects internal audit verification. |
| **Interactive Hero Card: Floating Badge 2** | `3 Autonomous Agents Active` | `5 Autonomous Agents Active` | Matches actual pipeline code in `orchestrator.py` (`IntakeAgent`, `AssetDiscoveryAgent`, `LegalEligibilityAgent`, `ClaimsPackagerAgent`, `FraudDisputeAgent`). |

---

## Review of Other Artifacts

- **`README.md`**: Confirmed clean; no unintegrated DigiLocker or DBOD compliance claims.
- **`docs/submission/ppt.md`**: Confirmed DigiLocker and Account Aggregator references are exclusively placed under the future ecosystem roadmap (Phase 3).
- **`scripts/export_deck_pdf.py`**: Confirmed roadmap slide matches `ppt.md`.
- **`docs/submission/description.md`**: Confirmed truthful description of Google Cloud and Hindu Succession Act engine.
