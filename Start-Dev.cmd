@echo off
setlocal
cd /d "%~dp0"
start "Notes Maker Server" /b npm run dev -- --port %1 1>dev-server.stdout.log 2>dev-server.stderr.log
