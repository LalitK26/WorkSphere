# WebRTC Configuration Guide

This document provides comprehensive instructions for configuring WebRTC functionality in the Recruitment Platform, including STUN/TURN server setup and deployment.

## Table of Contents

1. [Overview](#overview)
2. [Current Configuration](#current-configuration)
3. [Development Setup](#development-setup)
4. [Production Setup](#production-setup)
5. [TURN Server (coturn) Installation](#turn-server-coturn-installation)
6. [Testing WebRTC Connectivity](#testing-webrtc-connectivity)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The platform uses **WebRTC** for real-time video/audio interviews with:
- **STUN servers** for NAT discovery (Google's public STUN servers)
- **TURN servers** for media relay when direct P2P fails (coturn - production only)
- **WebSocket signaling** for WebRTC session negotiation (STOMP over SockJS)

### Architecture

```
[Browser] <--HTTPS--> [Nginx] <--HTTP--> [Spring Boot]
    |                                         |
    |<--------WebSocket Signaling------------>|
    |
    |<--WebRTC Media (via STUN/TURN)-->| [Browser]
```

---

## Current Configuration

### Backend (Spring Boot)

**File:** `dashboard/src/main/resources/application-prod.yml`

The production configuration includes:
- WebRTC STUN/TURN server URLs
- WebSocket endpoint configuration
- CORS settings for recruitment subdomain
- Signaling server parameters

**Environment Variables** (set in `/etc/dashboard/dashboard.env`):
```bash
WEBRTC_TURN_ENABLED=true
WEBRTC_TURN_URL=turn:recruitment.worksphere.ltd:3478
WEBRTC_TURN_USERNAME=worksphere_turn_user
WEBRTC_TURN_CREDENTIAL=your_strong_password
WEBRTC_WS_ENDPOINT=https://api.worksphere.ltd/ws
```

### Frontend (React)

**Configuration File:** `recruitment_frontend/src/config/webrtc.config.js`

The frontend automatically detects environment and configures:
- WebSocket URL (development: localhost, production: API domain)
- ICE servers (STUN + TURN if enabled)
- Debug logging

**Environment Files:**
- `.env.development` - Local development (TURN disabled)
- `.env.production` - Production build (TURN enabled)
- `.env.example` - Template for reference

---

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Java 17+ and Maven
- MySQL 8.0+

### Configuration

Development uses **localhost** and **STUN only** (no TURN needed):

1. **Frontend** `.env.development` is already configured:
   ```bash
   VITE_WS_URL=http://localhost:8080/ws
   VITE_TURN_ENABLED=false
   ```

2. **Backend** `application-dev.yml` uses default settings

3. **Start services:**
   ```bash
   # Terminal 1 - Backend
   cd dashboard
   mvn spring-boot:run

   # Terminal 2 - Frontend
   cd recruitment_frontend
   npm run dev
   ```

4. **Access:** http://localhost:3001

### Testing Locally

- WebRTC works on localhost without TURN
- Open two browser windows (or use incognito)
- Join the same interview as different users
- Camera/microphone permissions will be requested

---

## Production Setup

### Step 1: Update Environment Variables

Edit `/etc/dashboard/dashboard.env`:

```bash
# WebRTC Configuration
WEBRTC_TURN_ENABLED=true
WEBRTC_TURN_URL=turn:recruitment.worksphere.ltd:3478
WEBRTC_TURN_USERNAME=worksphere_turn_user
WEBRTC_TURN_CREDENTIAL=Use_A_Strong_Random_Password_Here

# WebSocket endpoint
WEBRTC_WS_ENDPOINT=https://api.worksphere.ltd/ws
WEBRTC_WS_ALLOWED_ORIGINS=https://recruitment.worksphere.ltd,https://dashboard.worksphere.ltd
```

### Step 2: Update Frontend `.env.production`

Edit `recruitment_frontend/.env.production`:

```bash
VITE_TURN_ENABLED=true
VITE_TURN_URL=turn:recruitment.worksphere.ltd:3478
VITE_TURN_USERNAME=worksphere_turn_user
VITE_TURN_CREDENTIAL=Same_Password_As_Backend
```

### Step 3: Build and Deploy

```bash
# Build frontend
cd recruitment_frontend
npm ci
npm run build

# Deploy frontend
sudo cp -r dist/* /opt/frontend/recruitment-ui/

# Restart backend
sudo systemctl restart dashboard
```

### Step 4: Configure Nginx for WebSocket

Update `/etc/nginx/conf.d/dashboard.conf`:

```nginx
# WebSocket support for signaling
location /ws {
    proxy_pass http://127.0.0.1:8080/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts for long-lived connections
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## TURN Server (coturn) Installation

**CRITICAL for production:** TURN is required when users are behind strict NATs/firewalls.

### Install coturn

```bash
# RHEL/Rocky/AlmaLinux
sudo dnf install -y coturn

# Ubuntu/Debian
sudo apt install -y coturn
```

### Configure coturn

Edit `/etc/turnserver.conf`:

```conf
# Listening port for TURN server
listening-port=3478

# External IP address (your server's public IP)
external-ip=YOUR_SERVER_PUBLIC_IP

# Relay IP address (usually same as external IP)
relay-ip=YOUR_SERVER_PUBLIC_IP

# Realm for TURN authentication
realm=recruitment.worksphere.ltd

# User credentials (must match backend configuration)
user=worksphere_turn_user:Use_A_Strong_Random_Password_Here

# Enable long-term credentials
lt-cred-mech

# Fingerprint for enhanced security
fingerprint

# Enable verbose logging (for debugging)
verbose

# Log file
log-file=/var/log/turnserver/turnserver.log

# Server name
server-name=recruitment.worksphere.ltd

# Deny specific IP ranges (optional security)
# denied-peer-ip=10.0.0.0-10.255.255.255
# denied-peer-ip=192.168.0.0-192.168.255.255
```

### Create Log Directory

```bash
sudo mkdir -p /var/log/turnserver
sudo chown turnserver:turnserver /var/log/turnserver
```

### Enable and Start coturn

```bash
# Enable coturn on boot
sudo systemctl enable coturn

# Start coturn
sudo systemctl start coturn

# Check status
sudo systemctl status coturn

# View logs
sudo journalctl -u coturn -f
```

### Configure Firewall

```bash
# Open TURN ports
sudo firewall-cmd --permanent --add-port=3478/tcp
sudo firewall-cmd --permanent --add-port=3478/udp
sudo firewall-cmd --permanent --add-port=49152-65535/udp
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

### Test TURN Server

Use the online TURN/STUN test tool:
- Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- Add your TURN server:
  ```
  turn:recruitment.worksphere.ltd:3478
  Username: worksphere_turn_user
  Password: Your_Password
  ```
- Click "Gather candidates"
- Verify you see `relay` candidates (not just `host` and `srflx`)

---

## Testing WebRTC Connectivity

### Browser Console Testing

Open browser DevTools console and check for:

```javascript
// Should see WebRTC config
[WebRTC Config] Environment: production
[WebRTC Config] WebSocket URL: https://api.worksphere.ltd/ws
[WebRTC Config] ICE Servers: Array(4)
  0: {urls: "stun:stun.l.google.com:19302"}
  1: {urls: "stun:stun1.l.google.com:19302"}
  2: {urls: "stun:stun2.l.google.com:19302"}
  3: {urls: "turn:recruitment.worksphere.ltd:3478", username: "...", credential: "..."}
```

### Network Testing

Test from different networks:
1. Same LAN (should work with STUN only)
2. Different networks (requires TURN)
3. Mobile network (4G/5G)
4. Corporate network (strict firewall)

### Expected Behavior

✅ **Working:**
- Camera/mic permissions granted
- Video preview shows local video
- WebSocket connected (green indicator)
- Remote video appears when other participant joins
- Audio/video controls work

❌ **Not Working:**
- Check browser console for errors
- Verify WebSocket connection
- Test TURN server separately
- Review backend logs: `sudo journalctl -u dashboard -f`
- Review coturn logs: `sudo journalctl -u coturn -f`

---

## Troubleshooting

### Issue: "WebSocket connection failed"

**Solution:**
- Verify backend is running: `sudo systemctl status dashboard`
- Check Nginx config includes WebSocket upgrade headers
- Ensure firewall allows HTTPS (443)
- Test WebSocket: `wscat -c wss://api.worksphere.ltd/ws`

### Issue: "Video works locally but not across networks"

**Solution:**
- TURN server is likely not configured
- Verify coturn is running: `sudo systemctl status coturn`
- Check TURN credentials match in all configs
- Verify firewall ports 3478 and 49152-65535 are open

### Issue: "Failed to access camera/microphone"

**Solution:**
- **HTTPS required:** WebRTC camera/mic only works on HTTPS (or localhost)
- Browser must have camera/mic permissions granted
- Check if another app is using the camera
- Try different browser (Chrome/Firefox/Edge)

### Issue: "ICE connection failed"

**Solution:**
- Check ICE candidates in browser console
- Verify STUN servers are reachable
- Test TURN server with online tool
- Review network restrictions (corporate firewalls)

### Issue: "TURN authentication failed"

**Solution:**
- Verify credentials match in:
  - `/etc/dashboard/dashboard.env`
  - `recruitment_frontend/.env.production`
  - `/etc/turnserver.conf`
- Restart coturn: `sudo systemctl restart coturn`
- Check coturn logs for auth errors

### Debug Mode

Enable debug logging:

**Backend:**
```yaml
# application-prod.yml
webrtc:
  signaling:
    enable-logging: true
```

**Frontend:**
```bash
# .env.production
VITE_DEBUG_MODE=true
```

---

## Security Considerations

1. **HTTPS/WSS Only:** WebRTC requires secure context (HTTPS)
2. **Strong TURN Password:** Use 32+ character random password
3. **Restrict CORS:** Only allow trusted origins
4. **Firewall Rules:** Only open required ports
5. **Regular Updates:** Keep coturn and dependencies updated
6. **Monitor Logs:** Watch for suspicious activity
7. **Rate Limiting:** Configure Nginx rate limits for WebSocket endpoint

---

## Performance Optimization

1. **Bandwidth:** TURN relay consumes server bandwidth
2. **Connection Pooling:** Configure Hikari connection pool
3. **WebSocket Heartbeats:** Already configured (4 seconds)
4. **Video Quality:** Adjust resolution based on network
5. **Session Timeout:** Configured to 30 minutes

---

## Additional Resources

- [WebRTC Documentation](https://webrtc.org/getting-started/overview)
- [coturn Documentation](https://github.com/coturn/coturn/wiki)
- [STUN/TURN Test Tools](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)
- [Mozilla WebRTC Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

## Support

For issues or questions:
1. Check browser console for errors
2. Review application logs: `sudo journalctl -u dashboard -f`
3. Review coturn logs: `sudo journalctl -u coturn -f`
4. Test TURN server independently
5. Verify all configurations match across files

---

**Last Updated:** January 19, 2026
**Author:** Lalit Katkam
**Project:** WorkSphere Recruitment Platform
