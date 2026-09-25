@echo off
rem Doppio clic per scaricare le foto candidate da Wikimedia Commons.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scarica-immagini.ps1" %*
echo.
pause
