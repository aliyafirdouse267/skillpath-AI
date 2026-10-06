# SkillPath AI

A responsive career-readiness web app inspired by the supplied landing-page reference. It includes a demo journey from onboarding through learning, assessment, skill analysis, resume preparation, and job matches, backed by a small Node.js API.

## Run it

Run the Node.js server from the project directory:

```powershell
node server.mjs
```

Then visit `http://localhost:8000`. Node.js 18 or newer is required. The app server reads `.env`; `.env.example` documents the available settings.

If you change the port in `.env`, use that port in the browser URL.

To reset locally saved server demo data, stop the server and remove `data/demo-store.json`.

## API

- `GET /api/health`
- `POST /api/onboarding`
- `GET /api/roadmap?level=Beginner&career=Data%20Scientist`
- `POST /api/progress`
- `POST /api/assessment`
- `GET` and `PUT /api/resume`
- `GET /api/jobs`

The API validates inputs and persists demo progress, assessments, and resume data to the ignored `data/demo-store.json` file.

## Configuration

The current `.env` uses local demo settings. `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` are documented as future integration placeholders in `.env.example`; the app does not currently call those services. Do not add real credentials unless the matching integrations are implemented.

## Demo behavior

- The browser keeps a convenience copy of your current journey in `localStorage`; the Node API also saves onboarding, progress, assessment, and resume records to a local JSON file.
- Roadmaps and assessment scoring use deterministic demo logic, not generative AI.
- Job roles, match percentages, and explanations are sample data, not live vacancies or AI-generated recommendations.
- The local JSON store is for a single-user demo. There is no account system, production database, or real AI integration yet.

Use **Get Started** to select a starting level and career. From the workspace, use the navigation bar to reach the roadmap, notes, assessment, validated skill profile, resume builder, and job matches.
