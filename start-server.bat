@echo off
start "Gantt Server" /min python "%~dp0output\save-server.py"
echo Server started. Check taskbar for "Gantt Server" window.
pause
