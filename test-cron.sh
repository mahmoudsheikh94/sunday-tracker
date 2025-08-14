#!/bin/bash

# Test the cron job
echo "Testing cron job..."

# Get the CRON_KEY from .env file
CRON_KEY=$(grep CRON_KEY .env | cut -d '=' -f2)

if [ -z "$CRON_KEY" ]; then
    echo "❌ CRON_KEY not found in .env file"
    exit 1
fi

echo "Using CRON_KEY: $CRON_KEY"

# Test the cron job
curl -X POST "http://192.168.8.21:3000/api/jobs/poll-recently-played" \
  -H "X-CRON-KEY: $CRON_KEY" \
  -H "Content-Type: application/json"

echo ""
echo "✅ Cron job test completed"
