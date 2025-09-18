@echo off
REM ========================================
REM Photo of the Day - Desktop App Starter
REM ========================================

echo.
echo ===========================================
echo    PHOTO OF THE DAY - Desktop App
echo ===========================================
echo.

REM Wechsle zum App-Verzeichnis
cd /d "%~dp0"

REM Einfache Node.js Prüfung
where node >nul 2>&1
if errorlevel 1 (
    echo FEHLER: Node.js wurde nicht gefunden!
    echo Bitte installieren Sie Node.js von https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo Node.js gefunden, starte App...
echo.

REM Direkt npm start ausführen
echo Starte Photo of the Day App...
echo.
echo Hinweis: GPU-Warnungen sind normal und harmlos.
echo Zum Beenden: Fenster schließen oder Ctrl+C
echo.

npm start

REM Nach App-Ende
echo.
echo App wurde beendet.
pause
