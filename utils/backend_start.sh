#!/bin/bash

# Set up cron job
cp /opt/rt3/utils/backup.cron /etc/cron.d/rt3-backup
chmod 0644 /etc/cron.d/rt3-backup
crontab /etc/cron.d/rt3-backup
service cron start

# Initialize database
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
alembic upgrade head

# Start the application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload