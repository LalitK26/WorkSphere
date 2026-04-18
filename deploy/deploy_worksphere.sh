#!/bin/bash
set -e

# ===== CONFIG =====
RELEASE=$(date +%Y-%m-%d_%H-%M)
API_RELEASE_DIR="/opt/apps/dashboard-api/releases/$RELEASE"
DASHBOARD_RELEASE_DIR="/opt/frontend/dashboard-ui/releases/$RELEASE"
RECRUIT_RELEASE_DIR="/opt/frontend/recruitment-ui/releases/$RELEASE"

API_JAR_SOURCE="/root/build/dashboard.jar"
DASHBOARD_DIST_SOURCE="/root/build/dashboard/dist"
RECRUIT_DIST_SOURCE="/root/build/recruitment/dist"

# ==================

echo "🚀 Starting WorkSphere Deployment"
echo "📦 Release: $RELEASE"

# =========================
# 1️⃣ BACKEND DEPLOY
# =========================
echo "➡ Deploying Backend API"

mkdir -p "$API_RELEASE_DIR"
cp "$API_JAR_SOURCE" "$API_RELEASE_DIR/dashboard.jar"

ln -sfn "$API_RELEASE_DIR/dashboard.jar" /opt/apps/dashboard-api/current

systemctl restart dashboard-api
sleep 3
systemctl status dashboard-api --no-pager

# =========================
# 2️⃣ DASHBOARD UI DEPLOY
# =========================
echo "➡ Deploying Dashboard UI"

mkdir -p "$DASHBOARD_RELEASE_DIR"
rsync -av "$DASHBOARD_DIST_SOURCE/" "$DASHBOARD_RELEASE_DIR/"

ln -sfn "$DASHBOARD_RELEASE_DIR" /opt/frontend/dashboard-ui/current
chown -R www-data:www-data /opt/frontend/dashboard-ui
chmod -R 755 /opt/frontend/dashboard-ui

# =========================
# 3️⃣ RECRUITMENT UI DEPLOY
# =========================
echo "➡ Deploying Recruitment UI"

mkdir -p "$RECRUIT_RELEASE_DIR"
rsync -av "$RECRUIT_DIST_SOURCE/" "$RECRUIT_RELEASE_DIR/"

ln -sfn "$RECRUIT_RELEASE_DIR" /opt/frontend/recruitment-ui/current
chown -R www-data:www-data /opt/frontend/recruitment-ui
chmod -R 755 /opt/frontend/recruitment-ui

# =========================
# 4️⃣ NGINX RELOAD
# =========================
echo "➡ Reloading Nginx"
nginx -t
systemctl reload nginx

# =========================
# 5️⃣ VERIFY
# =========================
echo "✅ Deployment Completed"
echo "🔗 API: https://api.worksphere.ltd"
echo "🔗 Dashboard: https://dashboard.worksphere.ltd"
echo "🔗 Recruitment: https://recruitment.worksphere.ltd"
