# ShareMeal MVP — Deployment-ready starter

ShareMeal is an educational food-donation MVP with a React + Vite frontend and FastAPI backend. It supports listing donations, searching, status filters, claiming, marking collected, and basic statistics.

## Local development (Windows / VS Code)

### Backend terminal
```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
API docs: http://127.0.0.1:8000/docs

### Frontend terminal (separate terminal)
```powershell
cd frontend
npm install
npm run dev
```
Open the Vite URL, typically http://localhost:5173.

## Deployment configuration

- Backend API URL is read from `VITE_API_URL` at frontend build time. If it is unset, the app uses the local API URL.
- Backend reads `DATABASE_URL`. If unset, it uses local SQLite. If a PostgreSQL URL is provided, SQLAlchemy uses psycopg 3.
- Backend reads `CORS_ORIGINS` as a comma-separated list of frontend origins. Local Vite origins are always allowed.
- Do not commit passwords, `.env` files, virtual environments, `node_modules`, or the local SQLite database. The root `.gitignore` excludes them.

## Hosting plan (demo / student project)

1. Push this folder to a private or public GitHub repository.
2. Create a Supabase PostgreSQL project. In its Connect dialog choose the **Session pooler** connection string (port 5432) for an IPv4-friendly connection. Replace the password placeholder and keep the connection string secret. URL-encode special characters in the password if necessary.
3. On Render create a **Web Service** from this GitHub repository with Root Directory `backend`, Build Command `pip install -r requirements.txt`, Start Command `uvicorn main:app --host 0.0.0.0 --port $PORT`. Add environment variable `DATABASE_URL` with the Supabase connection string.
4. After the backend deploys, open `https://YOUR-BACKEND.onrender.com/health` and confirm `{"status":"ok"}`. Copy the backend service URL without a trailing slash.
5. On Render create a **Static Site** from the same repository, Root Directory `frontend`, Build Command `npm install && npm run build`, Publish Directory `dist`. Add environment variable `VITE_API_URL` equal to the backend service URL (for example `https://your-api.onrender.com`).
6. After the frontend is deployed, copy its full `https://...onrender.com` origin. In the backend Render service add `CORS_ORIGINS` with that exact origin (no trailing slash), then redeploy the backend.
7. Open the frontend URL and test `GET /donations`, create a donation, claim it, and mark it collected.

## Important limitations

This MVP has no login/authentication, role-based access control, donor identity verification, rate limiting, image uploads, live notifications, maps, or AI food-safety verification. Anyone with the public website can currently create or claim demo records. Do not use it to make food-safety decisions or to handle sensitive personal information. Add authentication, permissions, stronger abuse protection, monitoring, backups, and applicable food safety checks before real public use.

Free Render web services may sleep after inactivity; first requests can be slow. Supabase Free projects can pause after low database activity. Free plans are suitable for demos, not production guarantees. Verify current pricing/limits before launching.
