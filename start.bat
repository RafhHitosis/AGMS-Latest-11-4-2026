@echo off
setlocal
title Attendance Web Application - PostgreSQL Server ^& Frontend
cls
echo =======================================================
echo   ATTENDANCE SYSTEM (PostgreSQL + Express + Vite)
echo =======================================================
echo.
echo  Backend:  http://localhost:5000/api/health
echo  Frontend: http://localhost:5173 or http://localhost:5174
echo.
echo Starting backend and frontend servers...
echo.

REM Run concurrent dev servers
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo Server stopped with exit code %errorlevel%.
    pause
)
