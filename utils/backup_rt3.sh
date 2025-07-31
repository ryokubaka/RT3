#!/bin/bash
# backup_rt3.sh

set -e

# Directories - use environment variable if set, otherwise default
BASE_DIR="/app"
BACKUP_DIR="/app/backup"
LOG_FILE="$BACKUP_DIR/backup.log"
exec >>"$LOG_FILE" 2>&1
DATA_FILE="$BASE_DIR/data/rt3.db"
UPLOADS_DIR="$BASE_DIR/uploads"

# Timestamped backup name
TIMESTAMP=$(date +"%Y-%m-%d_%H%M")
ARCHIVE_NAME="backup_$TIMESTAMP.tar.gz"

echo "=== RT3 Backup Started: $(date) ==="

echo "Creating backup: $ARCHIVE_NAME"

# Check if source files exist
if [ ! -f "$DATA_FILE" ]; then
    echo "WARNING: Database file not found: $DATA_FILE"
    exit 1
fi

if [ ! -d "$UPLOADS_DIR" ]; then
    echo "WARNING: Uploads directory not found: $UPLOADS_DIR"
    exit 1
fi

# Create the archive
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$BASE_DIR" "data/rt3.db" "uploads/"

# Check if backup was created successfully
if [ -f "$BACKUP_DIR/$ARCHIVE_NAME" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$ARCHIVE_NAME" | cut -f1)
    echo "Backup created successfully: $BACKUP_DIR/$ARCHIVE_NAME (Size: $BACKUP_SIZE)"
else
    echo "ERROR: Backup file was not created!"
    exit 1
fi

# Keep only the most recent 28 backups (7 days × 4 backups/day)
echo "Cleaning up old backups (keeping latest 28)..."
cd "$BACKUP_DIR"
OLD_BACKUPS=$(ls -1t backup_*.tar.gz | tail -n +29 | wc -l)
if [ $OLD_BACKUPS -gt 0 ]; then
    echo "Removing $OLD_BACKUPS old backup(s)..."
    ls -1t backup_*.tar.gz | tail -n +29 | xargs -r rm --
else
    echo "No old backups to remove"
fi

# Show current backup count
CURRENT_BACKUPS=$(ls -1 backup_*.tar.gz 2>/dev/null | wc -l)
echo "Current backup count: $CURRENT_BACKUPS"

echo "=== RT3 Backup Completed: $(date) ==="
echo ""
