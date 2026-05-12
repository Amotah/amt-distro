@echo off
REM Deploy backend to Supabase
REM Usage: deploy.bat your-supabase-pat-here

if "%1"=="" (
    echo Usage: deploy.bat YOUR_SUPABASE_PAT
    echo.
    echo To get your PAT:
    echo 1. Go to https://app.supabase.com/account/tokens
    echo 2. Create a new token or copy an existing one
    echo 3. Run: deploy.bat your-token-here
    exit /b 1
)

setlocal enabledelayedexpansion
set SUPABASE_ACCESS_TOKEN=%1

echo Deploying backend function to Supabase...
cd /d "%~dp0figma-export"

npx supabase@latest functions deploy make-server-79198001 --project-ref vatpvfrbgeatdeypqcrv

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Deployment successful!
    echo.
    echo Changes deployed:
    echo - Partner artist creation now checks role OR subscriptionTier
    echo - 7 artist management endpoints updated
    echo - Admin billing history endpoint added
    echo.
    echo Wait 10 seconds for Supabase to fully process, then:
    echo 1. Hard refresh your browser (Ctrl+Shift+R)
    echo 2. Try creating a managed artist as a partner role
) else (
    echo.
    echo ✗ Deployment failed. Check the error above.
)

pause
