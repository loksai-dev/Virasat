# Virasat Backend Service

FastAPI backend skeleton for **Virasat** (AI Estate Settlement Platform), developed for the Google Cloud JAPAC Hackathon 2026 (BFSI Theme).

Deployable to **Google Cloud Run** using Python 3.12 and Application Default Credentials (ADC).

---

## 1. Architecture Overview

```
backend/
├── app/
│   ├── main.py              # Application lifecycle, CORS, Request ID middleware, /health, /ready
│   ├── config.py            # Pydantic-settings reading from environment
│   ├── deps.py              # Dependency injection for Spanner, Vertex AI, Auth, and Context
│   ├── auth.py              # Firebase ID token verification with LOCAL_DEV_UID bypass
│   ├── errors.py            # Uniform error envelope {error: {code, message, request_id}}
│   ├── logging_setup.py     # Structured JSON logging (never logs bodies or document text)
│   ├── models/              # Pydantic request & response schemas adhering to API contract
│   ├── routers/             # Contract route stubs (sessions, cases, people, relations, etc.)
│   ├── agents/              # Multi-agent orchestrators
│   ├── db/                  # Cloud Spanner client & bi-temporal repository layer
│   ├── engines/             # Succession computation & rules execution engines
│   ├── rules/               # Statutory succession rule definitions (Hindu, Indian Succession Acts)
│   ├── services/            # Domain services (affidavits, claims, notifications)
│   ├── seed/                # Pre-canned synthetic scenarios (Sharma, Mehta)
│   └── corpus/              # Legal reference corpus & citations
├── tests/                   # Pytest suite verifying auth, errors, health, ready, and OpenAPI contract
├── scripts/                 # Development and utility scripts
├── Dockerfile               # Production multi-stage Cloud Run container specification
├── requirements.txt         # Pinned production and test dependencies
├── pytest.ini               # Pytest configuration
├── ruff.toml                # Ruff linter configuration
└── .env.example             # Example environment variable configurations
```

---

## 2. Prerequisites & Setup

- **Python 3.12**
- **Google Cloud SDK (`gcloud`)** authenticated with Application Default Credentials:
  ```bash
  gcloud auth application-default login
  ```

### Local Virtual Environment

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate      # Windows PowerShell
# or: source .venv/bin/activate # Linux / macOS

pip install -r requirements.txt
```

---

## 3. Running the Server

Start the development server with live reload:

```bash
uvicorn app.main:app --reload --port 8000
```

Once running:
- **Interactive OpenAPI Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Liveness Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
- **Readiness Dependency Probe (Spanner + Vertex AI):** [http://localhost:8000/ready](http://localhost:8000/ready)

---

## 4. Environment Variables

All variables are configured via `pydantic-settings` in `app/config.py`:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `GCP_PROJECT` | `virasat-511210` | Google Cloud project ID |
| `GCP_REGION` | `asia-south1` | Regional location for Spanner and Cloud Storage |
| `VERTEX_LOCATION` | `us-central1` | Vertex AI regional endpoint |
| `GEMINI_PRO_MODEL` | `gemini-2.5-pro` | Gemini Pro model for complex legal reasoning |
| `GEMINI_FLASH_MODEL` | `gemini-2.5-flash` | Gemini Flash model for extraction & routing |
| `EMBED_MODEL` | `text-embedding-005` | Text embedding model |
| `EMBED_DIM` | `768` | Embedding dimension |
| `SPANNER_INSTANCE` | `virasat-inst` | Cloud Spanner instance ID |
| `SPANNER_DATABASE` | `virasat-db` | Cloud Spanner database ID |
| `GCS_BUCKET` | `virasat-511210-docs` | Cloud Storage bucket for document vault |
| `ALLOWED_ORIGINS` | Comma-separated | Allowed CORS origins |
| `DEMO_MODE` | `true` | Allows synthetic demo scenario initialization |
| `LOCAL_DEV_UID` | `""` | Local development user ID bypass for testing |

---

## 5. Running Tests

Run the automated test suite:

```bash
pytest
```

Run linter checks:

```bash
ruff check .
```

---

## 6. Cloud Run Deployment

Build and deploy directly with Google Cloud Build and Cloud Run:

```bash
gcloud run deploy virasat-api \
  --source . \
  --region asia-south1 \
  --service-account virasat-api@virasat-511210.iam.gserviceaccount.com \
  --allow-unauthenticated
```
