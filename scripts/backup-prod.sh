#!/usr/bin/env bash
# Backup diario de comidas_prod.
#
# Pensado para ejecutar desde cron en el servidor Hetzner:
#   0 3 * * * /ruta/al/repo/scripts/backup-prod.sh >> /var/log/comidas-backup.log 2>&1
#
# Retención: 30 días. Los backups más viejos se borran automáticamente.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/comidas}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
# Identificador del container Postgres. Si cambia en el servidor, actualizar.
PG_CONTAINER="${PG_CONTAINER:-fws4wwks04kwkg8ss0sk004c}"
DB_NAME="${DB_NAME:-comidas_prod}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M)
OUTPUT="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Iniciando backup de $DB_NAME → $OUTPUT"

docker exec -i "$PG_CONTAINER" pg_dump -U postgres -d "$DB_NAME" --no-owner --no-acl \
  | gzip -9 > "$OUTPUT"

# Verificar tamaño mínimo (si sale vacío algo fue mal)
SIZE=$(stat -c%s "$OUTPUT" 2>/dev/null || stat -f%z "$OUTPUT")
if [ "$SIZE" -lt 1024 ]; then
  echo "[$(date -Iseconds)] ⚠️  Backup sospechosamente pequeño ($SIZE bytes). Revisa."
  exit 1
fi

echo "[$(date -Iseconds)] Backup OK ($SIZE bytes)"

# Rotación: borrar backups viejos
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete
echo "[$(date -Iseconds)] Rotación terminada (retención: ${RETENTION_DAYS}d)"
