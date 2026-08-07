@echo off
title S.D. Computronix HRMS Prototype
cd /d "%~dp0"
echo Starting S.D. Computronix Field-Force HRMS prototype...
echo.
node serve.js
if errorlevel 1 (
  echo.
  echo Could not start. Make sure Node.js is installed: https://nodejs.org
  echo.
  pause
)
