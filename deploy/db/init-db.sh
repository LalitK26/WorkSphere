#!/usr/bin/env bash
set -euo pipefail

# Initialize the `dashboard` database and create a dedicated DB user.
# Usage:
#   MYSQL_ROOT_PWD=your_root_pass ./deploy/db/init-db.sh
# If MYSQL_ROOT_PWD is not set the script will prompt for it interactively.

if [ -z "${MYSQL_ROOT_PWD:-}" ]; then
  read -s -p "Enter MySQL root password: " MYSQL_ROOT_PWD
  echo
fi

DB_NAME=dashboard
DB_USER=dashboard_user
DB_PASS=${DB_PASSWORD:-StrongPassword@123}

echo "Creating database '$DB_NAME' and user '$DB_USER' (password from DB_PASSWORD or default)."

mysql -u root -p"$MYSQL_ROOT_PWD" <<SQL
CREATE DATABASE IF NOT EXISTS \\`$DB_NAME\\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \\`$DB_NAME\\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

SCHEMA_PATH="$(pwd)/dashboard/src/main/resources/schema.sql"
if [ ! -f "$SCHEMA_PATH" ]; then
  echo "schema.sql not found at $SCHEMA_PATH"
  echo "Please copy schema.sql to the repo path or adjust SCHEMA_PATH in this script."
  exit 1
fi

echo "Importing schema from $SCHEMA_PATH ..."
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SCHEMA_PATH"

echo "Database initialized. User: $DB_USER, DB: $DB_NAME"
