# EVR Construction LLC — Web Platform & Autonomous SEO Engine

> Enterprise Next.js 16 SSR platform, customer portal, and autonomous local SEO intelligence engine for **EVR Construction LLC**, serving Knoxville, Farragut, and East Tennessee.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Experience"]
        PublicSite["Public Website (SSR / SSG)\n• Home, About, Services\n• Interactive Gallery\n• Multi-step Consultation Form"]
        AdminSuite["Admin Operations Portal\n• Overview & Live Telemetry\n• Posts Manager (Cloud Storage)\n• Keywords & Search Console\n• Backlinks & Citation Verifier\n• SEO Agent Autonomous Orchestrator"]
    end

    subgraph AppLayer ["Next.js 16 App Router (Turbopack)"]
        SiteRoutes["(site) Public Routes\n/ • /about • /projects • /contact"]
        AdminRoutes["(admin) Protected Routes\n/admin • /admin/posts • /admin/keywords\n/admin/backlinks • /admin/seo-agent"]
        APIRoutes["Edge & Node API Routes\n/api/session • /api/admin/*"]
    end

    subgraph FirebaseLayer ["Google Cloud & Firebase Backend"]
        AppHosting["Firebase App Hosting (us-east4)\nContainerized Cloud Run SSR"]
        FirebaseAuth["Firebase Authentication\nGoogle OAuth Session Management"]
        Firestore["Cloud Firestore\n• posts • leads • admin_notifications\n• backlinks • activity_logs • tracked_keywords\n• seo_agent_* • mail"]
        CloudStorage["Firebase Cloud Storage\n/posts/* Portfolio Assets"]
        VertexAI["Google Cloud Vertex AI\nGemini 3 Vision (gemini-3-flash)"]
    end

    subgraph IntelligenceLayer ["External Intelligence & Telemetry"]
        GA4["Google Analytics 4 API\n(Live Traffic & User Dimensions)"]
        GSC["Google Search Console API\n(Live Ranked Queries & CTR)"]
        Crawler["Live HTTP Verifier\n(DoFollow / NoFollow & Status)"]
        AgentEngine["Autonomous SEO Agent\n(7 Live Diagnostic Skills)"]
    end

    PublicSite --> SiteRoutes
    AdminSuite --> AdminRoutes
    SiteRoutes --> APIRoutes
    AdminRoutes --> APIRoutes

    APIRoutes --> FirebaseAuth
    APIRoutes --> Firestore
    APIRoutes --> CloudStorage
    APIRoutes --> AppHosting
    APIRoutes --> VertexAI

    AdminRoutes --> AgentEngine
    AgentEngine --> GA4
    AgentEngine --> GSC
    AgentEngine --> Crawler
    AgentEngine --> Firestore
```

---

## 🚀 Key Features

### 1. High-Performance Public Site & Dynamic Portfolio
- **SSR & SSG Architecture**: Pre-rendered service portfolio pages with Next.js Turbopack for sub-second load times.
- **Local SEO & Schema Markup**: Full JSON-LD `LocalBusiness`, `Organization`, and `Service` schema across all 12 East Tennessee service areas.
- **Real-Time Consultation Pipeline**: Lead capture routes through `POST /api/contact`, permanently persisting inquiries to Firestore `leads` with admin notification and mail queue dispatch.
- **Connected Project Galleries**: Public service pages dynamically query Firestore `posts` by category, merging client-uploaded builds with the core portfolio via 60-second ISR.

### 2. Admin Operations Suite (`/admin`)
- **Real-Time Telemetry Dashboard**: Zero synthetic data; displays verified visitor counts, consult inquiries, phone link clicks, and cloud health.
- **Posts Manager (`/admin/posts`)**: Image upload pipeline connected to Firebase Cloud Storage, analyzed with **Google Gemini 3 (`gemini-3-flash`)** on Vertex AI for automated local East TN captioning.
- **Keywords & Search Console Tracker (`/admin/keywords`)**: Merges tracked target queries with live Google Search Console position, clicks, and CTR data.
- **Backlinks & Citation Verifier (`/admin/backlinks`)**: Live crawler performing HTTP status and `DoFollow`/`NoFollow` link inspections across regional citations (BBB, Yelp, Bizapedia, Chambers), with verified 404/network error handling.
- **Notifications & Alert Center**: Fully persistent alert store in Firestore `admin_notifications` surviving Cloud Run container scaling events.

### 3. Autonomous 7-Day SEO Agent Orchestrator (`/admin/seo-agent`)

```mermaid
sequenceDiagram
    autonumber
    participant Schedule as Daily Scheduler
    participant Engine as Agent Orchestrator
    participant Skill as Daily Audit Skill
    participant DB as Cloud Firestore
    participant Admin as Admin Dashboard

    Schedule->>Engine: Trigger Scheduled Audit
    Engine->>Skill: Execute Day Skill
    alt Monday
        Skill->>DB: Scan GSC Queries & Tracked Terms
    else Tuesday
        Skill->>DB: Crawl & Verify Live Backlinks
    else Wednesday
        Skill->>DB: Audit JSON-LD Schema & Metadata
    else Thursday
        Skill->>DB: Evaluate 12 East TN GEO Entities
    else Friday
        Skill->>DB: Synthesize Inquiries & GA4 Leads
    else Saturday
        Skill->>DB: Audit 21 Project Posts for Alt Tags
    else Sunday
        Skill->>DB: Generate Executive Weekly Briefing
    end
    Skill-->>Engine: Return Run Log & Action Directives
    Engine->>DB: Persist Log (seo_agent_runs) & Directives (seo_agent_directives)
    Engine->>Admin: Update Health Score & Send Alert Notification
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org) | Turbopack compilation, SSR, and dynamic API endpoints |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | Responsive styling with bespoke architectural color palette |
| **Hosting** | [Firebase App Hosting](https://firebase.google.com/products/app-hosting) | Automated Cloud Run SSR deployments via GitHub |
| **Database** | [Cloud Firestore](https://firebase.google.com/products/firestore) | Real-time persistence for telemetry, posts, and keywords |
| **Storage** | [Cloud Storage for Firebase](https://firebase.google.com/products/storage) | Public project photos and CDN media delivery |
| **Auth** | [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) | Secure administrative authentication & session cookies |
| **Analytics** | Google Analytics 4 & Search Console APIs | Direct Google API client telemetry integrations |

---

## 📁 Repository Structure

```
evrconstruction/
├── public/                     # Static icons, vector assets, and fallbacks
│   └── images/                 # Optimized local project gallery images
├── src/
│   ├── app/
│   │   ├── (admin)/admin/      # Admin Operations Portal
│   │   │   ├── analytics/      # GA4 visitor telemetry & activity feed
│   │   │   ├── backlinks/      # Backlink registry & live HTTP crawler
│   │   │   ├── keywords/       # Target keyword tracker & Search Console
│   │   │   ├── posts/          # Firebase Storage project post manager
│   │   │   └── seo-agent/      # 7-day autonomous audit orchestrator
│   │   ├── (site)/             # Public Customer Site
│   │   │   ├── about/          # Company history & craftsmanship
│   │   │   ├── contact/        # Free estimate consultation form
│   │   │   ├── projects/       # Portfolio gallery & slug dynamic pages
│   │   │   └── page.tsx        # Public homepage
│   │   └── api/                # Backend API Endpoints
│   │       ├── admin/          # Protected administration CRUD APIs
│   │       └── session/        # Google Auth session login & logout
│   ├── components/             # Reusable UI & Layout Components
│   └── lib/                    # Shared Libraries & Integrations
│       ├── firebase-admin.ts   # Firebase Admin initialization
│       ├── geo-enhancements.ts # Client-safe metadata formatting
│       ├── integrations/       # GA4, GSC, and Backlink Verifier
│       └── seo-agent/          # Orchestrator & 7 daily skills
├── apphosting.yaml             # Firebase App Hosting SSR configuration
├── next.config.ts              # Next.js image domain & compiler settings
└── package.json                # Project dependencies and build scripts
```

---

## ⚙️ Environment Variables

Configure the following variables in `.env.local` for local development or in **Firebase App Hosting Environment Secrets** for production:

```env
# Firebase Public Client
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=evrconstruction-5f7bd
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=evrconstruction-5f7bd.firebasestorage.app

# Firebase Server Admin
FIREBASE_PROJECT_ID=evrconstruction-5f7bd
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@evrconstruction-5f7bd.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Single Administrator Access
ADMIN_EMAIL=contact@evrconstructions.com
```

---

## 💻 Local Development Workflow

1. **Clone & Install Dependencies**:
   ```bash
   git clone https://github.com/evrconstruction/evrconstruction.git
   cd evrconstruction
   npm install
   ```

2. **Run Local Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Validate Lint & Production Build**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 🚢 Production Deployment

Deployments are continuous and automated via **Firebase App Hosting**:
- Pushing to branch `main` triggers a Cloud Build workflow that compiles and deploys the Next.js SSR bundle to Cloud Run in `us-east4`.

```bash
git add .
git commit -m "feat: updates"
git push origin main
```

---

© 2026 EVR Construction LLC. All rights reserved.
