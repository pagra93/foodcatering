#!/usr/bin/env python3
"""
PM x10 Dashboard Bridge — V3.1 (Feature Dossiers)

Servidor HTTP local que sirve la UI del dashboard y expone endpoints de lectura
del filesystem del proyecto. Sin dependencias externas (solo stdlib).

Uso:
    python3 bridge.py [--port 7700] [--root .]

Endpoints:
    GET /                     → index.html
    GET /styles.css           → CSS
    GET /app.js               → JS
    GET /api/health           → { ok, version }
    GET /api/tree             → estructura de archivos del proyecto agrupada por área
    GET /api/file?path=X      → contenido raw del archivo (validado contra root)
"""

import argparse
import datetime
import json
import os
import re
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs


def _now_iso():
    """Timestamp ISO 8601 UTC con sufijo Z."""
    # datetime.UTC en Py3.11+; fallback a timezone.utc para versiones anteriores
    tz = getattr(datetime, "UTC", datetime.timezone.utc)
    return datetime.datetime.now(tz).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")

VERSION = "3.1"
DEFAULT_PORT = 7700
PORT_RANGE = 10  # intenta puertos hasta DEFAULT_PORT + PORT_RANGE

# Archivos que el dashboard NO debe permitir editar a través del endpoint POST.
# Algunos son append-only (qa.md), otros son derivados (tasks.json), otros son
# escritos por agentes (project-registry.md, build-state.md).
# El usuario puede editarlos a mano fuera del dashboard si lo necesita.
READ_ONLY_PATTERNS = [
    "docs/producto/qa.md",                      # append-only
    "docs/general/project-registry.md",         # mantenido por /review
    "pm/tasks.json",                            # derivado del filesystem
    "pm/build-state.md",                        # tracking de /build
    "pm/events.jsonl",                          # log append-only
    "docs/general/PROJECT_KNOWLEDGE.md",        # mantenido por /review + /docs
]

# V3.1: archivos read-only que aparecen en cualquier subcarpeta (match por basename)
READ_ONLY_BASENAMES = [
    "_dossier.md",        # auto-mantenido por /pm dossier (excepto sección USER:notes — editar fuera del dashboard)
    "_events.jsonl",      # timeline append-only por feature
]

# Áreas por defecto si no hay pm/config.json. Se sobreescriben con lo que diga config.json.
# Estructura V3: cada área tiene su carpeta docs/<area>/
DEFAULT_AREAS = {
    "general": {
        "label": "General",
        "active": True,
        "paths": ["docs/general"],
    },
    "producto": {
        "label": "Producto",
        "active": True,
        "paths": ["docs/producto"],
    },
    "marketing": {"label": "Marketing", "active": False, "paths": ["docs/marketing"]},
    "rrhh": {"label": "RRHH", "active": False, "paths": ["docs/rrhh"]},
    "operaciones": {"label": "Operaciones", "active": False, "paths": ["docs/operaciones"]},
}

# Sección "PM Sistema" — siempre visible, agrupa estado operativo y memoria
SYSTEM_SECTION = {
    "id": "_system",
    "label": "PM Sistema",
    "active": True,
    "paths": ["pm", "memory"],
}

# Archivos a ignorar al construir el árbol
IGNORE_NAMES = {".git", ".DS_Store", "node_modules", "__pycache__", ".pm-dashboard", "dashboard"}
IGNORE_PREFIXES = (".pm-backup-",)  # backups generados por scripts/migrate-to-v3.sh
IGNORE_SUFFIXES = (".pyc", ".swp", ".tmp")


def is_ignored(name):
    if name in IGNORE_NAMES or name.startswith("."):
        return True
    if any(name.startswith(prefix) for prefix in IGNORE_PREFIXES):
        return True
    return any(name.endswith(suf) for suf in IGNORE_SUFFIXES)


def build_node(abs_path, rel_path, project_root):
    """Recursivamente construye un nodo del árbol."""
    name = os.path.basename(rel_path) if rel_path else os.path.basename(abs_path)
    if os.path.isdir(abs_path):
        children = []
        try:
            entries = sorted(os.listdir(abs_path))
        except OSError:
            entries = []
        for entry in entries:
            if is_ignored(entry):
                continue
            child_abs = os.path.join(abs_path, entry)
            child_rel = os.path.relpath(child_abs, project_root)
            children.append(build_node(child_abs, child_rel, project_root))
        return {
            "type": "dir",
            "name": name,
            "path": rel_path,
            "children": children,
        }
    return {
        "type": "file",
        "name": name,
        "path": rel_path,
        "size": os.path.getsize(abs_path) if os.path.exists(abs_path) else 0,
    }


def load_areas(project_root):
    """Carga la lista de áreas desde pm/config.json. Si no existe, usa DEFAULT_AREAS.
    Esquema esperado en config.json:
        { "areas": { "<id>": { "label": "...", "active": bool, "paths": ["..."] }, ... } }
    Si falta el campo paths, se usa "docs/<id>" por defecto.
    """
    cfg_path = os.path.join(project_root, "pm", "config.json")
    if not os.path.exists(cfg_path):
        return DEFAULT_AREAS
    try:
        with open(cfg_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except (json.JSONDecodeError, OSError):
        return DEFAULT_AREAS

    areas_cfg = cfg.get("areas")
    if not areas_cfg or not isinstance(areas_cfg, dict):
        return DEFAULT_AREAS

    out = {}
    for area_id, info in areas_cfg.items():
        if not isinstance(info, dict):
            continue
        out[area_id] = {
            "label": info.get("label", area_id.capitalize()),
            "active": bool(info.get("active", False)),
            "paths": info.get("paths") or [f"docs/{area_id}"],
        }
    return out or DEFAULT_AREAS


def build_tree(project_root):
    """Construye el árbol agrupado por área + sección sistema."""
    areas = load_areas(project_root)
    areas_tree = []

    # Áreas declaradas en config.json (o defaults)
    for area_id, area_info in areas.items():
        area_node = {
            "id": area_id,
            "label": area_info["label"],
            "active": area_info["active"],
            "children": [],
        }
        if area_info["active"]:
            for path in area_info["paths"]:
                abs_path = os.path.join(project_root, path)
                if os.path.exists(abs_path):
                    area_node["children"].append(build_node(abs_path, path, project_root))
        areas_tree.append(area_node)

    # Sección sistema (siempre visible al final): pm/ + memory/
    system_node = {
        "id": SYSTEM_SECTION["id"],
        "label": SYSTEM_SECTION["label"],
        "active": SYSTEM_SECTION["active"],
        "children": [],
    }
    for path in SYSTEM_SECTION["paths"]:
        abs_path = os.path.join(project_root, path)
        if os.path.exists(abs_path):
            system_node["children"].append(build_node(abs_path, path, project_root))
    areas_tree.append(system_node)

    return {
        "project": os.path.basename(project_root),
        "project_root": project_root,
        "areas": areas_tree,
    }


def safe_join(project_root, requested_path):
    """Une project_root con requested_path validando que el resultado esté DENTRO de project_root.
    Devuelve la ruta absoluta o None si es inválida."""
    if not requested_path:
        return None
    candidate = os.path.realpath(os.path.join(project_root, requested_path))
    root_real = os.path.realpath(project_root)
    if not candidate.startswith(root_real + os.sep) and candidate != root_real:
        return None
    return candidate


def is_read_only(rel_path):
    """¿El path solicitado coincide con algún patrón read-only (path exacto o basename)?"""
    if not rel_path:
        return True
    norm = rel_path.replace("\\", "/").lstrip("./")
    if norm in READ_ONLY_PATTERNS:
        return True
    basename = norm.rsplit("/", 1)[-1]
    return basename in READ_ONLY_BASENAMES


# ─────────────────────────────────────────────────────────────────
# V3.1: Feature Dossier helpers
# ─────────────────────────────────────────────────────────────────

def list_features(project_root):
    """Lista todas las feature folders bajo docs/producto/features/.

    Returns: list of dicts con slug, title (del _dossier.md o nombre carpeta),
    has_dossier (bool), last_updated (mtime del _dossier.md), file_count.
    """
    features_dir = os.path.join(project_root, "docs", "producto", "features")
    if not os.path.isdir(features_dir):
        return []
    out = []
    for entry in sorted(os.listdir(features_dir)):
        feat_path = os.path.join(features_dir, entry)
        if not os.path.isdir(feat_path) or entry.startswith("."):
            continue
        dossier_path = os.path.join(feat_path, "_dossier.md")
        has_dossier = os.path.exists(dossier_path)
        title = entry
        last_updated = None
        if has_dossier:
            try:
                with open(dossier_path, "r", encoding="utf-8") as f:
                    first_line = f.readline().strip()
                    if first_line.startswith("# Dossier:"):
                        title = first_line[len("# Dossier:"):].strip()
                last_updated = os.path.getmtime(dossier_path)
            except OSError:
                pass
        artifacts = [n for n in os.listdir(feat_path) if n.endswith(".md") and not n.startswith("_")]
        out.append({
            "slug": entry,
            "title": title,
            "has_dossier": has_dossier,
            "last_updated": last_updated,
            "artifact_count": len(artifacts),
        })
    return out


def parse_dossier(project_root, slug):
    """Lee _dossier.md + _events.jsonl de una feature y devuelve estructura parseada.

    Returns: dict con:
      - slug
      - markdown (raw del dossier)
      - sections: {section_key: content} extraído de los marcadores <!-- AUTO:X -->
      - user_notes: contenido de <!-- USER:notes -->
      - events: list de eventos del _events.jsonl
      - artifacts: list de archivos .md hermanos
      - exists: bool
    """
    feat_dir = os.path.join(project_root, "docs", "producto", "features", slug)
    if not os.path.isdir(feat_dir):
        return {"slug": slug, "exists": False, "error": "feature_not_found"}
    dossier_path = os.path.join(feat_dir, "_dossier.md")
    events_path = os.path.join(feat_dir, "_events.jsonl")

    result = {
        "slug": slug,
        "exists": os.path.exists(dossier_path),
        "markdown": "",
        "sections": {},
        "user_notes": "",
        "events": [],
        "artifacts": [],
    }

    if result["exists"]:
        try:
            with open(dossier_path, "r", encoding="utf-8") as f:
                content = f.read()
            result["markdown"] = content
            # Parsear secciones AUTO
            auto_pat = re.compile(r"<!-- AUTO:(\w+) -->(.*?)<!-- /AUTO:\1 -->", re.DOTALL)
            for m in auto_pat.finditer(content):
                result["sections"][m.group(1)] = m.group(2).strip()
            # Parsear USER:notes
            user_pat = re.compile(r"<!-- USER:notes -->(.*?)<!-- /USER:notes -->", re.DOTALL)
            user_match = user_pat.search(content)
            if user_match:
                result["user_notes"] = user_match.group(1).strip()
        except OSError as e:
            result["error"] = f"dossier_unreadable: {e}"

    # Parsear events.jsonl
    if os.path.exists(events_path):
        try:
            with open(events_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("//"):
                        continue
                    if line.startswith('{"_comment"'):
                        continue
                    try:
                        result["events"].append(json.loads(line))
                    except json.JSONDecodeError:
                        continue  # skip malformed lines
            result["events"].sort(key=lambda e: e.get("ts", ""))
        except OSError as e:
            result["events_error"] = str(e)

    # Artefactos hermanos (.md sin prefijo _)
    try:
        for name in sorted(os.listdir(feat_dir)):
            if name.endswith(".md") and not name.startswith("_"):
                result["artifacts"].append(name)
    except OSError:
        pass

    return result


def atomic_write(abs_path, content):
    """Escritura atómica: escribe a archivo temporal y rename.
    Evita corrupción si el proceso muere a mitad de la escritura."""
    tmp_path = abs_path + ".tmp." + str(os.getpid())
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp_path, abs_path)


# ─────── Story frontmatter parser/serializer ───────
# Formato esperado en stories.md:
#   ## HU-XXX: Título
#   ```yaml
#   id: HU-XXX
#   priority: 5
#   ...
#   ```
#   ### Resto de la story...
#
# El parser es minimal pero robusto: solo entiende los tipos necesarios
# (string, int, bool, null, lista de strings). Sin dependencias externas.

_STORY_HEADER_RE = re.compile(r'^##\s+((?:HU|EPIC)-[0-9A-Za-z\-]+)(?:\s*:\s*(.*))?$', re.MULTILINE)
_YAML_FENCE_OPEN_RE = re.compile(r'^```ya?ml\s*$', re.MULTILINE)
_YAML_FENCE_CLOSE_RE = re.compile(r'^```\s*$', re.MULTILINE)


def _yaml_parse_value(s):
    """Parser simple de un valor YAML (sin recursión). Soporta: null, true/false, int, float, string, lista inline."""
    s = s.strip()
    if not s or s.lower() in ("null", "~"):
        return None
    if s.lower() == "true":
        return True
    if s.lower() == "false":
        return False
    # Lista inline: [a, b, c]
    if s.startswith("[") and s.endswith("]"):
        inner = s[1:-1].strip()
        if not inner:
            return []
        return [_yaml_parse_value(x) for x in inner.split(",")]
    # Quoted string: usar json.loads para los double-quoted (decodifica \n, \", etc.)
    if s.startswith('"') and s.endswith('"'):
        try:
            return json.loads(s)
        except (json.JSONDecodeError, ValueError):
            return s[1:-1]
    if s.startswith("'") and s.endswith("'"):
        return s[1:-1]
    # Int/float
    try:
        if "." in s:
            return float(s)
        return int(s)
    except ValueError:
        pass
    # Plain string
    return s


def _yaml_serialize_value(v):
    """Serialización simple de un valor a YAML."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        items = [_yaml_serialize_value(x) for x in v]
        return "[" + ", ".join(items) + "]"
    s = str(v)
    # Quote si tiene caracteres especiales o espacios al inicio
    if any(c in s for c in [':', '#', '"', "'", '\n']) or s.strip() != s or s == "":
        return json.dumps(s, ensure_ascii=False)  # double-quoted, escapa correctamente
    return s


def parse_yaml_block(text):
    """Parsea un bloque YAML simple a dict. Solo soporta `key: value` por línea."""
    out = {}
    for line in text.split("\n"):
        if not line.strip() or line.strip().startswith("#"):
            continue
        m = re.match(r'^(\w[\w\-]*)\s*:\s*(.*)$', line)
        if m:
            out[m.group(1)] = _yaml_parse_value(m.group(2))
    return out


def serialize_yaml_block(d, key_order=None):
    """Serializa un dict a bloque YAML simple (key: value por línea).
    Si key_order se pasa, las keys conocidas van primero en ese orden; el resto al final."""
    keys = list(d.keys())
    if key_order:
        ordered = [k for k in key_order if k in d]
        rest = [k for k in keys if k not in key_order]
        keys = ordered + rest
    return "\n".join(f"{k}: {_yaml_serialize_value(d[k])}" for k in keys)


# Orden canónico de campos en el frontmatter de una story
STORY_FRONTMATTER_KEYS = [
    "id", "parent_epic", "title", "priority", "platform", "category",
    "agent_suggested", "criticality", "status", "depends_on", "blocked",
    "blocked_reason", "previous_status", "created_at", "updated_at",
    "prompt_override",  # V2.0.3: instrucciones específicas del usuario para esta tarea
]


def find_stories_in_text(text, file_path):
    """Encuentra todas las stories en el texto markdown.
    Devuelve lista de dicts: {story_id, title, frontmatter, header_pos, frontmatter_pos, body_pos}
    Las posiciones son índices de carácter en text para permitir splice exacto."""
    results = []
    for m in _STORY_HEADER_RE.finditer(text):
        story_id = m.group(1)
        title_inline = (m.group(2) or "").strip()
        header_start = m.start()
        header_end = m.end()

        # Buscar bloque ```yaml después del header (debe ser el siguiente bloque, sin otro H2 antes)
        # Limitamos la búsqueda a hasta el siguiente H2 o EOF
        next_h2 = _STORY_HEADER_RE.search(text, header_end)
        section_end = next_h2.start() if next_h2 else len(text)
        section = text[header_end:section_end]

        # Buscar fence de apertura
        open_m = _YAML_FENCE_OPEN_RE.search(section)
        frontmatter = {}
        frontmatter_block_start = None
        frontmatter_block_end = None
        body_start = section_end  # default: si no hay frontmatter, no hay body extraíble

        if open_m:
            yaml_start = header_end + open_m.end()
            close_m = _YAML_FENCE_CLOSE_RE.search(section, open_m.end())
            if close_m:
                yaml_end = header_end + close_m.start()
                yaml_text = text[yaml_start:yaml_end]
                frontmatter = parse_yaml_block(yaml_text)
                frontmatter_block_start = header_end + open_m.start()
                frontmatter_block_end = header_end + close_m.end()
                body_start = frontmatter_block_end
            else:
                # Fence abierto sin cierre → frontmatter inválido, lo ignoramos
                pass

        # Asegurar que el id del frontmatter coincide con el del header (el del header gana si discrepan)
        if "id" not in frontmatter:
            frontmatter["id"] = story_id

        # Title: del frontmatter si existe, si no del header
        title = frontmatter.get("title") or title_inline or story_id

        results.append({
            "story_id": story_id,
            "title": title,
            "frontmatter": frontmatter,
            "header_start": header_start,
            "header_end": header_end,
            "frontmatter_block_start": frontmatter_block_start,
            "frontmatter_block_end": frontmatter_block_end,
            "body_start": body_start,
            "section_end": section_end,
            "_no_frontmatter": frontmatter_block_start is None,
            "_file": file_path,
        })

    return results


def update_story_frontmatter_in_text(text, story_id, fields_update, key_order=None):
    """Actualiza los campos del frontmatter de una story dentro de un .md.
    - Si la story no tiene frontmatter, lo crea (insertando ```yaml ... ``` después del H2).
    - Solo modifica los keys pasados; el resto se preserva.
    Devuelve (new_text, story_dict_actualizado) o (None, None) si la story no existe."""
    stories = find_stories_in_text(text, "")
    target = next((s for s in stories if s["story_id"] == story_id), None)
    if target is None:
        return None, None

    new_fm = dict(target["frontmatter"])
    for k, v in fields_update.items():
        new_fm[k] = v
    if "id" not in new_fm:
        new_fm["id"] = story_id

    serialized_yaml = serialize_yaml_block(new_fm, key_order or STORY_FRONTMATTER_KEYS)
    new_block = f"\n\n```yaml\n{serialized_yaml}\n```"

    if target["frontmatter_block_start"] is not None:
        # Reemplazar bloque existente
        new_text = (
            text[:target["frontmatter_block_start"]]
            + f"```yaml\n{serialized_yaml}\n```"
            + text[target["frontmatter_block_end"]:]
        )
    else:
        # Insertar después del header
        new_text = (
            text[:target["header_end"]]
            + new_block
            + text[target["header_end"]:]
        )

    target["frontmatter"] = new_fm
    return new_text, target


def extract_story_block(text, story_id):
    """Extrae el bloque completo de una story (header + frontmatter + body) y devuelve
    el texto restante sin esa story. Útil para mover stories entre archivos.
    Devuelve (story_block_text, new_text_without_story) o (None, None) si no existe."""
    stories = find_stories_in_text(text, "")
    target = next((s for s in stories if s["story_id"] == story_id), None)
    if target is None:
        return None, None
    block = text[target["header_start"]:target["section_end"]]
    # Eliminar también dobles saltos sobrantes alrededor
    new_text = text[:target["header_start"]] + text[target["section_end"]:]
    # Limpiar múltiples newlines consecutivas que queden
    new_text = re.sub(r'\n{3,}', '\n\n', new_text)
    return block.strip("\n"), new_text


def list_all_stories(project_root):
    """Escanea docs/producto/features/*/stories.md y devuelve todas las stories planas."""
    base = os.path.join(project_root, "docs", "producto", "features")
    out = []
    if not os.path.isdir(base):
        return out
    for feature_name in sorted(os.listdir(base)):
        feature_dir = os.path.join(base, feature_name)
        if not os.path.isdir(feature_dir):
            continue
        stories_file = os.path.join(feature_dir, "stories.md")
        if not os.path.isfile(stories_file):
            continue
        try:
            with open(stories_file, "r", encoding="utf-8") as f:
                text = f.read()
        except (OSError, UnicodeDecodeError):
            continue
        rel_path = os.path.relpath(stories_file, project_root).replace("\\", "/")
        for s in find_stories_in_text(text, rel_path):
            fm = s["frontmatter"]
            out.append({
                "path": rel_path,
                "feature": feature_name,
                "story_id": s["story_id"],
                "title": s["title"],
                "priority": fm.get("priority"),
                "platform": fm.get("platform"),
                "category": fm.get("category"),
                "status": fm.get("status"),
                "criticality": fm.get("criticality"),
                "agent_suggested": fm.get("agent_suggested"),
                "depends_on": fm.get("depends_on") or [],
                "blocked": fm.get("blocked") or False,
                "blocked_reason": fm.get("blocked_reason"),
                "parent_epic": fm.get("parent_epic"),
                "prompt_override": fm.get("prompt_override"),
                "created_at": fm.get("created_at"),
                "updated_at": fm.get("updated_at"),
                "_no_frontmatter": s["_no_frontmatter"],
            })
    return out


# V2.0.1: orden lógico de estados V2 para sugerir el "siguiente paso" en next_action.
STATE_NEXT_V2 = {
    "sin_priorizar": "priorizada",
    "priorizada":    "research",
    "research":      "definicion",
    "definicion":    "planning",
    "planning":      "build",
    "build":         "review",
    "review":        "hecho",
}


def enrich_tasks_with_sub_status(project_root, tasks_data):
    """Calcula sub_status (pendiente/completado) y next_action por tarea
    según existencia del artefacto definido en areas.producto.state_meta.

    Reemplaza los valores ya presentes en tasks.json para que el dashboard
    siempre muestre el estado real del filesystem sin esperar a /pm sync.
    """
    cfg_path = os.path.join(project_root, "pm", "config.json")
    if not os.path.exists(cfg_path):
        return tasks_data
    try:
        with open(cfg_path, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    except (json.JSONDecodeError, OSError):
        return tasks_data

    state_meta = (cfg.get("areas", {}).get("producto", {}).get("state_meta") or {})
    if not state_meta:
        return tasks_data

    def artifact_filename(meta):
        """Extrae el filename limpio: 'qa.md (aprobado)' → 'qa.md'."""
        raw = (meta or {}).get("artifact")
        if not raw:
            return None
        # quita comentarios entre paréntesis y espacios sobrantes
        name = re.split(r"\s*\(", raw)[0].strip()
        return name or None

    def artifact_exists(feature_path, filename):
        if not feature_path or not filename:
            return False
        # 1) ruta dentro de la feature
        candidate = os.path.join(project_root, feature_path, filename)
        if os.path.isfile(candidate):
            return True
        # 2) fallback: artefactos globales del proyecto (build-state.md, qa.md)
        candidate_global = os.path.join(project_root, filename)
        if os.path.isfile(candidate_global):
            return True
        return False

    for t in tasks_data.get("tasks", []):
        status = t.get("status")
        meta = state_meta.get(status, {}) or {}
        if meta.get("type") != "agent":
            t["sub_status"] = None
            t["next_action"] = None
            continue

        filename = artifact_filename(meta)
        feature_path = t.get("feature_path")
        if artifact_exists(feature_path, filename):
            t["sub_status"] = "completado"
            nxt = STATE_NEXT_V2.get(status)
            if nxt:
                nxt_meta = state_meta.get(nxt, {}) or {}
                nxt_label = nxt_meta.get("label", nxt)
                nxt_cmd = nxt_meta.get("command")
                if nxt_cmd:
                    t["next_action"] = f"Próximo: arrastra a «{nxt_label}» y lanza {nxt_cmd}"
                else:
                    t["next_action"] = f"Próximo: arrastra a «{nxt_label}»"
            else:
                t["next_action"] = None
        else:
            t["sub_status"] = "pendiente"
            t["next_action"] = None

    return tasks_data


# ─────────────────────────────────────────────────────────────────
# Cerebro/Wiki, Reuniones y Overview (panel de startup)
# ─────────────────────────────────────────────────────────────────

def _md_title(text, fallback):
    """Primer encabezado markdown `# ...`, o fallback."""
    m = re.search(r'^#\s+(.+)$', text, re.MULTILINE)
    return m.group(1).strip() if m else fallback


def _read_md_meta(abs_path):
    """Lee un .md: frontmatter (parse_yaml_block), título, y conteos de wikilinks."""
    try:
        with open(abs_path, "r", encoding="utf-8") as f:
            text = f.read()
    except (OSError, UnicodeDecodeError):
        return None
    fm = {}
    fm_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', text, re.DOTALL)
    if fm_match:
        fm = parse_yaml_block(fm_match.group(1))
    slug = os.path.splitext(os.path.basename(abs_path))[0]
    return {
        "slug": slug,
        "title": _md_title(text, slug),
        "frontmatter": fm,
        "wikilinks": len(re.findall(r'\[\[', text)),
        "_text": text,
    }


def _wiki_dir(project_root):
    return os.path.join(project_root, "docs", "general", "wiki")


def build_wiki(project_root):
    """Cerebro categorizado: entidades, conceptos, fuentes, temas + tags."""
    wdir = _wiki_dir(project_root)
    if not os.path.isdir(wdir):
        return {"_missing": True, "entities": [], "concepts": [], "sources": [],
                "topics": [], "tags": [], "counts": {"entities": 0, "concepts": 0, "sources": 0, "topics": 0}}

    def collect(subdir):
        d = os.path.join(wdir, subdir)
        items = []
        if not os.path.isdir(d):
            return items
        for name in sorted(os.listdir(d)):
            if not name.endswith(".md") or name in ("README.md", "index.md"):
                continue
            meta = _read_md_meta(os.path.join(d, name))
            if not meta:
                continue
            fm = meta["frontmatter"]
            items.append({
                "slug": meta["slug"],
                "title": meta["title"],
                "path": "docs/general/wiki/%s/%s" % (subdir, name),
                "category": fm.get("category"),
                "source_type": fm.get("source_type"),
                "date": fm.get("date"),
                "tags": fm.get("tags") if isinstance(fm.get("tags"), list) else (
                    [fm["tags"]] if fm.get("tags") else []),
                "status": fm.get("status"),
                "links": meta["wikilinks"],
            })
        return items

    entities = collect("entities")
    concepts = collect("concepts")
    sources = collect("sources")
    topics = collect("topics")

    # Índice de tags agregado desde el frontmatter de todas las páginas
    tag_count = {}
    for group in (entities, concepts, sources, topics):
        for it in group:
            for tg in it.get("tags") or []:
                tag_count[tg] = tag_count.get(tg, 0) + 1
    tags = sorted(({"name": k, "count": v} for k, v in tag_count.items()),
                  key=lambda x: -x["count"])

    return {
        "entities": entities, "concepts": concepts, "sources": sources, "topics": topics,
        "tags": tags,
        "counts": {"entities": len(entities), "concepts": len(concepts),
                   "sources": len(sources), "topics": len(topics)},
    }


def build_meetings(project_root):
    """Lista de reuniones desde raw/reuniones/, con decisiones/action items contados."""
    rdir = os.path.join(project_root, "raw", "reuniones")
    if not os.path.isdir(rdir):
        return {"_missing": True, "meetings": [], "total": 0}
    meetings = []
    for name in sorted(os.listdir(rdir), reverse=True):
        if not name.endswith(".md"):
            continue
        meta = _read_md_meta(os.path.join(rdir, name))
        if not meta:
            continue
        fm = meta["frontmatter"]
        text = meta["_text"]
        decisions = len(re.findall(r'(?im)^\s*(?:-\s*)?DECISI[ÓO]N\s*:', text))
        actions = len(re.findall(r'(?m)^\s*-\s*\[\s?\]', text))
        att = fm.get("attendees")
        att = att if isinstance(att, list) else ([att] if att else [])
        rel = fm.get("related_features")
        rel = rel if isinstance(rel, list) else ([rel] if rel else [])
        meetings.append({
            "slug": meta["slug"],
            "title": meta["title"],
            "path": "raw/reuniones/%s" % name,
            "date": fm.get("date"),
            "attendees": att,
            "tags": fm.get("tags") if isinstance(fm.get("tags"), list) else [],
            "related_features": rel,
            "ingested": bool(fm.get("ingested")),
            "decisions": decisions,
            "action_items": actions,
        })
    return {"meetings": meetings, "total": len(meetings)}


def build_overview(project_root):
    """Panel de startup: agrega tareas, features, cerebro, reuniones."""
    # Tareas por estado (pm/tasks.json)
    by_status, blocked = {}, 0
    tpath = os.path.join(project_root, "pm", "tasks.json")
    if os.path.exists(tpath):
        try:
            with open(tpath, "r", encoding="utf-8") as f:
                td = json.load(f)
            for t in td.get("tasks", []):
                st = t.get("status") or "sin_estado"
                by_status[st] = by_status.get(st, 0) + 1
                if t.get("blocked"):
                    blocked += 1
        except (json.JSONDecodeError, OSError):
            pass
    total_tasks = sum(by_status.values())

    # Features
    feats = list_features(project_root)
    with_dossier = sum(1 for f in feats if f.get("has_dossier"))

    # Cerebro
    wiki = build_wiki(project_root)
    # Reuniones
    meetings = build_meetings(project_root)

    # Áreas activas
    areas = load_areas(project_root)
    area_list = [{"id": aid, "label": info.get("label", aid)}
                 for aid, info in areas.items() if info.get("active")]

    return {
        "tasks": {"total": total_tasks, "by_status": by_status, "blocked": blocked},
        "features": {"total": len(feats), "with_dossier": with_dossier},
        "wiki": wiki.get("counts", {}),
        "meetings": {"total": meetings.get("total", 0),
                     "recent": meetings.get("meetings", [])[:5]},
        "areas": area_list,
    }


class DashboardHandler(BaseHTTPRequestHandler):
    project_root = None
    static_root = None  # carpeta donde están index.html, styles.css, app.js

    def log_message(self, format, *args):
        # Silenciar logs por defecto. Descomentar para debugging.
        # super().log_message(format, *args)
        pass

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_static(self, status, content_type, body_bytes):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body_bytes)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body_bytes)

    def _send_text(self, status, text):
        body = text.encode("utf-8")
        self._send_static(status, "text/plain; charset=utf-8", body)

    def _tasks_path_for_area(self, area):
        """
        V3.5: devuelve la ruta del archivo de tasks para un area dada.
        - area=None o "producto": pm/tasks.json (backward compat para producto)
        - area=<otro>: pm/tasks-<area>.json
        Sanitiza el nombre del area para evitar path traversal.
        """
        if not area or area == "producto":
            return os.path.join(self.project_root, "pm", "tasks.json")
        # Sanitize: solo letras/numeros/guion bajo/guion (sin / ni ..)
        if not re.match(r'^[a-zA-Z0-9_-]+$', area):
            # Fallback al de producto si el area es invalida (no crashear)
            return os.path.join(self.project_root, "pm", "tasks.json")
        return os.path.join(self.project_root, "pm", f"tasks-{area}.json")

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # ── API ─────────────────────────────────────────────────
        if path == "/api/health":
            return self._send_json(200, {"ok": True, "version": VERSION, "project": os.path.basename(self.project_root)})

        if path == "/api/tree":
            return self._send_json(200, build_tree(self.project_root))

        # V2.3: tasks index (lectura del pm/tasks.json)
        # V2.0.1: enriquecemos con sub_status y next_action calculados en vivo
        # según existencia de artefactos (sin esperar a /pm sync).
        # V3.5: soporta ?area=X para leer pm/tasks-<area>.json en lugar de pm/tasks.json.
        #       Sin ?area o ?area=producto -> pm/tasks.json (backward compat producto).
        if path == "/api/tasks":
            area = query.get("area", [None])[0]
            tasks_path = self._tasks_path_for_area(area)
            file_area = area or "producto"
            if not os.path.exists(tasks_path):
                return self._send_json(200, {"schema_version": "1.0.0", "area": file_area, "tasks": [], "drift_warnings": [], "_missing": True})
            try:
                with open(tasks_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                # enrich_tasks_with_sub_status hoy es producto-specifico (busca artefactos
                # en docs/producto/features/). Solo lo aplicamos a producto; otras areas
                # devuelven los tasks tal cual.
                if file_area == "producto":
                    data = enrich_tasks_with_sub_status(self.project_root, data)
                # Garantizar campo 'area' en la respuesta
                if "area" not in data:
                    data["area"] = file_area
                return self._send_json(200, data)
            except (json.JSONDecodeError, OSError) as e:
                return self._send_json(500, {"error": "tasks_unreadable", "detail": str(e)})

        # V2.5: Lista plana de todas las stories del área Producto con frontmatter parseado
        if path == "/api/stories":
            stories = list_all_stories(self.project_root)
            categories = sorted({s["category"] for s in stories if s.get("category")})
            platforms = sorted({s["platform"] for s in stories if s.get("platform")})
            agents = sorted({s["agent_suggested"] for s in stories if s.get("agent_suggested")})
            return self._send_json(200, {
                "stories": stories,
                "categories": categories,
                "platforms": platforms,
                "agents": agents,
                "count": len(stories),
            })

        # V2.3: config (áreas, estados, transiciones)
        if path == "/api/config":
            cfg_path = os.path.join(self.project_root, "pm", "config.json")
            if not os.path.exists(cfg_path):
                return self._send_json(200, {"_missing": True, "states": [], "transitions": {}})
            try:
                with open(cfg_path, "r", encoding="utf-8") as f:
                    return self._send_json(200, json.load(f))
            except (json.JSONDecodeError, OSError) as e:
                return self._send_json(500, {"error": "config_unreadable", "detail": str(e)})

        # Mapa de arquitectura (architecture-map.json). Lo mantiene ski-architecture-map.
        if path == "/api/architecture":
            map_path = os.path.join(self.project_root, "docs", "general", "architecture-map.json")
            if not os.path.exists(map_path):
                return self._send_json(200, {"_missing": True, "nodes": [], "edges": [], "data_flows": []})
            try:
                with open(map_path, "r", encoding="utf-8") as f:
                    return self._send_json(200, json.load(f))
            except (json.JSONDecodeError, OSError) as e:
                return self._send_json(500, {"error": "architecture_unreadable", "detail": str(e)})

        # V3.1: lista de feature folders con metadata del dossier
        if path == "/api/features":
            return self._send_json(200, {"features": list_features(self.project_root)})

        # V3.1: dossier completo de una feature (markdown + secciones + events + artifacts)
        if path.startswith("/api/feature/") and path.endswith("/dossier"):
            # Extraer slug: /api/feature/<slug>/dossier
            slug = path[len("/api/feature/"):-len("/dossier")]
            if "/" in slug or ".." in slug or not slug:
                return self._send_json(400, {"error": "invalid_slug"})
            data = parse_dossier(self.project_root, slug)
            return self._send_json(200, data)

        if path == "/api/file":
            requested = query.get("path", [""])[0]
            abs_path = safe_join(self.project_root, requested)
            if abs_path is None:
                return self._send_json(403, {"error": "path_outside_project", "requested": requested})
            if not os.path.exists(abs_path):
                return self._send_json(404, {"error": "not_found", "path": requested})
            if os.path.isdir(abs_path):
                return self._send_json(400, {"error": "is_directory", "path": requested})
            try:
                with open(abs_path, "r", encoding="utf-8") as f:
                    content = f.read()
            except UnicodeDecodeError:
                return self._send_json(415, {"error": "binary_or_non_utf8", "path": requested})
            mtime = os.path.getmtime(abs_path)
            return self._send_json(200, {
                "path": requested,
                "content": content,
                "mtime": mtime,
                "size": os.path.getsize(abs_path),
                "read_only": is_read_only(requested),
            })

        # ── Panel de startup: overview, cerebro/wiki, reuniones ──
        if path == "/api/overview":
            return self._send_json(200, build_overview(self.project_root))

        if path == "/api/wiki":
            return self._send_json(200, build_wiki(self.project_root))

        if path == "/api/meetings":
            return self._send_json(200, build_meetings(self.project_root))

        # ── Static ──────────────────────────────────────────────
        if path == "/" or path == "/index.html":
            return self._serve_static("index.html", "text/html; charset=utf-8")
        if path == "/styles.css":
            return self._serve_static("styles.css", "text/css; charset=utf-8")
        if path == "/app.js":
            return self._serve_static("app.js", "application/javascript; charset=utf-8")
        if path == "/guia-pmx.html":
            return self._serve_static("guia-pmx.html", "text/html; charset=utf-8")

        # 404
        return self._send_json(404, {"error": "unknown_endpoint", "path": path})

    def _serve_static(self, filename, content_type):
        full = os.path.join(self.static_root, filename)
        if not os.path.exists(full):
            return self._send_text(404, f"Not found: {filename}")
        with open(full, "rb") as f:
            body = f.read()
        return self._send_static(200, content_type, body)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)  # V3.5: necesario para soportar ?area=X en /api/tasks/move

        # ── POST /api/file ──────────────────────────────────────
        # Body JSON esperado: {"path": "<rel>", "content": "<utf-8>", "expected_mtime": <number|null>}
        # Si expected_mtime se proporciona y NO coincide con el mtime actual del archivo,
        # devuelve 409 conflict (el archivo cambió fuera del dashboard).
        if path == "/api/file":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw) if raw else {}
            except (ValueError, json.JSONDecodeError):
                return self._send_json(400, {"error": "invalid_json"})

            requested = body.get("path", "")
            content = body.get("content")
            expected_mtime = body.get("expected_mtime")

            if not requested or content is None:
                return self._send_json(400, {"error": "missing_fields", "required": ["path", "content"]})

            abs_path = safe_join(self.project_root, requested)
            if abs_path is None:
                return self._send_json(403, {"error": "path_outside_project", "requested": requested})

            if is_read_only(requested):
                return self._send_json(403, {"error": "read_only", "path": requested,
                                             "hint": "Este archivo está marcado como read-only en el dashboard. Edítalo a mano o desde el agente correspondiente."})

            if os.path.isdir(abs_path):
                return self._send_json(400, {"error": "is_directory", "path": requested})

            # Conflict detection: si el archivo existe y expected_mtime se pasa,
            # verificar que no ha cambiado externamente.
            if os.path.exists(abs_path) and expected_mtime is not None:
                actual_mtime = os.path.getmtime(abs_path)
                # Tolerancia de 0.5s (filesystem timestamps tienen precisión limitada)
                if abs(actual_mtime - float(expected_mtime)) > 0.5:
                    return self._send_json(409, {
                        "error": "conflict",
                        "path": requested,
                        "actual_mtime": actual_mtime,
                        "expected_mtime": expected_mtime,
                        "hint": "El archivo cambió fuera del dashboard. Recarga para ver la versión actual antes de guardar.",
                    })

            # Crear directorio padre si no existe
            try:
                os.makedirs(os.path.dirname(abs_path), exist_ok=True)
                atomic_write(abs_path, content)
            except OSError as e:
                return self._send_json(500, {"error": "write_failed", "detail": str(e)})

            new_mtime = os.path.getmtime(abs_path)
            return self._send_json(200, {
                "path": requested,
                "size": os.path.getsize(abs_path),
                "mtime": new_mtime,
            })

        # ── POST /api/story/move (V2.10) ────────────────────────
        # Body: {"path": "docs/producto/features/ideas/stories.md", "story_id": "HU-099", "new_feature": "auth"}
        # Mueve la story del archivo origen al stories.md de la feature destino.
        # Si la feature destino no existe, crea la carpeta y el archivo.
        # Sincroniza pm/tasks.json (actualiza el campo files de esa task).
        if path == "/api/story/move":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw) if raw else {}
            except (ValueError, json.JSONDecodeError):
                return self._send_json(400, {"error": "invalid_json"})

            src_rel = body.get("path", "")
            story_id = body.get("story_id", "")
            new_feature = (body.get("new_feature") or "").strip()

            if not src_rel or not story_id or not new_feature:
                return self._send_json(400, {"error": "missing_fields",
                                             "required": ["path", "story_id", "new_feature"]})

            if not re.match(r'^[a-zA-Z0-9_\-]+$', new_feature):
                return self._send_json(400, {"error": "invalid_feature_name",
                                              "hint": "Solo alfanuméricos, '-' y '_'"})

            abs_src = safe_join(self.project_root, src_rel)
            if abs_src is None or not os.path.exists(abs_src):
                return self._send_json(404, {"error": "src_not_found", "path": src_rel})

            # Construir destino
            dst_rel = f"docs/producto/features/{new_feature}/stories.md"
            abs_dst_check = safe_join(self.project_root, dst_rel)
            if abs_dst_check is None:
                return self._send_json(403, {"error": "dst_outside_project"})

            # No-op si origen == destino
            if os.path.realpath(abs_src) == os.path.realpath(abs_dst_check):
                return self._send_json(200, {
                    "path": dst_rel, "story_id": story_id, "moved": False,
                    "hint": "Origen y destino son la misma feature"
                })

            # Leer origen y extraer la story
            try:
                with open(abs_src, "r", encoding="utf-8") as f:
                    src_text = f.read()
            except (OSError, UnicodeDecodeError) as e:
                return self._send_json(500, {"error": "read_src_failed", "detail": str(e)})

            block, new_src_text = extract_story_block(src_text, story_id)
            if block is None:
                return self._send_json(404, {"error": "story_not_found_in_src",
                                              "story_id": story_id, "path": src_rel})

            # Preparar destino
            dst_dir = os.path.dirname(abs_dst_check)
            try:
                os.makedirs(dst_dir, exist_ok=True)
            except OSError as e:
                return self._send_json(500, {"error": "mkdir_dst_failed", "detail": str(e)})

            if os.path.exists(abs_dst_check):
                try:
                    with open(abs_dst_check, "r", encoding="utf-8") as f:
                        dst_text = f.read()
                except (OSError, UnicodeDecodeError) as e:
                    return self._send_json(500, {"error": "read_dst_failed", "detail": str(e)})
                # Append al final
                new_dst_text = dst_text.rstrip() + "\n\n" + block + "\n"
            else:
                new_dst_text = f"# Stories: {new_feature}\n\n" + block + "\n"

            # Escritura atómica de ambos archivos
            try:
                atomic_write(abs_dst_check, new_dst_text)
                atomic_write(abs_src, new_src_text)
            except OSError as e:
                return self._send_json(500, {"error": "write_failed", "detail": str(e)})

            # Sincronizar pm/tasks.json: actualizar files de esa task
            tasks_path = os.path.join(self.project_root, "pm", "tasks.json")
            if os.path.exists(tasks_path):
                try:
                    with open(tasks_path, "r", encoding="utf-8") as f:
                        tdata = json.load(f)
                    for t in tdata.get("tasks", []):
                        if t.get("id") == story_id:
                            t["files"] = [dst_rel]
                            t["updated_at"] = _now_iso()
                            break
                    tdata["last_indexed_at"] = _now_iso()
                    atomic_write(tasks_path, json.dumps(tdata, indent=2, ensure_ascii=False))
                except (json.JSONDecodeError, OSError):
                    pass

            return self._send_json(200, {
                "story_id": story_id,
                "from": src_rel,
                "to": dst_rel,
                "new_feature": new_feature,
                "moved": True,
            })

        # ── POST /api/folder/create (V2.8) ──────────────────────
        # Body: {"path": "docs/general/notas"}
        # Crea una carpeta vacía. Validaciones de path traversal.
        if path == "/api/folder/create":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw) if raw else {}
            except (ValueError, json.JSONDecodeError):
                return self._send_json(400, {"error": "invalid_json"})

            requested = (body.get("path") or "").strip().strip("/")
            if not requested:
                return self._send_json(400, {"error": "missing_path"})
            # Solo permitir crear bajo docs/ (general, producto, marketing, rrhh, operaciones)
            if not requested.startswith("docs/"):
                return self._send_json(403, {"error": "out_of_scope",
                                             "hint": "Solo se pueden crear carpetas bajo docs/"})
            # Sanear nombres: solo alfanumérico, guion, guion bajo, slashes y espacios
            if not re.match(r'^[a-zA-Z0-9_\- /]+$', requested):
                return self._send_json(400, {"error": "invalid_chars",
                                             "hint": "Solo letras, números, guiones, espacios y /"})

            abs_path = safe_join(self.project_root, requested)
            if abs_path is None:
                return self._send_json(403, {"error": "path_outside_project"})

            if os.path.isfile(abs_path):
                return self._send_json(409, {"error": "exists_as_file",
                                             "path": requested})

            try:
                os.makedirs(abs_path, exist_ok=True)
            except OSError as e:
                return self._send_json(500, {"error": "mkdir_failed", "detail": str(e)})

            return self._send_json(200, {
                "path": requested,
                "created": True,
            })

        # ── POST /api/story/create (V2.5.4) ─────────────────────
        # Body: {feature, title, priority?, platform?, category?, description?}
        # Crea una nueva story en docs/producto/features/<feature>/stories.md
        # Asigna el siguiente HU-XXX libre (escanea TODAS las stories existentes).
        # Status inicial: backlog_sin_priorizar.
        if path == "/api/story/create":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw) if raw else {}
            except (ValueError, json.JSONDecodeError):
                return self._send_json(400, {"error": "invalid_json"})

            feature = (body.get("feature") or "").strip()
            title = (body.get("title") or "").strip()
            if not feature or not title:
                return self._send_json(400, {"error": "missing_fields", "required": ["feature", "title"]})

            # Sanear feature (solo alfanumérico, guion, guion bajo)
            if not re.match(r'^[a-zA-Z0-9_\-]+$', feature):
                return self._send_json(400, {"error": "invalid_feature_name",
                                              "hint": "Solo alfanuméricos, '-' y '_'"})

            feature_dir = os.path.join(self.project_root, "docs", "producto", "features", feature)
            stories_file = os.path.join(feature_dir, "stories.md")

            # Validar path estaría dentro del proyecto
            rel_check = safe_join(self.project_root, f"docs/producto/features/{feature}/stories.md")
            if rel_check is None:
                return self._send_json(403, {"error": "path_outside_project"})

            # Encontrar siguiente HU libre escaneando todas las stories
            existing_ids = set()
            all_stories = list_all_stories(self.project_root)
            for s in all_stories:
                existing_ids.add(s["story_id"])
            # Generar siguiente HU-XXX
            next_num = 1
            while f"HU-{next_num:03d}" in existing_ids:
                next_num += 1
            new_id = f"HU-{next_num:03d}"

            # Construir frontmatter
            now = _now_iso()
            fm = {"id": new_id, "title": title}
            for k in ("priority", "platform", "category"):
                v = body.get(k)
                if v not in (None, ""):
                    fm[k] = v
            fm["status"] = "backlog_sin_priorizar"
            fm["created_at"] = now
            fm["updated_at"] = now

            description = body.get("description") or ""
            yaml_block = serialize_yaml_block(fm, STORY_FRONTMATTER_KEYS)
            new_story_text = f"\n## {new_id}: {title}\n\n```yaml\n{yaml_block}\n```\n"
            if description:
                new_story_text += f"\n{description}\n"

            # Crear archivo si no existe
            try:
                os.makedirs(feature_dir, exist_ok=True)
                if os.path.exists(stories_file):
                    with open(stories_file, "r", encoding="utf-8") as f:
                        existing_text = f.read()
                    new_text = existing_text.rstrip() + "\n" + new_story_text
                else:
                    new_text = f"# Stories: {feature}\n" + new_story_text
                atomic_write(stories_file, new_text)
            except OSError as e:
                return self._send_json(500, {"error": "write_failed", "detail": str(e)})

            # V2.7.1: sincronizar también pm/tasks.json para que el kanban vea la nueva story
            tasks_path = os.path.join(self.project_root, "pm", "tasks.json")
            if os.path.exists(tasks_path):
                try:
                    with open(tasks_path, "r", encoding="utf-8") as f:
                        tdata = json.load(f)
                    new_task = {
                        "id": new_id,
                        "type": "task",
                        "title": title,
                        "status": "backlog_sin_priorizar",
                        "criticality": fm.get("criticality"),
                        "agent_suggested": fm.get("agent_suggested"),
                        "depends_on": [],
                        "blocked": False,
                        "files": [f"docs/producto/features/{feature}/stories.md"],
                        "created_at": now,
                        "updated_at": now,
                    }
                    tdata.setdefault("tasks", []).append(new_task)
                    tdata["last_indexed_at"] = now
                    atomic_write(tasks_path, json.dumps(tdata, indent=2, ensure_ascii=False))
                except (json.JSONDecodeError, OSError):
                    pass  # no bloqueamos por esto

            return self._send_json(200, {
                "id": new_id,
                "path": f"docs/producto/features/{feature}/stories.md",
                "feature": feature,
                "frontmatter": fm,
            })

        # ── POST /api/story/update-frontmatter (V2.5.3) ─────────
        # Body: {path, story_id, fields: {priority?, platform?, category?, status?, ...}, expected_mtime?}
        # Acción: parsear el .md, encontrar la story por id, actualizar solo los campos pasados,
        # añadir/actualizar updated_at automáticamente, reescribir atomic.
        # Si el campo `status` cambia y existe pm/tasks.json con esa task, también la actualiza.
        if path == "/api/story/update-frontmatter":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw) if raw else {}
            except (ValueError, json.JSONDecodeError):
                return self._send_json(400, {"error": "invalid_json"})

            requested = body.get("path", "")
            story_id = body.get("story_id", "")
            fields = body.get("fields") or {}
            expected_mtime = body.get("expected_mtime")

            if not requested or not story_id or not isinstance(fields, dict):
                return self._send_json(400, {"error": "missing_fields", "required": ["path", "story_id", "fields"]})

            abs_path = safe_join(self.project_root, requested)
            if abs_path is None:
                return self._send_json(403, {"error": "path_outside_project", "requested": requested})
            if not os.path.exists(abs_path):
                return self._send_json(404, {"error": "not_found", "path": requested})
            if os.path.isdir(abs_path):
                return self._send_json(400, {"error": "is_directory", "path": requested})

            # Conflict detection
            if expected_mtime is not None:
                actual_mtime = os.path.getmtime(abs_path)
                if abs(actual_mtime - float(expected_mtime)) > 0.5:
                    return self._send_json(409, {
                        "error": "conflict",
                        "actual_mtime": actual_mtime,
                        "expected_mtime": expected_mtime,
                        "hint": "El archivo cambió fuera del dashboard. Recarga.",
                    })

            # Validar status (si se pasa) contra config.json/states
            if "status" in fields:
                cfg_path = os.path.join(self.project_root, "pm", "config.json")
                if os.path.exists(cfg_path):
                    try:
                        with open(cfg_path, "r", encoding="utf-8") as f:
                            cfg = json.load(f)
                        # V2.0: states viven en areas.producto.states. Fallback a global por compatibilidad.
                        producto = cfg.get("areas", {}).get("producto", {})
                        valid = (producto.get("states") or cfg.get("states") or []) + ["bloqueado"]
                        if valid and fields["status"] not in valid:
                            return self._send_json(400, {
                                "error": "invalid_status",
                                "got": fields["status"],
                                "valid": valid,
                            })
                    except (json.JSONDecodeError, OSError):
                        pass

            # Leer .md, parsear, actualizar
            try:
                with open(abs_path, "r", encoding="utf-8") as f:
                    text = f.read()
            except (UnicodeDecodeError, OSError) as e:
                return self._send_json(500, {"error": "read_failed", "detail": str(e)})

            # Añadir updated_at automáticamente
            fields_with_ts = dict(fields)
            fields_with_ts["updated_at"] = _now_iso()

            new_text, target = update_story_frontmatter_in_text(text, story_id, fields_with_ts)
            if new_text is None:
                return self._send_json(404, {"error": "story_not_found", "story_id": story_id, "path": requested})

            # Escritura atómica
            try:
                atomic_write(abs_path, new_text)
            except OSError as e:
                return self._send_json(500, {"error": "write_failed", "detail": str(e)})

            # Si status cambió, sincronizar pm/tasks.json (si existe la entrada)
            if "status" in fields:
                tasks_path = os.path.join(self.project_root, "pm", "tasks.json")
                if os.path.exists(tasks_path):
                    try:
                        with open(tasks_path, "r", encoding="utf-8") as f:
                            tdata = json.load(f)
                        for t in tdata.get("tasks", []):
                            if t.get("id") == story_id:
                                t["status"] = fields["status"]
                                t["updated_at"] = fields_with_ts["updated_at"]
                                if fields["status"] == "bloqueado":
                                    t["blocked"] = True
                                else:
                                    t["blocked"] = False
                                break
                        tdata["last_indexed_at"] = fields_with_ts["updated_at"]
                        atomic_write(tasks_path, json.dumps(tdata, indent=2, ensure_ascii=False))
                    except (json.JSONDecodeError, OSError):
                        pass  # no bloqueamos por esto

            return self._send_json(200, {
                "path": requested,
                "story_id": story_id,
                "frontmatter": target["frontmatter"],
                "mtime": os.path.getmtime(abs_path),
                "size": os.path.getsize(abs_path),
            })

        # ── POST /api/tasks/move ────────────────────────────────
        # Body JSON: {"id": "HU-XXX", "new_status": "<state>", "area"?: "<area>"}
        # Valida la transición contra pm/config.json (si existe).
        # V3.5: actualiza pm/tasks-<area>.json si area != "producto"; pm/tasks.json si es producto.
        if path == "/api/tasks/move":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                raw = self.rfile.read(length).decode("utf-8")
                body = json.loads(raw) if raw else {}
            except (ValueError, json.JSONDecodeError):
                return self._send_json(400, {"error": "invalid_json"})

            task_id = body.get("id")
            new_status = body.get("new_status")
            if not task_id or not new_status:
                return self._send_json(400, {"error": "missing_fields", "required": ["id", "new_status"]})

            # V3.5: area del move. Puede venir en el body o en ?area=X. Default producto.
            area = body.get("area") or query.get("area", [None])[0]
            file_area = area or "producto"

            # Cargar tasks.json (o tasks-<area>.json segun corresponda)
            tasks_path = self._tasks_path_for_area(area)
            if not os.path.exists(tasks_path):
                return self._send_json(404, {"error": "tasks_json_not_found",
                                             "path": os.path.relpath(tasks_path, self.project_root),
                                             "area": file_area,
                                             "hint": f"Ejecuta /pm sync (o el deploy.sh del paquete responsable del area '{file_area}') para crearlo"})
            try:
                with open(tasks_path, "r", encoding="utf-8") as f:
                    tasks_data = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                return self._send_json(500, {"error": "tasks_unreadable", "detail": str(e)})

            tasks = tasks_data.get("tasks", [])
            target = next((t for t in tasks if t.get("id") == task_id), None)
            if target is None:
                return self._send_json(404, {"error": "task_not_found", "id": task_id})

            current_status = target.get("status")

            # Validar transición contra config.json (si existe)
            cfg_path = os.path.join(self.project_root, "pm", "config.json")
            if os.path.exists(cfg_path):
                try:
                    with open(cfg_path, "r", encoding="utf-8") as f:
                        cfg = json.load(f)
                    # V3.5: transitions/states viven en areas.<file_area>.*, NO hardcoded a producto.
                    # Newsletter (y futuros paquetes) tiene su propio pipeline editorial declarado
                    # en su area de config. Fallback al global por compatibilidad muy antigua.
                    area_cfg = cfg.get("areas", {}).get(file_area, {})
                    transitions = area_cfg.get("transitions") or cfg.get("transitions", {})
                    valid_states = (area_cfg.get("states") or cfg.get("states", [])) + ["bloqueado"]
                    if new_status not in valid_states:
                        return self._send_json(400, {"error": "invalid_state",
                                                     "got": new_status,
                                                     "valid": valid_states,
                                                     "area": file_area})
                    allowed = transitions.get(current_status, [])
                    # Permitir mover desde bloqueado a cualquiera (caso especial)
                    if current_status != new_status and new_status not in allowed:
                        return self._send_json(409, {
                            "error": "invalid_transition",
                            "from": current_status,
                            "to": new_status,
                            "allowed_from_current": allowed,
                            "area": file_area,
                            "hint": f"La transicion no esta permitida en pm/config.json > areas.{file_area}.transitions. Edita ese archivo si quieres permitirla.",
                        })
                except (json.JSONDecodeError, OSError):
                    pass  # si config no se puede leer, permitir el cambio

            # Si new_status es "bloqueado": también marcar blocked: true y guardar previous_status
            if new_status == "bloqueado":
                target["previous_status"] = current_status
                target["blocked"] = True
                if not target.get("blocked_reason"):
                    target["blocked_reason"] = body.get("reason", "(sin razón)")
            else:
                # Salir de bloqueado
                if target.get("blocked"):
                    target["blocked"] = False
                    target["blocked_reason"] = None
                    target["previous_status"] = None

            target["status"] = new_status
            target["updated_at"] = _now_iso()

            tasks_data["last_indexed_at"] = _now_iso()

            try:
                atomic_write(tasks_path, json.dumps(tasks_data, indent=2, ensure_ascii=False))
            except OSError as e:
                return self._send_json(500, {"error": "write_failed", "detail": str(e)})

            # V3.3 — sincronizar frontmatter YAML de la story en stories.md
            # Sin esto, getMergedTasks() en el frontend usa el status viejo del frontmatter
            # (que gana sobre tasks.json) y la card no se mueve visualmente.
            # V3.4 (fix bug drag-drop) — si feature_path NO funciona (None, inexistente
            # o story no esta en ese stories.md), buscar la story por ID en TODOS los
            # stories.md del proyecto antes de rendirse. Cubre tareas del inbox sin
            # feature_path, splits que renombraron el feature, drift en general.
            frontmatter_synced = False
            fm_update = {"status": new_status, "updated_at": _now_iso()}
            if new_status == "bloqueada":
                fm_update["blocked"] = True
            elif target.get("blocked") is False:
                fm_update["blocked"] = False

            def _try_sync_in(stories_abs):
                """Devuelve True si encontro y actualizo la story en stories_abs."""
                if not stories_abs or not os.path.exists(stories_abs):
                    return False
                try:
                    with open(stories_abs, "r", encoding="utf-8") as f:
                        story_text = f.read()
                    new_text, found = update_story_frontmatter_in_text(
                        story_text, task_id, fm_update
                    )
                    if found and new_text is not None and new_text != story_text:
                        atomic_write(stories_abs, new_text)
                        return True
                except (OSError, UnicodeDecodeError):
                    return False
                return False

            if not task_id.startswith("EPIC-"):
                # Intento 1: ruta declarada en feature_path
                feature_path = target.get("feature_path")
                if feature_path:
                    stories_rel = feature_path.rstrip("/") + "/stories.md"
                    stories_abs = safe_join(self.project_root, stories_rel)
                    frontmatter_synced = _try_sync_in(stories_abs)

                # Intento 2: si fallo, buscar la story en cualquier stories.md del proyecto.
                # Solo recorremos docs/ para acotar el scope.
                if not frontmatter_synced:
                    docs_root = safe_join(self.project_root, "docs")
                    if docs_root and os.path.isdir(docs_root):
                        for dirpath, _dirnames, filenames in os.walk(docs_root):
                            if "stories.md" in filenames:
                                candidate = os.path.join(dirpath, "stories.md")
                                if _try_sync_in(candidate):
                                    frontmatter_synced = True
                                    break

            return self._send_json(200, {
                "id": task_id,
                "from": current_status,
                "to": new_status,
                "task": target,
                "frontmatter_synced": frontmatter_synced,
            })

        # 404
        return self._send_json(404, {"error": "unknown_endpoint", "method": "POST", "path": path})


def find_free_port(start, count):
    import socket
    for offset in range(count):
        port = start + offset
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return None


def main():
    parser = argparse.ArgumentParser(description="PM x10 Dashboard Bridge")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Puerto (default {DEFAULT_PORT})")
    parser.add_argument("--root", type=str, default=".", help="Raíz del proyecto (default cwd)")
    args = parser.parse_args()

    project_root = os.path.abspath(args.root)
    static_root = os.path.dirname(os.path.abspath(__file__))

    if not os.path.isdir(project_root):
        print(f"ERROR: --root no existe: {project_root}", file=sys.stderr)
        sys.exit(1)

    port = find_free_port(args.port, PORT_RANGE)
    if port is None:
        print(f"ERROR: ningún puerto libre en {args.port}-{args.port + PORT_RANGE - 1}", file=sys.stderr)
        sys.exit(1)

    DashboardHandler.project_root = project_root
    DashboardHandler.static_root = static_root

    server = HTTPServer(("127.0.0.1", port), DashboardHandler)

    print(f"PM x10 Dashboard v{VERSION}")
    print(f"  Proyecto: {project_root}")
    print(f"  URL:      http://localhost:{port}/")
    print(f"  Pulsa Ctrl+C para parar")
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDashboard detenido.")
        server.server_close()


if __name__ == "__main__":
    main()
