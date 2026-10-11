"""Document generator for Virasat seed cases.

Generates realistic PDFs and scanned-looking PNG/JPG documents using
ReportLab and Pillow with fabricated numbers, realistic layouts,
and a small 'SYNTHETIC SAMPLE' footer.

Uploads documents to gs://virasat-511210-docs/seed/<seed_key>/
and caches ground-truth extraction metadata to backend/app/seed/cache/.
"""

import json
import random
import sys
from pathlib import Path
from typing import Any

# Ensure backend directory is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from google.cloud import storage
from PIL import Image, ImageDraw, ImageFilter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.config import get_settings

SEED_DOCS_DIR = Path(__file__).resolve().parent.parent / "app" / "seed" / "docs"
SEED_CACHE_DIR = Path(__file__).resolve().parent.parent / "app" / "seed" / "cache"


def ensure_dirs():
    SEED_DOCS_DIR.mkdir(parents=True, exist_ok=True)
    SEED_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (SEED_DOCS_DIR / "sharma").mkdir(parents=True, exist_ok=True)
    (SEED_DOCS_DIR / "mehta").mkdir(parents=True, exist_ok=True)
    (SEED_CACHE_DIR / "sharma").mkdir(parents=True, exist_ok=True)
    (SEED_CACHE_DIR / "mehta").mkdir(parents=True, exist_ok=True)


def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(colors.HexColor("#718096"))
    canvas.drawCentredString(A4[0] / 2.0, 20, "SYNTHETIC SAMPLE — FOR DEMONSTRATION PURPOSES ONLY — VIRASAT AI")
    canvas.setStrokeColor(colors.HexColor("#CBD5E0"))
    canvas.setLineWidth(0.5)
    canvas.line(40, 32, A4[0] - 40, 32)
    canvas.restoreState()


def create_pdf(filepath: Path, title: str, subtitle: str, content_elements: list[Any]):
    """Generate a clean, official-looking PDF document."""
    doc = SimpleDocTemplate(
        str(filepath),
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=45,
    )
    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        "HeaderTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#1A202C"),
        alignment=1,
    )
    sub_style = ParagraphStyle(
        "SubTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4A5568"),
        alignment=1,
    )

    story = [
        Paragraph(title.upper(), header_style),
        Spacer(1, 4),
        Paragraph(subtitle, sub_style),
        Spacer(1, 15),
    ]
    story.extend(content_elements)
    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)


def create_scanned_image(filepath: Path, title: str, subtitle: str, fields: list[tuple[str, str]], rotation: float = 0.5):
    """Generate an authentic-looking scanned ID/certificate with slight rotation and noise using Pillow."""
    width, height = 1200, 800
    img = Image.new("RGB", (width, height), color=(252, 252, 248))
    draw = ImageDraw.Draw(img)

    # Borders and header banner
    draw.rectangle([20, 20, width - 20, height - 20], outline=(160, 160, 160), width=2)
    draw.rectangle([25, 25, width - 25, 120], fill=(235, 240, 248))

    # Basic text rendering (fallback to default font)
    draw.text((width // 2 - 200, 45), title.upper(), fill=(20, 40, 80))
    draw.text((width // 2 - 180, 75), subtitle, fill=(70, 70, 70))

    # Photo box placeholder
    draw.rectangle([50, 160, 250, 420], outline=(180, 180, 180), fill=(240, 240, 240), width=1)
    draw.text((90, 280), "PHOTO IDENTIFIER", fill=(120, 120, 120))

    # Fields
    y = 160
    for label, val in fields:
        draw.text((290, y), f"{label.upper()}:", fill=(60, 60, 60))
        draw.text((500, y), str(val), fill=(10, 10, 10))
        y += 45

    # Footer note
    draw.text((width // 2 - 220, height - 50), "SYNTHETIC SAMPLE — FOR DEMONSTRATION ONLY", fill=(130, 130, 130))

    # Add light noise / grain
    pixels = img.load()
    for _ in range(3000):
        rx = random.randint(0, width - 1)
        ry = random.randint(0, height - 1)
        c = random.randint(180, 240)
        pixels[rx, ry] = (c, c, c)

    # Slight rotation simulating physical scanner placement
    img = img.rotate(rotation, resample=Image.Resampling.BICUBIC, expand=False, fillcolor=(255, 255, 255))
    img = img.filter(ImageFilter.SMOOTH_MORE)
    img.save(filepath, "PNG")


def generate_all_documents():
    """Build all documents for Sharma and Mehta seed cases and save ground truth JSON."""
    ensure_dirs()
    styles = getSampleStyleSheet()

    table_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EDF2F7")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#2D3748")),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
    ])

    # =========================================================================
    # SHARMA SCENARIO DOCUMENTS
    # =========================================================================
    sharma_docs = []

    # 1. Death Certificate
    p_death = SEED_DOCS_DIR / "sharma" / "doc-sharma-01.pdf"
    content = [
        Paragraph("<b>GREATER HYDERABAD MUNICIPAL CORPORATION</b><br/>Department of Vital Statistics", styles["Normal"]),
        Spacer(1, 10),
        Table([
            ["Registration No", "HYD/2026/D/004512", "Date of Registration", "2026-03-20"],
            ["Name of Deceased", "RAMESH SHARMA", "Sex", "Male"],
            ["Date of Death", "2026-03-14", "Place of Death", "Care Hospital, Banjara Hills, Hyderabad"],
            ["Age at Death", "67 Years", "Permanent Address", "Plot 42, Jubilee Hills, Hyderabad"],
            ["Father's Name", "Late Narayana Sharma", "Mother's Name", "Kamala Sharma"],
            ["Spouse Name", "Sunita Sharma", "Cause of Death", "Cardio-respiratory arrest"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_death, "FORM NO. 6 — DEATH CERTIFICATE", "Issued under Section 12/17 of the Registration of Births and Deaths Act, 1969", content)
    sharma_docs.append(("doc-sharma-01", p_death, {
        "doc_type": "DEATH_CERTIFICATE",
        "deceased_name": "Ramesh Sharma",
        "dod": "2026-03-14",
        "place": "Hyderabad",
        "cert_no": "HYD/2026/D/004512",
        "spouse": "Sunita Sharma",
        "mother": "Kamala Sharma",
    }))

    # 2. Aadhaar Ramesh (Scanned Image)
    p_id_ramesh = SEED_DOCS_DIR / "sharma" / "doc-sharma-02.png"
    create_scanned_image(
        p_id_ramesh,
        "Unique Identification Authority of India",
        "Government of India — Aadhaar Card",
        [("Name", "Ramesh Sharma"), ("Date of Birth", "12/06/1958"), ("Gender", "Male"), ("Aadhaar No", "XXXX XXXX 4821"), ("Address", "Banjara Hills, Hyderabad")],
        rotation=0.4,
    )
    sharma_docs.append(("doc-sharma-02", p_id_ramesh, {"doc_type": "ID_PROOF", "person_name": "Ramesh Sharma", "uid_masked": "…4821", "dob": "1958-06-12"}))

    # 3. Aadhaar Sunita (Scanned Image)
    p_id_sunita = SEED_DOCS_DIR / "sharma" / "doc-sharma-03.png"
    create_scanned_image(
        p_id_sunita,
        "Unique Identification Authority of India",
        "Government of India — Aadhaar Card",
        [("Name", "Sunita Sharma"), ("Date of Birth", "20/08/1962"), ("Gender", "Female"), ("Aadhaar No", "XXXX XXXX 7730"), ("Husband", "Ramesh Sharma")],
        rotation=-0.5,
    )
    sharma_docs.append(("doc-sharma-03", p_id_sunita, {"doc_type": "ID_PROOF", "person_name": "Sunita Sharma", "uid_masked": "…7730", "dob": "1962-08-20"}))

    # 4. PAN Arjun (Scanned Image)
    p_id_arjun = SEED_DOCS_DIR / "sharma" / "doc-sharma-04.png"
    create_scanned_image(
        p_id_arjun,
        "Income Tax Department",
        "Government of India — Permanent Account Number Card",
        [("Name", "Arjun Sharma"), ("Father's Name", "Ramesh Sharma"), ("Date of Birth", "04/11/1988"), ("PAN", "ABCPSXXXX1956")],
        rotation=0.3,
    )
    sharma_docs.append(("doc-sharma-04", p_id_arjun, {"doc_type": "ID_PROOF", "person_name": "Arjun Sharma", "pan_masked": "…1956", "dob": "1988-11-04"}))

    # 5. SBI Savings Statement
    p_sbi = SEED_DOCS_DIR / "sharma" / "doc-sharma-05.pdf"
    content_sbi = [
        Paragraph("<b>STATE BANK OF INDIA</b> — Jubilee Hills Branch, Hyderabad", styles["Normal"]),
        Spacer(1, 8),
        Table([
            ["Account Number", "XXXX XXXX 2204", "Account Type", "Savings Bank"],
            ["Account Holder", "Ramesh Sharma", "CIF Number", "8821904122"],
            ["Available Balance", "INR 18,50,000.00", "Status", "Active (Hold on Death)"],
            ["Nomination Registered", "YES", "Nominee Name", "Sunita Sharma (100%)"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_sbi, "STATE BANK OF INDIA — ACCOUNT STATEMENT", "Statement of Account as on 15-03-2026", content_sbi)
    sharma_docs.append(("doc-sharma-05", p_sbi, {"doc_type": "BANK_STATEMENT", "account_masked": "…2204", "balance": 1850000, "nominee": "Sunita Sharma", "nominee_share": 100}))

    # 6. HDFC Savings Statement (The stale 2023 record)
    p_hdfc = SEED_DOCS_DIR / "sharma" / "doc-sharma-06.pdf"
    content_hdfc = [
        Paragraph("<b>HDFC BANK LIMITED</b> — Banjara Hills Branch, Hyderabad", styles["Normal"]),
        Spacer(1, 8),
        Table([
            ["Account Number", "XXXX XXXX 8891", "Print Date", "2023-12-31"],
            ["Account Holder", "Ramesh Sharma", "Product", "Regular Savings Account"],
            ["Closing Balance", "INR 9,20,000.00", "Currency", "INR"],
            ["Nominee in Record", "Sunita Sharma", "Share", "100.00%"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
        Spacer(1, 10),
        Paragraph("<i>Note: This printout reflects nomination as recorded prior to modification on 01-04-2024.</i>", styles["Normal"]),
    ]
    create_pdf(p_hdfc, "HDFC BANK — HISTORIC ACCOUNT STATEMENT", "Generated on 31-12-2023 for Customer Records", content_hdfc)
    sharma_docs.append(("doc-sharma-06", p_hdfc, {"doc_type": "BANK_STATEMENT", "account_masked": "…8891", "balance": 920000, "stale_print_date": "2023-12-31", "stale_nominee": "Sunita Sharma", "stale_pct": 100}))

    # 7. ICICI FD Receipt
    p_icici = SEED_DOCS_DIR / "sharma" / "doc-sharma-07.pdf"
    content_icici = [
        Table([
            ["Deposit Receipt No", "FD-ICICI-3377", "Deposit Date", "2024-05-10"],
            ["Principal Amount", "INR 45,00,000.00", "Maturity Date", "2027-05-10"],
            ["Customer Name", "Ramesh Sharma", "Interest Rate", "7.10% p.a."],
            ["Nomination", "NOT REGISTERED", "Operating Mode", "Single"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_icici, "ICICI BANK LIMITED — FIXED DEPOSIT RECEIPT", "Term Deposit Confirmation Advice", content_icici)
    sharma_docs.append(("doc-sharma-07", p_icici, {"doc_type": "FD_RECEIPT", "fd_ref": "…3377", "amount": 4500000, "nomination": "NONE"}))

    # 8. Zerodha Demat Statement
    p_demat = SEED_DOCS_DIR / "sharma" / "doc-sharma-08.pdf"
    content_demat = [
        Table([
            ["Client ID", "12081600-XXXX5512", "DP ID", "IN-DP-CDSL-312"],
            ["Account Holder", "Ramesh Sharma", "Valuation Date", "2026-03-14"],
            ["Portfolio Value", "INR 22,80,000.00", "Total Scrips", "18 Bluechip Equities"],
            ["Nomination", "NOT SPECIFIED", "Status", "Frozen on Death Advice"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_demat, "ZERODHA BROKING LTD — HOLDING STATEMENT", "CDSL Demat Holding Statement", content_demat)
    sharma_docs.append(("doc-sharma-08", p_demat, {"doc_type": "DEMAT_STATEMENT", "client_ref": "…5512", "valuation": 2280000}))

    # 9. SBI Mutual Fund Statement
    p_mf = SEED_DOCS_DIR / "sharma" / "doc-sharma-09.pdf"
    content_mf = [
        Table([
            ["Folio Number", "XXXX XXXX 9020", "Scheme Name", "SBI Bluechip Fund - Growth"],
            ["Investor Name", "Ramesh Sharma", "Total Units", "28,636.36"],
            ["Market Value", "INR 31,50,000.00", "NAV Date", "2026-03-13"],
            ["Nominee", "NONE", "Holding Pattern", "Single"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_mf, "SBI MUTUAL FUND — STATEMENT OF ACCOUNT", "Folio Statement of Holding", content_mf)
    sharma_docs.append(("doc-sharma-09", p_mf, {"doc_type": "MF_STATEMENT", "folio": "…9020", "valuation": 3150000}))

    # 10. LIC Policy Schedule
    p_lic = SEED_DOCS_DIR / "sharma" / "doc-sharma-10.pdf"
    content_lic = [
        Table([
            ["Policy Number", "XXXX XXXX 6618", "Plan", "LIC Jeevan Anand (Table 149)"],
            ["Life Assured", "Ramesh Sharma", "Sum Assured", "INR 25,00,000.00"],
            ["Nominee Name", "Sunita Sharma", "Nominee Relationship", "Wife (100%)"],
            ["Policy Status", "In Force (Claim Payable)", "Beneficiary Route", "SECTION 39 ENHANCED"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_lic, "LIFE INSURANCE CORPORATION OF INDIA", "Policy Schedule & Benefit Details", content_lic)
    sharma_docs.append(("doc-sharma-10", p_lic, {"doc_type": "INSURANCE_POLICY", "policy_ref": "…6618", "sum_assured": 2500000, "nominee": "Sunita Sharma"}))

    # 11. EPF Passbook
    p_epf = SEED_DOCS_DIR / "sharma" / "doc-sharma-11.pdf"
    content_epf = [
        Table([
            ["Member ID", "APHYD0012345/XXXX4090", "UAN", "100912441920"],
            ["Member Name", "Ramesh Sharma", "Employer", "Apex Engineering Corp"],
            ["Total EPF Balance", "INR 19,60,000.00", "Date of Exit", "2023-06-30"],
            ["E-Nomination Status", "SUCCESS", "Nominee", "Sunita Sharma (100%)"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_epf, "EMPLOYEES' PROVIDENT FUND ORGANISATION", "Member E-Passbook Statement", content_epf)
    sharma_docs.append(("doc-sharma-11", p_epf, {"doc_type": "EPF_PASSBOOK", "member_id": "…4090", "balance": 1960000, "nominee": "Sunita Sharma"}))

    # 12. PPF Passbook
    p_ppf = SEED_DOCS_DIR / "sharma" / "doc-sharma-12.pdf"
    content_ppf = [
        Table([
            ["PPF Account No", "XXXX XXXX 7741", "Bank", "State Bank of India"],
            ["Subscriber Name", "Ramesh Sharma", "Maturity Year", "2028"],
            ["Current Balance", "INR 14,20,000.00", "Currency", "INR"],
            ["Nominee Details", "Arjun Sharma (100%)", "Relationship", "Son"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_ppf, "PUBLIC PROVIDENT FUND SCHEME (1968)", "Government of India PPF Passbook", content_ppf)
    sharma_docs.append(("doc-sharma-12", p_ppf, {"doc_type": "PPF_PASSBOOK", "account_ref": "…7741", "balance": 1420000, "nominee": "Arjun Sharma"}))

    # 13. Property Deed Summary
    p_apt = SEED_DOCS_DIR / "sharma" / "doc-sharma-13.pdf"
    content_apt = [
        Table([
            ["Document No", "DOC-HYD-4412/2015", "Sub-Registrar", "Banjara Hills, Hyderabad"],
            ["Property Description", "Flat 401, Silver Oak Apts, Hyderabad", "Super Built-up", "2,850 sq. ft."],
            ["Registered Owner", "Ramesh Sharma", "Ownership Share", "100% Sole Owner"],
            ["Estimated Market Value", "INR 1,50,00,000.00", "Encumbrance Status", "Mortgaged to SBI"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_apt, "REGISTRATION AND STAMPS DEPARTMENT — TELANGANA", "Certified Copy of Registered Sale Deed Summary", content_apt)
    sharma_docs.append(("doc-sharma-13", p_apt, {"doc_type": "PROPERTY_DEED", "property_ref": "DOC-HYD-4412", "market_value": 15000000, "owner": "Ramesh Sharma"}))

    # 14. Home Loan Statement
    p_loan = SEED_DOCS_DIR / "sharma" / "doc-sharma-14.pdf"
    content_loan = [
        Table([
            ["Loan Account Number", "XXXX XXXX 3308", "Product", "SBI MaxGain Home Loan"],
            ["Borrower", "Ramesh Sharma", "Security", "Flat 401, Silver Oak Apts"],
            ["Outstanding Dues", "INR -56,30,000.00", "Nature", "Liability (Payable by Estate)"],
            ["Insurance Cover", "NONE", "Status", "Regular"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_loan, "STATE BANK OF INDIA — HOME LOAN STATEMENT", "Liability Statement for Succession Claim Settlement", content_loan)
    sharma_docs.append(("doc-sharma-14", p_loan, {"doc_type": "LOAN_STATEMENT", "loan_ref": "…3308", "outstanding": -5630000}))

    # 15. Vehicle RC (Scanned Image)
    p_rc = SEED_DOCS_DIR / "sharma" / "doc-sharma-15.png"
    create_scanned_image(
        p_rc,
        "Transport Department — Government of Telangana",
        "Certificate of Registration — Motor Vehicle",
        [("Regn No", "TS-09-EA-4120"), ("Owner", "Ramesh Sharma"), ("Maker / Model", "Hyundai Creta SX"), ("Date of Regn", "15/02/2021"), ("Est Value", "INR 4,50,000")],
        rotation=-0.4,
    )
    sharma_docs.append(("doc-sharma-15", p_rc, {"doc_type": "VEHICLE_RC", "regn_no": "TS-09-EA-4120", "value": 450000}))

    # 16. Locker Agreement
    p_lock = SEED_DOCS_DIR / "sharma" / "doc-sharma-16.pdf"
    content_lock = [
        Table([
            ["Locker Number", "LOC-0156", "Branch", "SBI Jubilee Hills"],
            ["Hirer Name", "Ramesh Sharma", "Operation", "Single"],
            ["Annual Rent", "INR 3,500.00", "Contents Value", "UNKNOWN (Inventory Pending)"],
            ["Nomination", "NONE", "Key Status", "With Legal Heirs"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_lock, "STATE BANK OF INDIA — SAFE DEPOSIT LOCKER AGREEMENT", "Memorandum of Locker Hiring", content_lock)
    sharma_docs.append(("doc-sharma-16", p_lock, {"doc_type": "LOCKER_AGREEMENT", "locker_no": "…0156", "value": 0}))

    # 17. Draft Will (Missing witness signatures)
    p_will = SEED_DOCS_DIR / "sharma" / "doc-sharma-17.pdf"
    content_will = [
        Paragraph("<b>DRAFT LAST WILL AND TESTAMENT OF RAMESH SHARMA</b>", styles["Normal"]),
        Spacer(1, 8),
        Paragraph("I, Ramesh Sharma, residing at Banjara Hills, Hyderabad, declare this to be my draft Will executed on 2nd November 2025.", styles["Normal"]),
        Spacer(1, 8),
        Table([
            ["Bequest 1", "Apartment Banjara Hills", "50% to son Arjun Sharma, 50% to daughter Priya Sharma"],
            ["Bequest 2", "All Residuary Estate", "100% to spouse Sunita Sharma"],
            ["Attestation", "Witness 1 Signature: [BLANK]", "Witness 2 Signature: [BLANK]"],
            ["Registration", "UNREGISTERED DRAFT", "Status: Incomplete Formalities"],
        ], colWidths=[100, 180, 220], style=table_style),
    ]
    create_pdf(p_will, "DRAFT WILL — TESTAMENTARY INSTRUMENT (INCOMPLETE)", "Unregistered Draft Prepared by Testator", content_will)
    sharma_docs.append(("doc-sharma-17", p_will, {"doc_type": "WILL", "status": "DRAFT", "executed_on": "2025-11-02", "witnesses": False}))

    # 18. Affidavit by Vikram Sharma (PLANTED INCONSISTENCIES)
    p_aff = SEED_DOCS_DIR / "sharma" / "doc-sharma-18.pdf"
    content_aff = [
        Paragraph("<b>BEFORE THE HONOURABLE NOTARY PUBLIC AT HYDERABAD</b>", styles["Normal"]),
        Spacer(1, 10),
        Paragraph(
            "I, Vikram Sharma, aged 61 years, residing at Secunderabad, do hereby solemnly affirm and state on oath as follows:<br/><br/>"
            "1. That my elder brother <b>Rameshh Sharma</b> passed away on <b>19th March 2026</b> at Hyderabad.<br/><br/>"
            "2. That the said deceased was a bachelor and had no surviving parents, wife, or children.<br/><br/>"
            "3. That I am the sole and absolute surviving Class II legal heir entitled to inherit all bank accounts and properties.<br/><br/>"
            "Deponent: <i>Vikram Sharma</i><br/>"
            "Solemnly affirmed and signed before me on this <b>10th day of March 2026</b>.",
            styles["Normal"],
        ),
        Spacer(1, 15),
        Table([
            ["Notary Advocate", "K. V. Raman, Advocate & Notary", "Notary Date", "10-03-2026"],
            ["Claimant Assertion", "Sole Legal Heir", "Target Accounts", "HDFC Savings …8891 & Assets"],
        ], colWidths=[150, 150, 100, 100], style=table_style),
    ]
    create_pdf(p_aff, "AFFIDAVIT OF LEGAL HEIRSHIP", "Sworn Affidavit of Heirship Claim", content_aff)
    sharma_docs.append(("doc-sharma-18", p_aff, {
        "doc_type": "AFFIDAVIT",
        "claimant": "Vikram Sharma",
        "inconsistencies": {
            "name_typo": "Rameshh Sharma",
            "fraudulent_dod": "2026-03-19",
            "notary_prior_to_death": "2026-03-10",
        },
    }))

    # =========================================================================
    # MEHTA SCENARIO DOCUMENTS
    # =========================================================================
    mehta_docs = []

    # 1. Death Certificate Anil Mehta
    p_m_death = SEED_DOCS_DIR / "mehta" / "doc-mehta-01.pdf"
    content_m_death = [
        Table([
            ["Registration No", "PUN/2026/D/009120", "Registration Date", "2026-05-25"],
            ["Deceased Name", "ANIL MEHTA", "Date of Death", "2026-05-22"],
            ["Place of Death", "Ruby Hall Clinic, Pune", "Age", "64 Years"],
            ["Spouse Name", "Rekha Mehta", "Father's Name", "Late Manilal Mehta"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_m_death, "PUNE MUNICIPAL CORPORATION — DEATH CERTIFICATE", "Registration of Births and Deaths Act, 1969", content_m_death)
    mehta_docs.append(("doc-mehta-01", p_m_death, {"doc_type": "DEATH_CERTIFICATE", "deceased": "Anil Mehta", "dod": "2026-05-22", "city": "Pune"}))

    # 2. Aadhaar Anil (Scanned Image)
    p_m_id1 = SEED_DOCS_DIR / "mehta" / "doc-mehta-02.png"
    create_scanned_image(
        p_m_id1,
        "Unique Identification Authority of India",
        "Government of India — Aadhaar Card",
        [("Name", "Anil Mehta"), ("Date of Birth", "03/09/1961"), ("Gender", "Male"), ("Aadhaar No", "XXXX XXXX 3310"), ("Address", "Kothrud, Pune")],
        rotation=0.4,
    )
    mehta_docs.append(("doc-mehta-02", p_m_id1, {"doc_type": "ID_PROOF", "person": "Anil Mehta"}))

    # 3. Aadhaar Rekha (Scanned Image)
    p_m_id2 = SEED_DOCS_DIR / "mehta" / "doc-mehta-03.png"
    create_scanned_image(
        p_m_id2,
        "Unique Identification Authority of India",
        "Government of India — Aadhaar Card",
        [("Name", "Rekha Mehta"), ("Date of Birth", "12/04/1965"), ("Gender", "Female"), ("Aadhaar No", "XXXX XXXX 8812")],
        rotation=-0.3,
    )
    mehta_docs.append(("doc-mehta-03", p_m_id2, {"doc_type": "ID_PROOF", "person": "Rekha Mehta"}))

    # 4. PAN Rohan (Scanned Image)
    p_m_id3 = SEED_DOCS_DIR / "mehta" / "doc-mehta-04.png"
    create_scanned_image(
        p_m_id3,
        "Income Tax Department",
        "Government of India — PAN Card",
        [("Name", "Rohan Mehta"), ("Father's Name", "Anil Mehta"), ("Date of Birth", "08/10/1993"), ("PAN", "BZXPMXXXX7719")],
        rotation=0.2,
    )
    mehta_docs.append(("doc-mehta-04", p_m_id3, {"doc_type": "ID_PROOF", "person": "Rohan Mehta"}))

    # 5. Kotak Savings Statement
    p_m_kotak = SEED_DOCS_DIR / "mehta" / "doc-mehta-05.pdf"
    content_m_kotak = [
        Table([
            ["Account Number", "XXXX XXXX 9120", "Account Holder", "Anil Mehta"],
            ["Balance", "INR 6,40,000.00", "Branch", "Kothrud, Pune"],
            ["Nominee", "Rekha Mehta", "Share", "100.00%"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_m_kotak, "KOTAK MAHINDRA BANK — ACCOUNT STATEMENT", "Savings Account Summary", content_m_kotak)
    mehta_docs.append(("doc-mehta-05", p_m_kotak, {"doc_type": "BANK_STATEMENT", "account": "…9120", "balance": 640000, "nominee": "Rekha Mehta"}))

    # 6. Bank of Baroda FD
    p_m_bob = SEED_DOCS_DIR / "mehta" / "doc-mehta-06.pdf"
    content_m_bob = [
        Table([
            ["FD Account No", "XXXX XXXX 4410", "Deposit Amount", "INR 20,00,000.00"],
            ["Maturity Date", "2027-11-20", "Nominee", "NONE"],
        ], colWidths=[150, 150, 100, 100], style=table_style),
    ]
    create_pdf(p_m_bob, "BANK OF BARODA — FIXED DEPOSIT CONFIRMATION", "Term Deposit Certificate", content_m_bob)
    mehta_docs.append(("doc-mehta-06", p_m_bob, {"doc_type": "FD_RECEIPT", "account": "…4410", "amount": 2000000}))

    # 7. HDFC Life Policy
    p_m_life = SEED_DOCS_DIR / "mehta" / "doc-mehta-07.pdf"
    content_m_life = [
        Table([
            ["Policy No", "XXXX XXXX 8841", "Life Assured", "Anil Mehta"],
            ["Sum Assured", "INR 30,00,000.00", "Nominee", "Rekha Mehta (100%)"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_m_life, "HDFC LIFE INSURANCE COMPANY LTD", "Policy Benefit Schedule", content_m_life)
    mehta_docs.append(("doc-mehta-07", p_m_life, {"doc_type": "INSURANCE_POLICY", "policy": "…8841", "sum_assured": 3000000, "nominee": "Rekha Mehta"}))

    # 8. Nippon Mutual Fund
    p_m_nippon = SEED_DOCS_DIR / "mehta" / "doc-mehta-08.pdf"
    content_m_nippon = [
        Table([
            ["Folio Number", "XXXX XXXX 3319", "Scheme", "Nippon India Growth Fund"],
            ["Valuation", "INR 12,60,000.00", "Nominee", "Rohan Mehta (100%)"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_m_nippon, "NIPPON INDIA MUTUAL FUND — FOLIO STATEMENT", "Statement of Account", content_m_nippon)
    mehta_docs.append(("doc-mehta-08", p_m_nippon, {"doc_type": "MF_STATEMENT", "folio": "…3319", "valuation": 1260000, "nominee": "Rohan Mehta"}))

    # 9. PPF Passbook
    p_m_ppf = SEED_DOCS_DIR / "mehta" / "doc-mehta-09.pdf"
    content_m_ppf = [
        Table([
            ["PPF Account", "XXXX XXXX 6120", "Balance", "INR 9,00,000.00"],
            ["Nominee", "Rohan Mehta", "Share", "100%"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_m_ppf, "STATE BANK OF INDIA — PPF PASSBOOK", "Public Provident Fund", content_m_ppf)
    mehta_docs.append(("doc-mehta-09", p_m_ppf, {"doc_type": "PPF_PASSBOOK", "account": "…6120", "balance": 900000, "nominee": "Rohan Mehta"}))

    # 10. Pune Apartment Sale Deed
    p_m_apt = SEED_DOCS_DIR / "mehta" / "doc-mehta-10.pdf"
    content_m_apt = [
        Table([
            ["Document Reg No", "DOC-PUN-8120/2012", "Sub-Registrar", "Haveli 3, Pune"],
            ["Property", "Flat 302, Mayur Residency, Kothrud", "Est Value", "INR 85,00,000.00"],
            ["Owner", "Anil Mehta", "Ownership", "100% Sole Owner"],
        ], colWidths=[130, 130, 120, 130], style=table_style),
    ]
    create_pdf(p_m_apt, "MAHARASHTRA REGISTRATION DEPARTMENT", "Summary of Registered Sale Deed", content_m_apt)
    mehta_docs.append(("doc-mehta-10", p_m_apt, {"doc_type": "PROPERTY_DEED", "reg_no": "DOC-PUN-8120", "value": 8500000, "owner": "Anil Mehta"}))

    # 11. Vehicle RC (Scanned Image)
    p_m_rc = SEED_DOCS_DIR / "mehta" / "doc-mehta-11.png"
    create_scanned_image(
        p_m_rc,
        "Transport Department — Government of Maharashtra",
        "Certificate of Registration — Motor Vehicle",
        [("Regn No", "MH-12-QR-5510"), ("Owner", "Anil Mehta"), ("Model", "Honda City V"), ("Est Value", "INR 6,00,000")],
        rotation=0.3,
    )
    mehta_docs.append(("doc-mehta-11", p_m_rc, {"doc_type": "VEHICLE_RC", "regn_no": "MH-12-QR-5510", "value": 600000}))

    # 12. Kotak Credit Card Statement
    p_m_cc = SEED_DOCS_DIR / "mehta" / "doc-mehta-12.pdf"
    content_m_cc = [
        Table([
            ["Card Account", "XXXX XXXX XXXX 1190", "Cardholder", "Anil Mehta"],
            ["Total Outstanding Due", "INR -1,20,000.00", "Payment Due Date", "2026-06-15"],
        ], colWidths=[150, 150, 100, 100], style=table_style),
    ]
    create_pdf(p_m_cc, "KOTAK MAHINDRA BANK — CREDIT CARD STATEMENT", "Monthly Account Statement", content_m_cc)
    mehta_docs.append(("doc-mehta-12", p_m_cc, {"doc_type": "LOAN_STATEMENT", "card_ref": "…1190", "outstanding": -120000}))

    # 13. Registered Will of Anil Mehta
    p_m_will = SEED_DOCS_DIR / "mehta" / "doc-mehta-13.pdf"
    content_m_will = [
        Paragraph("<b>REGISTERED WILL OF ANIL MEHTA</b><br/>Registered as Document No. PUN-WILL-2022-0441", styles["Normal"]),
        Spacer(1, 8),
        Table([
            ["Execution Date", "2022-08-17", "Registration Date", "2022-08-18"],
            ["Testator", "Anil Mehta", "Sub-Registrar", "Pune Haveli 3"],
            ["Specific Bequest", "Flat 302, Mayur Residency, Kothrud", "100% to spouse Rekha Mehta"],
            ["Residuary Bequest", "All remaining bank accounts, investments & assets", "60% to Rekha Mehta, 40% to Rohan Mehta"],
            ["Attesting Witnesses", "1. Dilip Shah (Signed) — 2. Suresh Joshi (Signed)", "Status: FULLY REGISTERED & VALID"],
        ], colWidths=[120, 180, 200], style=table_style),
    ]
    create_pdf(p_m_will, "REGISTERED LAST WILL AND TESTAMENT", "Formally Executed and Registered Testamentary Instrument", content_m_will)
    mehta_docs.append(("doc-mehta-13", p_m_will, {"doc_type": "WILL", "status": "REGISTERED", "executed_on": "2022-08-17", "bequests": {"apartment": "Rekha 100%", "residuary": "Rekha 60%, Rohan 40%"}}))

    # =========================================================================
    # WRITE GROUND TRUTH JSON CACHE
    # =========================================================================
    for doc_id, _file_path, data in sharma_docs:
        # Cache per file
        cache_file = SEED_CACHE_DIR / "sharma" / f"{doc_id}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        # Also root cache
        with open(SEED_CACHE_DIR / f"{doc_id}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    for doc_id, _file_path, data in mehta_docs:
        cache_file = SEED_CACHE_DIR / "mehta" / f"{doc_id}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        with open(SEED_CACHE_DIR / f"{doc_id}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    print(f"Generated {len(sharma_docs)} Sharma docs and {len(mehta_docs)} Mehta docs.")
    return sharma_docs, mehta_docs


def upload_to_gcs():
    """Upload all generated documents to Google Cloud Storage bucket."""
    settings = get_settings()
    bucket_name = settings.GCS_BUCKET
    print(f"Uploading seed documents to gs://{bucket_name}/seed/ ...")

    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # Sharma files
    sharma_dir = SEED_DOCS_DIR / "sharma"
    for file_path in sharma_dir.glob("*.*"):
        blob_path = f"seed/sharma/{file_path.name}"
        blob = bucket.blob(blob_path)
        content_type = "application/pdf" if file_path.suffix == ".pdf" else "image/png"
        blob.upload_from_filename(str(file_path), content_type=content_type)
        print(f"  Uploaded gs://{bucket_name}/{blob_path}")

    # Mehta files
    mehta_dir = SEED_DOCS_DIR / "mehta"
    for file_path in mehta_dir.glob("*.*"):
        blob_path = f"seed/mehta/{file_path.name}"
        blob = bucket.blob(blob_path)
        content_type = "application/pdf" if file_path.suffix == ".pdf" else "image/png"
        blob.upload_from_filename(str(file_path), content_type=content_type)
        print(f"  Uploaded gs://{bucket_name}/{blob_path}")

    print("All seed documents uploaded successfully to GCS.")


if __name__ == "__main__":
    generate_all_documents()
    upload_to_gcs()
