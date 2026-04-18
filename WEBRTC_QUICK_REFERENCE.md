# WebRTC Quick Reference Guide

Fast reference for WebRTC configuration and troubleshooting.

## 📋 Configuration Files Checklist

### Backend Configuration
- ✅ `dashboard/src/main/resources/application-prod.yml` - WebRTC config added
- ✅ `/etc/dashboard/dashboard.env` - Environment variables (production server)

### Frontend Configuration
- ✅ `recruitment_frontend/src/config/webrtc.config.js` - Configuration utility
- ✅ `recruitment_frontend/.env.development` - Development settings
- ✅ `recruitment_frontend/.env.production` - Production settings
- ✅ `recruitment_frontend/src/components/meeting/WebRTCMeeting.jsx` - Updated to use config

### Infrastructure
- ✅ `deploy/nginx/dashboard.conf` - WebSocket support added
- ✅ `deploy/turnserver.conf.sample` - TURN server template
- ✅ `deploy/env/dashboard.env.sample` - Updated with WebRTC vars

## 🚀 Quick Start Commands

### Development (No TURN needed)
```bash
# Backend
cd dashboard
mvn spring-boot:run

# Frontend
cd recruitment_frontend
npm run dev
```

### Production Deployment

#### 1. Update Environment Variables
```bash
sudo nano /etc/dashboard/dashboard.env
# Set WEBRTC_TURN_* variables
```

#### 2. Install coturn
```bash
sudo dnf install -y coturn
sudo cp deploy/turnserver.conf.sample /etc/turnserver.conf
sudo nano /etc/turnserver.conf
# Update: external-ip, user credentials
```

#### 3. Configure Firewall
```bash
sudo firewall-cmd --permanent --add-port=3478/tcp
sudo firewall-cmd --permanent --add-port=3478/udp
sudo firewall-cmd --permanent --add-port=49152-65535/udp
sudo firewall-cmd --reload
```

#### 4. Start coturn
```bash
sudo systemctl enable --now coturn
sudo systemctl status coturn
```

#### 5. Update Nginx
```bash
sudo cp deploy/nginx/dashboard.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
```

#### 6. Build & Deploy Frontend
```bash
cd recruitment_frontend
npm ci
npm run build
sudo cp -r dist/* /opt/frontend/recruitment-ui/
```

#### 7. Restart Backend
```bash
sudo systemctl restart dashboard
```

## 🔑 Environment Variables Reference

### Backend (`/etc/dashboard/dashboard.env`)
```bash
# Essential WebRTC Variables
WEBRTC_TURN_ENABLED=true
WEBRTC_TURN_URL=turn:recruitment.worksphere.ltd:3478
WEBRTC_TURN_USERNAME=worksphere_turn_user
WEBRTC_TURN_CREDENTIAL=your_strong_password
WEBRTC_WS_ENDPOINT=https://api.worksphere.ltd/ws
```

### Frontend (`.env.production`)
```bash
# Essential WebRTC Variables
VITE_WS_URL=https://api.worksphere.ltd/ws
VITE_TURN_ENABLED=true
VITE_TURN_URL=turn:recruitment.worksphere.ltd:3478
VITE_TURN_USERNAME=worksphere_turn_user
VITE_TURN_CREDENTIAL=your_strong_password
```

### coturn (`/etc/turnserver.conf`)
```conf
# Essential coturn Configuration
external-ip=YOUR_SERVER_PUBLIC_IP
realm=recruitment.worksphere.ltd
user=worksphere_turn_user:your_strong_password
```

**⚠️ IMPORTANT:** Credentials must match across all three files!

## 🧪 Testing Commands

### Test TURN Server
```bash
# Check if coturn is running
sudo systemctl status coturn

# View coturn logs
sudo journalctl -u coturn -f

# Check listening ports
sudo netstat -tuln | grep 3478
```

### Test WebSocket
```bash
# Install wscat if needed
npm install -g wscat

# Test WebSocket connection
wscat -c wss://api.worksphere.ltd/ws
```

### Test from Browser
1. Open browser DevTools (F12)
2. Go to Console tab
3. Join interview meeting
4. Look for:
   ```
   [WebRTC Config] TURN server configured: turn:recruitment.worksphere.ltd:3478
   [WebRTC] Connecting to WebSocket: https://api.worksphere.ltd/ws
   WebSocket connected
   ```

### Online TURN Test
Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

Add TURN server and verify you see `relay` type candidates.

## 🐛 Common Issues & Quick Fixes

### Issue: WebSocket Connection Failed
```bash
# Check backend is running
sudo systemctl status dashboard
sudo journalctl -u dashboard -f

# Check Nginx config
sudo nginx -t

# Verify WebSocket upgrade headers in Nginx
grep -A 5 "location /ws" /etc/nginx/conf.d/dashboard.conf
```

### Issue: TURN Authentication Failed
```bash
# Verify credentials match in all three files:
grep WEBRTC_TURN_USERNAME /etc/dashboard/dashboard.env
grep VITE_TURN_USERNAME recruitment_frontend/.env.production
grep "^user=" /etc/turnserver.conf

# Restart coturn after credential changes
sudo systemctl restart coturn
```

### Issue: Video Doesn't Work Across Networks
```bash
# Check coturn is running
sudo systemctl status coturn

# Verify firewall ports are open
sudo firewall-cmd --list-all | grep -E "3478|49152-65535"

# Check coturn logs for connections
sudo journalctl -u coturn --since "5 minutes ago"
```

### Issue: Camera/Mic Access Denied
- HTTPS is required (not HTTP)
- Check browser permissions
- Close other apps using camera
- Try different browser

## 📊 Log Locations

| Service | Log Command |
|---------|-------------|
| Backend | `sudo journalctl -u dashboard -f` |
| coturn | `sudo journalctl -u coturn -f` |
| Nginx | `sudo tail -f /var/log/nginx/error.log` |
| Browser | Open DevTools → Console |

## 🔒 Security Checklist

- [ ] HTTPS enabled (required for WebRTC)
- [ ] Strong TURN password (32+ characters)
- [ ] CORS properly configured
- [ ] Firewall rules in place
- [ ] Only required ports open
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

## 📞 Support Resources

- Full Guide: `WEBRTC_SETUP.md`
- Deployment: `deploy/README.md`
- coturn Docs: https://github.com/coturn/coturn/wiki
- WebRTC Docs: https://webrtc.org/

## 🎯 Verification Checklist

After deployment, verify:

1. **Backend**
   ```bash
   curl https://api.worksphere.ltd/actuator/health
   # Should return: {"status":"UP"}
   ```

2. **WebSocket**
   ```bash
   wscat -c wss://api.worksphere.ltd/ws
   # Should connect successfully
   ```

3. **TURN Server**
   ```bash
   sudo systemctl status coturn
   # Should be: active (running)
   ```

4. **Firewall**
   ```bash
   sudo firewall-cmd --list-all
   # Should show: 80/tcp 443/tcp 3478/tcp 3478/udp 49152-65535/udp
   ```

5. **Frontend Build**
   ```bash
   ls /opt/frontend/recruitment-ui/assets/
   # Should contain: index-*.js index-*.css
   ```

6. **Live Test**
   - Open https://recruitment.worksphere.ltd
   - Join interview as two different users
   - Verify video/audio works

## 💡 Pro Tips

1. **Development:** Use TURN disabled for faster local testing
2. **Debugging:** Enable `VITE_DEBUG_MODE=true` in `.env.production`
3. **Monitoring:** Watch coturn logs during first tests
4. **Performance:** TURN relay uses server bandwidth, monitor usage
5. **Fallback:** System works with STUN only if users are on good networks

---

**Last Updated:** January 19, 2026
