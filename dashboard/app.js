// PM x10 Dashboard — V2.1 app.js
// Vanilla JS. Sin frameworks. Sin build step.

(() => {
  'use strict';

  // ─────────── State ───────────
  const state = {
    project: null,
    bridgeUrl: window.location.origin,
    tree: null,
    selectedPath: null,
    expandedAreas: new Set(['producto']),
    expandedDirs: new Set(),
    markedReady: false,
    // V2.2 — edit state
    currentFile: null,         // { path, content, mtime, size, read_only }
    editing: false,            // ¿está en modo edición?
    previewing: false,         // dentro del modo edición, ¿mostrando preview en vez de textarea?
    dirty: false,              // ¿el textarea tiene cambios sin guardar?
    // V2.6 — navegación por áreas
    activeArea: 'inicio',      // 'inicio' | 'cerebro' | 'general' | 'producto' | '_system' | <id dinamico>

    areaSubTab: {              // sub-tab activa por área (default por área)
      cerebro: 'wiki',
      general: 'dashboard',
      producto: 'resumen',
      _system: 'estado',
    },
    tasksData: null,
    config: null,
    storiesData: null,
    pollingTimer: null,
    lastSyncMs: null,
    // V2.5 — funcionalidades view
    funcFeatureFilter: '',  // V2.9: tab principal = feature (carpeta)
    funcFilters: { statusGroup: '', category: '', platform: '', agent: '' },
    funcSort: { key: 'updated_at', dir: 'desc' },
    funcExpandedEpics: new Set(),  // V2.7: épicas expandidas en cascada
    // Kanban filters (legacy refs, no se usan en V2.6 sidebar — quedaron como noop)
    filters: { area: '', criticality: '', agent: '' },
  };

  // V2.0: estados como cola de trabajo por agente (no por fase completada)
  // Cada columna = "agente que toca trabajar". El humano arrastra para asignar.
  const KANBAN_STATES = [
    'sin_priorizar',
    'priorizada',
    'research',
    'definicion',
    'planning',
    'build',
    'review',
    'hecho',
  ];
  const KANBAN_TRAY_STATES = ['bloqueada', 'cancelada'];

  const STATE_LABELS = {
    sin_priorizar: 'Sin priorizar',
    priorizada:    'Priorizada',
    research:      'Research',
    definicion:    'Definición',
    planning:      'Planning',
    build:         'Build',
    review:        'Review',
    hecho:         'Hecho',
    bloqueada:     'Bloqueada',
    cancelada:     'Cancelada',
  };

  // Comando sugerido por estado (para botón "Copiar")
  const STATE_COMMAND = {
    research:   '/analyze',
    definicion: '/define',   // 3 rutas; mostrar como default; otros disponibles en command_options
    planning:   '/plan',
    build:      '/build',
    review:     '/review',
  };

  // Artefacto esperado por estado (para inferir sub_status)
  const STATE_ARTIFACT = {
    research:   'research.md',
    definicion: 'stories.md',
    planning:   'architecture.md',
    build:      'build-state.md',
    review:     'qa.md',
  };
  const POLL_INTERVAL_MS = 7000;

  // ─────────── V2.7.1: Fuente de datos unificada ───────────
  // Combina pm/tasks.json (estado inferido por el PM) + stories.md (frontmatter directo).
  // Para cada id único, prioriza el frontmatter cuando exista; si falta un campo,
  // usa el de tasks.json. Esto hace que Kanban y Funcionalidades vean lo MISMO.
  function getMergedTasks() {
    const tasks = (state.tasksData?.tasks) || [];
    const stories = (state.storiesData?.stories) || [];
    const byId = new Map();

    // Primero: stories del filesystem (con frontmatter)
    for (const s of stories) {
      byId.set(s.story_id, {
        story_id: s.story_id,
        title: s.title,
        // Status: del frontmatter si existe; si no, queda null y se completa abajo
        status: s.status,
        priority: s.priority,
        platform: s.platform,
        category: s.category,
        criticality: s.criticality,
        agent_suggested: s.agent_suggested,
        depends_on: s.depends_on || [],
        blocked: !!s.blocked,
        blocked_reason: s.blocked_reason,
        parent_epic: s.parent_epic,
        path: s.path,
        feature: s.feature,
        prompt_override: s.prompt_override || null,
        created_at: s.created_at,
        updated_at: s.updated_at,
        _source: 'story',
      });
    }

    // Después: tasks del PM (rellena lo que falte; añade entries que no estén en stories)
    for (const t of tasks) {
      const id = t.id;
      if (byId.has(id)) {
        const existing = byId.get(id);
        // Status: si el frontmatter no lo tenia, usar el del PM (inferido).
        // V3.4 (fix bug drag-drop): si tasks.json tiene updated_at MAS RECIENTE
        // que el frontmatter, gana tasks.json. Esto cubre el caso en que el move
        // sincronizo tasks.json pero el frontmatter de stories.md no pudo
        // actualizarse (story sin feature_path declarado, EPIC, etc.) y evita
        // que la card "vuelva" visualmente a su columna original tras el drop.
        if (!existing.status) {
          existing.status = t.status;
        } else if (t.status && t.updated_at && existing.updated_at && t.updated_at > existing.updated_at) {
          existing.status = t.status;
        }
        if (existing.criticality == null) existing.criticality = t.criticality;
        if (existing.agent_suggested == null) existing.agent_suggested = t.agent_suggested;
        if (!existing.depends_on?.length && t.depends_on?.length) existing.depends_on = t.depends_on;
        if (!existing.blocked && t.blocked) {
          existing.blocked = true;
          existing.blocked_reason = t.blocked_reason;
        }
        if (!existing.title && t.title) existing.title = t.title;
        if (!existing.parent_epic && t.parent_id) existing.parent_epic = t.parent_id;
        // V2.0: campos derivados que solo viven en tasks.json
        existing.sub_status = t.sub_status || null;
        existing.next_action = t.next_action || null;
        existing.origin = existing.origin || t.origin || null;
        existing.feature_path = existing.feature_path || t.feature_path || null;
        existing._source = 'merged';
      } else {
        // Solo en tasks.json (sin .md): es entrada huérfana del índice
        // V3.3: las EPICs caen aquí (stories.md no tiene ## EPIC-). Necesitamos preservar
        // feature + feature_path + origin para que renderEpicDetailBody localice el PRD.
        byId.set(id, {
          story_id: id,
          title: t.title,
          status: t.status,
          priority: null,
          platform: null,
          category: null,
          criticality: t.criticality,
          agent_suggested: t.agent_suggested,
          depends_on: t.depends_on || [],
          blocked: !!t.blocked,
          blocked_reason: t.blocked_reason,
          parent_epic: t.parent_id || null,
          path: (t.files && t.files[0]) || null,
          feature: t.feature || null,
          feature_path: t.feature_path || null,
          origin: t.origin || null,
          sub_status: t.sub_status || null,
          next_action: t.next_action || null,
          created_at: t.created_at,
          updated_at: t.updated_at,
          _source: 'task-only',
        });
      }
    }

    return Array.from(byId.values());
  }

  // ─────────── DOM refs ───────────
  const el = {
    projectName: document.getElementById('project-name'),
    connStatus: document.getElementById('connection-status'),
    bridgeUrl: document.getElementById('bridge-url'),
    welcome: document.getElementById('welcome-state'),
    viewer: document.getElementById('viewer'),
    breadcrumb: document.getElementById('breadcrumb'),
    fileMeta: document.getElementById('file-meta'),
    markdownOutput: document.getElementById('markdown-output'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    // V2.2
    btnEdit: document.getElementById('btn-edit'),
    btnPreview: document.getElementById('btn-preview'),
    btnSave: document.getElementById('btn-save'),
    btnCancel: document.getElementById('btn-cancel'),
    editor: document.getElementById('editor'),
    readonlyBadge: document.getElementById('readonly-badge'),
    dirtyBadge: document.getElementById('dirty-badge'),
    saveToast: document.getElementById('save-toast'),
    // V2.6 — sidebar areas + sub-tabs
    areaRows: document.querySelectorAll('.area-row'),
    areaViews: document.querySelectorAll('.area-view'),
    aTabs: document.querySelectorAll('.atab'),
    aTabContents: document.querySelectorAll('.atab-content'),
    sharedViewerHost: document.getElementById('shared-viewer-host'),
    badgeProducto: document.getElementById('badge-producto'),
    // Producto: kanban
    kanbanBoard: document.getElementById('kanban-board'),
    kanbanCounts: document.getElementById('kanban-counts'),
    kanbanLastSync: document.getElementById('kanban-last-sync'),
    kanbanDrift: document.getElementById('kanban-drift'),
    btnRefreshTasks: document.getElementById('btn-refresh-tasks'),
    // V2.5 - Producto: Resumen
    resumenCards: document.getElementById('resumen-cards'),
    resumenNext: document.getElementById('resumen-next'),
    resumenRecent: document.getElementById('resumen-recent'),
    resumenDrift: document.getElementById('resumen-drift'),
    resumenDriftList: document.getElementById('resumen-drift-list'),
    // V2.5.2 funcionalidades — V2.9: tabs por feature, filtro category
    funcFeatureTabs: document.getElementById('func-feature-tabs'),
    funcFilterStatus: document.getElementById('func-filter-status'),
    funcFilterCategory: document.getElementById('func-filter-category'),
    funcFilterPlatform: document.getElementById('func-filter-platform'),
    funcFilterAgent: document.getElementById('func-filter-agent'),
    funcCount: document.getElementById('func-count'),
    funcTable: document.getElementById('func-table'),
    funcTbody: document.getElementById('func-tbody'),
    // V2.6 — General area
    generalCards: document.getElementById('general-cards'),
    generalAreas: document.getElementById('general-areas'),
    generalKeydocs: document.getElementById('general-keydocs'),
    generalRecent: document.getElementById('general-recent'),
    // V2.6 — PM Sistema area
    systemStateCards: document.getElementById('system-state-cards'),
    systemFilesQuicklinks: document.getElementById('system-files-quicklinks'),
    systemDrift: document.getElementById('system-drift'),
    // V2.7 — task detail panel
    taskDetailPanel: document.getElementById('task-detail-panel'),
    tdId: document.getElementById('td-id'),
    tdTitle: document.getElementById('td-title'),
    tdEpicLink: document.getElementById('td-epic-link'),
    tdMetaGrid: document.getElementById('td-meta-grid'),
    tdPromptSection: document.getElementById('td-prompt-section'),
    tdBody: document.getElementById('td-body'),
    tdBtnDocs: document.getElementById('td-btn-docs'),
    // V2.10 — move story
    tdBtnMove: document.getElementById('td-btn-move'),
    tdMovePopover: document.getElementById('td-move-popover'),
  };

  // ─────────── Markdown renderer ───────────
  // Carga marked.js desde CDN. Si falla, usa fallback minimal.
  function loadMarked() {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked@12/lib/marked.umd.min.js';
      script.onload = () => {
        if (window.marked) {
          window.marked.setOptions({ breaks: false, gfm: true });
          state.markedReady = true;
        }
        resolve();
      };
      script.onerror = () => {
        console.warn('marked.js no se pudo cargar; usando renderer fallback');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  function renderMarkdown(text) {
    if (state.markedReady && window.marked) {
      try {
        return window.marked.parse(text);
      } catch (e) {
        console.error('marked falló:', e);
      }
    }
    return fallbackRenderer(text);
  }

  // Renderer minimal: headers, párrafos, listas, código, énfasis, links
  function fallbackRenderer(text) {
    const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = text.split('\n');
    const out = [];
    let inCode = false;
    let codeBuf = [];
    let inList = false;
    let listType = null;

    const flushList = () => {
      if (inList) {
        out.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('```')) {
        if (inCode) {
          out.push(`<pre><code>${escape(codeBuf.join('\n'))}</code></pre>`);
          codeBuf = [];
          inCode = false;
        } else {
          flushList();
          inCode = true;
        }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushList();
        const level = h[1].length;
        out.push(`<h${level}>${inlineFormat(h[2])}</h${level}>`);
        continue;
      }

      const ul = line.match(/^[-*+]\s+(.*)$/);
      const ol = line.match(/^\d+\.\s+(.*)$/);
      if (ul) {
        if (!inList || listType !== 'ul') { flushList(); out.push('<ul>'); inList = true; listType = 'ul'; }
        out.push(`<li>${inlineFormat(ul[1])}</li>`);
        continue;
      }
      if (ol) {
        if (!inList || listType !== 'ol') { flushList(); out.push('<ol>'); inList = true; listType = 'ol'; }
        out.push(`<li>${inlineFormat(ol[1])}</li>`);
        continue;
      }

      flushList();
      if (line.trim() === '') { out.push(''); continue; }
      if (line.startsWith('> ')) {
        out.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
        continue;
      }
      out.push(`<p>${inlineFormat(line)}</p>`);
    }
    if (inCode) out.push(`<pre><code>${escape(codeBuf.join('\n'))}</code></pre>`);
    flushList();
    return out.join('\n');
  }

  function inlineFormat(text) {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  // ─────────── API ───────────
  async function api(path, options = {}) {
    const opts = {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : {},
    };
    if (options.body) opts.body = JSON.stringify(options.body);

    const res = await fetch(state.bridgeUrl + path, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* respuesta no-JSON */ }
    if (!res.ok) {
      const err = new Error(`${res.status} ${res.statusText}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function checkHealth() {
    try {
      const data = await api('/api/health');
      if (data.ok) {
        el.connStatus.classList.remove('conn-status--unknown', 'conn-status--ko');
        el.connStatus.classList.add('conn-status--ok');
        el.connStatus.querySelector('.conn-label').textContent = `bridge v${data.version}`;
        const projectLabel = data.project || '—';
        el.projectName.textContent = projectLabel;
        // V2.0.2: el header y el title de la pestaña usan el nombre del proyecto
        const brandEl = document.getElementById('brand-text');
        if (brandEl) brandEl.textContent = `Dashboard ${projectLabel}`;
        document.title = `Dashboard ${projectLabel}`;
        el.bridgeUrl.textContent = state.bridgeUrl;
        return true;
      }
    } catch (e) {
      setBridgeError(e.message);
    }
    return false;
  }

  function setBridgeError(msg) {
    el.connStatus.classList.remove('conn-status--unknown', 'conn-status--ok');
    el.connStatus.classList.add('conn-status--ko');
    el.connStatus.querySelector('.conn-label').textContent = 'bridge KO';
    showError(`Bridge no responde:\n${msg}\n\nArranca el bridge con:\n  python3 dashboard/bridge.py`);
  }

  function showError(msg) {
    el.welcome.classList.add('hidden');
    el.viewer.classList.add('hidden');
    el.errorState.classList.remove('hidden');
    el.errorMessage.textContent = msg;
  }

  // ─────────── Tree rendering ───────────
  async function loadTree() {
    try {
      const data = await api('/api/tree');
      state.tree = data;
      // V2.6: el sidebar ya no muestra el árbol; lo renderizamos por área
      // dentro del sub-tab Docs/Files cuando esté activo.
      const sub = state.areaSubTab[state.activeArea];
      if (sub === 'docs' || sub === 'files') {
        renderTreeForArea(state.activeArea);
      }
    } catch (e) {
      setBridgeError(e.message);
    }
  }

  function renderNode(node, depth) {
    if (node.type === 'dir') return renderDir(node, depth);
    return renderFile(node, depth);
  }

  function renderDir(node, depth) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-node tree-dir';

    const row = document.createElement('div');
    row.className = 'tree-row';
    const isExpanded = state.expandedDirs.has(node.path);
    row.innerHTML = `
      <span class="tree-icon">${isExpanded ? '▼' : '▶'}</span>
      <span class="tree-icon">📁</span>
      <span class="tree-name">${escapeHtml(node.name)}/</span>
    `;

    const children = document.createElement('div');
    children.className = 'tree-children';
    if (!isExpanded) children.classList.add('collapsed');
    for (const child of node.children) {
      children.appendChild(renderNode(child, depth + 1));
    }

    row.addEventListener('click', () => {
      if (state.expandedDirs.has(node.path)) {
        state.expandedDirs.delete(node.path);
        children.classList.add('collapsed');
        row.querySelector('.tree-icon').textContent = '▶';
      } else {
        state.expandedDirs.add(node.path);
        children.classList.remove('collapsed');
        row.querySelector('.tree-icon').textContent = '▼';
      }
    });

    wrap.appendChild(row);
    wrap.appendChild(children);
    return wrap;
  }

  function renderFile(node, _depth) {
    const wrap = document.createElement('div');
    wrap.className = 'tree-node tree-file';
    wrap.dataset.path = node.path;  // V2.6: usado por el listener delegado del árbol

    const row = document.createElement('div');
    row.className = 'tree-row';
    if (state.selectedPath === node.path) row.classList.add('active');

    const icon = fileIcon(node.name);
    row.innerHTML = `
      <span class="tree-icon"></span>
      <span class="tree-icon">${icon}</span>
      <span class="tree-name">${escapeHtml(node.name)}</span>
    `;

    // El click va por el listener delegado en wireV26Listeners (lee data-path del wrap padre)

    wrap.appendChild(row);
    return wrap;
  }

  function fileIcon(name) {
    if (name.endsWith('.md')) return '📄';
    if (name.endsWith('.json')) return '⚙';
    if (name.endsWith('.jsonl')) return '📋';
    if (name.endsWith('.yaml') || name.endsWith('.yml')) return '⚙';
    return '·';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─────────── File viewer ───────────
  async function openFile(path, opts = {}) {
    // Si hay cambios sin guardar, advertir antes de cambiar de archivo
    if (state.dirty && !opts.force) {
      if (!confirm('Hay cambios sin guardar. ¿Descartarlos y abrir otro archivo?')) {
        return;
      }
    }

    state.selectedPath = path;
    // V2.6: re-render del árbol de la sub-tab Docs/Files activa para destacar archivo activo
    const activeSub = state.areaSubTab[state.activeArea];
    if (activeSub === 'docs' || activeSub === 'files') {
      renderTreeForArea(state.activeArea);
    }

    el.welcome.classList.add('hidden');
    el.errorState.classList.add('hidden');
    el.viewer.classList.remove('hidden');

    try {
      const data = await api('/api/file?path=' + encodeURIComponent(path));
      state.currentFile = data;
      // Reset edit state al cambiar de archivo
      state.editing = false;
      state.previewing = false;
      state.dirty = false;
      renderViewer();

      // Persistir último archivo
      try { localStorage.setItem('pm-dashboard-last-file', path); } catch (e) {}
    } catch (e) {
      el.markdownOutput.innerHTML = `<div class="error-message">Error cargando archivo:\n${escapeHtml(e.message)}</div>`;
    }
  }

  // Renderiza el viewer según el modo (read/edit/preview).
  function renderViewer() {
    const f = state.currentFile;
    if (!f) return;

    el.breadcrumb.innerHTML = renderBreadcrumb(f.path);
    el.fileMeta.textContent = `${f.size} bytes`;

    // Badges
    el.readonlyBadge.classList.toggle('hidden', !f.read_only);
    el.dirtyBadge.classList.toggle('hidden', !state.dirty);

    // Botones por modo
    if (state.editing) {
      el.btnEdit.classList.add('hidden');
      el.btnPreview.classList.remove('hidden');
      el.btnPreview.textContent = state.previewing ? '✎ Editar' : '👁 Preview';
      el.btnSave.classList.remove('hidden');
      el.btnSave.disabled = !state.dirty;
      el.btnCancel.classList.remove('hidden');
    } else {
      el.btnEdit.classList.toggle('hidden', f.read_only || !isEditable(f.path));
      el.btnPreview.classList.add('hidden');
      el.btnSave.classList.add('hidden');
      el.btnCancel.classList.add('hidden');
    }

    // Contenido
    if (state.editing && !state.previewing) {
      el.markdownOutput.classList.add('hidden');
      el.editor.classList.remove('hidden');
      // No reasignar value si ya tiene contenido (preserva caret y cambios)
      if (el.editor.value !== el.editor.dataset.lastLoaded) {
        el.editor.value = f.content;
        el.editor.dataset.lastLoaded = f.content;
      }
    } else {
      el.markdownOutput.classList.remove('hidden');
      el.editor.classList.add('hidden');
      // En modo preview usamos el contenido del textarea (cambios sin guardar);
      // en modo read usamos el del archivo cargado.
      const source = (state.editing && state.previewing) ? el.editor.value : f.content;
      renderContentByExtension(f.path, source);
    }
  }

  function renderContentByExtension(path, content) {
    if (path.endsWith('.md')) {
      el.markdownOutput.innerHTML = renderMarkdown(content);
    } else {
      // .json / .jsonl / .yaml / cualquier otro: monoespaciado plano
      el.markdownOutput.innerHTML = `<pre><code>${escapeHtml(content)}</code></pre>`;
    }
  }

  // ¿Este archivo se puede editar desde el dashboard? (Solo .md, .json, .jsonl, .yaml)
  function isEditable(path) {
    return /\.(md|json|jsonl|ya?ml|txt)$/i.test(path);
  }

  // ─────────── Edit mode ───────────

  function startEditing() {
    if (!state.currentFile || state.currentFile.read_only) return;
    state.editing = true;
    state.previewing = false;
    state.dirty = false;
    el.editor.value = state.currentFile.content;
    el.editor.dataset.lastLoaded = state.currentFile.content;
    renderViewer();
    el.editor.focus();
  }

  function togglePreview() {
    if (!state.editing) return;
    state.previewing = !state.previewing;
    renderViewer();
    if (!state.previewing) el.editor.focus();
  }

  function cancelEditing() {
    if (state.dirty) {
      if (!confirm('¿Descartar los cambios?')) return;
    }
    state.editing = false;
    state.previewing = false;
    state.dirty = false;
    delete el.editor.dataset.lastLoaded;
    renderViewer();
  }

  async function saveFile() {
    if (!state.currentFile || !state.editing || !state.dirty) return;
    el.btnSave.disabled = true;
    try {
      const result = await api('/api/file', {
        method: 'POST',
        body: {
          path: state.currentFile.path,
          content: el.editor.value,
          expected_mtime: state.currentFile.mtime,
        },
      });
      // Actualizar currentFile con nuevo mtime y content
      state.currentFile.content = el.editor.value;
      state.currentFile.mtime = result.mtime;
      state.currentFile.size = result.size;
      el.editor.dataset.lastLoaded = el.editor.value;
      state.dirty = false;
      showToast(`Guardado · ${result.size} bytes`, 'ok');
      renderViewer();
    } catch (e) {
      const data = e.data || {};
      if (e.status === 409) {
        showToast(`⚠ Conflicto: el archivo cambió fuera del dashboard. Recarga para ver la versión actual.`, 'error');
      } else if (e.status === 403) {
        showToast(`⚠ ${data.hint || 'No autorizado para escribir este archivo.'}`, 'error');
      } else {
        showToast(`Error guardando: ${e.message}`, 'error');
      }
    } finally {
      el.btnSave.disabled = !state.dirty;
    }
  }

  function showToast(msg, kind) {
    el.saveToast.textContent = msg;
    el.saveToast.classList.remove('hidden', 'save-toast--error', 'save-toast--warn');
    if (kind === 'error') el.saveToast.classList.add('save-toast--error');
    else if (kind === 'warn') el.saveToast.classList.add('save-toast--warn');
    clearTimeout(showToast._t);
    // Warnings se quedan mas tiempo para que el PM los pueda leer (lleva mas info)
    const ms = kind === 'warn' ? 7000 : 3500;
    showToast._t = setTimeout(() => el.saveToast.classList.add('hidden'), ms);
  }

  function renderBreadcrumb(path) {
    const parts = path.split('/');
    const crumbs = parts.map((p, i) => {
      const isLast = i === parts.length - 1;
      return isLast
        ? `<span class="crumb-final">${escapeHtml(p)}</span>`
        : `<span class="crumb">${escapeHtml(p)}</span>`;
    });
    return crumbs.join('<span class="crumb-sep">/</span>');
  }

  // ─────────── V2.3: Kanban / Project view ───────────

  // ─────────── V2.6: navegación por áreas ───────────

  // Sub-tab por defecto si no hay una guardada
  const AREA_DEFAULT_SUBTAB = {
    general: 'dashboard',
    producto: 'resumen',
    _system: 'estado',
  };

  function setActiveArea(areaId) {
    state.activeArea = areaId;
    // Sidebar: marcar fila activa (querySelectorAll vivo, incluye areas dinamicas)
    document.querySelectorAll('.area-row').forEach(r => r.classList.toggle('active', r.dataset.area === areaId));
    // Main: mostrar solo la sección del área (querySelectorAll vivo)
    document.querySelectorAll('.area-view').forEach(v => v.classList.toggle('hidden', v.dataset.areaView !== areaId));
    el.errorState.classList.add('hidden');

    // Áreas transversales del "panel de startup"
    if (areaId === 'inicio') { renderOverview(); stopPolling(); hideSharedViewer(); return; }
    if (areaId === 'cerebro') {
      stopPolling();
      setSubTab('cerebro', state.areaSubTab['cerebro'] || 'wiki');  // setSubTab gestiona el viewer (docs vs no-docs)
      return;
    }

    // Areas inactivas: las que tienen active: false en pm/config.json > areas
    // (Antes hardcoded como ['marketing', 'rrhh', 'operaciones']; ahora dinamico)
    const areaCfg = state.config?.areas?.[areaId];
    const isHardcoded = (areaId === 'general' || areaId === 'producto' || areaId === '_system');
    if (!isHardcoded && areaCfg && areaCfg.active === false) {
      renderInactiveArea(areaId);
      stopPolling();
      hideSharedViewer();
      return;
    }

    // Areas dinamicas ACTIVAS (newsletter, marketing si se activa, etc.):
    // renderizar vista de docs simple (browser del primer path)
    if (!isHardcoded && areaCfg && areaCfg.active === true) {
      renderDynamicActiveArea(areaId, areaCfg);
      stopPolling();
      hideSharedViewer();
      return;
    }

    // Activar sub-tab por defecto del área (si no había una guardada)
    const sub = state.areaSubTab[areaId] || AREA_DEFAULT_SUBTAB[areaId];
    setSubTab(areaId, sub);

    // Polling solo si estamos en producto o general (que muestran datos del PM)
    if (areaId === 'producto' || areaId === 'general' || areaId === '_system') {
      loadTasksAndConfig();
      loadStories();
      startPolling();
    } else {
      stopPolling();
    }
  }

  function setSubTab(areaId, subtab) {
    state.areaSubTab[areaId] = subtab;
    // V3.5: querySelectorAll vivo en lugar de cache (las tabs dinamicas no estan en el cache).
    document.querySelectorAll('.atab').forEach(t => {
      if (t.dataset.area !== areaId) return;
      t.classList.toggle('active', t.dataset.subtab === subtab);
    });
    document.querySelectorAll('.atab-content').forEach(c => {
      if (c.dataset.area !== areaId) return;
      c.classList.toggle('hidden', c.dataset.subtab !== subtab);
    });

    // Render según área + sub-tab
    if (areaId === 'general' && subtab === 'dashboard') renderGeneralDashboard();
    if (areaId === 'general' && subtab === 'docs') renderTreeForArea('general');
    if (areaId === 'producto' && subtab === 'resumen') renderResumen();
    if (areaId === 'producto' && subtab === 'funcionalidades') renderFuncionalidades();
    if (areaId === 'producto' && subtab === 'dossiers') renderDossiers();
    if (areaId === 'producto' && subtab === 'kanban') renderKanban();
    if (areaId === 'producto' && subtab === 'arquitectura') renderArquitectura();
    if (areaId === 'producto' && subtab === 'docs') renderTreeForArea('producto');
    if (areaId === '_system' && subtab === 'estado') renderSystemEstado();
    if (areaId === '_system' && subtab === 'files') renderTreeForArea('_system');
    if (areaId === 'cerebro' && subtab === 'wiki') renderWiki();
    if (areaId === 'cerebro' && subtab === 'reuniones') renderMeetings();
    if (areaId === 'cerebro' && subtab === 'docs') renderAllDocs();

    // V3.5: areas dinamicas activas con states declarados (kanban genérico)
    const areaCfg = state.config?.areas?.[areaId];
    const isHardcoded = (areaId === 'general' || areaId === 'producto' || areaId === '_system');
    if (!isHardcoded && areaCfg && areaCfg.active === true && Array.isArray(areaCfg.states) && areaCfg.states.length > 0) {
      if (subtab === 'kanban') renderAreaKanban(areaId, areaCfg);
      if (subtab === 'docs') renderAreaDocsBrowser(areaId, areaCfg);
    }

    // Mover el shared viewer al slot del área activa, o esconderlo
    const isDocsLike = (subtab === 'docs' || subtab === 'files');
    if (isDocsLike) {
      mountSharedViewerInto(areaId);
    } else {
      hideSharedViewer();
    }
  }

  function mountSharedViewerInto(areaId) {
    const slot = document.querySelector(`[data-viewer-slot="${areaId}"]`);
    if (!slot) return;
    if (el.sharedViewerHost.parentElement !== slot) {
      slot.appendChild(el.sharedViewerHost);
    }
    el.sharedViewerHost.classList.remove('hidden');
    // Estado inicial: si no hay archivo abierto, welcome; si hay, viewer
    if (state.currentFile) {
      el.welcome.classList.add('hidden');
      el.viewer.classList.remove('hidden');
    } else {
      el.welcome.classList.remove('hidden');
      el.viewer.classList.add('hidden');
    }
  }

  function hideSharedViewer() {
    el.sharedViewerHost.classList.add('hidden');
  }

  // ---- Arquitectura: render del architecture-map.json con mermaid ----
  let _mermaidReady = false;
  let _archRefreshWired = false;

  function archSafeId(id) {
    return String(id).replace(/[^a-zA-Z0-9]/g, '_');
  }
  function archEsc(t) {
    return String(t == null ? '' : t).replace(/"/g, "'").replace(/\n/g, ' ');
  }

  function archGraph(nodes, edges) {
    if (!nodes.length) return 'graph TD\n  empty["(mapa vacio)"]';
    const lines = ['graph TD'];
    nodes.forEach(n => {
      const dep = n.status === 'deprecated' ? '  %% deprecated' : '';
      lines.push(`  ${archSafeId(n.id)}["${archEsc(n.name)}\\n(${archEsc(n.kind)})"]${dep}`);
    });
    edges.forEach(e => {
      lines.push(`  ${archSafeId(e.from)} -->|${archEsc(e.type)}| ${archSafeId(e.to)}`);
    });
    return lines.join('\n');
  }

  function archER(nodes, edges) {
    const tables = nodes.filter(n => n.kind === 'table');
    if (!tables.length) return null;
    const lines = ['erDiagram'];
    tables.forEach(t => {
      const fields = (t.meta && t.meta.fields) || [];
      lines.push(`  ${archSafeId(t.id)} {`);
      (fields.length ? fields : ['id']).forEach(f => lines.push(`    string ${archSafeId(f)}`));
      lines.push('  }');
    });
    const tableIds = new Set(tables.map(t => t.id));
    edges.forEach(e => {
      if (e.type === 'fk' && tableIds.has(e.from) && tableIds.has(e.to)) {
        lines.push(`  ${archSafeId(e.from)} ||--o{ ${archSafeId(e.to)} : fk`);
      }
    });
    return lines.join('\n');
  }

  function archSequences(flows) {
    return (flows || []).map(flow => {
      const lines = ['sequenceDiagram'];
      let prev = 'Actor';
      (flow.steps || []).forEach((step, i) => {
        lines.push(`  ${prev}->>Paso${i + 1}: ${archEsc(step)}`);
        prev = `Paso${i + 1}`;
      });
      return { title: flow.name || flow.id || 'Flujo', diagram: lines.join('\n') };
    });
  }

  async function renderArquitectura() {
    const host = document.getElementById('arch-view');
    const meta = document.getElementById('arch-meta');
    if (!host) return;

    if (!_archRefreshWired) {
      const btn = document.getElementById('btn-refresh-arch');
      if (btn) btn.addEventListener('click', renderArquitectura);
      _archRefreshWired = true;
    }

    host.innerHTML = '<p class="arch-empty">Cargando mapa…</p>';
    let map;
    try {
      map = await api('/api/architecture');
    } catch (e) {
      host.innerHTML = `<p class="arch-empty">No se pudo leer el mapa: ${escapeHtml(String(e))}</p>`;
      return;
    }

    const nodes = map.nodes || [];
    const edges = map.edges || [];
    if (meta) {
      meta.textContent = map._missing
        ? 'Aún no hay architecture-map.json. Se generará al construir features (/review) o con bootstrap.'
        : `${nodes.length} nodos · ${edges.length} relaciones · generado: ${map.generated_at || '—'}`;
    }
    if (!nodes.length) {
      host.innerHTML = '<p class="arch-empty">Mapa vacío. Se irá poblando a medida que construyas features (paso UPDATE en /review), o lánzalo retroactivamente con el modo BOOTSTRAP de ski-architecture-map.</p>';
      return;
    }

    const er = archER(nodes, edges);
    const seqs = archSequences(map.data_flows);
    let html = '<div class="arch-section"><h3>Grafo de dependencias</h3>'
      + `<pre class="mermaid">${archGraph(nodes, edges)}</pre></div>`;
    html += '<div class="arch-section"><h3>Modelo de datos</h3>'
      + (er ? `<pre class="mermaid">${er}</pre>` : '<p class="arch-empty">Sin tablas registradas.</p>') + '</div>';
    html += '<div class="arch-section"><h3>Flujos de datos</h3>'
      + (seqs.length ? seqs.map(s => `<p class="arch-flow-title">${escapeHtml(s.title)}</p><pre class="mermaid">${s.diagram}</pre>`).join('')
                     : '<p class="arch-empty">Sin flujos registrados.</p>') + '</div>';
    host.innerHTML = html;

    if (typeof mermaid === 'undefined') {
      host.insertAdjacentHTML('afterbegin', '<p class="arch-empty">mermaid no cargó (¿sin conexión al CDN?). El JSON sí está disponible.</p>');
      return;
    }
    try {
      if (!_mermaidReady) { mermaid.initialize({ startOnLoad: false, theme: 'dark' }); _mermaidReady = true; }
      await mermaid.run({ querySelector: '#arch-view .mermaid' });
    } catch (e) {
      host.insertAdjacentHTML('afterbegin', `<p class="arch-empty">Error al renderizar diagramas: ${escapeHtml(String(e))}</p>`);
    }
  }

  // ───────────────── Panel de startup: Inicio / Cerebro / Reuniones ─────────────────

  const CARD = 'background:linear-gradient(180deg,var(--bg2),var(--bg3));border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow)';
  function ovPill(text, color) {
    return `<span style="display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;padding:3px 10px;font-size:11.5px;color:${color||'var(--text2)'}">${text}</span>`;
  }
  function statCard(icon, color, value, label, rightHtml) {
    return `<div style="${CARD};padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:18px;color:${color};background:color-mix(in oklab, ${color} 12%, transparent);border:1px solid var(--border)">${icon}</div>
        ${rightHtml || ''}
      </div>
      <div style="font-size:32px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin-top:14px">${escapeHtml(String(value))}</div>
      <div style="color:var(--text2);font-size:13px;margin-top:2px">${escapeHtml(label)}</div>
    </div>`;
  }
  function ovDonut(pct, top, bot) {
    const c = 2 * Math.PI * 50, off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
    return `<svg width="118" height="118" viewBox="0 0 118 118">
      <circle cx="59" cy="59" r="50" fill="none" stroke="var(--border)" stroke-width="12"/>
      <circle cx="59" cy="59" r="50" fill="none" stroke="var(--cyan)" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 59 59)"/>
      <text x="59" y="55" text-anchor="middle" fill="var(--text)" font-size="24" font-weight="800">${top}</text>
      <text x="59" y="74" text-anchor="middle" fill="var(--text3)" font-size="11">${bot}</text>
    </svg>`;
  }
  const OV_STATUS_COLOR = {
    sin_priorizar:'var(--text3)', priorizada:'var(--text3)', research:'var(--green)',
    definicion:'var(--blue)', en_definicion:'var(--orange)', planning:'var(--purple)',
    build:'var(--cyan)', review:'var(--pink)', hecho:'var(--green)', bloqueada:'var(--red)', cancelada:'var(--text3)',
  };
  function ovStatusColor(s) { return OV_STATUS_COLOR[s] || 'var(--blue)'; }

  function chip(text, cls) {
    return `<span class="inline-block rounded-full border border-brd ${cls || 'text-muted'} px-2.5 py-0.5 text-xs">${escapeHtml(text)}</span>`;
  }

  let _overviewWired = false;
  async function renderOverview() {
    const host = document.getElementById('overview-view');
    if (!host) return;
    if (!_overviewWired) {
      const b = document.getElementById('btn-refresh-overview');
      if (b) b.addEventListener('click', renderOverview);
      _overviewWired = true;
    }
    host.innerHTML = '<p class="text-muted">Cargando…</p>';
    let d;
    try { d = await api('/api/overview'); }
    catch (e) { host.innerHTML = `<p class="text-danger">No se pudo cargar el resumen: ${escapeHtml(String(e))}</p>`; return; }

    const t = d.tasks || {}, f = d.features || {}, w = d.wiki || {}, m = d.meetings || {};
    const brainTotal = (w.entities||0)+(w.concepts||0)+(w.sources||0)+(w.topics||0);
    const statusOrder = Object.entries(t.by_status || {}).sort((a,b)=>b[1]-a[1]);
    const totalT = t.total || statusOrder.reduce((s,[,n])=>s+n,0) || 0;
    const pctDossier = f.total ? Math.round((f.with_dossier||0)/f.total*100) : 0;
    const LBL = { definicion:'Definición', en_definicion:'En definición', sin_priorizar:'Sin priorizar', priorizada:'Priorizada' };
    const lbl = s => LBL[s] || (s.charAt(0).toUpperCase()+s.slice(1).replace(/_/g,' '));
    const grid = 'display:grid;gap:16px;margin-bottom:18px';

    // Stat cards
    let html = `<div style="${grid};grid-template-columns:repeat(4,minmax(0,1fr))">`;
    html += statCard('◷','var(--cyan)', totalT, 'Tareas activas',
      ovPill(t.blocked ? `${t.blocked} bloqueadas` : '0 bloqueadas', t.blocked ? 'var(--red)' : 'var(--green)'));
    html += statCard('▦','var(--blue)', f.total||0, 'Funcionalidades', ovPill(`${pctDossier}% dossier`, 'var(--blue)'));
    html += statCard('🗣','var(--purple)', m.total||0, 'Reuniones', '');
    html += statCard('🧠','var(--green)', brainTotal, 'Cerebro · entidades+conceptos', ovPill(brainTotal? 'activo':'vacío', 'var(--text3)'));
    html += '</div>';

    // Estado de tareas (barra segmentada) + donut de features
    html += `<div style="${grid};grid-template-columns:1.6fr 1fr">`;
    html += `<div style="${CARD};padding:20px 22px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--text3)">Estado de las tareas</div>
        ${ovPill(`${totalT} total`)}</div>`;
    if (statusOrder.length) {
      html += '<div style="height:12px;border-radius:999px;display:flex;gap:3px;margin-bottom:18px">'
        + statusOrder.map(([s,n]) => `<span style="flex:${n};background:${ovStatusColor(s)};border-radius:999px;display:block"></span>`).join('') + '</div>';
      html += '<div style="display:flex;gap:26px;flex-wrap:wrap">' + statusOrder.map(([s,n]) =>
        `<div><div style="display:flex;align-items:center;gap:7px"><i style="width:9px;height:9px;border-radius:3px;background:${ovStatusColor(s)};display:block"></i><span style="color:var(--text2);font-size:13px">${escapeHtml(lbl(s))}</span></div><div style="font-size:22px;font-weight:700;margin-top:3px;font-variant-numeric:tabular-nums">${n}</div></div>`).join('') + '</div>';
    } else { html += '<p style="color:var(--text2);font-size:13px">Sin tareas todavía.</p>'; }
    html += '</div>';

    html += `<div style="${CARD};padding:20px 22px;display:flex;flex-direction:column">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--text3);margin-bottom:8px">Progreso de features</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:20px">
        ${ovDonut(pctDossier, pctDossier+'%', (f.with_dossier||0)+' / '+(f.total||0))}
        <div style="font-size:13px;color:var(--text2);line-height:1.7"><div><b style="color:var(--text)">${f.with_dossier||0}</b> con dossier</div><div><b style="color:var(--text)">${(f.total||0)-(f.with_dossier||0)}</b> pendientes</div></div>
      </div></div></div>`;

    // Reuniones recientes + áreas
    html += `<div style="display:grid;gap:16px;grid-template-columns:1.6fr 1fr">`;
    html += `<div style="${CARD};padding:20px 22px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--text3);margin-bottom:14px">Reuniones recientes</div>`;
    html += (m.recent && m.recent.length)
      ? m.recent.map(r => `<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line2)"><span style="font-size:14px">${escapeHtml(r.title||r.slug)}</span><span style="color:var(--text3);font-size:12px">${escapeHtml((r.date||'').slice(0,10))} · ${r.decisions||0} dec · ${r.action_items||0} tareas</span></div>`).join('')
      : '<div style="text-align:center;padding:22px 0;color:var(--text3)"><div style="font-size:30px;opacity:.5">🗣</div><div style="color:var(--text);font-weight:600;margin-top:8px">Sin reuniones todavía</div><div style="font-size:13px;margin-top:4px">Captúralas con <code>/wiki reunion</code>.</div></div>';
    html += '</div>';
    html += `<div style="${CARD};padding:20px 22px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--text3);margin-bottom:14px">Áreas activas</div><div style="display:flex;flex-direction:column;gap:10px">`
      + (d.areas||[]).map(a => `<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:14px">${escapeHtml(a.label)}</span></div>`).join('') + '</div></div></div>';

    host.innerHTML = html;
  }

  async function renderWiki() {
    const host = document.getElementById('wiki-view');
    if (!host) return;
    host.innerHTML = '<p class="text-muted">Cargando el cerebro…</p>';
    let d;
    try { d = await api('/api/wiki'); }
    catch (e) { host.innerHTML = `<p class="text-danger">No se pudo cargar el cerebro: ${escapeHtml(String(e))}</p>`; return; }

    if (d._missing) {
      host.innerHTML = '<div class="rounded-xl border border-brd bg-surface p-8 text-center"><p class="text-text font-medium mb-1">El cerebro está vacío.</p><p class="text-muted text-sm">Aliméntalo desde Claude Code: <code>/wiki reunion</code>, <code>/wiki ingestar</code>, <code>/wiki anotar</code>. Cada cosa que metas queda aquí clasificada y sin silos.</p></div>';
      return;
    }
    const c = d.counts || {};
    let html = '<div class="flex flex-wrap items-center gap-2 mb-5 text-sm text-muted">'
      + chip(`${c.entities||0} entidades`,'text-ok') + chip(`${c.concepts||0} conceptos`,'text-info')
      + chip(`${c.sources||0} fuentes`,'text-special') + chip(`${c.topics||0} temas`,'text-warn') + '</div>';

    if (d.tags && d.tags.length) {
      html += '<div class="mb-6"><div class="text-faint text-xs uppercase tracking-wide mb-2">Tags</div><div class="flex flex-wrap gap-2">'
        + d.tags.slice(0,30).map(tg => `<span class="rounded-full bg-surface2 border border-brd px-2.5 py-0.5 text-xs text-muted">${escapeHtml(tg.name)} <b class="text-text">${tg.count}</b></span>`).join('') + '</div></div>';
    }

    const section = (title, items, meta) => {
      let s = `<div class="rounded-xl border border-brd bg-surface p-5"><div class="text-faint text-xs uppercase tracking-wide mb-3">${escapeHtml(title)} <span class="text-text">${items.length}</span></div>`;
      s += items.length
        ? items.map(it => `<div class="py-2 border-b border-brd last:border-0">
            <div class="text-text text-sm font-medium">${escapeHtml(it.title)}</div>
            <div class="text-faint text-xs mt-0.5">${meta(it)}${(it.tags||[]).length? ' · ' + it.tags.map(escapeHtml).join(', ') : ''}</div></div>`).join('')
        : '<p class="text-muted text-sm">—</p>';
      return s + '</div>';
    };
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
    html += section('Entidades', d.entities, it => escapeHtml(it.category||'entidad') + ` · ${it.links||0} enlaces`);
    html += section('Conceptos', d.concepts, it => escapeHtml(it.status||'concepto') + ` · ${it.links||0} enlaces`);
    html += section('Fuentes', d.sources, it => escapeHtml(it.source_type||'fuente') + (it.date? ' · '+escapeHtml(String(it.date).slice(0,10)) : ''));
    html += section('Temas', d.topics, () => 'tema');
    html += '</div>';
    host.innerHTML = html;
  }

  async function renderMeetings() {
    const host = document.getElementById('meetings-view');
    if (!host) return;
    host.innerHTML = '<p class="text-muted">Cargando reuniones…</p>';
    let d;
    try { d = await api('/api/meetings'); }
    catch (e) { host.innerHTML = `<p class="text-danger">No se pudieron cargar las reuniones: ${escapeHtml(String(e))}</p>`; return; }

    if (d._missing || !d.meetings || !d.meetings.length) {
      host.innerHTML = '<div class="rounded-xl border border-brd bg-surface p-8 text-center"><p class="text-text font-medium mb-1">Sin reuniones todavía.</p><p class="text-muted text-sm">Captura una con <code>/wiki reunion "Título"</code> y luego <code>/wiki ingestar</code>. Aparecerán aquí con sus decisiones y tareas.</p></div>';
      return;
    }
    host.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' + d.meetings.map(m => `
      <div class="rounded-xl border border-brd bg-surface p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="text-text font-medium">${escapeHtml(m.title || m.slug)}</div>
          ${m.ingested ? '<span class="text-ok text-xs">✓ en el cerebro</span>' : '<span class="text-warn text-xs">sin ingerir</span>'}
        </div>
        <div class="text-faint text-xs mt-1">${escapeHtml((m.date||'').slice(0,10))}${(m.attendees||[]).length? ' · ' + m.attendees.map(escapeHtml).join(', ') : ''}</div>
        <div class="flex flex-wrap gap-2 mt-3">
          ${chip(`${m.decisions||0} decisiones`, 'text-info')}
          ${chip(`${m.action_items||0} tareas`, 'text-accent')}
          ${(m.related_features||[]).map(f => chip('→ '+f, 'text-special')).join('')}
        </div>
      </div>`).join('') + '</div>';
  }

  // ───────────────── Tema claro/oscuro ─────────────────
  function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('light', theme === 'light');
    try { localStorage.setItem('pmx-theme', theme); } catch (e) {}
  }
  function initTheme() {
    let theme;
    try { theme = localStorage.getItem('pmx-theme'); } catch (e) {}
    if (!theme) theme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    applyTheme(theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', () => {
      const now = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(now);
    });
  }
  initTheme();

  async function loadStories() {
    try {
      const data = await api('/api/stories');
      state.storiesData = data;
      // V2.6: re-renderizar la sub-tab activa si usa stories
      const sub = state.areaSubTab[state.activeArea];
      if (state.activeArea === 'producto' && sub === 'resumen') renderResumen();
      else if (state.activeArea === 'producto' && sub === 'funcionalidades') renderFuncionalidades();
      else if (state.activeArea === 'general' && sub === 'dashboard') renderGeneralDashboard();
    } catch (e) {
      console.warn('No se pudo cargar /api/stories:', e.message);
    }
  }

  function renderResumen() {
    // V2.7.1: misma fuente unificada que Kanban y Funcionalidades
    const all = getMergedTasks();

    // Contadores agrupados
    const buckets = { backlog: 0, curso: 0, hecho: 0, bloqueado: 0 };
    for (const item of all) {
      if (item.blocked) { buckets.bloqueado++; continue; }
      const st = item.status || '';
      if (st === 'hecho') buckets.hecho++;
      else if (st.startsWith('en_')) buckets.curso++;
      else if (st.startsWith('backlog_') || !st) buckets.backlog++;
    }
    el.resumenCards.innerHTML = `
      <div class="r-card r-card--backlog"><div class="r-card-num">${buckets.backlog}</div><div class="r-card-label">Backlog</div></div>
      <div class="r-card r-card--curso"><div class="r-card-num">${buckets.curso}</div><div class="r-card-label">En curso</div></div>
      <div class="r-card r-card--hecho"><div class="r-card-num">${buckets.hecho}</div><div class="r-card-label">Hecho</div></div>
      <div class="r-card r-card--bloqueado"><div class="r-card-num">${buckets.bloqueado}</div><div class="r-card-label">Bloqueado</div></div>
    `;

    // Próximas a arrancar: backlog_priorizado con dependencias en hecho, ordenadas por priority/criticality
    const doneIds = new Set(all.filter(x => x.status === 'hecho').map(x => x.story_id));
    const next = all
      .filter(x => !x.blocked && (x.status === 'backlog_priorizado'))
      .filter(x => (x.depends_on || []).every(d => doneIds.has(d)))
      .sort((a, b) => priorityScore(b) - priorityScore(a))
      .slice(0, 5);
    el.resumenNext.innerHTML = next.length === 0
      ? '<div class="resumen-list-empty">Nada listo. Prioriza algo del backlog (/pm prioritize HU-XXX) o desbloquea dependencias.</div>'
      : next.map(it => renderResumenRow(it, 'next')).join('');

    // Últimas modificaciones (top 5 por updated_at desc)
    const recent = all
      .filter(x => x.updated_at)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, 5);
    el.resumenRecent.innerHTML = recent.length === 0
      ? '<div class="resumen-list-empty">Sin actividad registrada (los agentes aún no han escrito updated_at).</div>'
      : recent.map(it => renderResumenRow(it, 'recent')).join('');

    // Drift
    const drift = (state.tasksData?.drift_warnings) || [];
    if (drift.length === 0) {
      el.resumenDrift.classList.add('hidden');
    } else {
      el.resumenDrift.classList.remove('hidden');
      el.resumenDriftList.innerHTML = drift.map(d =>
        `<div style="margin:4px 0;font-size:12px"><b>${escapeHtml(d.task_id)}</b>: ${escapeHtml(d.issue)}</div>`
      ).join('');
    }
  }

  function priorityScore(item) {
    if (typeof item.priority === 'number') return item.priority;
    const map = { high: 5, medium: 3, low: 2 };
    return map[item.criticality] || 0;
  }

  function renderResumenRow(item, kind) {
    const stars = renderStarsInline(priorityScore(item));
    const meta = kind === 'next'
      ? (item.platform ? escapeHtml(item.platform) : '')
      : (item.status ? escapeHtml(item.status) : '');
    const path = item.path || '';
    return `
      <div class="r-list-row" data-path="${escapeHtml(path)}">
        <span class="r-id">${escapeHtml(item.story_id)}</span>
        <span class="r-title">${escapeHtml(item.title || '(sin título)')}</span>
        <span class="r-stars">${stars}</span>
        <span class="r-meta">${meta}</span>
      </div>
    `;
  }

  function renderStarsInline(n) {
    n = Math.max(0, Math.min(5, Math.round(n || 0)));
    return '★'.repeat(n) + '<span style="color:var(--text3)">' + '☆'.repeat(5 - n) + '</span>';
  }

  // ─────────── V2.5.2: Vista Funcionalidades ───────────

  function renderFuncionalidades() {
    if (!state.storiesData && !state.tasksData) {
      el.funcTbody.innerHTML = '<tr><td colspan="8" class="func-table-empty">Cargando…</td></tr>';
      return;
    }
    // V2.7.1: misma fuente unificada que Kanban
    const stories = getMergedTasks();

    // V2.9: tabs principales por feature (carpeta)
    renderFeatureTabs(stories);

    // Filter dropdowns: poblar category/platform/agent
    populateFuncFilters();

    // Aplicar filtros
    let visible = stories.filter(s => {
      // Filtro feature (tab principal)
      if (state.funcFeatureFilter === '__none__') {
        if (s.feature) return false;
      } else if (state.funcFeatureFilter) {
        if (s.feature !== state.funcFeatureFilter) return false;
      }
      // Filtro category (dropdown)
      if (state.funcFilters.category && s.category !== state.funcFilters.category) return false;
      // Filtro estado agrupado
      const grp = state.funcFilters.statusGroup;
      if (grp === 'backlog' && !(s.blocked === false && (s.status || '').startsWith('backlog'))) return false;
      if (grp === 'curso' && !(s.blocked === false && (s.status || '').startsWith('en_'))) return false;
      if (grp === 'hecho' && s.status !== 'hecho') return false;
      if (grp === 'bloqueado' && !s.blocked) return false;
      // Filtro platform
      if (state.funcFilters.platform && s.platform !== state.funcFilters.platform) return false;
      // Filtro agent
      if (state.funcFilters.agent && s.agent_suggested !== state.funcFilters.agent) return false;
      return true;
    });

    // Sort
    const { key, dir } = state.funcSort;
    visible.sort((a, b) => {
      let av = a[key], bv = b[key];
      if (key === 'priority') {
        av = priorityScore(a);
        bv = priorityScore(b);
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = (typeof av === 'number' && typeof bv === 'number')
        ? (av - bv)
        : String(av).localeCompare(String(bv));
      return dir === 'asc' ? cmp : -cmp;
    });

    el.funcCount.textContent = `${visible.length} de ${stories.length} stories`;

    // Update sort indicators en header
    el.funcTable.querySelectorAll('th[data-sort]').forEach(th => {
      const arrow = th.querySelector('.sort-arrow');
      if (arrow) arrow.remove();
      if (th.dataset.sort === key) {
        const span = document.createElement('span');
        span.className = 'sort-arrow';
        span.textContent = dir === 'asc' ? '▲' : '▼';
        th.appendChild(span);
      }
    });

    if (visible.length === 0) {
      el.funcTbody.innerHTML = '<tr><td colspan="8" class="func-table-empty">No hay stories que cumplan los filtros.</td></tr>';
      return;
    }

    // V2.7: agrupar por épica (cascada)
    el.funcTbody.innerHTML = renderFuncRowsGrouped(visible);
  }

  // Agrupa stories por parent_epic y renderiza:
  //   - Épicas como rows padre (clickables para expandir/colapsar)
  //   - Tareas hijas debajo de su épica (visibles solo si la épica está expandida)
  //   - Tareas sin épica al final como sección "Sin épica"
  function renderFuncRowsGrouped(stories) {
    const epics = stories.filter(s => String(s.story_id).startsWith('EPIC-'));
    const tasks = stories.filter(s => !String(s.story_id).startsWith('EPIC-'));

    // Mapear tareas por épica
    const tasksByEpic = new Map();
    const orphanTasks = [];
    for (const t of tasks) {
      const ep = t.parent_epic;
      if (ep && epics.some(e => e.story_id === ep)) {
        if (!tasksByEpic.has(ep)) tasksByEpic.set(ep, []);
        tasksByEpic.get(ep).push(t);
      } else {
        orphanTasks.push(t);
      }
    }

    const rows = [];
    // Épicas (cada una con su grupo)
    for (const epic of epics) {
      const children = tasksByEpic.get(epic.story_id) || [];
      const isExpanded = state.funcExpandedEpics.has(epic.story_id);
      rows.push(renderEpicRow(epic, children.length, isExpanded));
      if (isExpanded) {
        for (const child of children) {
          rows.push(renderFuncRow(child, true /* nested */));
        }
      }
    }
    // Tareas sin épica
    if (orphanTasks.length > 0) {
      if (epics.length > 0) {
        rows.push(`<tr class="ft-section-row"><td colspan="8">Sin épica (${orphanTasks.length})</td></tr>`);
      }
      for (const t of orphanTasks) rows.push(renderFuncRow(t, false));
    }
    return rows.join('');
  }

  function renderEpicRow(epic, childrenCount, isExpanded) {
    const score = priorityScore(epic);
    const stars = score > 0 ? renderStarsInline(score) : '<span class="ft-stars-empty">☆☆☆☆☆</span>';
    const status = epic.blocked ? 'bloqueado' : (epic.status || 'unknown');
    const statusLabel = STATE_LABELS[status] || status;
    const updated = epic.updated_at ? formatRelative(epic.updated_at) : '';
    const chev = isExpanded ? '▼' : '▶';
    return `
      <tr class="ft-epic-row" data-epic-id="${escapeHtml(epic.story_id)}" data-path="${escapeHtml(epic.path || '')}" data-id="${escapeHtml(epic.story_id)}">
        <td class="ft-id"><span class="ft-epic-chev">${chev}</span> ${escapeHtml(epic.story_id)}</td>
        <td class="ft-title"><b>${escapeHtml(epic.title || '(sin título)')}</b> <span class="ft-epic-count">${childrenCount} tareas</span></td>
        <td class="ft-stars">${stars}</td>
        <td><span class="ft-status ft-status--${escapeHtml(status)}">${escapeHtml(statusLabel)}</span></td>
        <td>${epic.platform ? `<span class="ft-pill">${escapeHtml(epic.platform)}</span>` : '<span class="ft-empty">—</span>'}</td>
        <td>${epic.category ? `<span class="ft-pill">${escapeHtml(epic.category)}</span>` : '<span class="ft-empty">—</span>'}</td>
        <td><span class="ft-empty">—</span></td>
        <td><span class="ft-meta">${escapeHtml(updated)}</span></td>
      </tr>
    `;
  }

  // V2.9: tabs principales por feature (carpeta) en lugar de category
  function renderFeatureTabs(stories) {
    const features = Array.from(new Set(stories.map(s => s.feature).filter(Boolean))).sort();
    const noneCount = stories.filter(s => !s.feature).length;

    const tabsHTML = ['<button class="fc-tab" data-feature="">Todas <span class="fc-tab-count">' + stories.length + '</span></button>'];
    for (const f of features) {
      const n = stories.filter(s => s.feature === f).length;
      tabsHTML.push(`<button class="fc-tab" data-feature="${escapeHtml(f)}">📁 ${escapeHtml(f)} <span class="fc-tab-count">${n}</span></button>`);
    }
    if (noneCount > 0) {
      tabsHTML.push(`<button class="fc-tab" data-feature="__none__">Sin carpeta <span class="fc-tab-count">${noneCount}</span></button>`);
    }
    el.funcFeatureTabs.innerHTML = tabsHTML.join('');

    // Marcar la activa
    el.funcFeatureTabs.querySelectorAll('.fc-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.feature === state.funcFeatureFilter);
    });
  }

  function populateFuncFilters() {
    const platforms = (state.storiesData?.platforms) || [];
    const agents = (state.storiesData?.agents) || [];
    // V2.9: categories = únicos de las stories (que pueden venir del frontmatter directo)
    const categories = Array.from(new Set((state.storiesData?.stories || [])
      .map(s => s.category).filter(Boolean))).sort();

    // Solo repoblar si cambió (preserva selección)
    if (el.funcFilterPlatform.options.length !== platforms.length + 1) {
      const cur = el.funcFilterPlatform.value;
      el.funcFilterPlatform.innerHTML = '<option value="">— Todas —</option>' +
        platforms.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
      el.funcFilterPlatform.value = cur;
    }
    if (el.funcFilterAgent.options.length !== agents.length + 1) {
      const cur = el.funcFilterAgent.value;
      el.funcFilterAgent.innerHTML = '<option value="">— Todos —</option>' +
        agents.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
      el.funcFilterAgent.value = cur;
    }
    if (el.funcFilterCategory && el.funcFilterCategory.options.length !== categories.length + 1) {
      const cur = el.funcFilterCategory.value;
      el.funcFilterCategory.innerHTML = '<option value="">— Todas —</option>' +
        categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      el.funcFilterCategory.value = cur;
    }
  }

  function renderFuncRow(s, nested = false) {
    const score = priorityScore(s);
    const stars = score > 0 ? renderStarsInline(score) : '<span class="ft-stars-empty">☆☆☆☆☆</span>';
    const status = s.blocked ? 'bloqueado' : (s.status || 'unknown');
    const statusLabel = STATE_LABELS[status] || status;
    const updated = s.updated_at ? formatRelative(s.updated_at) : '';
    const rowCls = nested ? 'ft-nested-row' : '';
    const idCell = nested
      ? `<span class="ft-nested-indent">└</span> ${escapeHtml(s.story_id)}`
      : escapeHtml(s.story_id);
    return `
      <tr class="${rowCls}" data-path="${escapeHtml(s.path)}" data-id="${escapeHtml(s.story_id)}">
        <td class="ft-id">${idCell}</td>
        <td class="ft-title">${escapeHtml(s.title || '(sin título)')}</td>
        <td class="ft-stars editable" data-edit="priority" data-priority="${score}">${stars}</td>
        <td class="editable" data-edit="status"><span class="ft-status ft-status--${escapeHtml(status)}">${escapeHtml(statusLabel)}</span></td>
        <td class="editable" data-edit="platform">${s.platform ? `<span class="ft-pill">${escapeHtml(s.platform)}</span>` : '<span class="ft-empty">—</span>'}</td>
        <td class="editable" data-edit="category">${s.category ? `<span class="ft-pill">${escapeHtml(s.category)}</span>` : '<span class="ft-empty">—</span>'}</td>
        <td>${s.agent_suggested ? `<span class="ft-meta">${escapeHtml(s.agent_suggested)}</span>` : '<span class="ft-empty">—</span>'}</td>
        <td><span class="ft-meta">${escapeHtml(updated)}</span></td>
      </tr>
    `;
  }

  // ─────────── V2.5.3: Inline edit ───────────

  let _activePopover = null;

  function closePopover() {
    if (_activePopover) {
      _activePopover.popover.remove();
      _activePopover.cell.classList.remove('editing');
      document.removeEventListener('click', _onDocClickClosePopover, true);
      document.removeEventListener('keydown', _onEscClosePopover, true);
      _activePopover = null;
    }
  }

  function _onDocClickClosePopover(e) {
    if (!_activePopover) return;
    if (_activePopover.popover.contains(e.target)) return;
    if (_activePopover.cell.contains(e.target)) return;
    closePopover();
  }

  function _onEscClosePopover(e) {
    if (e.key === 'Escape') closePopover();
  }

  function openInlineEditor(cell, story) {
    closePopover();
    const editKind = cell.dataset.edit;
    const popover = document.createElement('div');
    popover.className = 'edit-popover edit-popover--floating';

    if (editKind === 'priority') {
      popover.innerHTML = renderPriorityEditor(story);
    } else if (editKind === 'status') {
      popover.innerHTML = renderStatusEditor(story);
    } else if (editKind === 'platform') {
      popover.innerHTML = renderFreetextEditor(story, 'platform', state.storiesData?.platforms || []);
    } else if (editKind === 'category') {
      popover.innerHTML = renderFreetextEditor(story, 'category',
        Array.from(new Set((state.storiesData?.stories || []).map(s => s.category).filter(Boolean))).sort());
    } else if (editKind === 'criticality') {
      popover.innerHTML = renderCriticalityEditor(story);
    }

    cell.classList.add('editing');
    // V2.0.2: el popover vive en <body> con position: fixed para que no lo
    // recorte el overflow de la columna del kanban ni de la tabla.
    document.body.appendChild(popover);
    positionPopoverNearCell(popover, cell);
    _activePopover = { popover, cell, story, editKind };

    setTimeout(() => {
      document.addEventListener('click', _onDocClickClosePopover, true);
      document.addEventListener('keydown', _onEscClosePopover, true);
    }, 0);

    wirePopoverInteractions(popover, cell, story, editKind);
  }

  // V2.0.2: posiciona el popover flotante junto a la celda, ajustando si se sale del viewport.
  function positionPopoverNearCell(popover, cell) {
    const cellRect = cell.getBoundingClientRect();
    // Render fuera de pantalla primero para medir tamaño real
    popover.style.top = '-9999px';
    popover.style.left = '-9999px';
    popover.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      const popRect = popover.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 6;
      // Por defecto: justo debajo de la celda, alineado a la izquierda
      let top = cellRect.bottom + 4;
      let left = cellRect.left;
      // Ajuste horizontal si se sale por la derecha
      if (left + popRect.width + margin > vw) {
        left = Math.max(margin, vw - popRect.width - margin);
      }
      if (left < margin) left = margin;
      // Si se sale por abajo y hay sitio arriba, lo ponemos encima
      if (top + popRect.height + margin > vh && cellRect.top - popRect.height - 4 >= margin) {
        top = cellRect.top - popRect.height - 4;
      }
      if (top + popRect.height + margin > vh) {
        top = Math.max(margin, vh - popRect.height - margin);
      }
      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
      popover.style.visibility = '';
    });
  }

  function renderPriorityEditor(story) {
    const cur = typeof story.priority === 'number' ? story.priority : 0;
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += `<span class="star ${i <= cur ? 'on' : ''}" data-value="${i}">★</span>`;
    }
    return `
      <div class="edit-popover-title">Priority (1-5)</div>
      <div class="stars-editor">
        ${starsHtml}
        <button class="star-clear" data-value="0">limpiar</button>
      </div>
    `;
  }

  // V2.0.3: editor de criticality (opciones discretas: critical/high/medium/low)
  function renderCriticalityEditor(story) {
    const cur = story.criticality || '';
    const opts = ['critical', 'high', 'medium', 'low'];
    return `
      <div class="edit-popover-title">Criticality</div>
      <div class="edit-popover-options">
        ${opts.map(s => `
          <button class="edit-popover-option ${s === cur ? 'current' : ''}" data-value="${escapeHtml(s)}">
            ${escapeHtml(s)}
          </button>
        `).join('')}
        <button class="edit-popover-option" data-value="">— vacío —</button>
      </div>
    `;
  }

  function renderStatusEditor(story) {
    const states = (state.config?.states) || KANBAN_STATES;
    const cur = story.blocked ? 'bloqueado' : story.status;
    const opts = [...states, 'bloqueado'];
    return `
      <div class="edit-popover-title">Status</div>
      <div class="edit-popover-options">
        ${opts.map(s => `
          <button class="edit-popover-option ${s === cur ? 'current' : ''}" data-value="${escapeHtml(s)}">
            ${escapeHtml(STATE_LABELS[s] || s)}
          </button>
        `).join('')}
      </div>
    `;
  }

  function renderFreetextEditor(story, field, suggestions) {
    const cur = story[field] || '';
    const optsHtml = suggestions.length === 0 ? '' : `
      <div class="edit-popover-options">
        ${suggestions.map(v => `
          <button class="edit-popover-option ${v === cur ? 'current' : ''}" data-value="${escapeHtml(v)}">
            ${escapeHtml(v)}
          </button>
        `).join('')}
        <button class="edit-popover-option" data-value="">— vacío —</button>
      </div>
    `;
    return `
      <div class="edit-popover-title">${field === 'platform' ? 'Platform' : 'Category'}</div>
      ${optsHtml}
      <input type="text" class="edit-popover-input" placeholder="Otro... (Enter para guardar)" value="${escapeHtml(cur)}">
    `;
  }

  function wirePopoverInteractions(popover, cell, story, editKind) {
    if (editKind === 'priority') {
      const stars = popover.querySelectorAll('.star');
      stars.forEach((star, idx) => {
        star.addEventListener('mouseenter', () => {
          stars.forEach((s, i) => s.classList.toggle('preview', i <= idx));
        });
        star.addEventListener('click', async () => {
          const value = parseInt(star.dataset.value, 10);
          await commitInlineEdit(cell, story, { priority: value });
        });
      });
      popover.querySelector('.stars-editor').addEventListener('mouseleave', () => {
        stars.forEach(s => s.classList.remove('preview'));
      });
      popover.querySelector('.star-clear').addEventListener('click', async () => {
        await commitInlineEdit(cell, story, { priority: null });
      });
    } else {
      // Opciones discretas — el campo se infiere de editKind
      popover.querySelectorAll('.edit-popover-option').forEach(btn => {
        btn.addEventListener('click', async () => {
          const value = btn.dataset.value;
          const fieldKey = editKind;  // status | platform | category | criticality
          const fieldValue = (value === '' && editKind !== 'status') ? null : value;
          await commitInlineEdit(cell, story, { [fieldKey]: fieldValue });
        });
      });
      // Input libre (platform/category)
      const input = popover.querySelector('.edit-popover-input');
      if (input) {
        input.focus();
        input.select();
        input.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const value = input.value.trim() || null;
            await commitInlineEdit(cell, story, { [editKind]: value });
          }
        });
      }
    }
  }

  async function commitInlineEdit(cell, story, fields) {
    const tr = cell.closest('tr');
    cell.classList.add('saving');
    closePopover();

    try {
      const result = await api('/api/story/update-frontmatter', {
        method: 'POST',
        body: {
          path: story.path,
          story_id: story.story_id,
          fields: fields,
        },
      });

      // Actualizar local cache
      const idx = state.storiesData.stories.findIndex(s => s.story_id === story.story_id && s.path === story.path);
      if (idx >= 0) {
        Object.assign(state.storiesData.stories[idx], fields);
        state.storiesData.stories[idx].updated_at = result.frontmatter.updated_at;
      }

      // Re-render: tabla + kanban + panel detalle si está abierto sobre esta story
      renderFuncionalidades();
      if (typeof renderKanban === 'function' && el.kanbanBoard) renderKanban();
      if (_detailStoryId === story.story_id && el.taskDetailPanel && !el.taskDetailPanel.classList.contains('hidden')) {
        // Refrescar metadata + prompt del panel sin recargar el cuerpo .md
        const fresh = (state.storiesData?.stories || []).find(s => s.story_id === story.story_id && s.path === story.path);
        if (fresh) {
          _detailStory = fresh;
          el.tdMetaGrid.innerHTML = renderTaskDetailMeta(fresh);
          renderTaskDetailPrompt(fresh);
        }
      }
      showToast(`${story.story_id} actualizada`, 'ok');
    } catch (e) {
      cell.classList.remove('saving');
      cell.classList.add('save-error');
      setTimeout(() => cell.classList.remove('save-error'), 800);
      const data = e.data || {};
      if (e.status === 409) {
        showToast(`⚠ Conflict: el archivo cambió fuera del dashboard. Recarga.`, 'error');
      } else if (e.status === 400 && data.error === 'invalid_status') {
        showToast(`⚠ Estado inválido: ${data.got}`, 'error');
      } else {
        showToast(`Error guardando: ${e.message}`, 'error');
      }
    }
  }

  function formatRelative(iso) {
    try {
      const d = new Date(iso);
      const sec = Math.round((Date.now() - d.getTime()) / 1000);
      if (sec < 60) return 'hace ' + sec + 's';
      if (sec < 3600) return 'hace ' + Math.round(sec/60) + 'min';
      if (sec < 86400) return 'hace ' + Math.round(sec/3600) + 'h';
      const days = Math.round(sec/86400);
      if (days < 30) return 'hace ' + days + 'd';
      return d.toISOString().slice(0, 10);
    } catch (e) { return iso; }
  }

  function wireFuncListeners() {
    // V2.9: Click en tab de feature (carpeta)
    el.funcFeatureTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.fc-tab');
      if (!tab) return;
      state.funcFeatureFilter = tab.dataset.feature || '';
      renderFuncionalidades();
    });

    // Filtros
    el.funcFilterStatus.addEventListener('change', () => {
      state.funcFilters.statusGroup = el.funcFilterStatus.value;
      renderFuncionalidades();
    });
    if (el.funcFilterCategory) {
      el.funcFilterCategory.addEventListener('change', () => {
        state.funcFilters.category = el.funcFilterCategory.value;
        renderFuncionalidades();
      });
    }
    el.funcFilterPlatform.addEventListener('change', () => {
      state.funcFilters.platform = el.funcFilterPlatform.value;
      renderFuncionalidades();
    });
    el.funcFilterAgent.addEventListener('change', () => {
      state.funcFilters.agent = el.funcFilterAgent.value;
      renderFuncionalidades();
    });

    // Click en header → sort
    el.funcTable.querySelector('thead').addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const key = th.dataset.sort;
      if (state.funcSort.key === key) {
        state.funcSort.dir = state.funcSort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.funcSort.key = key;
        state.funcSort.dir = 'desc';
      }
      renderFuncionalidades();
    });

    // Click en celda editable → popover; click en chevron de épica → expand;
    // click en row no-editable → panel de detalle lateral
    el.funcTbody.addEventListener('click', (e) => {
      if (e.target.closest('.edit-popover')) return;

      // V2.7: click en chevron de épica → expand/collapse
      const chev = e.target.closest('.ft-epic-chev');
      const epicRow = e.target.closest('tr.ft-epic-row');
      if (chev && epicRow) {
        e.stopPropagation();
        const epicId = epicRow.dataset.epicId;
        if (state.funcExpandedEpics.has(epicId)) state.funcExpandedEpics.delete(epicId);
        else state.funcExpandedEpics.add(epicId);
        renderFuncionalidades();
        return;
      }

      const editableCell = e.target.closest('td.editable');
      const tr = e.target.closest('tr[data-path]');
      if (!tr) return;

      if (editableCell) {
        e.stopPropagation();
        const story = (state.storiesData?.stories || []).find(s =>
          s.story_id === tr.dataset.id && s.path === tr.dataset.path);
        if (story) openInlineEditor(editableCell, story);
        return;
      }

      // Row click → abrir panel lateral de detalle
      // V3.3: las EPICs NO están en state.storiesData.stories (stories.md no contiene ## EPIC-).
      // Vienen de tasks.json via getMergedTasks(). Buscar en la fuente unificada.
      const merged = getMergedTasks();
      const story = merged.find(s =>
        s.story_id === tr.dataset.id && (s.path || '') === (tr.dataset.path || ''));
      if (story) openTaskDetailPanel(story);
    });
  }

  async function loadTasksAndConfig() {
    try {
      // En paralelo
      const [tasks, cfg] = await Promise.all([
        api('/api/tasks'),
        api('/api/config'),
      ]);
      state.tasksData = tasks;
      state.config = cfg;
      state.lastSyncMs = Date.now();
      // Inyectar areas dinamicas (no hardcoded) en sidebar y main panel
      renderDynamicAreas(cfg);
      renderKanban();
      renderKanbanMeta();
    } catch (e) {
      el.kanbanBoard.innerHTML = `<div class="error-message" style="margin:20px">Error cargando tasks/config:\n${escapeHtml(e.message)}</div>`;
    }
  }

  function startPolling() {
    if (state.pollingTimer) return;
    state.pollingTimer = setInterval(async () => {
      // Polling solo en áreas que muestran datos del PM
      if (!['producto', 'general', '_system'].includes(state.activeArea)) return;
      try {
        const [tasks, stories] = await Promise.all([
          api('/api/tasks'),
          api('/api/stories').catch(() => state.storiesData),
        ]);
        state.tasksData = tasks;
        if (stories) state.storiesData = stories;
        state.lastSyncMs = Date.now();
        // Re-render según área + sub-tab activa
        const sub = state.areaSubTab[state.activeArea];
        if (state.activeArea === 'producto') {
          if (sub === 'kanban') { renderKanban(); renderKanbanMeta(); }
          else if (sub === 'resumen') renderResumen();
          else if (sub === 'funcionalidades') renderFuncionalidades();
        } else if (state.activeArea === 'general' && sub === 'dashboard') {
          renderGeneralDashboard();
        } else if (state.activeArea === '_system' && sub === 'estado') {
          renderSystemEstado();
        }
      } catch (e) { /* silencioso */ }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (state.pollingTimer) { clearInterval(state.pollingTimer); state.pollingTimer = null; }
  }

  function applyFilters(tasks) {
    const { area, criticality, agent } = state.filters;
    return tasks.filter(t => {
      if (area && t.area !== area) return false;
      if (criticality && t.criticality !== criticality) return false;
      if (agent && t.agent_suggested !== agent) return false;
      return true;
    });
  }

  // V2.0.3: leyenda del kanban (colapsable). Lee state_meta del config para
  // que si cambian agentes/comandos se refleje sin tocar el HTML.
  function renderKanbanLegend() {
    const body = document.getElementById('kanban-legend-body');
    if (!body) return;
    const stateMeta = state.config?.areas?.producto?.state_meta || {};
    const stateList = state.config?.areas?.producto?.states || KANBAN_STATES.concat(KANBAN_TRAY_STATES);

    const rows = stateList.map(s => {
      const m = stateMeta[s] || {};
      const label = m.label || STATE_LABELS[s] || s;
      const type = m.type || '—';
      let agentTxt = '—';
      let cmdTxt = '—';
      if (type === 'agent') {
        agentTxt = m.agent || '—';
        if (Array.isArray(m.command_options) && m.command_options.length) {
          cmdTxt = m.command_options.map(o => `<code>${escapeHtml(o.cmd)}</code> <span class="legend-when">(${escapeHtml(o.when || '')})</span>`).join('<br>');
        } else if (m.command) {
          cmdTxt = `<code>${escapeHtml(m.command)}</code>`;
        }
      } else if (type === 'tray') {
        agentTxt = '<em>bandeja (decide humano)</em>';
      } else if (type === 'terminal') {
        agentTxt = '<em>tarea cerrada</em>';
      } else if (type === 'lateral') {
        agentTxt = '<em>pausada / descartada</em>';
      }
      return `
        <tr>
          <td class="legend-col"><strong>${escapeHtml(label)}</strong></td>
          <td class="legend-type"><span class="legend-type-pill legend-type-pill--${escapeHtml(type)}">${escapeHtml(type)}</span></td>
          <td class="legend-agent">${agentTxt}</td>
          <td class="legend-cmd">${cmdTxt}</td>
        </tr>`;
    }).join('');

    body.innerHTML = `
      <table class="kanban-legend-table">
        <thead>
          <tr>
            <th>Columna</th>
            <th>Tipo</th>
            <th>Agente que la trabaja</th>
            <th>Comando para lanzar</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="kanban-legend-hint">El sub-indicador <strong>⏸ pendiente</strong> significa que el agente aún no ha sido lanzado. <strong>✅ completado</strong> aparece cuando existe el artefacto esperado. Cada tarea acepta un <strong>prompt custom</strong> que el agente respetará al actuar.</p>
    `;
  }

  function renderKanban() {
    if (!state.tasksData) {
      el.kanbanBoard.innerHTML = '<div class="loading">Cargando…</div>';
      return;
    }

    // V2.0.3: leyenda dinámica a partir del state_meta del config
    renderKanbanLegend();

    // V2.7.1: fuente unificada (mismo dataset que Funcionalidades)
    // Sin épicas (son agrupaciones, no se trabajan en kanban)
    const merged = getMergedTasks();
    const allTasks = merged
      .filter(t => !String(t.story_id || '').startsWith('EPIC-'))
      .map(t => ({  // adaptar al schema que renderCard espera
        id: t.story_id,
        title: t.title,
        status: t.status,
        criticality: t.criticality,
        priority: t.priority,
        path: t.path,
        agent_suggested: t.agent_suggested,
        depends_on: t.depends_on,
        blocked: t.blocked,
        blocked_reason: t.blocked_reason,
        files: t.path ? [t.path] : [],
        origin: t.origin,
        sub_status: t.sub_status,
        next_action: t.next_action,
        prompt_override: t.prompt_override || null,
      }));

    if (state.tasksData._missing) {
      el.kanbanBoard.innerHTML = `<div class="error-message" style="margin:20px">
No se encontró <code>pm/tasks.json</code> en este proyecto.

Ejecuta <code>/pm sync</code> en Claude Code para crearlo y que aparezcan tareas aquí.</div>`;
      return;
    }

    const filtered = applyFilters(allTasks);

    // V2.0: tray con bloqueada + cancelada (laterales). 8 columnas principales arriba.
    el.kanbanBoard.innerHTML = '';

    // Columnas principales (8)
    for (const stateName of KANBAN_STATES) {
      const cards = filtered.filter(t => t.status === stateName && !t.blocked);
      el.kanbanBoard.appendChild(renderColumn(stateName, cards));
    }

    // Tray lateral colapsable con bloqueada + cancelada
    const trayItems = filtered.filter(t =>
      KANBAN_TRAY_STATES.includes(t.status) || t.blocked === true
    );
    el.kanbanBoard.appendChild(renderTray(trayItems));

    // V2.4 — engancha drag & drop después de re-render
    enableDragDrop();
  }

  // V2.0: tray colapsable lateral para bloqueada + cancelada
  function renderTray(items) {
    const tray = document.createElement('div');
    tray.className = 'k-tray';
    const isOpen = state.kanbanTrayOpen !== false;  // default abierto
    tray.classList.toggle('k-tray--open', isOpen);

    const blockedCount = items.filter(t => t.status === 'bloqueada' || t.blocked === true).length;
    const cancelledCount = items.filter(t => t.status === 'cancelada').length;

    tray.innerHTML = `
      <div class="k-tray-header">
        <button type="button" class="k-tray-toggle" data-action="toggle-tray">
          ${isOpen ? '▶' : '◀'} Tray
        </button>
        <span class="k-tray-summary">
          ${blockedCount > 0 ? `⛔ ${blockedCount}` : ''}
          ${cancelledCount > 0 ? `✕ ${cancelledCount}` : ''}
          ${blockedCount === 0 && cancelledCount === 0 ? '<em>(vacío)</em>' : ''}
        </span>
      </div>
      <div class="k-tray-body">
        ${KANBAN_TRAY_STATES.map(s => {
          const cards = items.filter(t => t.status === s || (s === 'bloqueada' && t.blocked === true && t.status !== 'cancelada'));
          return `
            <div class="k-tray-section">
              <div class="k-tray-section-title">${escapeHtml(STATE_LABELS[s] || s)} (${cards.length})</div>
              <div class="k-tray-cards" data-state="${escapeHtml(s)}"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Insertar cards en cada sección
    for (const s of KANBAN_TRAY_STATES) {
      const cardsContainer = tray.querySelector(`.k-tray-cards[data-state="${s}"]`);
      const cards = items.filter(t => t.status === s || (s === 'bloqueada' && t.blocked === true && t.status !== 'cancelada'));
      for (const c of cards) {
        cardsContainer.appendChild(renderCard(c));
      }
    }

    // Toggle handler
    const toggleBtn = tray.querySelector('.k-tray-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        state.kanbanTrayOpen = !isOpen;
        renderKanban();
      });
    }

    return tray;
  }

  // ─────────── V2.4: Drag & Drop ───────────

  function enableDragDrop() {
    if (typeof Sortable === 'undefined') {
      // SortableJS no cargó (CDN caído). El kanban sigue siendo lectura.
      return;
    }
    const columns = el.kanbanBoard.querySelectorAll('.k-column');
    columns.forEach(col => {
      const body = col.querySelector('.k-column-body');
      if (!body || body._sortable) return;  // ya inicializado
      body._sortable = new Sortable(body, {
        group: 'kanban',
        animation: 160,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onAdd: handleDragMove,
      });
    });
  }

  async function handleDragMove(evt) {
    const card = evt.item;
    const taskId = card.dataset.taskId;
    const fromCol = evt.from.closest('.k-column');
    const toCol = evt.to.closest('.k-column');
    const newStatus = toCol?.dataset.state;
    const oldStatus = fromCol?.dataset.state;

    if (!taskId || !newStatus || newStatus === oldStatus) return;

    // Optimistic UI: la tarjeta ya está en la nueva columna por SortableJS
    let body = {id: taskId, new_status: newStatus};
    // V3.4 fix: el estado bloqueado se llama "bloqueada" en config y en kanban (femenino).
    // Antes aqui figuraba 'bloqueado' (masculino) lo cual nunca matcheaba y era dead code.
    if (newStatus === 'bloqueada') {
      const reason = prompt(`Razón para bloquear ${taskId}:`, '');
      if (reason === null) {
        // canceló → rollback
        rollbackCard(card, evt.from, evt.oldIndex);
        return;
      }
      body.reason = reason || '(sin razón)';
    }

    try {
      const result = await api('/api/tasks/move', { method: 'POST', body });

      // Actualizar estado local sin re-render completo (preservar drag visual)
      const taskInState = (state.tasksData?.tasks || []).find(t => t.id === taskId);
      if (taskInState) Object.assign(taskInState, result.task);

      // Refrescar contadores y meta
      renderKanbanMeta();
      // Re-render para que las tarjetas dentro de la columna queden bien (deps, badges)
      renderKanban();

      // V3.4: si el backend no pudo sincronizar el frontmatter de stories.md,
      // avisar al usuario en lugar del toast verde de exito. Con el fix de
      // getMergedTasks (compara updated_at), la card SE QUEDA en la nueva
      // columna, pero conviene que el PM sepa que stories.md esta desfasado.
      if (result.frontmatter_synced === false) {
        showToast(`⚠ ${taskId}: ${oldStatus} → ${newStatus} (tasks.json OK; stories.md NO sincronizado — la story no se encontro en disco)`, 'warn');
      } else {
        showToast(`${taskId}: ${oldStatus} → ${newStatus}`, 'ok');
      }
    } catch (e) {
      // Rollback + flash de error
      rollbackCard(card, evt.from, evt.oldIndex);
      const data = e.data || {};
      if (e.status === 409 && data.error === 'invalid_transition') {
        showToast(`⚠ Transición no permitida: ${data.from} → ${data.to}. Permitidas desde ${data.from}: ${(data.allowed_from_current||[]).join(', ') || '(ninguna)'}`, 'error');
      } else if (e.status === 400 && data.error === 'invalid_state') {
        showToast(`⚠ Estado inválido: ${data.got}`, 'error');
      } else {
        showToast(`Error moviendo: ${e.message}`, 'error');
      }
    }
  }

  function rollbackCard(card, originalParent, originalIndex) {
    // Devolver la tarjeta a su columna original en su posición
    const siblings = originalParent.querySelectorAll('.k-card');
    if (originalIndex >= siblings.length) {
      originalParent.appendChild(card);
    } else {
      originalParent.insertBefore(card, siblings[originalIndex]);
    }
    card.classList.add('k-card--error');
    setTimeout(() => card.classList.remove('k-card--error'), 700);
  }

  function renderColumn(stateName, cards) {
    const col = document.createElement('div');
    col.className = 'k-column';
    col.dataset.state = stateName;

    const header = document.createElement('div');
    header.className = 'k-column-header';
    header.innerHTML = `
      <span class="k-column-name">${escapeHtml(STATE_LABELS[stateName] || stateName)}</span>
      <span class="k-column-count">${cards.length}</span>
    `;
    col.appendChild(header);

    const body = document.createElement('div');
    body.className = 'k-column-body';
    if (cards.length === 0) {
      body.innerHTML = '<div class="k-column-empty">vacío</div>';
    } else {
      for (const t of cards) body.appendChild(renderCard(t));
    }
    col.appendChild(body);

    return col;
  }

  // V3.2: mapeo de origin → pill visual
  const ORIGIN_PILLS = {
    design:  { icon: '📐', label: 'Diseño',     cls: 'origin-design' },
    story:   { icon: '✨', label: 'Story',      cls: 'origin-story' },
    inbox:   { icon: '💡', label: 'Inbox',      cls: 'origin-inbox' },
    define:  { icon: '🔬', label: 'Investigada', cls: 'origin-define' },
    hotfix:  { icon: '🔧', label: 'Hotfix',     cls: 'origin-hotfix' },
  };

  function renderOriginPill(origin) {
    if (!origin) return '';
    const o = ORIGIN_PILLS[origin];
    if (!o) return '';
    return `<span class="origin-pill ${o.cls}" title="Origen: ${o.label}">${o.icon} ${o.label}</span>`;
  }

  function renderCard(task) {
    const card = document.createElement('div');
    card.className = 'k-card';
    card.dataset.taskId = task.id;

    const score = priorityScore(task);
    const starsHtml = renderStarsInline(score);
    const deps = (task.depends_on || []).filter(Boolean);

    // V2.0: sub_status (⏸ pendiente / ✅ completado) — solo para columnas de agente
    const isAgentColumn = STATE_ARTIFACT[task.status] != null;
    const subStatusHtml = isAgentColumn
      ? renderSubStatus(task.sub_status)
      : '';

    // V2.0: botón "Copiar /comando" si estado es de agente y sub_status pendiente.
    // V2.0.3: si la tarea tiene prompt_override, incluirlo en el comando copiado.
    const baseCmd = STATE_COMMAND[task.status];
    const hasPrompt = !!(task.prompt_override && String(task.prompt_override).trim());
    const copyBtnHtml = (isAgentColumn && task.sub_status === 'pendiente' && baseCmd)
      ? `<button class="k-card-copy-cmd" type="button" title="Copiar comando ${hasPrompt ? '(incluye prompt custom)' : ''} al portapapeles">📋 ${escapeHtml(baseCmd)} ${escapeHtml(task.id)}${hasPrompt ? ' <span class="k-card-cmd-mark" title="Incluye tu prompt custom">📝</span>' : ''}</button>`
      : '';

    // V2.0: next_action sugerida (cuando ✅ completado)
    const nextActionHtml = (task.next_action)
      ? `<div class="k-card-next">⤷ ${escapeHtml(task.next_action)}</div>`
      : '';

    // V2.0.1: estrellas editables en card (misma UX que tabla Funcionalidades)
    const starsBlock = task.path
      ? `<span class="k-card-stars editable" data-edit="priority" title="Prioridad — click para editar">${starsHtml}</span>`
      : `<span class="k-card-stars" title="Prioridad">${starsHtml}</span>`;

    // V2.0.3: botón para editar el prompt_override. Indicador visual si ya tiene prompt.
    const promptBtnHtml = task.path
      ? `<button class="k-card-prompt-btn ${hasPrompt ? 'has-prompt' : ''}" type="button" title="${hasPrompt ? 'Prompt custom definido — click para editar' : 'Añadir prompt custom para este agente'}">📝 ${hasPrompt ? 'prompt' : '+ prompt'}</button>`
      : '';

    card.innerHTML = `
      <div class="k-card-header">
        <span class="k-card-id">${escapeHtml(task.id)}</span>
        ${starsBlock}
      </div>
      <div class="k-card-title">${escapeHtml(task.title || '(sin título)')}</div>
      ${(subStatusHtml || deps.length) ? `<div class="k-card-meta">
        ${subStatusHtml}
        ${deps.length ? `<span class="k-card-deps">↳ depende de ${escapeHtml(deps.join(', '))}</span>` : ''}
      </div>` : ''}
      ${nextActionHtml}
      <div class="k-card-actions">
        ${copyBtnHtml}
        ${promptBtnHtml}
      </div>
      ${task.blocked && task.blocked_reason ? `<div class="k-card-blocked">⛔ ${escapeHtml(task.blocked_reason)}</div>` : ''}
    `;

    // Click handlers: botón copiar, botón prompt, estrellas editables, resto abre panel
    card.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.k-card-copy-cmd');
      if (copyBtn) {
        e.stopPropagation();
        copyCommandForTask(task);
        return;
      }
      const promptBtn = e.target.closest('.k-card-prompt-btn');
      if (promptBtn) {
        e.stopPropagation();
        openPromptOverrideEditor(task, promptBtn);
        return;
      }
      const starsCell = e.target.closest('.k-card-stars.editable');
      if (starsCell) {
        e.stopPropagation();
        const story = { ...task, story_id: task.id, path: task.path };
        openInlineEditor(starsCell, story);
        return;
      }
      openTaskFiles(task);
    });

    return card;
  }

  // V2.0.3: copia al portapapeles el comando para una tarea, incluyendo prompt_override si existe.
  function copyCommandForTask(task) {
    const baseCmd = STATE_COMMAND[task.status];
    if (!baseCmd) return;
    const hasPrompt = !!(task.prompt_override && String(task.prompt_override).trim());
    let text = `${baseCmd} ${task.id}`;
    if (hasPrompt) {
      text += `\n\nContexto adicional del usuario (prompt_override del frontmatter):\n${String(task.prompt_override).trim()}`;
    }
    copyToClipboard(text);
  }

  // V2.0.3: abre un popover con textarea para editar el prompt_override de la tarea.
  function openPromptOverrideEditor(task, anchorBtn) {
    closePopover();
    const popover = document.createElement('div');
    popover.className = 'edit-popover edit-popover--floating edit-popover--prompt';
    popover.innerHTML = `
      <div class="edit-popover-title">Prompt custom para esta tarea (${escapeHtml(task.id)})</div>
      <textarea class="edit-popover-textarea"
        placeholder="Instrucciones específicas para el agente que trabajará esta tarea. Por ejemplo: «Enfoca el research en competidores europeos B2B de menos de 50 empleados». El agente leerá esto del frontmatter y lo respetará."
        rows="8">${escapeHtml(task.prompt_override || '')}</textarea>
      <div class="edit-popover-hint">⌘+Enter guarda · Esc cancela · Vacío limpia el campo</div>
      <div class="edit-popover-actions">
        <button class="btn btn--ghost" type="button" data-action="cancel">Cancelar</button>
        <button class="btn btn--primary" type="button" data-action="save">Guardar</button>
      </div>
    `;

    document.body.appendChild(popover);
    positionPopoverNearCell(popover, anchorBtn);
    _activePopover = { popover, cell: anchorBtn, story: { story_id: task.id, path: task.path }, editKind: 'prompt_override' };

    const textarea = popover.querySelector('textarea');
    const saveBtn = popover.querySelector('[data-action="save"]');
    const cancelBtn = popover.querySelector('[data-action="cancel"]');

    async function save() {
      const value = textarea.value.trim();
      const fields = { prompt_override: value || null };
      await commitInlineEdit(anchorBtn, { story_id: task.id, path: task.path }, fields);
    }

    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', closePopover);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePopover();
      }
    });

    setTimeout(() => {
      textarea.focus();
      document.addEventListener('click', _onDocClickClosePopover, true);
      document.addEventListener('keydown', _onEscClosePopover, true);
    }, 0);
  }

  // V2.0: renderiza el sub-indicador ⏸/✅ en la card
  function renderSubStatus(sub_status) {
    if (sub_status === 'completado') {
      return '<span class="k-card-substatus k-card-substatus--done" title="Completado: el agente terminó">✅ completado</span>';
    }
    if (sub_status === 'pendiente') {
      return '<span class="k-card-substatus k-card-substatus--pending" title="Pendiente: el agente no ha sido lanzado">⏸ pendiente</span>';
    }
    return '';
  }

  // V2.0: copiar al portapapeles + toast de confirmación
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(`📋 Copiado: ${text}`, 'ok'),
        () => showToast(`Error al copiar`, 'error')
      );
    } else {
      // Fallback: textarea + execCommand
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast(`📋 Copiado: ${text}`, 'ok'); }
      catch { showToast(`Error al copiar`, 'error'); }
      document.body.removeChild(ta);
    }
  }

  function openTaskFiles(task) {
    // V2.7: en lugar de cambiar de área, abrir el panel lateral de detalle.
    // Buscar la story enriquecida (con path) en storiesData
    const story = (state.storiesData?.stories || []).find(s => s.story_id === task.id);
    if (story) {
      openTaskDetailPanel(story);
      return;
    }
    // Si no está en storiesData, intentar con files de tasks.json
    if (Array.isArray(task.files) && task.files.length > 0) {
      // Construir un story-like mínimo
      openTaskDetailPanel({
        story_id: task.id,
        title: task.title,
        path: task.files[0].split('#')[0],
        priority: null, platform: null, category: null,
        status: task.status, criticality: task.criticality,
        agent_suggested: task.agent_suggested,
        depends_on: task.depends_on || [],
        blocked: !!task.blocked, blocked_reason: task.blocked_reason,
        parent_epic: null, created_at: null, updated_at: task.updated_at,
      });
      return;
    }
    showToast(`${task.id} no se encontró en docs/producto/features/. Ejecuta /pm sync para reindexar.`, 'error');
  }

  // ─────────── V2.7: Panel lateral de detalle ───────────

  let _detailFileContent = null;  // contenido raw del .md actual
  let _detailStoryId = null;       // id de la story que se está mostrando
  let _detailStory = null;         // V2.10: objeto completo de la story (para move)
  let _detailNavBack = null;       // V3.3: HU previa cuando se navegó a su EPIC (para "← Volver")

  // V3.3: breadcrumb bidireccional en el panel detalle (HU ↔ PRD de épica padre)
  function renderEpicBreadcrumb(story, isEpic) {
    if (!el.tdEpicLink) return;

    if (isEpic && _detailNavBack) {
      // Estamos en una EPIC tras haber venido de una HU → mostrar "← Volver"
      const back = _detailNavBack;
      el.tdEpicLink.innerHTML = `
        <button type="button" data-action="td-nav-back">← Volver a ${escapeHtml(back.story_id)}</button>
        <span style="margin-left:8px;color:var(--text3);">${escapeHtml(back.title || '')}</span>
      `;
      el.tdEpicLink.classList.remove('hidden');
      const btn = el.tdEpicLink.querySelector('[data-action="td-nav-back"]');
      if (btn) {
        btn.addEventListener('click', () => {
          const target = _detailNavBack;
          _detailNavBack = null;
          if (target) openTaskDetailPanel(target);
        });
      }
      return;
    }

    if (!isEpic && story && story.parent_epic) {
      // Estamos en una HU con épica padre → ofrecer salto al PRD
      el.tdEpicLink.innerHTML = `
        <button type="button" data-action="td-view-prd">📄 Ver PRD de la épica (${escapeHtml(story.parent_epic)})</button>
      `;
      el.tdEpicLink.classList.remove('hidden');
      const btn = el.tdEpicLink.querySelector('[data-action="td-view-prd"]');
      if (btn) {
        btn.addEventListener('click', () => {
          const merged = getMergedTasks();
          const epic = merged.find(s => s.story_id === story.parent_epic);
          if (!epic) {
            showToast(`No se encontró la épica ${story.parent_epic} en tasks.json`, 'error');
            return;
          }
          _detailNavBack = story;  // recordar la HU para "← Volver"
          openTaskDetailPanel(epic);
        });
      }
      return;
    }

    // Cualquier otro caso: ocultar
    el.tdEpicLink.classList.add('hidden');
    el.tdEpicLink.innerHTML = '';
  }

  async function openTaskDetailPanel(story) {
    _detailStoryId = story.story_id;
    _detailStory = story;
    closeMovePopover();
    el.tdId.textContent = story.story_id;
    el.tdTitle.textContent = story.title || '(sin título)';
    el.tdMetaGrid.innerHTML = renderTaskDetailMeta(story);
    renderTaskDetailPrompt(story);
    el.tdBody.innerHTML = '<div class="loading">Cargando contenido…</div>';
    el.tdBtnDocs.dataset.path = story.path || '';
    el.taskDetailPanel.classList.remove('hidden');

    const isEpic = String(story.story_id || '').startsWith('EPIC-');

    // V3.3: breadcrumb bidireccional (HU ↔ PRD de épica padre)
    renderEpicBreadcrumb(story, isEpic);

    if (isEpic) {
      // V3.3: panel de EPIC → carga PRD destacado + lista de HUs hijas
      await renderEpicDetailBody(story);
    } else if (story.path) {
      // HU normal: cargar el .md y extraer el body de la story
      try {
        const data = await api('/api/file?path=' + encodeURIComponent(story.path));
        _detailFileContent = data.content;
        const body = extractStoryBody(data.content, story.story_id);
        el.tdBody.innerHTML = renderMarkdown(body || '_(sin contenido en el .md más allá del frontmatter)_');
      } catch (e) {
        el.tdBody.innerHTML = `<div class="error-message">Error cargando ${escapeHtml(story.path)}:\n${escapeHtml(e.message)}</div>`;
      }
    } else {
      el.tdBody.innerHTML = '<p style="color:var(--text3)">Esta tarea no tiene un .md asociado.</p>';
    }
  }

  // V3.3: panel detalle de una EPIC — destaca el PRD + lista HUs hijas
  async function renderEpicDetailBody(epic) {
    // Derivar ruta del PRD desde feature_path o desde el path de stories.md
    let prdPath = null;
    if (epic.feature_path) {
      prdPath = epic.feature_path.replace(/\/$/, '') + '/prd.md';
    } else if (epic.feature) {
      prdPath = `docs/producto/features/${epic.feature}/prd.md`;
    } else if (epic.path) {
      // path suele ser .../stories.md → derivar carpeta
      prdPath = epic.path.replace(/\/stories\.md$/, '/prd.md');
    }

    // Buscar HUs hijas en storiesData
    const allStories = state.storiesData?.stories || [];
    const children = allStories.filter(s => s.parent_epic === epic.story_id);

    // Construir tabla compacta de HUs
    const childrenHtml = children.length > 0
      ? `
        <h3 style="margin-top:20px;font-size:13px;color:var(--cyan);">📋 User Stories (${children.length})</h3>
        <table class="epic-children-table" style="width:100%;font-size:11px;margin-top:8px;">
          <thead><tr style="color:var(--text3);font-weight:600;">
            <th style="text-align:left;padding:4px 8px 4px 0;">ID</th>
            <th style="text-align:left;padding:4px 8px;">Título</th>
            <th style="text-align:left;padding:4px 8px;">Estado</th>
          </tr></thead>
          <tbody>
            ${children.map(h => `
              <tr data-hu-id="${escapeHtml(h.story_id)}" data-hu-path="${escapeHtml(h.path || '')}" class="epic-child-row" style="cursor:pointer;">
                <td style="padding:4px 8px 4px 0;font-family:var(--mono);font-weight:500;">${escapeHtml(h.story_id)}</td>
                <td style="padding:4px 8px;">${escapeHtml(h.title || '(sin título)')}</td>
                <td style="padding:4px 8px;color:var(--text2);">${escapeHtml(h.status || '—')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `
      : '<p style="color:var(--text3);margin-top:16px;font-size:11px;">_(sin HUs hijas todavía — crea con /design-to-prd, /define o /story)_</p>';

    // Cargar PRD
    if (!prdPath) {
      el.tdBody.innerHTML = `
        <p style="color:var(--text3);">Esta épica no tiene <code>feature_path</code> en tasks.json. No se puede localizar el PRD.</p>
        ${childrenHtml}
      `;
      return;
    }

    let prdHtml;
    try {
      const data = await api('/api/file?path=' + encodeURIComponent(prdPath));
      _detailFileContent = data.content;
      prdHtml = `
        <div class="epic-prd-section">
          <div class="epic-prd-header">
            <h3 style="font-size:13px;color:var(--cyan);margin:0;">📄 Definición de la épica (PRD)</h3>
            <button class="btn btn--ghost" style="font-size:10px;padding:3px 8px;" onclick="document.querySelector('[data-path=\\'${prdPath.replace(/'/g, "\\'")}\\']')?.click()">Ver/Editar archivo</button>
          </div>
          <div class="epic-prd-content">${renderMarkdown(data.content)}</div>
        </div>
      `;
      el.tdBtnDocs.dataset.path = prdPath;
    } catch (e) {
      prdHtml = `
        <div class="epic-prd-section">
          <h3 style="font-size:13px;color:var(--cyan);margin:0;">📄 Definición de la épica (PRD)</h3>
          <p style="color:var(--orange);font-size:11px;margin-top:6px;">
            No existe <code>${escapeHtml(prdPath)}</code>.
            Si esta épica es legacy (pre-V3.3), ejecuta <code>/pm sync</code> o crea el archivo manualmente desde el template.
          </p>
        </div>
      `;
    }

    el.tdBody.innerHTML = prdHtml + childrenHtml;

    // Wire: click en HU hija abre su panel detalle
    el.tdBody.querySelectorAll('.epic-child-row').forEach(row => {
      row.addEventListener('click', () => {
        const huId = row.dataset.huId;
        const huStory = allStories.find(s => s.story_id === huId);
        if (huStory) openTaskDetailPanel(huStory);
      });
    });
  }

  function closeTaskDetailPanel() {
    el.taskDetailPanel.classList.add('hidden');
    closeMovePopover();
    _detailFileContent = null;
    _detailStoryId = null;
    _detailStory = null;
    _detailNavBack = null;  // V3.3: limpiar breadcrumb al cerrar
    if (el.tdEpicLink) {
      el.tdEpicLink.classList.add('hidden');
      el.tdEpicLink.innerHTML = '';
    }
  }

  // ─────────── V2.10: Mover story a otra carpeta ───────────

  function openMovePopover() {
    if (!_detailStory) return;
    const features = Array.from(new Set((state.storiesData?.stories || [])
      .map(s => s.feature).filter(Boolean))).sort();
    const currentFeature = _detailStory.feature;

    const optsHtml = [
      '<div class="edit-popover-title">Mover a carpeta…</div>',
      '<div class="edit-popover-options">',
      ...features.filter(f => f !== currentFeature).map(f =>
        `<button class="edit-popover-option" data-target-feature="${escapeHtml(f)}">📁 ${escapeHtml(f)}</button>`
      ),
      '<button class="edit-popover-option" data-target-feature="__new__">+ Nueva carpeta…</button>',
      '</div>',
      '<input type="text" class="edit-popover-input" id="td-move-new-input" placeholder="nombre de la nueva carpeta" style="display:none">',
    ].join('');
    el.tdMovePopover.innerHTML = optsHtml;
    el.tdMovePopover.classList.remove('hidden');

    // Listeners de los botones
    el.tdMovePopover.querySelectorAll('.edit-popover-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.targetFeature;
        if (target === '__new__') {
          const input = document.getElementById('td-move-new-input');
          input.style.display = '';
          input.focus();
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const name = input.value.trim();
              if (name) commitMove(name);
            }
          });
        } else {
          commitMove(target);
        }
      });
    });

    // Click fuera cierra
    setTimeout(() => {
      document.addEventListener('click', _onDocClickCloseMove, true);
    }, 0);
  }

  function _onDocClickCloseMove(e) {
    if (!el.tdMovePopover || el.tdMovePopover.classList.contains('hidden')) return;
    if (el.tdMovePopover.contains(e.target)) return;
    if (el.tdBtnMove && el.tdBtnMove.contains(e.target)) return;
    closeMovePopover();
  }

  function closeMovePopover() {
    if (el.tdMovePopover) el.tdMovePopover.classList.add('hidden');
    document.removeEventListener('click', _onDocClickCloseMove, true);
  }

  async function commitMove(newFeature) {
    if (!_detailStory) return;
    closeMovePopover();
    try {
      const result = await api('/api/story/move', {
        method: 'POST',
        body: {
          path: _detailStory.path,
          story_id: _detailStory.story_id,
          new_feature: newFeature,
        },
      });
      if (result.moved === false) {
        showToast(`${_detailStory.story_id} ya está en ${newFeature}`, 'ok');
        return;
      }
      showToast(`📁 ${_detailStory.story_id} movida a ${newFeature}`, 'ok');
      // Refresh stories y reabrir el panel con el nuevo path
      await loadStories();
      const updated = (state.storiesData?.stories || []).find(s => s.story_id === _detailStory.story_id);
      if (updated) openTaskDetailPanel(updated);
      // Re-render vistas activas
      const sub = state.areaSubTab[state.activeArea];
      if (state.activeArea === 'producto') {
        if (sub === 'funcionalidades') renderFuncionalidades();
        else if (sub === 'kanban') { renderKanban(); renderKanbanMeta(); }
        else if (sub === 'resumen') renderResumen();
      }
    } catch (e) {
      const data = e.data || {};
      if (e.status === 400 && data.error === 'invalid_feature_name') {
        showToast(`⚠ ${data.hint}`, 'error');
      } else {
        showToast(`Error moviendo: ${e.message}`, 'error');
      }
    }
  }

  function renderTaskDetailMeta(s) {
    // V2.0.3: cada item puede marcarse como editable (`edit: 'priority'` etc.) → click
    // abre el mismo popover inline que en la tabla Funcionalidades.
    const items = [
      { label: 'Status',      value: s.status, edit: 'status' },
      { label: 'Priority',    value: s.priority != null ? '★'.repeat(s.priority) + '☆'.repeat(5 - s.priority) : null, css: 'stars', edit: 'priority' },
      { label: 'Criticality', value: s.criticality, edit: 'criticality' },
      { label: 'Platform',    value: s.platform, edit: 'platform' },
      { label: 'Category',    value: s.category, edit: 'category' },
      { label: 'Parent epic', value: s.parent_epic },
      { label: 'Depends on',  value: (s.depends_on || []).join(', ') || null },
      { label: 'Blocked',     value: s.blocked ? (s.blocked_reason || 'sí') : null },
      { label: 'Created',     value: s.created_at },
      { label: 'Updated',     value: s.updated_at },
      { label: 'Feature',     value: s.feature },
    ];
    return items.map(it => {
      const empty = !it.value;
      const cssClass = ['td-meta-value', empty ? 'empty' : '', it.css || ''].join(' ').trim();
      const display = empty ? '—' : escapeHtml(String(it.value));
      const editAttrs = it.edit && s.path
        ? ` class="td-meta-item editable" data-edit="${escapeHtml(it.edit)}" title="Click para editar"`
        : ` class="td-meta-item"`;
      return `
        <div${editAttrs}>
          <span class="td-meta-label">${escapeHtml(it.label)}${it.edit && s.path ? ' <span class="td-edit-hint">✎</span>' : ''}</span>
          <span class="${cssClass}">${display}</span>
        </div>
      `;
    }).join('');
  }

  // V2.0.3: bloque dedicado al prompt_override en el panel detalle.
  function renderTaskDetailPrompt(s) {
    if (!el.tdPromptSection) return;
    if (!s.path) {
      el.tdPromptSection.innerHTML = '';
      return;
    }
    const has = !!(s.prompt_override && String(s.prompt_override).trim());
    const preview = has
      ? `<pre class="td-prompt-text">${escapeHtml(String(s.prompt_override).trim())}</pre>`
      : `<p class="td-prompt-empty">Sin prompt custom. El agente trabajará esta tarea con el contexto por defecto.</p>`;
    el.tdPromptSection.innerHTML = `
      <div class="td-prompt-header">
        <span class="td-prompt-title">📝 Prompt custom para el agente</span>
        <button type="button" class="btn btn--ghost btn--sm" data-action="td-edit-prompt">
          ${has ? 'Editar' : '+ Añadir prompt'}
        </button>
      </div>
      ${preview}
      <p class="td-prompt-hint">El agente que trabaje esta tarea respetará estas instrucciones (regla universal <code>rul-prompt-override</code>).</p>
    `;
    const btn = el.tdPromptSection.querySelector('[data-action="td-edit-prompt"]');
    if (btn) {
      btn.addEventListener('click', () => openPromptOverrideEditor(
        { id: s.story_id, path: s.path, prompt_override: s.prompt_override || null, status: s.status },
        btn
      ));
    }
  }

  // Extrae el cuerpo de la story (lo que está debajo del bloque ```yaml ... ``` y antes del siguiente H2)
  function extractStoryBody(text, storyId) {
    const headerRe = new RegExp(`^##\\s+${storyId}\\b[^\\n]*$`, 'm');
    const m = headerRe.exec(text);
    if (!m) return '';
    let body = text.slice(m.index + m[0].length);
    // Cortar al siguiente ## (próxima story)
    const next = body.search(/^##\s+(?:HU|EPIC)-/m);
    if (next > -1) body = body.slice(0, next);
    // Quitar el bloque ```yaml ... ``` del inicio
    body = body.replace(/^\s*```ya?ml[\s\S]*?```\s*/, '');
    return body.trim();
  }

  function wireTaskDetailListeners() {
    // Cerradores
    document.querySelectorAll('[data-close-detail]').forEach(el => {
      el.addEventListener('click', closeTaskDetailPanel);
    });
    // V2.0.3: click en un campo editable del meta-grid abre el popover inline
    if (el.tdMetaGrid) {
      el.tdMetaGrid.addEventListener('click', (e) => {
        const item = e.target.closest('.td-meta-item.editable');
        if (!item || !_detailStory || !_detailStory.path) return;
        e.stopPropagation();
        openInlineEditor(item, _detailStory);
      });
    }
    // Botón "Ver/editar en Docs"
    el.tdBtnDocs.addEventListener('click', () => {
      const path = el.tdBtnDocs.dataset.path;
      closeTaskDetailPanel();
      if (path) {
        setActiveArea('producto');
        setSubTab('producto', 'docs');
        openFile(path);
      }
    });
    // V2.10: Botón "Mover a otra carpeta"
    if (el.tdBtnMove) {
      el.tdBtnMove.addEventListener('click', (e) => {
        e.stopPropagation();
        if (el.tdMovePopover && !el.tdMovePopover.classList.contains('hidden')) {
          closeMovePopover();
        } else {
          openMovePopover();
        }
      });
    }
    // Esc cierra
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !el.taskDetailPanel.classList.contains('hidden')) {
        closeTaskDetailPanel();
      }
    });
  }

  function renderKanbanMeta() {
    if (!state.tasksData) return;
    const tasks = state.tasksData.tasks || [];

    // Contadores por estado
    const counts = {};
    for (const t of tasks) {
      const s = t.blocked ? 'bloqueado' : (t.status || '?');
      counts[s] = (counts[s] || 0) + 1;
    }
    const order = [...KANBAN_STATES, 'bloqueado'];
    el.kanbanCounts.innerHTML = order
      .filter(s => counts[s])
      .map(s => `<span class="kc-item">${escapeHtml(STATE_LABELS[s] || s)}: <b>${counts[s]}</b></span>`)
      .join('');

    // Last sync
    if (state.lastSyncMs) {
      const ago = Math.round((Date.now() - state.lastSyncMs) / 1000);
      el.kanbanLastSync.textContent = `Sync hace ${ago}s · ${tasks.length} tareas totales`;
    }

    // Drift warnings
    const drift = (state.tasksData.drift_warnings || []);
    if (drift.length === 0) {
      el.kanbanDrift.classList.add('hidden');
    } else {
      el.kanbanDrift.classList.remove('hidden');
      el.kanbanDrift.innerHTML = `<b>⚠ ${drift.length} drift warning${drift.length > 1 ? 's' : ''}</b><br>` +
        drift.slice(0, 3).map(d => `<small>${escapeHtml(d.task_id)}: ${escapeHtml(d.issue)}</small>`).join('<br>');
    }
  }

  // ─────────── V2.6: Tree por área ───────────

  // Mapping: qué carpetas filtra cada área (hardcoded para las áreas core)
  const AREA_TREE_PATHS = {
    general: ['docs/general'],
    producto: ['docs/producto'],
    _system: ['pm', 'memory'],
  };

  // V3.5: para áreas dinámicas (newsletter, marketing, ...) los paths vienen
  // del config (pm/config.json > areas.<id>.paths). Esta función centraliza
  // la resolución para no duplicar lógica.
  function getPathsForArea(areaId) {
    if (AREA_TREE_PATHS[areaId]) return AREA_TREE_PATHS[areaId];
    const cfg = state.config?.areas?.[areaId];
    return (cfg && cfg.paths) || [`docs/${areaId}`];
  }

  function renderTreeForArea(areaId) {
    const container = document.getElementById('tree-' + areaId);
    if (!container) return;
    if (!state.tree) {
      container.innerHTML = '<div class="loading">Cargando árbol…</div>';
      return;
    }
    container.innerHTML = '';
    const wantedPaths = getPathsForArea(areaId);
    // El árbol actual viene en state.tree.areas — buscamos los nodos que correspondan
    // a las paths configuradas (escaneamos todas las áreas + _system del bridge).
    const allChildren = [];
    for (const a of (state.tree.areas || [])) {
      for (const c of (a.children || [])) {
        if (wantedPaths.some(p => c.path === p || c.path.startsWith(p + '/'))) {
          allChildren.push(c);
        }
      }
    }
    if (allChildren.length === 0) {
      container.innerHTML = '<div class="loading">Vacío.</div>';
      return;
    }
    for (const node of allChildren) {
      container.appendChild(renderNode(node, 0));
    }
  }

  // Documentos unificados: TODAS las áreas en un explorador (sin silos) — para el Cerebro
  function renderAllDocs() {
    const container = document.getElementById('tree-cerebro');
    if (!container) return;
    if (!state.tree) { container.innerHTML = '<div class="loading">Cargando…</div>'; return; }
    container.innerHTML = '';
    let any = false;
    for (const a of (state.tree.areas || [])) {
      const kids = a.children || [];
      if (!kids.length) continue;
      any = true;
      const header = document.createElement('div');
      header.className = 'alldocs-area-title';
      header.textContent = a.label || a.id;
      container.appendChild(header);
      for (const node of kids) container.appendChild(renderNode(node, 0));
    }
    if (!any) container.innerHTML = '<div class="loading">Sin documentos todavía.</div>';
  }

  // ── Captura al cerebro: escribe en raw/ (luego /wiki ingestar lo categoriza con IA) ──
  function slugify(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'nota';
  }
  function openCaptureModal() {
    const m = document.getElementById('capture-modal'); if (!m) return;
    const f = m.querySelector('form'); f.reset();
    m.classList.remove('hidden');
    setTimeout(() => f.elements.title && f.elements.title.focus(), 50);
  }
  function closeCaptureModal() {
    const m = document.getElementById('capture-modal'); if (m) m.classList.add('hidden');
  }
  async function submitCapture(e) {
    e.preventDefault();
    const f = e.target, fd = new FormData(f);
    const tipo = fd.get('tipo') || 'notas';
    const title = (fd.get('title') || '').trim();
    const content = (fd.get('content') || '').trim();
    const tags = (fd.get('tags') || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!title || !content) return;
    const today = new Date().toISOString().slice(0, 10);
    const path = `raw/${tipo}/${today}-${slugify(title)}.md`;
    const typeMap = { notas: 'note', articulos: 'article', transcripciones: 'transcript' };
    const fm = ['---', `type: ${typeMap[tipo] || 'note'}`, `date: ${today}`,
      `tags: [${tags.join(', ')}]`, 'ingested: false', '---', '', `# ${title}`, '', content, ''].join('\n');
    const btn = f.querySelector('button[type="submit"]'); btn.disabled = true;
    try {
      await api('/api/file', { method: 'POST', body: { path, content: fm } });
      closeCaptureModal();
      showToast(`🧠 Guardado en ${path}. Ejecuta /wiki ingestar ${path} en Claude para categorizarlo en el cerebro.`, 'ok');
      await loadTree();
      if (state.activeArea === 'cerebro') renderAllDocs();
    } catch (err) {
      showToast(`Error al guardar: ${err.message || err}`, 'error');
    } finally { btn.disabled = false; }
  }
  function wireCaptureListeners() {
    const btn = document.getElementById('btn-add-brain');
    if (btn) btn.addEventListener('click', openCaptureModal);
    const m = document.getElementById('capture-modal');
    if (m) {
      m.querySelectorAll('[data-close-capture]').forEach(el => el.addEventListener('click', closeCaptureModal));
      const f = m.querySelector('form'); if (f) f.addEventListener('submit', submitCapture);
    }
  }
  wireCaptureListeners();

  // ─────────── V2.6: General Dashboard ───────────

  function renderGeneralDashboard() {
    // V2.7.1: misma fuente unificada
    const stories = getMergedTasks();

    // Cards globales
    const totalStories = stories.length;
    // V3.4: contar areas activas/inactivas desde pm/config.json en lugar de hardcoded.
    // Excluye 'general' (panel cross-area) y '_system' (interno del PM).
    const allAreas = state.config?.areas || {};
    const userAreas = Object.entries(allAreas).filter(([k]) => k !== 'general' && k !== '_system');
    const activeAreas = userAreas.filter(([_, v]) => v.active === true).length;
    const inactiveAreas = userAreas.filter(([_, v]) => v.active === false).length;
    const drift = (state.tasksData?.drift_warnings || []).length;
    el.generalCards.innerHTML = `
      <div class="r-card r-card--backlog"><div class="r-card-num">${totalStories}</div><div class="r-card-label">Stories totales</div></div>
      <div class="r-card r-card--hecho"><div class="r-card-num">${activeAreas}</div><div class="r-card-label">Áreas activas</div></div>
      <div class="r-card r-card--curso"><div class="r-card-num">${inactiveAreas}</div><div class="r-card-label">Áreas inactivas</div></div>
      <div class="r-card r-card--bloqueado"><div class="r-card-num">${drift}</div><div class="r-card-label">Drift activo</div></div>
    `;

    // Lista de áreas
    const areas = [
      { id: 'producto', label: 'Producto', active: true, count: stories.length },
      { id: 'marketing', label: 'Marketing', active: false },
      { id: 'rrhh', label: 'RRHH', active: false },
      { id: 'operaciones', label: 'Operaciones', active: false },
    ];
    el.generalAreas.innerHTML = areas.map(a => `
      <div class="r-list-row" data-goto-area="${a.id}">
        <span class="r-id">${a.active ? '▶' : '░'}</span>
        <span class="r-title">${escapeHtml(a.label)}</span>
        <span class="r-stars">${a.count != null ? a.count + ' stories' : ''}</span>
        <span class="r-meta">${a.active ? 'activa' : 'sin activar'}</span>
      </div>
    `).join('');

    // Documentos clave
    const keyDocs = [
      { path: 'docs/general/PROJECT_KNOWLEDGE.md', label: 'PROJECT_KNOWLEDGE.md', desc: 'Knowledge base' },
      { path: 'docs/general/project-registry.md', label: 'project-registry.md', desc: 'Inventario técnico' },
      { path: '.claude/CLAUDE.md', label: 'CLAUDE.md', desc: 'Config del proyecto' },
    ];
    el.generalKeydocs.innerHTML = keyDocs.map(d => `
      <div class="r-list-row" data-path="${escapeHtml(d.path)}" data-area-target="general">
        <span class="r-id">📄</span>
        <span class="r-title">${escapeHtml(d.label)}</span>
        <span class="r-stars"></span>
        <span class="r-meta">${escapeHtml(d.desc)}</span>
      </div>
    `).join('');

    // Últimas modificaciones (top 5 cross-área)
    const recent = stories
      .filter(s => s.updated_at)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, 5);
    el.generalRecent.innerHTML = recent.length === 0
      ? '<div class="resumen-list-empty">Sin actividad registrada (los agentes aún no han escrito updated_at).</div>'
      : recent.map(s => `
        <div class="r-list-row" data-path="${escapeHtml(s.path)}" data-area-target="producto">
          <span class="r-id">${escapeHtml(s.story_id)}</span>
          <span class="r-title">${escapeHtml(s.title || '(sin título)')}</span>
          <span class="r-stars">${escapeHtml(s.status || '')}</span>
          <span class="r-meta">${escapeHtml(formatRelative(s.updated_at))}</span>
        </div>
      `).join('');

    // Badge en sidebar
    if (el.badgeProducto) el.badgeProducto.textContent = totalStories || '';
  }

  // ─────────── V2.6: PM Sistema (Estado) ───────────

  function renderSystemEstado() {
    const tasks = (state.tasksData?.tasks) || [];
    const drift = (state.tasksData?.drift_warnings) || [];
    const lastSync = state.tasksData?.last_indexed_at || '—';
    const lastEvent = '—'; // V2.7: leer de events.jsonl

    el.systemStateCards.innerHTML = `
      <div class="r-card r-card--backlog"><div class="r-card-num">${tasks.length}</div><div class="r-card-label">Tareas indexadas</div></div>
      <div class="r-card r-card--bloqueado"><div class="r-card-num">${drift.length}</div><div class="r-card-label">Drift warnings</div></div>
      <div class="r-card r-card--curso"><div class="r-card-num" style="font-size:14px;font-family:var(--mono)">${escapeHtml(String(lastSync).slice(0, 19))}</div><div class="r-card-label">Last sync</div></div>
      <div class="r-card r-card--hecho"><div class="r-card-num" style="font-size:14px">${escapeHtml(lastEvent)}</div><div class="r-card-label">Último evento</div></div>
    `;

    // Quick links a archivos del PM
    const files = [
      { path: 'pm/tasks.json', label: 'pm/tasks.json', desc: 'índice maestro' },
      { path: 'pm/config.json', label: 'pm/config.json', desc: 'áreas, estados, transiciones' },
      { path: 'pm/events.jsonl', label: 'pm/events.jsonl', desc: 'activity log' },
      { path: 'pm/build-state.md', label: 'pm/build-state.md', desc: 'tracking durante /build' },
      { path: 'memory/MEMORY.md', label: 'memory/MEMORY.md', desc: 'working memory del code-reviewer' },
    ];
    el.systemFilesQuicklinks.innerHTML = files.map(f => `
      <div class="r-list-row" data-path="${escapeHtml(f.path)}" data-area-target="_system">
        <span class="r-id">⚙</span>
        <span class="r-title">${escapeHtml(f.label)}</span>
        <span class="r-stars"></span>
        <span class="r-meta">${escapeHtml(f.desc)}</span>
      </div>
    `).join('');

    // Drift list
    el.systemDrift.innerHTML = drift.length === 0
      ? '<div class="resumen-list-empty">Sin drift detectado.</div>'
      : drift.map(d => `
        <div class="r-list-row">
          <span class="r-id">⚠</span>
          <span class="r-title">${escapeHtml(d.task_id)}: ${escapeHtml(d.issue)}</span>
          <span class="r-stars"></span>
          <span class="r-meta">${escapeHtml(d.detected_at || '')}</span>
        </div>
      `).join('');
  }

  // ─────────── V2.6: Áreas inactivas ───────────

  function renderInactiveArea(areaId) {
    const pane = document.querySelector(`.inactive-area-pane[data-area-id="${areaId}"]`);
    if (!pane) return;
    pane.innerHTML = `
      <h3>⚠ Esta área está preparada pero no activada</h3>
      <p style="color:var(--text2)">Para activarla necesitas:</p>
      <ol>
        <li>Editar <code>pm/config.json</code> y cambiar <code>areas.${escapeHtml(areaId)}.active</code> a <code>true</code></li>
        <li>Crear el agente PM correspondiente: <code>age-spe-pm-${escapeHtml(areaId)}</code> con sus propios estados y transiciones</li>
        <li>Recargar el dashboard</li>
      </ol>
      <p style="color:var(--text3);font-size:12px;margin-top:16px">
        El sistema PM x10 está diseñado para que cada área tenga su propio PM con su modelo de estados. Por eso Marketing tendrá estados como "borrador", "en revisión", "publicado" en lugar de los del pipeline de software.
      </p>
    `;
  }

  // ─────────────────────────────────────────────────────────────────
  // Areas dinamicas (no hardcoded): inyecta botones de sidebar y
  // sections en main panel para cada area declarada en pm/config.json
  // que no sea general/producto/_system. Idempotente: limpia y re-renderiza.
  // ─────────────────────────────────────────────────────────────────
  const HARDCODED_AREAS = new Set(['general', 'producto', '_system']);

  function renderDynamicAreas(cfg) {
    const areas = cfg?.areas || {};
    const sidebarSlot = document.getElementById('dynamic-areas-slot');
    const viewsSlot = document.getElementById('dynamic-area-views-slot');
    if (!sidebarSlot || !viewsSlot) return;

    // Limpiar lo anterior (re-render idempotente)
    sidebarSlot.innerHTML = '';
    viewsSlot.innerHTML = '';

    // Orden: por la posicion en el config (Object.keys preserva orden en JS moderno)
    for (const areaId of Object.keys(areas)) {
      if (HARDCODED_AREAS.has(areaId)) continue;
      const area = areas[areaId];
      const label = area.label || areaId.charAt(0).toUpperCase() + areaId.slice(1);
      const isActive = area.active === true;

      // Boton sidebar
      const btn = document.createElement('button');
      btn.className = 'area-row' + (isActive ? '' : ' area-row--inactive');
      btn.dataset.area = areaId;
      btn.innerHTML = isActive
        ? `<span class="area-icon">▶</span><span class="area-name">${escapeHtml(label)}</span>`
        : `<span class="area-icon">░</span><span class="area-name">${escapeHtml(label)}</span><span class="area-status">sin activar</span>`;
      sidebarSlot.appendChild(btn);

      // Section view
      const section = document.createElement('section');
      section.className = 'area-view hidden';
      section.dataset.areaView = areaId;
      if (isActive) {
        // V3.5: si el area declara states + transitions, sub-tabs (Kanban, Docs) + containers.
        // Si no, solo browser de docs simple.
        const hasKanban = Array.isArray(area.states) && area.states.length > 0;
        if (hasKanban) {
          // Sub-tab activa por defecto: kanban
          if (!state.areaSubTab[areaId]) state.areaSubTab[areaId] = 'kanban';
          section.innerHTML = `
            <div class="area-header">
              <div>
                <h1 class="area-title">${escapeHtml(label)}</h1>
                <p class="area-subtitle">Área activa con pipeline propio. Estados desde <code>pm/config.json &gt; areas.${escapeHtml(areaId)}</code>.</p>
              </div>
            </div>
            <div class="area-subtabs">
              <button class="atab ${state.areaSubTab[areaId] === 'kanban' ? 'active' : ''}" data-area="${escapeHtml(areaId)}" data-subtab="kanban">Kanban</button>
              <button class="atab ${state.areaSubTab[areaId] === 'docs' ? 'active' : ''}" data-area="${escapeHtml(areaId)}" data-subtab="docs">Docs</button>
            </div>
            <div class="atab-content ${state.areaSubTab[areaId] === 'kanban' ? '' : 'hidden'}" data-area="${escapeHtml(areaId)}" data-subtab="kanban">
              <div class="kanban-board area-kanban-board" data-area="${escapeHtml(areaId)}"></div>
            </div>
            <div class="atab-content ${state.areaSubTab[areaId] === 'docs' ? '' : 'hidden'}" data-area="${escapeHtml(areaId)}" data-subtab="docs">
              <div class="docs-toolbar">
                <button class="btn btn--primary" data-new-doc="${escapeHtml((area.paths && area.paths[0]) || 'docs/' + areaId)}" type="button">+ Nuevo</button>
                <span class="docs-toolbar-hint">Crear archivo .md o carpeta dentro de <code>${escapeHtml((area.paths && area.paths[0]) || 'docs/' + areaId)}/</code></span>
              </div>
              <div class="area-docs-layout">
                <div class="area-docs-tree" id="tree-${escapeHtml(areaId)}"></div>
                <div class="area-docs-viewer" data-viewer-slot="${escapeHtml(areaId)}"></div>
              </div>
            </div>
          `;
        } else {
          section.innerHTML = `
            <div class="area-header">
              <div>
                <h1 class="area-title">${escapeHtml(label)}</h1>
                <p class="area-subtitle">Área activa. Contenido en <code>${escapeHtml((area.paths && area.paths[0]) || 'docs/' + areaId)}</code>.</p>
              </div>
            </div>
            <div class="dynamic-area-pane" data-area-id="${escapeHtml(areaId)}"></div>
          `;
        }
      } else {
        section.innerHTML = `
          <div class="area-header"><div><h1 class="area-title">${escapeHtml(label)}</h1><p class="area-subtitle">Área preparada pero no activada.</p></div></div>
          <div class="inactive-area-pane" data-area-id="${escapeHtml(areaId)}"></div>
        `;
      }
      viewsSlot.appendChild(section);
    }
  }

  // Renderiza una vista para un area dinamica activa.
  // - Si el area tiene `states` declarados en pm/config.json: renderiza kanban con sub-tabs.
  // - Si no: vista de browser de docs simple.
  async function renderDynamicActiveArea(areaId, areaCfg) {
    const hasKanban = Array.isArray(areaCfg.states) && areaCfg.states.length > 0;
    if (hasKanban) {
      // Sub-tab activa actual (default kanban)
      const sub = state.areaSubTab[areaId] || 'kanban';
      if (sub === 'kanban') {
        await renderAreaKanban(areaId, areaCfg);
      } else {
        await renderAreaDocsBrowser(areaId, areaCfg);
      }
    } else {
      await renderAreaDocsBrowser(areaId, areaCfg);
    }
  }

  // Browser de docs para areas dinamicas activas. Reusa renderTreeForArea() del
  // mismo dashboard de producto/general/_system (mismo tree + viewer + mismo CSS).
  // V3.5: para que esto funcione, el HTML del sub-tab docs incluye #tree-<areaId>
  // y .area-docs-viewer[data-viewer-slot="<areaId>"] (igual estructura que producto).
  async function renderAreaDocsBrowser(areaId, areaCfg) {
    // Asegurar que state.tree esta cargado (init() ya lo carga, pero en caso de necesidad)
    if (!state.tree) {
      try {
        state.tree = await api('/api/tree');
      } catch (e) {
        const container = document.getElementById('tree-' + areaId);
        if (container) container.innerHTML = `<div class="error-message">Error: ${escapeHtml(e.message)}</div>`;
        return;
      }
    }
    renderTreeForArea(areaId);
    // Montar el shared viewer en el slot de esta area (mismo patron que producto)
    if (typeof mountSharedViewerInto === 'function') {
      mountSharedViewerInto(areaId);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // V3.5 — KANBAN GENERICO POR AREA (newsletter, marketing, etc.)
  // Independiente del renderKanban() de producto (que es mas rico: merge
  // stories.md, sub_status, filters, polling, etc.). Esta version es la
  // base minima viable para que otras areas tengan su pipeline.
  // ─────────────────────────────────────────────────────────────────
  async function renderAreaKanban(areaId, areaCfg) {
    const board = document.querySelector(`.area-kanban-board[data-area="${areaId}"]`);
    if (!board) return;
    board.innerHTML = '<div class="loading">Cargando tasks...</div>';

    let data;
    try {
      data = await api(`/api/tasks?area=${encodeURIComponent(areaId)}`);
    } catch (e) {
      board.innerHTML = `<div class="error-message" style="margin:20px">Error cargando tasks del area ${escapeHtml(areaId)}: ${escapeHtml(e.message)}</div>`;
      return;
    }

    // Cache (uso futuro)
    state.tasksDataByArea = state.tasksDataByArea || {};
    state.tasksDataByArea[areaId] = data;

    if (data._missing) {
      board.innerHTML = `
        <div class="error-message" style="margin:20px">
          No se encontro <code>pm/tasks-${escapeHtml(areaId)}.json</code> en este proyecto.
          <br><br>
          Crea tareas para esta area (o el deploy.sh del paquete lo materializa). Estados declarados en
          <code>pm/config.json &gt; areas.${escapeHtml(areaId)}.states</code>: ${(areaCfg.states || []).join(', ')}.
        </div>`;
      return;
    }

    const tasks = data.tasks || [];
    const states = areaCfg.states || [];
    const stateMeta = areaCfg.state_meta || {};

    // Render columnas
    board.innerHTML = '';
    for (const st of states) {
      const meta = stateMeta[st] || {};
      const stTasks = tasks.filter(t => t.status === st);
      const col = document.createElement('div');
      col.className = 'k-column';
      col.dataset.state = st;
      col.innerHTML = `
        <div class="k-column-header">
          <span class="k-column-name">${escapeHtml(meta.label || st)}</span>
          <span class="k-column-count">${stTasks.length}</span>
        </div>
        <div class="k-column-body"></div>
      `;
      const body = col.querySelector('.k-column-body');
      if (stTasks.length === 0) {
        body.innerHTML = '<div class="k-column-empty">vacio</div>';
      } else {
        for (const t of stTasks) {
          body.appendChild(renderSimpleCard(t));
        }
      }
      board.appendChild(col);
    }

    enableAreaDragDrop(areaId, board);
  }

  // Card simple para area kanban genérica (sin sub_status, sin deps, sin prompt_override).
  // El area producto sigue usando renderCard() que es mas rica.
  function renderSimpleCard(task) {
    const card = document.createElement('div');
    card.className = 'k-card';
    card.dataset.taskId = task.id;
    card.innerHTML = `
      <div class="k-card-header">
        <span class="k-card-id">${escapeHtml(task.id || '')}</span>
      </div>
      <div class="k-card-title">${escapeHtml(task.title || '(sin titulo)')}</div>
    `;
    return card;
  }

  function enableAreaDragDrop(areaId, board) {
    if (typeof Sortable === 'undefined') return;
    const cols = board.querySelectorAll('.k-column');
    cols.forEach(col => {
      const body = col.querySelector('.k-column-body');
      if (!body || body._sortable) return;
      body._sortable = new Sortable(body, {
        group: `kanban-${areaId}`,
        animation: 160,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onAdd: (evt) => handleAreaDragMove(areaId, evt),
      });
    });
  }

  async function handleAreaDragMove(areaId, evt) {
    const card = evt.item;
    const taskId = card.dataset.taskId;
    const fromCol = evt.from.closest('.k-column');
    const toCol = evt.to.closest('.k-column');
    const newStatus = toCol?.dataset.state;
    const oldStatus = fromCol?.dataset.state;
    if (!taskId || !newStatus || newStatus === oldStatus) return;

    try {
      const result = await api('/api/tasks/move', {
        method: 'POST',
        body: { id: taskId, new_status: newStatus, area: areaId },
      });
      // Refrescar el kanban del area (re-fetch para tener counts correctos)
      const cfg = state.config?.areas?.[areaId] || {};
      await renderAreaKanban(areaId, cfg);

      if (result.frontmatter_synced === false) {
        showToast(`⚠ ${taskId}: ${oldStatus} → ${newStatus} (tasks-${areaId}.json OK; no se encontro stories.md asociado — los tasks del area '${areaId}' no necesitan stories.md, esto es OK)`, 'warn');
      } else {
        showToast(`${taskId}: ${oldStatus} → ${newStatus}`, 'ok');
      }
    } catch (e) {
      rollbackCard(card, evt.from, evt.oldIndex);
      const data = e.data || {};
      if (e.status === 409 && data.error === 'invalid_transition') {
        showToast(`⚠ Transicion no permitida: ${data.from} → ${data.to}. Permitidas desde ${data.from}: ${(data.allowed_from_current||[]).join(', ') || '(ninguna)'}`, 'error');
      } else if (e.status === 400 && data.error === 'invalid_state') {
        showToast(`⚠ Estado invalido: ${data.got}`, 'error');
      } else {
        showToast(`Error moviendo: ${e.message}`, 'error');
      }
    }
  }

  function renderTreeListHTML(children, basePath, depth = 0) {
    if (!children || children.length === 0) return '<div style="color:var(--text3)">(vacio)</div>';
    let html = `<ul class="dynamic-tree" style="padding-left:${depth * 16}px;list-style:none">`;
    for (const node of children) {
      const isDir = (node.children && node.children.length >= 0) && node.type === 'dir';
      const icon = isDir ? '📁' : '📄';
      html += `<li class="dynamic-tree-row" style="padding:4px 0">
        <span style="margin-right:6px">${icon}</span>
        ${isDir
          ? `<strong>${escapeHtml(node.name)}</strong>`
          : `<a href="#" class="r-list-row" data-path="${escapeHtml(node.path)}" data-area-target="${escapeHtml(state.activeArea)}">${escapeHtml(node.name)}</a>`
        }
      </li>`;
      if (isDir && node.children) html += renderTreeListHTML(node.children, basePath, depth + 1);
    }
    html += '</ul>';
    return html;
  }

  function wireV26Listeners() {
    // V2.6 (modificado): sidebar lateral — click en area. Event delegation para
    // que funcione con areas hardcoded Y con las dinamicas inyectadas despues.
    const sidebar = document.getElementById('sidebar') || document.getElementById('area-nav');
    if (sidebar) {
      sidebar.addEventListener('click', (e) => {
        const row = e.target.closest('.area-row');
        if (!row) return;
        const id = row.dataset.area;
        if (id) setActiveArea(id);
      });
    }

    // V2.6: sub-tabs dentro de cada area. V3.5: cambiado a event delegation
    // sobre document para que funcione con sub-tabs inyectadas dinamicamente
    // (areas con states declarados en pm/config.json).
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.atab');
      if (!tab) return;
      const area = tab.dataset.area;
      const sub = tab.dataset.subtab;
      if (area && sub) setSubTab(area, sub);
    });

    // Refresh kanban
    if (el.btnRefreshTasks) {
      el.btnRefreshTasks.addEventListener('click', () => {
        loadTasksAndConfig();
        loadStories();
      });
    }

    // Click en una row del Resumen / General / Sistema → abrir archivo (en su sub-tab Docs/Files) o navegar a área
    document.addEventListener('click', (e) => {
      const row = e.target.closest('.r-list-row');
      if (!row) return;

      // Navegar a otra área (solo botones de "Áreas" en General Dashboard)
      const gotoArea = row.dataset.gotoArea;
      if (gotoArea) {
        setActiveArea(gotoArea);
        return;
      }

      // Abrir archivo
      const path = row.dataset.path;
      if (path) {
        const targetArea = row.dataset.areaTarget || state.activeArea;
        // Cambiar al área indicada y poner su sub-tab Docs/Files
        setActiveArea(targetArea);
        const sub = (targetArea === '_system') ? 'files' : 'docs';
        setSubTab(targetArea, sub);
        openFile(path);
      }
    });

    // Listener delegado para clicks en nodos del árbol de cualquier área
    document.addEventListener('click', (e) => {
      const row = e.target.closest('.tree-row');
      if (!row) return;
      const fileNode = row.parentElement;
      if (!fileNode || !fileNode.classList.contains('tree-file')) return;
      // Buscar el path del nodo (renderFile guarda solo el name; usamos un dataset que añadiremos)
      const path = fileNode.dataset.path;
      if (path) openFile(path);
    });
  }

  // ─────────── Edit listeners ───────────
  function wireEditListeners() {
    el.btnEdit.addEventListener('click', startEditing);
    el.btnPreview.addEventListener('click', togglePreview);
    el.btnSave.addEventListener('click', saveFile);
    el.btnCancel.addEventListener('click', cancelEditing);

    // Detectar cambios en el textarea
    el.editor.addEventListener('input', () => {
      const original = el.editor.dataset.lastLoaded || '';
      const changed = el.editor.value !== original;
      if (changed !== state.dirty) {
        state.dirty = changed;
        renderViewer();
      }
    });

    // Atajos de teclado en modo edición
    el.editor.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + S → guardar
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
        return;
      }
      // Esc → cancelar
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
        return;
      }
      // Tab → insertar 2 espacios (no perder foco)
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = el.editor.selectionStart;
        const end = el.editor.selectionEnd;
        el.editor.value = el.editor.value.substring(0, start) + '  ' + el.editor.value.substring(end);
        el.editor.selectionStart = el.editor.selectionEnd = start + 2;
        el.editor.dispatchEvent(new Event('input'));
      }
    });

    // Warning al cerrar pestaña con cambios sin guardar
    window.addEventListener('beforeunload', (e) => {
      if (state.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // ─────────── V2.5.4: Modal "+ Nueva funcionalidad" ───────────

  function openNewFeatureModal() {
    const modal = document.getElementById('new-feature-modal');
    if (!modal) return;

    // Poblar datalists con sugerencias actuales
    const dlPlatforms = document.getElementById('modal-platforms');
    const dlCategories = document.getElementById('modal-categories');
    const platforms = (state.storiesData?.platforms) || [];
    const categories = Array.from(new Set((state.storiesData?.stories || [])
      .map(s => s.category).filter(Boolean))).sort();
    if (dlPlatforms) dlPlatforms.innerHTML = platforms.map(p => `<option value="${escapeHtml(p)}">`).join('');
    if (dlCategories) dlCategories.innerHTML = categories.map(c => `<option value="${escapeHtml(c)}">`).join('');

    // V2.9: poblar dropdown de features (carpetas) con las existentes + opción "Nueva carpeta..."
    const featureSelect = document.getElementById('new-feature-feature-select');
    const featureNewInput = document.getElementById('new-feature-feature-new');
    if (featureSelect) {
      const features = Array.from(new Set((state.storiesData?.stories || [])
        .map(s => s.feature).filter(Boolean))).sort();
      // Si no hay features detectadas, default a "ideas"
      const defaultFeature = features.includes('ideas') ? 'ideas' : (features[0] || 'ideas');
      const optsHtml = [
        ...features.map(f => `<option value="${escapeHtml(f)}" ${f === defaultFeature ? 'selected' : ''}>${escapeHtml(f)}</option>`),
        '<option value="__new__">+ Nueva carpeta…</option>',
      ].join('');
      // Si no había ninguna feature, mostrar al menos "ideas"
      featureSelect.innerHTML = features.length === 0
        ? `<option value="ideas" selected>ideas (se creará)</option><option value="__new__">+ Nueva carpeta…</option>`
        : optsHtml;
      featureNewInput.style.display = 'none';
      featureNewInput.value = '';
    }

    modal.classList.remove('hidden');
    setTimeout(() => modal.querySelector('input[name="title"]')?.focus(), 50);
  }

  function closeNewFeatureModal() {
    const modal = document.getElementById('new-feature-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.querySelector('form')?.reset();
    }
  }

  async function submitNewFeature(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    // V2.9: feature puede ser una existente (del select) o una nueva (del input feature_new)
    let featureValue = (fd.get('feature') || '').trim();
    if (featureValue === '__new__') {
      featureValue = (fd.get('feature_new') || '').trim();
      if (!featureValue) {
        showToast('⚠ Escribe el nombre de la nueva carpeta', 'error');
        return;
      }
    }
    if (!featureValue) featureValue = 'ideas';
    const body = {
      feature: featureValue,
      title: (fd.get('title') || '').trim(),
    };
    const priority = fd.get('priority');
    if (priority) body.priority = parseInt(priority, 10);
    const platform = (fd.get('platform') || '').trim();
    if (platform) body.platform = platform;
    const category = (fd.get('category') || '').trim();
    if (category) body.category = category;
    const description = (fd.get('description') || '').trim();
    if (description) body.description = description;

    if (!body.title) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const result = await api('/api/story/create', { method: 'POST', body });
      closeNewFeatureModal();
      showToast(`Creada ${result.id} en ${result.feature}`, 'ok');
      // Recargar stories y refrescar la sub-tab activa
      await loadStories();
      const sub = state.areaSubTab[state.activeArea];
      if (state.activeArea === 'producto' && sub === 'funcionalidades') renderFuncionalidades();
      else if (state.activeArea === 'producto' && sub === 'resumen') renderResumen();
      else if (state.activeArea === 'general' && sub === 'dashboard') renderGeneralDashboard();
    } catch (e) {
      const data = e.data || {};
      if (e.status === 400 && data.error === 'invalid_feature_name') {
        showToast(`⚠ ${data.hint}`, 'error');
      } else {
        showToast(`Error creando: ${e.message}`, 'error');
      }
    } finally {
      submitBtn.disabled = false;
    }
  }

  function wireNewFeatureListeners() {
    const modal = document.getElementById('new-feature-modal');
    if (!modal) return;

    // Botones que abren el modal (en Resumen, en Funcionalidades, etc.)
    document.querySelectorAll('[data-open-new-feature]').forEach(btn => {
      btn.addEventListener('click', openNewFeatureModal);
    });

    // Cerradores (X, backdrop, botón Cancelar)
    modal.querySelectorAll('[data-close-modal]').forEach(el =>
      el.addEventListener('click', closeNewFeatureModal));

    // Submit
    modal.querySelector('form')?.addEventListener('submit', submitNewFeature);

    // V2.9: el dropdown de feature muestra/oculta el input "Nueva carpeta..."
    const featureSelect = document.getElementById('new-feature-feature-select');
    const featureNewInput = document.getElementById('new-feature-feature-new');
    if (featureSelect && featureNewInput) {
      featureSelect.addEventListener('change', () => {
        if (featureSelect.value === '__new__') {
          featureNewInput.style.display = '';
          featureNewInput.focus();
        } else {
          featureNewInput.style.display = 'none';
          featureNewInput.value = '';
        }
      });
    }

    // Esc cierra
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeNewFeatureModal();
      }
    });
  }

  // ─────────── V2.8: Modal "+ Nuevo" archivo/carpeta ───────────

  function openNewDocModal(parent) {
    const modal = document.getElementById('new-doc-modal');
    if (!modal) return;
    const form = modal.querySelector('form');
    form.reset();
    form.elements.parent.value = parent || 'docs/general';
    // El radio "file" arranca seleccionado por default
    syncNewDocFormByKind(form);
    modal.classList.remove('hidden');
    setTimeout(() => form.elements.name?.focus(), 50);
  }

  function closeNewDocModal() {
    const modal = document.getElementById('new-doc-modal');
    if (modal) modal.classList.add('hidden');
  }

  function syncNewDocFormByKind(form) {
    const kind = form.elements.kind.value;
    const contentField = document.getElementById('new-doc-content-field');
    const extHint = document.getElementById('new-doc-extension-hint');
    if (kind === 'folder') {
      contentField.style.display = 'none';
      extHint.textContent = '(carpeta)';
    } else {
      contentField.style.display = '';
      extHint.innerHTML = '(se añadirá <code>.md</code> automáticamente si no lo lleva)';
    }
  }

  async function submitNewDoc(e) {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const kind = fd.get('kind');
    const parent = (fd.get('parent') || '').trim().replace(/\/+$/, '');
    let name = (fd.get('name') || '').trim().replace(/^\/+/, '');
    const content = fd.get('content') || '';

    if (!parent || !name) return;
    if (!/^[a-zA-Z0-9_\- /]+$/.test(name)) {
      showToast('⚠ Nombre inválido. Solo letras, números, guiones, espacios y /.', 'error');
      return;
    }

    // Para archivo: añadir .md si no lleva extensión
    if (kind === 'file' && !name.includes('.')) name += '.md';

    const fullPath = `${parent}/${name}`;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      if (kind === 'folder') {
        await api('/api/folder/create', { method: 'POST', body: { path: fullPath } });
        showToast(`📁 Carpeta creada: ${fullPath}`, 'ok');
      } else {
        await api('/api/file', {
          method: 'POST',
          body: { path: fullPath, content: content || `# ${name.replace(/\.md$/, '')}\n` },
        });
        showToast(`📄 Archivo creado: ${fullPath}`, 'ok');
      }
      closeNewDocModal();
      // Refrescar el árbol del área actual
      await loadTree();
      // Si fue archivo, abrirlo
      if (kind === 'file') openFile(fullPath);
    } catch (e) {
      const data = e.data || {};
      if (e.status === 403 && data.error === 'out_of_scope') {
        showToast('⚠ Solo puedes crear bajo docs/.', 'error');
      } else if (e.status === 400) {
        showToast(`⚠ ${data.hint || data.error}`, 'error');
      } else if (e.status === 409) {
        showToast(`⚠ Ya existe: ${data.path}`, 'error');
      } else {
        showToast(`Error: ${e.message}`, 'error');
      }
    } finally {
      submitBtn.disabled = false;
    }
  }

  function wireNewDocListeners() {
    const modal = document.getElementById('new-doc-modal');
    if (!modal) return;

    // Botones que abren el modal (uno por sub-tab Docs, con data-new-doc="docs/general" etc.)
    document.querySelectorAll('[data-new-doc]').forEach(btn => {
      btn.addEventListener('click', () => openNewDocModal(btn.dataset.newDoc));
    });

    // Cerradores
    modal.querySelectorAll('[data-close-modal]').forEach(el =>
      el.addEventListener('click', closeNewDocModal));

    // Cambio de tipo (file/folder) → ajustar UI
    const form = modal.querySelector('form');
    form.elements.kind.forEach
      ? form.elements.kind.forEach(r => r.addEventListener('change', () => syncNewDocFormByKind(form)))
      : Array.from(form.elements.kind).forEach(r => r.addEventListener('change', () => syncNewDocFormByKind(form)));

    // Submit
    form.addEventListener('submit', submitNewDoc);

    // Esc cierra
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeNewDocModal();
    });
  }

  // ─────────── Init ───────────
  // ─────────────────────────────────────────────────────────────
  // V3.1: Dossiers (vista contextual por feature)
  // ─────────────────────────────────────────────────────────────

  const dossierState = {
    features: [],
    activeSlug: null,
    cachedDossiers: {},  // slug -> data
    searchTerm: '',
  };

  async function renderDossiers() {
    const itemsEl = document.getElementById('dossiers-items');
    if (!itemsEl) return;
    try {
      const res = await fetch('/api/features');
      const data = await res.json();
      dossierState.features = Array.isArray(data.features) ? data.features : [];
    } catch (e) {
      itemsEl.innerHTML = '<div class="dossier-empty">Error al cargar features.</div>';
      return;
    }
    renderDossiersList();
    // Si había una activa antes, mantenerla
    if (dossierState.activeSlug && dossierState.features.some(f => f.slug === dossierState.activeSlug)) {
      loadDossier(dossierState.activeSlug);
    }
  }

  function renderDossiersList() {
    const itemsEl = document.getElementById('dossiers-items');
    if (!itemsEl) return;
    const term = dossierState.searchTerm.toLowerCase();
    const filtered = dossierState.features.filter(f =>
      !term || f.slug.toLowerCase().includes(term) || (f.title || '').toLowerCase().includes(term)
    );
    if (filtered.length === 0) {
      itemsEl.innerHTML = '<div class="dossier-empty" style="padding:20px;">No hay features que coincidan.</div>';
      return;
    }
    itemsEl.innerHTML = filtered.map(f => {
      const active = f.slug === dossierState.activeSlug ? ' active' : '';
      const noDossier = !f.has_dossier ? '<span class="pill-no-dossier">sin dossier</span>' : '';
      const updated = f.last_updated ? new Date(f.last_updated * 1000).toLocaleDateString() : '—';
      const safeTitle = dossierEscape(f.title || f.slug);
      const safeSlug = dossierEscape(f.slug);
      return `
        <div class="dossier-item${active}" data-slug="${safeSlug}">
          <div class="dossier-item-title">${safeTitle}</div>
          <div class="dossier-item-meta">${safeSlug} · ${f.artifact_count} artefactos · ${updated} ${noDossier}</div>
        </div>
      `;
    }).join('');
    // Wire clicks
    itemsEl.querySelectorAll('.dossier-item').forEach(el => {
      el.addEventListener('click', () => loadDossier(el.dataset.slug));
    });
  }

  async function loadDossier(slug) {
    dossierState.activeSlug = slug;
    renderDossiersList();  // re-render para marcar active
    const viewerEl = document.getElementById('dossier-viewer');
    if (!viewerEl) return;
    viewerEl.innerHTML = '<div class="dossier-empty">Cargando dossier...</div>';
    let data;
    try {
      const res = await fetch(`/api/feature/${encodeURIComponent(slug)}/dossier`);
      data = await res.json();
    } catch (e) {
      viewerEl.innerHTML = '<div class="dossier-empty">Error al cargar el dossier.</div>';
      return;
    }
    dossierState.cachedDossiers[slug] = data;
    renderDossierContent(viewerEl, data);
  }

  function renderDossierContent(viewerEl, data) {
    if (!data.exists) {
      viewerEl.innerHTML = `
        <div class="dossier-empty" style="padding:30px;">
          <p>Esta feature aún no tiene <code>_dossier.md</code>.</p>
          <p style="margin-top:8px;">Ejecuta <code>/pm dossier ${dossierEscape(data.slug)}</code> en Claude Code para generarlo,</p>
          <p>o cualquier comando del pipeline (<code>/story</code>, <code>/define</code>, etc.) lo creará automáticamente vía auto-sync.</p>
          ${data.artifacts && data.artifacts.length ? `<p style="margin-top:12px;font-size:11px;">Artefactos existentes: <code>${data.artifacts.join(', ')}</code></p>` : ''}
        </div>
      `;
      return;
    }
    // Render dossier markdown
    const md = data.markdown || '';
    const html = window.marked ? window.marked.parse(md) : dossierEscape(md);
    let timelineHtml = '';
    if (data.events && data.events.length > 0) {
      const evRows = data.events.map(e => {
        const isDecision = e.agent === 'human' && e.event === 'decision';
        const cls = isDecision ? ' human-decision' : '';
        const ts = e.ts ? new Date(e.ts).toLocaleString() : '—';
        const summary = e.summary || e.event || '';
        const extras = [];
        if (e.entity) extras.push(dossierEscape(e.entity));
        if (e.score !== undefined) extras.push(`score: ${e.score}`);
        if (e.commit) extras.push(`commit: ${e.commit.substring(0,7)}`);
        const extra = extras.length ? ` <span style="color:var(--text3);">(${extras.join(' · ')})</span>` : '';
        return `
          <div class="timeline-event${cls}">
            <span class="ts">${dossierEscape(ts)}</span>
            <span class="agent">${dossierEscape(e.agent || '?')}</span>
            <span class="summary">${dossierEscape(summary)}${extra}</span>
          </div>
        `;
      }).join('');
      timelineHtml = `
        <div class="dossier-timeline">
          <h2 class="dossier-timeline-title">📅 Timeline (${data.events.length} eventos)</h2>
          ${evRows}
        </div>
      `;
    }
    viewerEl.innerHTML = html + timelineHtml;
  }

  function wireDossiersListeners() {
    const searchEl = document.getElementById('dossiers-search');
    if (searchEl) {
      searchEl.addEventListener('input', () => {
        dossierState.searchTerm = searchEl.value.trim();
        renderDossiersList();
      });
    }
  }

  function dossierEscape(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  async function init() {
    await loadMarked();
    wireEditListeners();
    wireV26Listeners();
    wireFuncListeners();
    wireNewFeatureListeners();
    wireNewDocListeners();
    wireTaskDetailListeners();
    wireDossiersListeners();
    const ok = await checkHealth();
    if (!ok) return;
    await loadTree();
    // Cargar config (inyecta áreas dinámicas en el sidebar) aunque arranquemos en Inicio
    await loadTasksAndConfig();
    // Arrancar en el panel de Inicio (resumen de startup)
    setActiveArea(state.activeArea);
  }

  init();
})();
