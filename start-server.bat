@echo off
cd /d "%~dp0output"
start /b pythonw save-server.py
echo Server started (running in background)
echo To stop: open Task Manager and end the pythonw.exe process
pause
