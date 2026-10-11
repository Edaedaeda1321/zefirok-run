@echo off
cd /d "%~dp0"
py -3 START_WORLD_TEST.py
if errorlevel 1 python START_WORLD_TEST.py
pause
