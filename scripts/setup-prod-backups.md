# Configurar backups automáticos de `comidas_prod`

Esta configuración se hace **una sola vez** en el servidor Hetzner.

## Requisitos

- Acceso SSH al servidor (`root@5.78.124.107` o similar).
- El script `backup-prod.sh` clonado en algún lugar del servidor. Si el repo
  entero está clonado ahí, usa la ruta al script del repo. Si no, copia solo
  el script a `/root/scripts/backup-prod.sh`.

## Pasos

### 1. Copiar el script al servidor (si no está ya)

Desde tu laptop:

```bash
scp scripts/backup-prod.sh root@5.78.124.107:/root/backup-prod.sh
ssh root@5.78.124.107 'chmod +x /root/backup-prod.sh'
```

### 2. Crear el directorio de backups

```bash
ssh root@5.78.124.107 'mkdir -p /var/backups/comidas && chmod 700 /var/backups/comidas'
```

### 3. Probar el script manualmente

```bash
ssh root@5.78.124.107 '/root/backup-prod.sh'
ssh root@5.78.124.107 'ls -lh /var/backups/comidas/'
```

Deberías ver un `.sql.gz` con tamaño razonable (al menos unos KB para una BD
vacía, MB+ cuando tenga datos).

### 4. Configurar cron

```bash
ssh root@5.78.124.107
crontab -e
```

Añadir la línea (a las 3:00 cada madrugada):

```
0 3 * * * /root/backup-prod.sh >> /var/log/comidas-backup.log 2>&1
```

Guardar y salir. Verifica:

```bash
crontab -l | grep backup-prod
```

### 5. Probar el log

Al día siguiente comprobar que el backup corrió:

```bash
ssh root@5.78.124.107 'tail -20 /var/log/comidas-backup.log'
ssh root@5.78.124.107 'ls -lh /var/backups/comidas/'
```

## Variables configurables

Si alguna vez cambia el container de Postgres o la BD objetivo:

- `BACKUP_DIR` — dónde guardar (default `/var/backups/comidas`).
- `RETENTION_DAYS` — días a conservar (default 30).
- `PG_CONTAINER` — nombre del container (default
  `fws4wwks04kwkg8ss0sk004c`).
- `DB_NAME` — BD a dumpar (default `comidas_prod`).

Se pasan como env vars antes del comando:

```bash
PG_CONTAINER=otro_container DB_NAME=comidas_staging /root/backup-prod.sh
```

## Restaurar un backup

Ver `docs/despliegue/RUNBOOK.md` — sección "Restaurar desde un backup".

## Off-site backup (opcional, recomendado)

Los backups locales protegen de errores de software, no de que el servidor
físico se rompa. Para mayor robustez, sincronizar `/var/backups/comidas/` a
S3/Backblaze/OVH Object Storage diariamente:

```bash
# /root/backup-prod.sh (al final), por ejemplo con rclone:
rclone copy /var/backups/comidas/ remote:comidas-backups/ --max-age 40h
```

Fuera de scope en este sprint; anotar para cuando haya datos reales.
