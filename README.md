<p align="center">
  <img src="public/aivyapp1.png" alt="Aivy Logo" width="80" />
</p>

<h1 align="center">Aivy — Where Focus Meets Intelligence</h1>

<p align="center">
  An AI-powered study assistant that helps students plan, focus, and succeed — built with React, Supabase, and Google Gemini&nbsp;2.0&nbsp;Flash.
</p>

<p align="center">
  <a href="https://studyai01.vercel.app">🌐 Live Demo</a> &nbsp;·&nbsp;
  <a href="#-features">Features</a> &nbsp;·&nbsp;
  <a href="#%EF%B8%8F-tech-stack">Tech Stack</a> &nbsp;·&nbsp;
  <a href="#-getting-started">Getting Started</a>
</p>

---

## ✨ Features

### 🤖 AI Study Assistant (Gemini 2.0 Flash)
- **Conversational Chat** — Ask Aivy anything; get structured, educational responses with code blocks, tables, and diagrams.
- **Smart Study Plans** — AI generates day-by-day study schedules tailored to your subject, timeline, and level.
- **Flashcard Generation** — Upload notes or a topic and get instant Q&A flashcards.
- **Quiz Builder** — Multiple-choice, true/false, and short-answer quizzes with explanations.
- **Concept Maps** — Visual topic breakdowns with hierarchical relationships.
- **ELI5 Mode** — Complex topics explained in simple terms with analogies.
- **Document Analysis** — Upload PDFs, DOCX, PPTX, or spreadsheets; Aivy extracts text server-side and answers questions about the content.

### 📋 Task & Schedule Management
- **Task Manager** — Create, prioritise, and track study tasks with completion stats.
- **Dynamic Schedule View** — Weekly/daily calendar with drag-and-drop events.
- **Google Calendar Sync** — Two-way sync between your study schedule and Google Calendar.
- **Auto-Schedule** — AI-suggested time blocks based on your tasks and preferences.

### ⏱️ Pomodoro Timer
- **Enhanced Timer** — Focus sessions with customisable work/break durations.
- **Session Tracking** — Daily session count, total focus time, and streak tracking.
- **Task Integration** — Link a Pomodoro session to a specific task for automatic progress logging.

### 📚 Materials & Flashcards
- **Materials Manager** — Upload, organise, and search study materials (PDF, DOCX, PPTX, images).
- **Server-Side Extraction** — Python backend extracts text from documents using `pdfplumber`, `PyPDF2`, `python-docx`, and `python-pptx`.
- **Flashcard Decks** — Create, study, and manage flashcard sets with spaced-repetition principles.

### 📊 Progress & Gamification
- **Progress Tracker** — Visual analytics dashboard with charts (completion rate, study hours, material usage).
- **XP & Levelling** — Earn experience points for completed tasks, sessions, and streaks.
- **Streak Counter** — Consecutive-day study streak to keep you motivated.
- **Motivational Quotes** — Daily rotating quotes on the dashboard.

### 🔐 Authentication & Cloud Sync
- **Supabase Auth** — Email/password and Google OAuth sign-in.
- **Real-Time Sync** — All data (tasks, materials, flashcards, settings) syncs to Supabase PostgreSQL.
- **Row-Level Security** — Each user's data is isolated at the database level.
- **Offline Support** — Works offline with `localStorage` / `IndexedDB` fallback; syncs on reconnection.

### 🎵 Ambient Music Player
- **Floating Player** — Lofi / ambient music to accompany focus sessions.
- **Music Upload** — Add your own tracks to the player.

### ⚙️ Settings & Personalisation
- **Dark / Light / System Theme** — Toggle via `next-themes`.
- **Notification Preferences** — Customise reminders and study alerts.
- **Google Calendar Settings** — Connect and manage calendar sync.
- **Feedback System** — In-app feedback modal with submissions stored in Supabase.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite |
| **UI** | Tailwind CSS · shadcn/ui · Radix UI · Framer Motion |
| **State** | React Context + Reducers · TanStack React Query · Zustand |
| **Auth & DB** | Supabase (PostgreSQL + Auth + Edge Functions) |
| **AI** | Google Gemini 2.0 Flash (`@google/genai`) |
| **Backend** | Python (Flask) Serverless Functions on Vercel |
| **Doc Parsing** | pdfplumber · PyPDF2 · python-docx · python-pptx |
| **Hosting** | Vercel (frontend + serverless API) |

---

## 🗂️ Project Structure

```
aivy/
├── src/                        # React frontend
│   ├── components/
│   │   ├── ai-assistant/       # AI chat UI, viewers (quiz, flashcard, concept map)
│   │   ├── features/           # Task manager, pomodoro, schedule, music, settings
│   │   ├── landing/            # Landing page sections
│   │   ├── modals/             # Task, feedback, session modals
│   │   ├── settings/           # Google Calendar & notification settings
│   │   └── ui/                 # shadcn/ui primitives
│   ├── contexts/               # Auth, StudyPlanner, ChatHistory, DashboardStats
│   ├── hooks/                  # Custom hooks (useAuth, useDashboardStats, etc.)
│   ├── pages/                  # Route-level components
│   ├── services/               # API layer, AI service, Supabase sync
│   ├── utils/                  # Date helpers, storage managers
│   └── types/                  # TypeScript interfaces
│
├── api/                        # Vercel serverless entry point (Python/Flask)
│   └── index.py
│
├── python-backend/             # Document processing service
│   └── src/services/
│       └── document_service.py # PDF, DOCX, PPTX text extraction
│
├── supabase/
│   ├── functions/              # Edge functions (Google Calendar sync)
│   └── migrations/             # SQL schema & RLS policies
│
├── public/                     # Static assets (favicon, images, demo video)
├── vercel.json                 # Vercel routing & serverless config
└── package.json                # Dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** (ships with Node)
- **Python** ≥ 3.9 (for local backend development only)
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key

### 1. Clone & Install

```bash
git clone https://github.com/Ren0-07/StudyAI01.git
cd StudyAI01
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_AI_API_KEY=<your-gemini-api-key>
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

### 3. Set Up Supabase

1. Open the [Supabase Dashboard](https://app.supabase.com) and select your project.
2. Go to **SQL Editor** and run the migration files in `supabase/migrations/` sequentially:
   - `create_user_data_tables.sql`
   - `create_user_preferences_table.sql`
   - *(remaining migration files as needed)*
3. Enable **Email/Password** sign-ups under Authentication → Providers.

### 4. Run the Frontend

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Run the Python Backend (Optional — for document uploads)

```bash
cd python-backend
pip install -r requirements.txt
python app.py
```

The backend will start at `http://localhost:5000`. In production, this runs as a Vercel serverless function automatically.

---

## 🌐 Deployment

Aivy is deployed on **Vercel** with zero configuration:

- The React frontend is built with `vite build`.
- `api/index.py` runs as a Vercel Python serverless function.
- `vercel.json` handles routing (SPA fallback + API rewrites).

Simply connect the GitHub repo to Vercel, add the environment variables, and deploy.

---

## 👥 Team

Built by **Kishan Prajapati** .

---

<p align="center">
  Made with ❤️ and ☕ by the Aivy team
</p>


