@echo off
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (
  echo First run setup commands in README.md to create the virtual environment.
  pause
  exit /b 1
)
call .venv\Scripts\activate
uvicorn main:app --reload
