#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${S3_BUCKET:?S3_BUCKET is required}"
: "${S3_ENDPOINT:?S3_ENDPOINT is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"

stamp="$(date -u +%Y%m%d-%H%M%S)"
prefix="${BACKUP_PREFIX:-arena-padel}"
filename="${prefix}-postgres-${stamp}.dump"
file="/tmp/${filename}"

cleanup() {
  rm -f "$file"
}
trap cleanup EXIT INT TERM

echo "Creating PostgreSQL backup: ${filename}"
pg_dump "$DATABASE_URL" --format=custom --no-owner --file="$file"

echo "Uploading backup to ${S3_BUCKET}"
aws s3 cp "$file" "s3://${S3_BUCKET}/${prefix}/${filename}" \
  --endpoint-url "$S3_ENDPOINT" \
  --only-show-errors

echo "Backup completed: ${prefix}/${filename}"
