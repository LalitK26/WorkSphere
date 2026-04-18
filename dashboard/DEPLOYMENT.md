# Production Deployment Guide for Windows Server

## Overview

This guide provides step-by-step instructions for deploying the Dashboard application on a Windows server.

## Prerequisites

1. **Java 17** installed and configured
2. **MySQL Server** running and accessible
3. **Database** created with schema initialized
4. **JAR file** built (`dashboard-0.0.1-SNAPSHOT.jar`)

## Important: ENUM Column Type Fix

The application uses `@Enumerated(EnumType.STRING)` which stores ENUM values as VARCHAR in the database. The production database should have VARCHAR columns, not ENUM types. This has been fixed in the code, but if you encounter schema validation errors, ensure your database columns are VARCHAR.

### Database Schema Requirements

All status/priority columns should be `VARCHAR(50)`, not ENUM:
- `attendances.status` → `VARCHAR(50)`
- `events.status` → `VARCHAR(50)`
- `users.status` → `VARCHAR(50)`
- `projects.status` → `VARCHAR(50)`
- `tasks.status` → `VARCHAR(50)`
- `tasks.priority` → `VARCHAR(50)`
- `tickets.status` → `VARCHAR(50)`
- `tickets.priority` → `VARCHAR(50)`
- `roles.type` → `VARCHAR(50)`

## Step-by-Step Deployment

### Step 1: Build the Application

```powershell
cd C:\WorkSphere-Dashboard\dashboard
mvn clean install -DskipTests
```

This creates the JAR file at: `target\dashboard-0.0.1-SNAPSHOT.jar`

### Step 2: Prepare Database

1. **Create the database** (if not exists):
   ```sql
   CREATE DATABASE IF NOT EXISTS dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Run schema.sql** in MySQL Workbench to create all tables:
   - Open MySQL Workbench
   - Connect to your MySQL server
   - Open `dashboard/src/main/resources/schema.sql`
   - Execute the entire script

3. **Verify column types** are VARCHAR (not ENUM):
   ```sql
   SHOW COLUMNS FROM `attendances` LIKE 'status';
   SHOW COLUMNS FROM `events` LIKE 'status';
   ```

### Step 3: Set Environment Variables

**Option A: PowerShell (Temporary - Session Only)**

```powershell
$env:SPRING_PROFILES_ACTIVE="prod"
$env:DB_URL="jdbc:mysql://localhost:3306/dashboard"
$env:DB_USERNAME="your_production_db_user"
$env:DB_PASSWORD="your_production_db_password"
```

**Option B: System Environment Variables (Permanent)**

1. Open **System Properties** → **Advanced** → **Environment Variables**
2. Under **System Variables**, click **New**
3. Add each variable:
   - Variable: `SPRING_PROFILES_ACTIVE`, Value: `prod`
   - Variable: `DB_URL`, Value: `jdbc:mysql://localhost:3306/dashboard`
   - Variable: `DB_USERNAME`, Value: `your_production_db_user`
   - Variable: `DB_PASSWORD`, Value: `your_production_db_password`

**Option C: Use the Startup Script (Recommended)**

Use the provided `start-production.bat` script (see Step 4).

### Step 4: Start the Application

**Method 1: Using the Startup Script (Recommended)**

```powershell
cd C:\WorkSphere-Dashboard\dashboard
.\start-production.bat
```

**Method 2: Manual PowerShell Command**

```powershell
cd C:\WorkSphere-Dashboard\dashboard
$env:SPRING_PROFILES_ACTIVE="prod"
$env:DB_URL="jdbc:mysql://localhost:3306/dashboard"
$env:DB_USERNAME="your_production_db_user"
$env:DB_PASSWORD="your_production_db_password"
java -jar target\dashboard-0.0.1-SNAPSHOT.jar
```

**Method 3: Using System Property**

```powershell
java -Dspring.profiles.active=prod -jar target\dashboard-0.0.1-SNAPSHOT.jar
```

### Step 5: Verify Deployment

Check the startup logs. You should see:

```
Starting application with profile: prod
```

**NOT:**
```
Starting application with profile: dev
```

The application should start on port 8080 by default. Access it at: `http://localhost:8080`

## Configuration Files

### application-prod.yml

The production profile is configured in `src/main/resources/application-prod.yml`:

- **Database**: Uses environment variables (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`)
- **DDL Auto**: Set to `none` (schema is managed separately)
- **Schema Init**: Disabled (`spring.sql.init.mode: never`)
- **Swagger**: Disabled
- **Logging**: Set to INFO level

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"

**Cause**: Application is using "dev" profile with hardcoded credentials.

**Solution**:
1. Ensure `SPRING_PROFILES_ACTIVE=prod` is set
2. Verify database credentials in environment variables
3. Check MySQL user permissions

### Error: "Schema-validation: wrong column type encountered"

**Cause**: Database has ENUM columns but Hibernate expects VARCHAR (or vice versa).

**Solution**:
1. The code has been fixed to explicitly use VARCHAR
2. Ensure `ddl-auto: none` in production (already configured)
3. If still occurring, verify database columns are VARCHAR:
   ```sql
   ALTER TABLE `attendances` MODIFY COLUMN `status` VARCHAR(50) NOT NULL;
   ALTER TABLE `events` MODIFY COLUMN `status` VARCHAR(50) NOT NULL;
   -- Repeat for other tables with status columns
   ```

### Error: "Field 'file_content' doesn't have a default value"

**Cause**: Database schema mismatch.

**Solution**: Run the schema.sql script or manually update the table:
```sql
ALTER TABLE `ticket_files` MODIFY COLUMN `file_content` LONGTEXT NULL;
```

### Application Not Starting

1. **Check Java version**: `java -version` (should be 17)
2. **Check MySQL connection**: Ensure MySQL server is running
3. **Check port availability**: Ensure port 8080 is not in use
4. **Check logs**: Review error messages in the console output

### Profile Not Activating

1. **Verify environment variable**:
   ```powershell
   echo $env:SPRING_PROFILES_ACTIVE
   ```
2. **Restart PowerShell/CMD** after setting environment variables
3. **Use system property** as alternative:
   ```powershell
   java -Dspring.profiles.active=prod -jar target\dashboard-0.0.1-SNAPSHOT.jar
   ```

## Running as a Windows Service

To run the application as a Windows service, you can use:

1. **NSSM (Non-Sucking Service Manager)**
2. **Windows Task Scheduler** (for scheduled startup)
3. **Java Service Wrapper**

### Using NSSM (Recommended)

1. Download NSSM from https://nssm.cc/download
2. Install the service:
   ```cmd
   nssm install DashboardApp "C:\Program Files\Java\jdk-17\bin\java.exe" "-jar C:\WorkSphere-Dashboard\dashboard\target\dashboard-0.0.1-SNAPSHOT.jar"
   ```
3. Set environment variables in NSSM GUI:
   - `SPRING_PROFILES_ACTIVE=prod`
   - `DB_URL=jdbc:mysql://localhost:3306/dashboard`
   - `DB_USERNAME=your_user`
   - `DB_PASSWORD=your_password`
4. Start the service:
   ```cmd
   nssm start DashboardApp
   ```

## Quick Reference

### Essential Commands

```powershell
# Set environment variables (PowerShell)
$env:SPRING_PROFILES_ACTIVE="prod"
$env:DB_URL="jdbc:mysql://localhost:3306/dashboard"
$env:DB_USERNAME="your_user"
$env:DB_PASSWORD="your_password"

# Start application
java -jar target\dashboard-0.0.1-SNAPSHOT.jar

# Check if running
netstat -ano | findstr :8080
```

### Database Verification Queries

```sql
-- Check column types
SHOW COLUMNS FROM `attendances` LIKE 'status';
SHOW COLUMNS FROM `events` LIKE 'status';
SHOW COLUMNS FROM `users` LIKE 'status';

-- Verify database connection
SELECT DATABASE();
```

## Security Notes

1. **Never commit** production database credentials to version control
2. **Use environment variables** or secure configuration management
3. **Restrict database user permissions** to minimum required
4. **Use strong passwords** for production databases
5. **Enable SSL/TLS** for database connections in production

## Support

If you encounter issues:
1. Check the application logs
2. Verify all prerequisites are met
3. Ensure database schema matches the code
4. Confirm environment variables are set correctly
