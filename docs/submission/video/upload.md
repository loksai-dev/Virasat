# Virasat — AI Builder Cup 2026: Video Submission & Upload Guide

This document provides exact, end-to-end instructions for uploading the official Virasat demonstration video to **YouTube** (or Google Drive/Vimeo) as a **Public** link for the **Google Cloud AI Builder Cup 2026** submission.

---

## 1. Submission Video Metadata

| Field | Value |
| :--- | :--- |
| **Video File** | `docs/submission/video/final.mp4` (1080p Full HD, H.264 / AAC) |
| **Duration** | **02:51** (171.0 seconds) • Strict Compliance: `< 03:00` (Target `02:50`) |
| **Thumbnail** | `docs/submission/video/thumbnail.png` (1280 × 720 px, Brand Palette) |
| **Subtitles** | `docs/submission/video/narration.srt` (English subtitles) |
| **Video Title** | **Virasat — Autonomous Estate Settlement Mesh (AI Builder Cup 2026)** |

---

## 2. YouTube Video Description (Copy & Paste)

```markdown
Virasat is India's first autonomous estate settlement mesh, transforming months of fragmented paperwork, uncataloged bank folios, and succession disputes into a dignified, 45-minute resolution for grieving families.

Built for the Google Cloud AI Builder Cup 2026.

🌐 LIVE PLATFORM: https://virasat-511210.web.app
💻 OPEN SOURCE CODEBASE: https://github.com/loksai-dev/Virasat
📊 ARCHITECTURE & BENCHMARKS: https://github.com/loksai-dev/Virasat/tree/main/docs/submission

Key Features & Engineering Highlights:
• Cloud Spanner Property Graph: Stores bi-temporal relationships, valid-time vs transaction-time kinship records, and asset folios.
• Vertex AI Gemini 2.5 Flash & Pro: Ingests municipal death certificates, extracts unstructured documents, verifies statutory citations, and assists families in Hindi and Telugu.
• Deterministic Legal Rules Engine: 100% zero-LLM math. Computes exact Class-I and Class-II legal shares under Section 8, 9, and 10 of the Hindu Succession Act, 1956.
• Automated Claims Packaging: Generates institution-compliant Form A transmission packets, indemnity affidavits, and statutory notices for SBI, EPFO, IRDAI, and SEBI.
• Dispute Guard: Flags adverse caveats, unnotarized memoranda, and fraudulent timeline contradictions before probate.
• SHA-256 Hash-Chained Audit Trail: Cryptographic tamper-evident provenance across every state transition.

Empirical Production Evaluation (30 Golden Cases):
• 100% Legal Share Accuracy across 30 golden test estates
• 100% Defect & Fraud Recall across 10 adversarial corrupted estates
• $0.015 (₹1.3) Total Execution Cost per complete estate run
• 15.1s p50 End-to-End Latency

Video Chapters:
0:00 Problem: ₹1.8 Lakh Crore Unclaimed Inheritance Crisis
0:20 Solution: Virasat Autonomous Estate Mesh
0:35 Live Demo: Entering as Judge & Raw Document Ingestion
0:50 Autonomous Multi-Agent Mesh Execution (2x)
1:05 Settlement Overview Dashboard (₹2.84 Cr across 12 Assets)
1:18 Bi-Temporal Kinship Graph & Time-Travel Slider
1:28 Deterministic Legal Shares (Zero LLM Math) & Citations
1:36 Institutional Claims Packaging (SBI Form A & Affidavits)
1:43 Dispute Guard: Catching Planted Caveats
1:47 Ask Virasat: Multilingual Legal Guidance in Hindi & Telugu
1:50 Under the Hood: Google Cloud Multi-Agent Architecture
2:08 Enterprise Safety Guardrails & Cryptographic Audit Chains
2:25 Empirical Production Evaluation & Cost Analysis
2:38 Closing Tagline & Live URL

Responsible AI Disclosure:
Virasat provides legal-technology decision support and document preparation, not binding judicial advice. All case names, asset folios, and scenarios demonstrated utilize realistic synthetic test data.
```

---

## 3. Step-by-Step YouTube Upload Instructions

### Step 1: Open YouTube Studio
1. Open your browser and navigate to [https://studio.youtube.com](https://studio.youtube.com).
2. Ensure you are signed in with your project/personal Google account.
3. Click the **CREATE** button (top-right camera icon) and select **Upload videos**.

### Step 2: Upload Files
1. Drag and drop `docs/submission/video/final.mp4`.
2. Under **Thumbnail**, click **Upload thumbnail** and select `docs/submission/video/thumbnail.png`.
3. Under **Playlists** (optional), create or select "AI Builder Cup 2026".
4. Under **Audience**, select **"No, it's not made for kids"** (standard setting for software demos).

### Step 3: Add Subtitles
1. In the **Video elements** tab, click **Add** next to **Subtitles**.
2. Choose **Upload file** $\rightarrow$ **With timing** $\rightarrow$ Select `docs/submission/video/narration.srt`.
3. Confirm that the English subtitles render properly in preview and click **Done**.

### Step 4: Set Visibility to PUBLIC (Mandatory)
1. In the **Visibility** tab, select **Public** (or **Unlisted** if explicitly allowed by contest rules, but **Public** guarantees judge access).
2. Do **NOT** set to *Private*.
3. Click **Publish**.

---

## 4. Verification in a Logged-Out Browser (Crucial QA)

Judges must be able to view your video without logging into YouTube or requesting permissions.

1. Copy the public watch URL (e.g., `https://youtu.be/XXXXXXXXXXX` or `https://www.youtube.com/watch?v=XXXXXXXXXXX`).
2. Open a **New Incognito Window** (`Ctrl + Shift + N` on Windows).
3. Paste the URL and verify:
   - [ ] The video starts immediately without a sign-in wall or permission prompt.
   - [ ] The video resolution option shows **1080p HD**.
   - [ ] Subtitles (CC button) display in sync.
   - [ ] Audio loudness is clear, balanced, and normalized (-16 LUFS).
   - [ ] The description links (`https://virasat-511210.web.app` and GitHub) are clickable and work.

---

## 5. Alternative / Backup Options

If your submission portal permits Google Drive or Vimeo:
- **Google Drive**:
  1. Upload `docs/submission/video/final.mp4` to your Google Drive.
  2. Right-click the file $\rightarrow$ **Share** $\rightarrow$ **General access** $\rightarrow$ Change from *Restricted* to **Anyone with the link**.
  3. Ensure role is set to **Viewer**.
  4. Test the link in an Incognito window to confirm it plays directly in the web preview player without requesting access.
- **Vimeo**:
  1. Upload `final.mp4` to Vimeo.
  2. Set privacy to **Public** or **Anyone with the unlisted link**.
