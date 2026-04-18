# Environment Configuration Setup Guide

This project uses automatic profile switching for development and production environments. The configuration is split between backend (Spring Boot) and frontend (Vite/React).

## Overview

### Backend Configuration Files

| File | Contains | Purpose |
|------|----------|---------|
| `application.yml` | Base config, common settings | Shared across all profiles |
| `application-dev.yml` | Dev-specific settings | Development environment |
| `application-prod.yml` | Prod-specific settings | Production environment |
| `.env.development` | Dev secrets/credentials | Development values (NOT in git) |
| `.env.production` | Prod secrets/credentials | Production values (NOT in git) |
| `EnvironmentConfig.java` | .env loader | Automatically loads .env files based on active profile |

### Frontend Configuration Files

| File | Contains | Purpose |
|------|----------|---------|
| `.env.development` | Dev API URLs | Development environment |
| `.env.production` | Prod API URLs | Production environment |

## Setup Instructions

### Backend Setup

1. **Create `.env.development` file** in the `dashboard/` directory:
   ```bash
   cd dashboard
   # Copy the example file
   cp .env.development.example .env.development
   # Edit .env.development with your development values
   ```

2. **Create `.env.production` file** in the `dashboard/` directory (for production):
   ```bash
   cd dashboard
   # Copy the example file
   cp .env.production.example .env.production
   # Edit .env.production with your production values
   ```

3. **Profile Activation**:
   - The application automatically detects the profile from:
     - `SPRING_PROFILES_ACTIVE` environment variable (highest priority)
     - `spring.profiles.active` system property
     - Defaults to `dev` if neither is set
   
   **Development:**
   ```bash
   # Option 1: Set environment variable
   export SPRING_PROFILES_ACTIVE=dev  # Linux/Mac
   set SPRING_PROFILES_ACTIVE=dev     # Windows CMD
   $env:SPRING_PROFILES_ACTIVE="dev"  # Windows PowerShell
   
   # Option 2: Use system property
   java -Dspring.profiles.active=dev -jar dashboard.jar
   
   # Option 3: Default (automatically uses 'dev')
   mvn spring-boot:run
   ```
   
   **Production:**
   ```bash
   # Set environment variable
   export SPRING_PROFILES_ACTIVE=prod  # Linux/Mac
   set SPRING_PROFILES_ACTIVE=prod     # Windows CMD
   $env:SPRING_PROFILES_ACTIVE="prod"  # Windows PowerShell
   
   # Or use system property
   java -Dspring.profiles.active=prod -jar dashboard.jar
   ```

### Frontend Setup

1. **Create `.env.development` file** in the `frontend/` directory:
   ```bash
   cd frontend
   # Copy the example file
   cp .env.development.example .env.development
   # Edit .env.development with your development API URL
   ```

2. **Create `.env.production` file** in the `frontend/` directory:
   ```bash
   cd frontend
   # Copy the example file
   cp .env.production.example .env.production
   # Edit .env.production with your production API URL
   ```

3. **Running the Frontend**:
   ```bash
   # Development mode (uses .env.development)
   npm run dev
   
   # Production build (uses .env.production)
   npm run build
   ```

## How It Works

### Backend Profile Detection

1. **Application Startup**: `DashboardApplication.java` checks for `SPRING_PROFILES_ACTIVE` environment variable or system property
2. **Profile Activation**: Spring Boot activates the corresponding profile (`dev` or `prod`)
3. **Configuration Loading**: 
   - Base `application.yml` is loaded first
   - Profile-specific `application-{profile}.yml` is merged
   - `EnvironmentConfig.java` loads `.env.{profile}` file and injects variables
4. **Property Resolution**: Spring Boot resolves `${VARIABLE_NAME}` placeholders from:
   - Environment variables (highest priority)
   - `.env` file properties
   - Default values in YAML files

### Frontend Environment Variables

1. **Vite Environment Detection**: Vite automatically loads `.env.{mode}` files based on the mode:
   - `npm run dev` → loads `.env.development`
   - `npm run build` → loads `.env.production`
2. **API Client**: `apiClient.js` uses `VITE_API_BASE_URL` from environment variables
3. **Proxy Configuration**: In development, Vite proxy forwards `/api` requests to the backend

## Environment Variables Reference

### Backend (.env files)

```properties
# Database Configuration
DB_USERNAME=root
DB_PASSWORD=root
DB_URL=jdbc:mysql://localhost:3306/dashboard

# Mail Configuration
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# JWT Configuration
JWT_SECRET=your-secret-key-should-be-at-least-256-bits-long
JWT_EXPIRATION=86400000

# Google Maps API Key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Server Configuration
SERVER_PORT=8080

# Spring Profile
SPRING_PROFILES_ACTIVE=dev  # or 'prod'
```

### Frontend (.env files)

```properties
# API Configuration
VITE_API_BASE_URL=http://localhost:8080/api  # Development
# VITE_API_BASE_URL=https://api.yourdomain.com/api  # Production

# Environment
VITE_APP_ENV=development  # or 'production'
```

## Security Notes

⚠️ **IMPORTANT**: 
- `.env.production` files should **NEVER** be committed to git
- `.env.development` files may contain sensitive data - consider gitignoring them too
- Use `.env.*.example` files as templates (these are safe to commit)
- In production, use environment variables or secure secret management systems

## Troubleshooting

### Backend Issues

1. **Profile not switching**:
   - Check `SPRING_PROFILES_ACTIVE` environment variable
   - Verify `.env.{profile}` file exists in the correct location
   - Check application logs for profile activation message

2. **Environment variables not loading**:
   - Ensure `.env.{profile}` file is in `dashboard/` directory
   - Check file format (no spaces around `=`)
   - Verify `EnvironmentConfig.java` is being loaded (check startup logs)

### Frontend Issues

1. **API calls failing**:
   - Verify `VITE_API_BASE_URL` in `.env.{mode}` file
   - Check that environment variables are prefixed with `VITE_`
   - Restart dev server after changing `.env` files

2. **Wrong environment variables**:
   - Ensure you're using the correct `.env.{mode}` file
   - Vite only loads variables prefixed with `VITE_`
   - Rebuild after changing production environment variables

## Best Practices

1. **Development**: Keep hardcoded values in `application-dev.yml` for quick setup
2. **Production**: Always use environment variables or `.env.production` file
3. **Secrets**: Never commit secrets to git - use `.env` files or environment variables
4. **Documentation**: Keep `.env.*.example` files updated with required variables
5. **Testing**: Test both development and production configurations before deployment

