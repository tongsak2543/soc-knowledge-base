# Internal SOC Knowledge Base & IOC Repository (Case & DFIR KB)

A lightweight, standalone, fully functional Knowledge Base designed specifically for internal Security Operations Center (SOC) and Digital Forensics & Incident Response (DFIR) use. It empowers analysts to record historical case investigations, search previous findings, correlate detected Indicators of Compromise (IOCs), and reuse proven investigation steps when similar incidents recur.

> 🚀 **Wazuh SIEM Integration Guides**:
> - **[แบบต่อตรง ไม่ใช้ CDB (Direct Real-Time API)]**: อ่าน [WAZUH_DIRECT_API_GUIDE.md](file:///c:/Cti%20For%20wazuh/WAZUH_DIRECT_API_GUIDE.md) สำหรับเชื่อมต่อผ่าน Wazuh Integratord Webhook ทันที ไม่ต้องดาวน์โหลดไฟล์ ไม่ต้องคอมไพล์
> - **[แบบ CDB List Compile]**: อ่าน [WAZUH_INTEGRATION_GUIDE.md](file:///c:/Cti%20For%20wazuh/WAZUH_INTEGRATION_GUIDE.md) สำหรับการใช้งานแบบ CDB File Lists บน Wazuh Manager

---

## 1. Summary of Implemented Features

### Module A: Case Knowledge Base (Primary Landing Page)
- **Primary Landing Page**: Designed for fast incident triage and historical incident referencing.
- **Prominent Search Bar**: Real-time keyword search across Case ID, Title, Summary, Investigation Findings, Observed Behavior, Investigation Method, Root Cause, Remediation, Conclusion, and Tags.
- **Full CRUD operations**: Create, edit, delete, and inspect comprehensive SOC/DFIR case files.
- **Structured Investigation Fields**:
  - `case_id`: Unique identifier (e.g., `CASE-2024-001`).
  - `title` & `summary`: Incident naming and executive briefing.
  - `category`: Malware, Ransomware, Phishing, Unauthorized Access, Vulnerability Exploitation, Data Breach, APT, Policy Violation, Denial of Service, Cyber Attack, Other.
  - `severity`: Critical, High, Medium, Low, Informational.
  - `status`: Open, In Progress, Resolved, Closed.
  - `incident_date`: ISO timestamp when the incident transpired.
  - `investigation_findings`: Forensic evidence, log events, and memory artifacts.
  - `observed_behavior`: Adversary TTPs, MITRE ATT&CK alignments, executed commands.
  - `investigation_method`: Tools and analysis techniques used (e.g., Volatility, Sysmon, Wireshark).
  - `root_cause`: Flaws, misconfigurations, or compromised credentials enabling initial compromise.
  - `remediation`: Containment actions, hardening procedures, and eradication steps.
  - `conclusion`: Post-incident takeaways and mitigation closure.
  - `tags`: Comma-separated labels for fast grouping.
- **Associated Indicators**: View linked IOCs with quick-copy actions, dissociate existing IOCs, or associate indicators directly from the case view.
- **Inline IOC Creation**: Attach new technical indicators directly while authoring a case.

### Module B: IOC Repository
- **Full CRUD operations**: Add, edit, delete, and inspect IOC technical records.
- **Supported IOC Types**: `IPv4`, `IPv6`, `Domain`, `URL`, `MD5`, `SHA1`, and `SHA256`.
- **Validation & Defang Normalization**: Automatically strips analyst defanging (e.g., `192[.]168[.]1[.]1` -> `192.168.1.1`, `hxxps://` -> `https://`), validates syntax, and normalizes values (lowercase hashes, domains, stripped trailing slashes).
- **Duplicate Prevention**: Enforces database-level uniqueness across `(ioc_type, normalized_value)`. Rejects duplicate entries with HTTP `409 Conflict`.
- **Many-to-Many Case Associations**: Link an IOC with multiple past and present cases; inspect complete historical case logs where the IOC was observed.

### Module C: SOC Dashboard
- **Dynamic Real-Time Metrics**: Zero hardcoded stats. Aggregations are calculated dynamically from SQLite queries.
- **Key Indicators**: Total Cases, Total IOCs, Critical & High Cases count.
- **Interactive Breakdown Distributions**:
  - Cases by Category (Ransomware, Phishing, Unauthorized Access, Vulnerability Exploitation, etc.).
  - Cases by Severity (Critical, High, Medium, Low, Informational).
  - Cases by Status (Open, In Progress, Resolved, Closed).
  - IOCs by Type (IPv4, IPv6, Domain, URL, MD5, SHA1, SHA256).
- **Recent Activity Feeds**: Quick links to the latest 5 investigation cases and recently observed IOCs.

### Internationalization (Bilingual Thai & English Support)
- **Instant Language Toggle**: Seamlessly switch between **ภาษาไทย (Thai)** and **English** with the `[ ไทย | ENG ]` button located in both the sidebar and top header.
- **Persistent Preference**: Language preference is automatically saved in browser `localStorage`.
- **Full Coverage**: Navigation, case search, case forms, investigation cards, IOC tables, detail modals, badges, and dashboard metrics all adapt instantly.

### Demonstration & Database Management
- **One-Click Demo Data**: Populates realistic DFIR cases (`CASE-2024-001` Akira Ransomware, `CASE-2024-002` AiTM Phishing, `CASE-2024-003` Ivanti Zero-Day WebShell, `CASE-2024-004` Lumma Stealer) and linked indicators.
- **Database Reset**: Fast database table wipe and reinitialization for test cycles.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2 validation.
- **Database**: SQLite (`backend/tip.db`), designed with portable ORM models for seamless PostgreSQL migration.

---

## 3. Project Structure

```
c:\Cti For wazuh/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI application setup, CORS, route registration
│   │   ├── database.py           # SQLAlchemy SQLite engine & session management
│   │   ├── seed_data.py          # Labeled [DEMO] DFIR cases & IOC seed data
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── case.py           # Case entity model with all DFIR investigation fields
│   │   │   ├── ioc.py            # IOC entity model & uniqueness constraint
│   │   │   ├── associations.py   # Many-to-many case_iocs association table
│   │   │   └── news.py           # Legacy entity model preserved
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── case.py           # Pydantic v2 models for Case CRUD
│   │   │   ├── ioc.py            # Pydantic v2 models for IOC CRUD & Case brief
│   │   │   └── dashboard.py      # Pydantic v2 models for Dashboard aggregations
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── case.py           # /api/cases endpoints
│   │   │   ├── ioc.py            # /api/iocs endpoints
│   │   │   ├── dashboard.py      # /api/dashboard/stats endpoint
│   │   │   └── seed.py           # /api/seed and /api/seed/reset endpoints
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── case_service.py   # Business logic for Case CRUD, search & relationships
│   │       ├── ioc_service.py    # Business logic for IOC CRUD & case associations
│   │       ├── dashboard_service.py # Dynamic SQLite aggregation metrics
│   │       └── validator.py      # IOC defanging, format regex & IP validation
│   ├── tests/
│   │   ├── conftest.py           # Isolated in-memory SQLite fixture
│   │   ├── test_cases.py         # Case CRUD, Case ID uniqueness & search tests
│   │   ├── test_ioc.py           # IOC CRUD and duplicate prevention tests
│   │   ├── test_relationships.py # Case-IOC many-to-many relationship tests
│   │   ├── test_dashboard.py     # Real dynamic database metrics tests
│   │   └── test_validation.py    # IOC validation & defang normalization tests
│   ├── pytest.ini
│   ├── requirements.txt
│   └── tip.db                    # SQLite database file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Badges.tsx        # Severity, Category, Status, and IOC Type styling
│   │   │   ├── Sidebar.tsx       # Dark SOC sidebar navigation & demo buttons
│   │   │   ├── CaseFormModal.tsx # Full DFIR case authoring with inline IOC support
│   │   │   ├── CaseDetailModal.tsx # Full investigation view & IOC relationship manager
│   │   │   ├── IOCFormModal.tsx  # Manual IOC entry with duplicate handling
│   │   │   ├── IOCDetailModal.tsx # Indicator detail & linked case history overview
│   │   │   └── LanguageToggle.tsx # Bilingual [ ไทย | ENG ] switcher
│   │   ├── context/
│   │   │   └── LanguageContext.tsx # React Context for i18n
│   │   ├── i18n/
│   │   │   └── translations.ts   # English & Thai dictionary for all SOC terms
│   │   ├── pages/
│   │   │   ├── CasePage.tsx      # Primary landing page: prominent search, filter, card grid
│   │   │   ├── IOCPage.tsx       # Searchable indicator repository table
│   │   │   └── DashboardPage.tsx # Real-time SOC analytics & recent cases/IOCs
│   │   ├── services/
│   │   │   └── api.ts            # Type-safe API client communicating with backend
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces and constants
│   │   ├── App.tsx               # Main layout and tab orchestrator (Case KB primary)
│   │   ├── index.css             # Tailwind v4 dark theme styling
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts            # Proxy configured for /api -> http://127.0.0.1:8000
│
├── run-backend.bat               # Windows batch script to launch FastAPI backend
├── run-frontend.bat              # Windows batch script to launch React frontend
├── run-all.ps1                   # Windows PowerShell script to launch both services
└── README.md
```

---

## 4. Installation & Setup Instructions

### Prerequisites
- Python 3.10+ (Python 3.12 installed)
- Node.js 18+ (Node.js 22.14 LTS installed)

### Backend Setup
1. Open PowerShell and navigate to the `backend` directory:
   ```powershell
   cd "c:\Cti For wazuh\backend"
   ```
2. Activate or create the virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\pip install -r requirements.txt
   ```
3. Run the automated test suite:
   ```powershell
   $env:PYTHONPATH="c:\Cti For wazuh\backend"
   .\venv\Scripts\pytest.exe
   ```

### Frontend Setup
1. Open PowerShell and navigate to the `frontend` directory:
   ```powershell
   cd "c:\Cti For wazuh\frontend"
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Build for production:
   ```powershell
   npm run build
   ```

---

## 5. Startup Commands for Windows

### Option 1: Quick Launch via PowerShell
Double-click or run the included PowerShell script:
```powershell
powershell -ExecutionPolicy Bypass -File "c:\Cti For wazuh\run-all.ps1"
```

### Option 2: Individual Batch Scripts
- Launch Backend: double-click `run-backend.bat`
- Launch Frontend: double-click `run-frontend.bat`

### Option 3: Manual Terminal Commands

**Terminal 1 (Backend):**
```powershell
cd "c:\Cti For wazuh\backend"
$env:PYTHONPATH="c:\Cti For wazuh\backend"
.\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 (Frontend):**
```powershell
cd "c:\Cti For wazuh\frontend"
npm run dev -- --host 127.0.0.1 --port 5173
```

---

## 6. Access Points & Documentation URLs

- **Frontend Application**: [http://127.0.0.1:5173](http://127.0.0.1:5173) (Primary SOC Knowledge Base)
- **FastAPI Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Database Location**: `c:\Cti For wazuh\backend\tip.db`

---

## 7. Test Results

Backend test suite executed with `pytest`:
```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.2.0, pluggy-1.7.0
rootdir: C:\Cti For wazuh\backend
configfile: pytest.ini
testpaths: tests
plugins: anyio-4.16.0
collected 21 items

tests\test_cases.py ....                                                 [ 19%]
tests\test_dashboard.py ..                                               [ 28%]
tests\test_ioc.py .....                                                  [ 52%]
tests\test_news.py ...                                                   [ 66%]
tests\test_relationships.py ..                                           [ 76%]
tests\test_validation.py .....                                           [100%]

======================== 21 passed, 1 warning in 0.46s ========================
```

Frontend build executed with `npm run build`:
```
✓ 2073 modules transformed.
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-Dg_R4L0u.css   54.01 kB │ gzip:  9.06 kB
dist/assets/index-DQd1leVe.js   334.62 kB │ gzip: 92.29 kB
✓ built in 453ms with 0 errors
```

---

## 8. Known Limitations & Architectural Notes

1. **Standalone Scope**: In compliance with the project specifications, the portal intentionally does not connect to external threat feeds (MISP, VirusTotal) or SIEM/EDR engines (Wazuh). All case investigations and indicators are recorded directly by SOC analysts.
2. **Authentication**: The portal currently runs without an enterprise RBAC / SSO layer, making it ideal for internal SOC lab or enclosed intranet deployment.
3. **Database Portability**: The database engine defaults to SQLite (`tip.db`) with `check_same_thread=False`. To migrate to PostgreSQL in the future, set the `DATABASE_URL` environment variable (e.g., `postgresql+psycopg2://user:pass@host:5432/tip`) without changing any ORM models or route code.

