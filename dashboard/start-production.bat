@echo off
REM Production Startup Script for Dashboard Application
REM This script sets the production profile and starts the application

echo ========================================
echo Starting Dashboard Application
echo Production Mode
echo ========================================
echo.

REM Set Production Profile
set SPRING_PROFILES_ACTIVE=prod
echo Profile set to: %SPRING_PROFILES_ACTIVE%

REM Set Database Credentials
REM IMPORTANT: Update these values with your actual production database credentials
set DB_URL=jdbc:mysql://localhost:3306/dashboard
set DB_USERNAME=DB_user
set DB_PASSWORD=D0hYpL?v70o_uwzg

echo.
echo Database Configuration:
echo   URL: %DB_URL%
echo   Username: %DB_USERNAME%
echo.

REM Check if JAR file exists
if not exist "target\dashboard-0.0.1-SNAPSHOT.jar" (
    echo ERROR: JAR file not found!
    echo Please build the application first using: mvn clean package
    pause
    exit /b 1
)

echo Starting application...
echo.

REM Start the application
java -jar target\dashboard-0.0.1-SNAPSHOT.jar

REM If application exits, pause to see any error messages
if errorlevel 1 (
    echo.
    echo ========================================
    echo Application exited with an error!
    echo Check the logs above for details.
    echo ========================================
    pause
)

