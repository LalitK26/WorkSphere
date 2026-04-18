Deployment notes — WorkSphere Dashboard

Quick commands (run on FMV 11 host as sudo/root):

1) Create users and dirs

```bash
sudo useradd -r -s /usr/sbin/nologin dashboard
sudo mkdir -p /opt/apps/dashboard-api
sudo mkdir -p /opt/frontend/dashboard-ui
sudo mkdir -p /opt/frontend/company-site
sudo mkdir -p /opt/logs/api
sudo mkdir -p /var/www/letsencrypt
sudo chown -R dashboard:dashboard /opt/apps/dashboard-api /opt/frontend /opt/logs
```

2) Copy artifacts

- Backend: copy built jar to `/opt/apps/dashboard-api/dashboard.jar`.
- Frontend: build `frontend` (`npm ci && npm run build`) and copy `dist` to `/opt/frontend/dashboard-ui/dist`.

3) Place environment and prod YAML

```bash
sudo mkdir -p /etc/dashboard
sudo cp deploy/env/dashboard.env.sample /etc/dashboard/dashboard.env
sudo chmod 600 /etc/dashboard/dashboard.env
# Edit /etc/dashboard/dashboard.env with real secrets
# Optionally copy application-prod.yml to /etc/dashboard/application-prod.yml to override packaged config
```

4) Initialize the database

If you have the MySQL root password (you indicated `StrongPassword@123`), run the DB init script from the repo root. This will create a dedicated DB user and import `schema.sql`.

```bash
cd /path/to/repo
MYSQL_ROOT_PWD='StrongPassword@123' DB_PASSWORD='StrongPassword@123' ./deploy/db/init-db.sh

# Verify
mysql -u dashboard_user -p'StrongPassword@123' -e "USE dashboard; SHOW TABLES;"
```

Note: It's safer to choose a separate strong password for `DB_PASSWORD` instead of reusing the root password.

5) Install systemd unit and start

```bash
sudo cp deploy/systemd/dashboard.service /etc/systemd/system/dashboard.service
sudo systemctl daemon-reload
sudo systemctl enable --now dashboard.service
sudo journalctl -u dashboard -f
```

6) Nginx + TLS

```bash
sudo cp deploy/nginx/dashboard.conf /etc/nginx/conf.d/dashboard.conf
sudo nginx -t && sudo systemctl reload nginx
# For TLS with certbot (assuming you have a domain):
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d dashboard.worksphere.ltd
```

7) Firewall (allow HTTP/HTTPS)

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

8) Logs & rotation

- If the app logs to files, add `/var/log/dashboard` or use `logging.file.path` from `application-prod.yml`.
- Add `/etc/logrotate.d/dashboard` to rotate application logs weekly.

9) Troubleshooting

If you encounter issues (e.g., health endpoint returns DOWN, 502 Bad Gateway), see `deploy/TROUBLESHOOTING.md` for detailed diagnosis and fixes.

10) WebRTC Setup (For Recruitment Platform)

If using the recruitment module with video interviews:

```bash
# Install coturn TURN server
sudo dnf install -y coturn

# Configure coturn
sudo cp deploy/turnserver.conf.sample /etc/turnserver.conf
sudo nano /etc/turnserver.conf
# Update: external-ip (your server's public IP) and user credentials

# Create log directory
sudo mkdir -p /var/log/turnserver
sudo chown turnserver:turnserver /var/log/turnserver

# Enable and start
sudo systemctl enable --now coturn

# Open firewall ports for TURN
sudo firewall-cmd --permanent --add-port=3478/tcp
sudo firewall-cmd --permanent --add-port=3478/udp
sudo firewall-cmd --permanent --add-port=49152-65535/udp
sudo firewall-cmd --reload

# Update /etc/dashboard/dashboard.env with TURN credentials
# See WEBRTC_SETUP.md for detailed instructions
```

Notes and recommendations
- Prefer a managed DB for production; otherwise schedule automatic backups (mysqldump or filesystem snapshots).
- Use strong, rotated secrets for `JWT_SECRET` (256-bit) and `DB_PASSWORD`.
- Consider using object storage (S3/Cloudinary) for uploads to avoid single-server state.
- Add Prometheus (Micrometer) and node_exporter for monitoring, and configure alerting in Grafana.
- For WebRTC video interviews, TURN server (coturn) is required in production. See `WEBRTC_SETUP.md` for complete guide.
