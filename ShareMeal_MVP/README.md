# ShareMeal MVP

Beginner-friendly food donation platform:
- React + Vite frontend
- FastAPI backend
- SQLite persistent database
- Add donations, browse, claim, mark collected, delete only through API safeguards
- Search and status filters
- Demo mode; no real authentication yet

## Requirements
- Windows 10/11
- Python 3.10+
- Node.js LTS
- VS Code recommended

## 1. Backend setup
Open Command Prompt or VS Code terminal:

```bat
cd ShareMeal_MVP\backend
py -m venv .venv
.venv\Scripts\activate
py -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend docs: http://127.0.0.1:8000/docs

Keep this terminal open.

## 2. Frontend setup
Open a SECOND terminal:

```bat
cd ShareMeal_MVP\frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally http://localhost:5173

## Notes
- SQLite data is stored in `backend/sharemeal.db`.
- The backend is local to your computer.
- This is a functional educational MVP, not yet a production service.
- There is no real login, role-based authorization, live notification, map routing, or AI food-safety verification yet.
- Do not use this demo to decide whether food is safe. Food safety needs human checks and applicable local rules.
- Before public deployment, add authentication/authorization, rate limits, stronger validation, HTTPS, backups, logging, and privacy safeguards.


For online deployment steps, see `README_DEPLOYMENT.md`.
