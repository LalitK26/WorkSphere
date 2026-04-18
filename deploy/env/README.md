# DevOps Deployment Guide - Environment Variables

## Overview
All sensitive credentials and secrets have been removed from `application-prod.yml`. The application now requires environment variables to be configured before deployment.

## Files

### 📄 `dashboard.env`
This file contains **ALL** environment variables needed for production. This is the **single source of truth** for secrets.

### 📄 `dashboard.env.sample`
Template file showing the structure. **DO NOT USE IN PRODUCTION** - it contains placeholder values.

## Deployment Instructions

### 1. Create Production Environment File

```bash
# Copy the dashboard.env file to the production server
sudo mkdir -p /etc/dashboard
sudo cp dashboard.env /etc/dashboard/dashboard.env
```

### 2. Edit with Real Credentials

Edit `/etc/dashboard/dashboard.env` and replace **ALL** placeholder values:

```bash
sudo nano /etc/dashboard/dashboard.env
```

**Required Changes:**
- `DB_PASSWORD` → Replace with actual database password
- `JWT_SECRET` → Generate: `openssl rand -base64 32`
- `MAIL_PASSWORD` → Use Gmail App-Specific Password
- `GOOGLE_MAPS_API_KEY` → Your Google Maps API key
- `WEBRTC_TURN_CREDENTIAL` → Strong password for TURN server

### 3. Secure the File

```bash
# Lock down permissions (readable only by root)
sudo chmod 600 /etc/dashboard/dashboard.env
sudo chown root:root /etc/dashboard/dashboard.env
```

### 4. Load Environment Variables

**Option A: Using systemd service (Recommended)**

Create `/etc/systemd/system/dashboard.service`:

```ini
[Unit]
Description=WorkSphere Dashboard API
After=network.target mysql.service

[Service]
Type=simple
User=dashboard
Group=dashboard
WorkingDirectory=/opt/apps/dashboard-api
EnvironmentFile=/etc/dashboard/dashboard.env
ExecStart=/usr/bin/java -jar dashboard-api.jar --spring.profiles.active=prod
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable dashboard
sudo systemctl start dashboard
```

**Option B: Manual execution**

```bash
# Load environment variables and run
set -a
source /etc/dashboard/dashboard.env
set +a
java -jar dashboard-api.jar --spring.profiles.active=prod
```

### 5. Verify Deployment

Check application logs for successful startup:

```bash
# Check service status
sudo systemctl status dashboard

# View logs
sudo journalctl -u dashboard -f

# Check specific log file
tail -f /opt/logs/api/spring.log
```

## Security Checklist

- [ ] `dashboard.env` is located at `/etc/dashboard/dashboard.env`
- [ ] File permissions are `600` (only root can read)
- [ ] All placeholder values have been replaced with real credentials
- [ ] Database password is strong (20+ characters)
- [ ] JWT secret is generated using `openssl rand -base64 32`
- [ ] TURN server password is strong
- [ ] Gmail App-Specific Password is configured (not regular password)
- [ ] File is **NOT** committed to Git
- [ ] Backups of the env file are secured

## Troubleshooting

### Application fails to start

**Error**: `A component required a bean of type 'java.lang.String' that could not be found`

**Solution**: Environment variables are not loaded. Ensure:
1. File exists at `/etc/dashboard/dashboard.env`
2. EnvironmentFile is configured in systemd service
3. All required variables are present

### Database connection fails

Check:
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` are correct
- Database server is running and accessible
- Network connectivity to database

### JWT authentication fails

Check:
- `JWT_SECRET` is set and is at least 32 characters
- Secret is consistent across application restarts

## Important Notes

⚠️ **NEVER commit `dashboard.env` to Git** - It contains sensitive credentials

⚠️ **The application WILL NOT START** without these environment variables - No default values are provided for security

✅ **Keep dashboard.env.sample in Git** - It serves as documentation for required variables

## Contact

For issues or questions, contact the development team.
