@REM Maven Wrapper batch script for Windows
@REM This downloads and runs the correct Maven version automatically.

@echo off
setlocal

set MAVEN_WRAPPER_PROPERTIES=.mvn\wrapper\maven-wrapper.properties

for /f "tokens=2 delims==" %%a in ('findstr "distributionUrl" %MAVEN_WRAPPER_PROPERTIES%') do set DIST_URL=%%a

set MAVEN_HOME=%USERPROFILE%\.m2\wrapper

if not exist "%MAVEN_HOME%" mkdir "%MAVEN_HOME%"

@REM Fallback: use system Maven if wrapper setup fails
where mvn >nul 2>&1
if %ERRORLEVEL% equ 0 (
    mvn %*
) else (
    echo Please install Maven or use Docker: docker compose up --build
    exit /b 1
)

endlocal
