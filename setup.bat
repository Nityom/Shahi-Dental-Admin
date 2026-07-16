@echo off
echo ================================
echo Titanium Dental Clinic - Setup
echo ================================
echo.

REM Check if PHP is installed
echo Checking PHP installation...
where php >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PHP is not installed or not in PATH
    echo Please install PHP - See INSTALL_PHP.md for instructions
    echo Quick install: choco install php
    pause
    exit /b 1
)

echo PHP found!
echo.

REM Check if MySQL is installed
echo Checking MySQL installation...
where mysql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: MySQL is not installed or not in PATH
    echo Please install MySQL from https://dev.mysql.com/downloads/mysql/
    pause
    exit /b 1
)

echo MySQL found!
echo.

REM Create database
echo Creating database...
set /p MYSQL_PASSWORD="Enter MySQL root password: "
echo CREATE DATABASE IF NOT EXISTS shahidentalclinic_db; | mysql -u root -p%MYSQL_PASSWORD%

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create database
    pause
    exit /b 1
)

echo Database created successfully!
echo.

REM Import schema
echo Importing database schema...
mysql -u root -p%MYSQL_PASSWORD% titanium_db < php-backend\database\schema.sql

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to import schema
    pause
    exit /b 1
)

echo Schema imported successfully!
echo.

REM Configure PHP backend
echo Configuring PHP backend...
if not exist php-backend\.env (
    copy php-backend\.env.example php-backend\.env
    echo Created php-backend\.env
    echo Please edit php-backend\.env and update your database password
) else (
    echo php-backend\.env already exists
)

REM Configure Next.js
echo Configuring Next.js frontend...
if not exist .env.local (
    copy .env.local.example .env.local
    echo Created .env.local
) else (
    echo .env.local already exists
)

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Next steps:
echo 1. Edit php-backend\.env and set your MySQL password
echo 2. Run start-backend.bat to start PHP server
echo 3. Run start-frontend.bat to start Next.js
echo.
pause
