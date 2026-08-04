#!/usr/bin/env bash
# Backup diario de comidas_prod.
#
# Pensado para ejecutar desde cron en el servidor Hetzner:
#   0 3 * * * /ruta/al/repo/scripts/backup-prod.sh >> /var/log/comidas-backup.log 2>&1
#
# Retención: 30 días. Los backups más viejos se borran automáticamente.
#
# Opcionales (env):
#   RCLONE_REMOTE   — remoto rclone para copia off-site, ej. "b2:plati-backups".
#   BACKUP_PING_URL — URL de dead-man's switch (Healthchecks/Uptime Kuma): se
#                     hace ping al terminar OK; si el cron deja de correr, el
#                     monitor avisa solo.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/comidas}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
# Nombre del container Postgres (Coolify lo nombra con el id del recurso). El
# default es el id actual en el servidor — sirve de fallback si la resolución
# por nombre no encuentra nada. Si el recurso cambia, exporta PG_CONTAINER_NAME.
PG_CONTAINER_NAME="${PG_CONTAINER_NAME:-fws4wwks04kwkg8ss0sk004c}"
DB_NAME="${DB_NAME:-comidas_prod}"

# Resolver el container por nombre → id. Respeta PG_CONTAINER si ya viene del
# entorno (compatibilidad con el comportamiento anterior).
if [ -z "${PG_CONTAINER:-}" ]; then
  PG_CONTAINER=$(docker ps --filter "name=$PG_CONTAINER_NAME" --format '{{.ID}}' | head -1)
  PG_CONTAINER="${PG_CONTAINER:-$PG_CONTAINER_NAME}"
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M)
OUTPUT="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Iniciando backup de $DB_NAME → $OUTPUT (container $PG_CONTAINER)"

docker exec -i "$PG_CONTAINER" pg_dump -U postgres -d "$DB_NAME" --no-owner --no-acl \
  | gzip -9 > "$OUTPUT"

# Verificar tamaño mínimo (si sale vacío algo fue mal)
SIZE=$(stat -c%s "$OUTPUT" 2>/dev/null || stat -f%z "$OUTPUT")
if [ "$SIZE" -lt 1024 ]; then
  echo "[$(date -Iseconds)] ⚠️  Backup sospechosamente pequeño ($SIZE bytes). Revisa."
  exit 1
fi

echo "[$(date -Iseconds)] Backup OK ($SIZE bytes)"

# Registrar el backup en BD (tabla backup_events, modelo BackupEvent). Best-effort:
# si el INSERT falla, el backup en disco sigue siendo válido — solo avisamos.
FILENAME=$(basename "$OUTPUT")
SHA256=$( (sha256sum "$OUTPUT" 2>/dev/null || shasum -a 256 "$OUTPUT" 2>/dev/null || echo '') | awk '{print $1}' )
INSERT_SQL="INSERT INTO backup_events (id, file_name, file_size, hash, created_by, source, notes, created_at)
VALUES (gen_random_uuid(), '${FILENAME}', ${SIZE}, NULLIF('${SHA256}', ''), 'backup-prod.sh', 'cron', 'OK', now());"
if docker exec -i "$PG_CONTAINER" psql -U postgres -d "$DB_NAME" -v ON_ERROR_STOP=1 -q -c "$INSERT_SQL" >/dev/null 2>&1; then
  echo "[$(date -Iseconds)] Backup registrado en backup_events (sha256: ${SHA256:-n/a})"
else
  echo "[$(date -Iseconds)] ⚠️  No se pudo registrar el backup en backup_events (el fichero en disco es válido)"
fi

# Copia off-site opcional (rclone). Best-effort: no aborta si falla.
if [ -n "${RCLONE_REMOTE:-}" ]; then
  if rclone copy "$OUTPUT" "$RCLONE_REMOTE/"; then
    echo "[$(date -Iseconds)] Copia off-site OK → $RCLONE_REMOTE"
  else
    echo "[$(date -Iseconds)] ⚠️  Falló la copia off-site a $RCLONE_REMOTE (el backup local es válido)"
  fi
fi

# Rotación: borrar backups viejos
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +"$RETENTION_DAYS" -delete
echo "[$(date -Iseconds)] Rotación terminada (retención: ${RETENTION_DAYS}d)"

# Dead-man's switch opcional: ping al monitor al terminar OK.
if [ -n "${BACKUP_PING_URL:-}" ]; then
  curl -fsS -m 10 "$BACKUP_PING_URL" >/dev/null || true
fi
