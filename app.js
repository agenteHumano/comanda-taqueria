/* ─── Catálogos ──────────────────────────────────────────────── */
const TACOS = [
  { sku: 'PA',  name: 'Pastor' },
  { sku: 'AS',  name: 'Asada' },
  { sku: 'BI',  name: 'Bistec' },
  { sku: 'CH',  name: 'Chorizo' },
  { sku: 'TR',  name: 'Tripa' },
  { sku: 'GR',  name: 'Gringa' },
  { sku: 'QU',  name: 'Quesadilla' },
  { sku: 'VOL', name: 'Volcán' },
  { sku: 'BUR', name: 'Burrito' },
  { sku: 'RA',  name: 'Rajas' },
];

const BEBIDAS = [
  { sku: 'REF', name: 'Refresco' },
  { sku: 'AGU', name: 'Agua' },
  { sku: 'CER', name: 'Cerveza' },
  { sku: 'JAR', name: 'Jarrito' },
  { sku: 'LIM', name: 'Limonada' },
  { sku: 'ORG', name: 'Horchata' },
  { sku: 'TAM', name: 'Tamarindo' },
  { sku: 'MAN', name: 'Mango' },
  { sku: 'TOM', name: 'Tomate' },
  { sku: 'JUG', name: 'Jugo' },
];

const ESPECIALES = [
  { id: 'PR', label: 'Para recoger', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>` },
  { id: 'PE', label: 'Para enviar',  icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` },
  { id: 'PA_ASIGNAR', label: 'Por asignar', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
];

/* ─── Configuración ──────────────────────────────────────────── */
const DEFAULT_PRODUCTS = {
  tacos:  TACOS.map(p  => ({ ...p })),
  drinks: BEBIDAS.map(p => ({ ...p })),
};

const DEFAULT_MODIFIERS = [
  { sku: 'S/V',  name: 'Sin verdura',  enabled: true  },
  { sku: 'S/C',  name: 'Sin cebolla',  enabled: true  },
  { sku: 'S/CI', name: 'Sin cilantro', enabled: true  },
  { sku: '',     name: '',             enabled: false  },
  { sku: '',     name: '',             enabled: false  },
  { sku: '',     name: '',             enabled: false  },
  { sku: '',     name: '',             enabled: false  },
];

let config = {
  waiterName: '',
  tableCount: 10,
  products: {
    tacos:  DEFAULT_PRODUCTS.tacos.map(p  => ({ ...p })),
    drinks: DEFAULT_PRODUCTS.drinks.map(p => ({ ...p })),
  },
  modifiers: DEFAULT_MODIFIERS.map(m => ({ ...m })),
  printer: { ip: '' },
};

/* ─── Estado ─────────────────────────────────────────────────── */
/*
  state.mesas: Map<id, MesaState>
    id: 1-10 (number) | 'PR' | 'PE' | 'PA_ASIGNAR'

  MesaState: {
    historial: Comanda[],
    borrador: { platos: Plato[], cantDigitos: string, lastSku: string|null, notaEditando: boolean }
  }

  Plato: { items: Item[], note: string }
  Item:  { sku, name, qty, mods: string[] }
  Comanda: { table, plates: Plato[] }
*/

let state = {
  currentMesa: null,  // id de la mesa activa
  mesas: new Map(),
};

/* ─── Persistencia (state) ───────────────────────────────────── */
function saveState() {
  try {
    const serializable = {
      mesas: Array.from(state.mesas.entries()),
    };
    localStorage.setItem('comanda-taqueria', JSON.stringify(serializable));
  } catch (_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('comanda-taqueria');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.mesas) {
      state.mesas = new Map(parsed.mesas);
    }
  } catch (_) {}
}

/* ─── Persistencia (config) ──────────────────────────────────── */
function loadConfig() {
  try {
    config.waiterName  = localStorage.getItem('config.waiterName') || '';
    const rawCount = parseInt(localStorage.getItem('config.tableCount'), 10);
    if (rawCount >= 1 && rawCount <= 20) config.tableCount = rawCount;

    const rawTacos  = localStorage.getItem('config.products.tacos');
    const rawDrinks = localStorage.getItem('config.products.drinks');

    if (rawTacos) {
      const parsed = JSON.parse(rawTacos);
      if (Array.isArray(parsed) && parsed.length === 10) config.products.tacos = parsed;
    }
    if (rawDrinks) {
      const parsed = JSON.parse(rawDrinks);
      if (Array.isArray(parsed) && parsed.length === 10) config.products.drinks = parsed;
    }

    const rawModifiers = localStorage.getItem('config.modifiers');
    if (rawModifiers) {
      const parsed = JSON.parse(rawModifiers);
      if (Array.isArray(parsed) && parsed.length === 7) config.modifiers = parsed;
    }

    config.printer.ip = localStorage.getItem('config.printer.ip') || '';
  } catch (_) {}
}

function saveConfig() {
  try {
    localStorage.setItem('config.waiterName',  config.waiterName);
    localStorage.setItem('config.tableCount', String(config.tableCount));
    localStorage.setItem('config.products.tacos',  JSON.stringify(config.products.tacos));
    localStorage.setItem('config.products.drinks', JSON.stringify(config.products.drinks));
    localStorage.setItem('config.modifiers',       JSON.stringify(config.modifiers));
    localStorage.setItem('config.printer.ip', config.printer.ip);
  } catch (_) {}
}

/* ─── Helpers de estado por mesa ─────────────────────────────── */
function getMesa(id) {
  if (!state.mesas.has(id)) {
    state.mesas.set(id, {
      historial: [],
      borrador: freshBorrador(),
    });
  }
  return state.mesas.get(id);
}

function freshBorrador() {
  return {
    platos: [{ items: [], note: '' }],
    cantDigitos: '',
    lastSku: null,
    notaEditando: false,
  };
}

function platoActivo(borrador) {
  return borrador.platos[borrador.platos.length - 1];
}

function getCantidad(borrador) {
  return borrador.cantDigitos ? parseInt(borrador.cantDigitos, 10) : 1;
}

/* ─── Helpers de catálogo ────────────────────────────────────── */
function findProducto(sku) {
  const all = [...config.products.tacos, ...config.products.drinks];
  const p = all.find(item => item.sku === sku);
  if (!p) return null;
  return { sku: p.sku, name: p.name || p.sku };
}

/* ─── Lógica de teclado ──────────────────────────────────────── */
function accionDigito(digito) {
  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;
  if (b.cantDigitos.length < 2) {
    b.cantDigitos += digito;
  }
  saveState();
  renderBorrador();
  renderCantidad();
}

function accionAtajo(n) {
  const mesa = getMesa(state.currentMesa);
  mesa.borrador.cantDigitos = String(n);
  saveState();
  renderBorrador();
  renderCantidad();
}

function accionProducto(sku) {
  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;
  const cant = getCantidad(b);
  const plato = platoActivo(b);
  const producto = findProducto(sku);
  if (!producto) return;

  const existente = plato.items.find(i => i.sku === sku);
  if (existente) {
    existente.qty += cant;
  } else {
    plato.items.push({ sku, name: producto.name, qty: cant, mods: [] });
  }

  b.lastSku = sku;
  b.cantDigitos = '';
  saveState();
  renderBorrador();
  renderCantidad();
  renderModStates();
}

function accionMod(mod) {
  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;
  const plato = platoActivo(b);

  if (!b.lastSku) return;
  const item = plato.items.find(i => i.sku === b.lastSku);
  if (!item) return;

  if (mod === 'C/T') {
    item.mods = [];
  } else {
    const idx = item.mods.indexOf(mod);
    if (idx === -1) {
      item.mods.push(mod);
    } else {
      item.mods.splice(idx, 1);
    }
  }

  saveState();
  renderBorrador();
  renderModStates();
}

function accionBorrar() {
  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;

  // 1. Hay dígitos pendientes → borra último dígito
  if (b.cantDigitos.length > 0) {
    b.cantDigitos = b.cantDigitos.slice(0, -1);
    saveState();
    renderCantidad();
    renderBorrador();
    return;
  }

  const plato = platoActivo(b);

  // 2. Hay items en el plato activo → borra el último con flash visual
  if (plato.items.length > 0) {
    const last = plato.items[plato.items.length - 1];
    if (b.lastSku === last.sku) b.lastSku = null;
    plato.items.pop();
    if (b.lastSku === null && plato.items.length > 0) {
      b.lastSku = plato.items[plato.items.length - 1].sku;
    }
    saveState();
    renderBorrador();
    renderModStates();
    const borradorEl = document.querySelector('.borrador-section');
    if (borradorEl) {
      borradorEl.style.transition = 'background 80ms';
      borradorEl.style.background = 'var(--error-muted, oklch(0.22 0.06 25))';
      setTimeout(() => { borradorEl.style.background = ''; borradorEl.style.transition = ''; }, 120);
    }
    return;
  }

  // 3. Plato activo vacío y hay más de uno → elimina el plato vacío
  if (b.platos.length > 1) {
    b.platos.pop();
    const nuevoPlato = platoActivo(b);
    b.lastSku = nuevoPlato.items.length > 0
      ? nuevoPlato.items[nuevoPlato.items.length - 1].sku
      : null;
    saveState();
    renderBorrador();
    renderModStates();
    return;
  }

  // 4. Nada que borrar
}

function accionSiguientePlato() {
  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;
  const plato = platoActivo(b);

  if (plato.items.length === 0) return;

  b.platos.push({ items: [], note: '' });
  b.lastSku = null;
  b.cantDigitos = '';
  saveState();
  renderBorrador();
  renderCantidad();
  renderModStates();
}

function accionEnviar() {
  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;

  if (b.notaEditando) {
    const input = document.querySelector('.nota-input');
    if (input) platoActivo(b).note = input.value.trim();
    b.notaEditando = false;
  }

  const platos = b.platos.filter(p => p.items.length > 0 || p.note.trim());
  if (platos.length === 0) return;

  const now = new Date();
  const comanda = {
    table: state.currentMesa === 'PA_ASIGNAR' ? 'PA' : state.currentMesa,
    sentAt: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
    plates: platos.map(p => {
      const out = { items: p.items.map(i => ({ ...i, mods: [...i.mods] })) };
      if (p.note.trim()) out.note = p.note.trim();
      return out;
    }),
  };

  mesa.historial.push(comanda);
  mesa.borrador = freshBorrador();

  console.log('[comanda-taqueria] nueva comanda:', JSON.stringify(comanda, null, 2));

  if (navigator.vibrate) navigator.vibrate(60);

  saveState();
  renderHistorial();
  renderBorrador();
  renderCantidad();
  renderModStates();
  actualizarEnviadasBadge();

  const hist = document.querySelector('.comanda-historial');
  if (hist) hist.scrollTop = hist.scrollHeight;
}

/* ─── Nota libre ─────────────────────────────────────────────── */
function abrirNota() {
  const mesa = getMesa(state.currentMesa);
  mesa.borrador.notaEditando = true;

  const wrapper = document.querySelector('.nota-input-wrapper');
  const modsRow = document.querySelector('.mods-nota-row');
  const input = document.querySelector('.nota-input');
  const plato = platoActivo(mesa.borrador);

  wrapper.classList.add('visible');
  if (modsRow) modsRow.style.display = 'none';
  input.value = plato.note || '';
  input.focus();
}

function cerrarNota() {
  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;
  const input = document.querySelector('.nota-input');
  const wrapper = document.querySelector('.nota-input-wrapper');
  const modsRow = document.querySelector('.mods-nota-row');

  const plato = platoActivo(b);
  plato.note = input ? input.value.trim() : '';
  b.notaEditando = false;

  if (wrapper) wrapper.classList.remove('visible');
  if (modsRow) modsRow.style.display = '';

  saveState();
  renderBorrador();
  actualizarBtnNota();
}

/* ─── Formateo de ticket ─────────────────────────────────────── */
function formatTicketLine(item) {
  const mods = item.mods.length > 0 ? ` [${item.mods.join(',')}]` : '';
  return `${item.qty} ${item.sku}${mods}`;
}

function renderTicketHTML(platos) {
  const lines = [];
  platos.forEach((plato, pi) => {
    if (pi > 0) lines.push('<hr class="ticket-sep">');
    if (plato.items.length > 0) {
      lines.push(plato.items.map(i => escapeHtml(formatTicketLine(i))).join(' · '));
    }
    if (plato.note) {
      lines.push(`<span class="ticket-note">${escapeHtml(plato.note)}</span>`);
    }
  });
  return lines.join('\n');
}

function renderTicketCocinaHTML(platos) {
  return platos.map((plato, pi) => {
    const title = `<div class="cocina-plato-title">Plato ${pi + 1}</div>`;
    const items = plato.items.map(i => {
      const mods = i.mods.length > 0 ? ` (${i.mods.map(m => modLabel(m)).join(', ')})` : '';
      return `<div class="cocina-item">- ${i.qty} ${escapeHtml(i.name)}${escapeHtml(mods)}</div>`;
    }).join('');
    const note = plato.note ? `<div class="cocina-item" style="font-style:italic;color:var(--ink-muted)">${escapeHtml(plato.note)}</div>` : '';
    return `<div class="cocina-plato">${title}${items}${note}</div>`;
  }).join('');
}

function modLabel(mod) {
  const fromConfig = config.modifiers.find(m => m.sku === mod);
  if (fromConfig && fromConfig.name) return fromConfig.name.toLowerCase();
  const map = { 'S/V': 'sin verdura', 'S/C': 'sin cebolla', 'S/Ci': 'sin cilantro', 'S/CI': 'sin cilantro', 'C/T': 'con todo' };
  return map[mod] || mod;
}

function modAriaLabel(mod) {
  const fromConfig = config.modifiers.find(m => m.sku === mod);
  if (fromConfig && fromConfig.name) return fromConfig.name;
  const map = { 'C/T': 'Con todo (limpiar modificadores)', 'S/V': 'Sin verdura', 'S/C': 'Sin cebolla', 'S/Ci': 'Sin cilantro', 'S/CI': 'Sin cilantro' };
  return map[mod] || mod;
}

/* ─── Renderizado: Pantalla Mesas ────────────────────────────── */
function renderMesas() {
  const grid = document.getElementById('mesa-grid');
  const especiales = document.getElementById('especiales-grid');
  if (!grid || !especiales) return;

  grid.innerHTML = '';
  for (let i = 1; i <= config.tableCount; i++) {
    grid.appendChild(buildMesaCard(i, String(i)));
  }

  especiales.innerHTML = '';
  ESPECIALES.forEach(e => {
    especiales.appendChild(buildEspecialCard(e));
  });

  const allIds = [
    ...Array.from({ length: config.tableCount }, (_, i) => i + 1),
    ...ESPECIALES.map(e => e.id),
  ];
  const activas = allIds.filter(id => {
    const m = getMesa(id);
    return m.historial.length > 0 || m.borrador.platos.some(p => p.items.length > 0 || p.note.trim());
  }).length;
  const badge = document.getElementById('mesas-activas-badge');
  if (badge) badge.textContent = activas > 0 ? `· ${activas} activa${activas !== 1 ? 's' : ''}` : '';
}

function buildMesaCard(id, label) {
  const mesa = getMesa(id);
  const hasBorrador = mesa.borrador.platos.some(p => p.items.length > 0 || p.note.trim());
  const numEnviadas = mesa.historial.length;

  const statusText = hasBorrador
    ? 'en construcción'
    : numEnviadas > 0
      ? `${numEnviadas} enviada${numEnviadas !== 1 ? 's' : ''}`
      : '';

  const btn = document.createElement('button');
  btn.className = 'mesa-card';
  if (hasBorrador) btn.classList.add('has-borrador');
  else if (numEnviadas > 0) btn.classList.add('has-enviadas');
  btn.setAttribute('aria-label', `Mesa ${id}${statusText ? ', ' + statusText : ''}`);

  btn.innerHTML = `
    <span class="mesa-num">${label}</span>
    ${statusText ? `<span class="mesa-status">${statusText}</span>` : '<span class="mesa-status"></span>'}
  `;
  btn.addEventListener('click', () => abrirMesa(id));
  return btn;
}

function buildEspecialCard(e) {
  const mesa = getMesa(e.id);
  const hasBorrador = mesa.borrador.platos.some(p => p.items.length > 0 || p.note.trim());
  const numEnviadas = mesa.historial.length;

  const statusText = hasBorrador
    ? 'en construcción'
    : numEnviadas > 0
      ? `${numEnviadas} enviada${numEnviadas !== 1 ? 's' : ''}`
      : '';

  const btn = document.createElement('button');
  btn.className = 'especial-card';
  if (hasBorrador) btn.classList.add('has-borrador');
  else if (numEnviadas > 0) btn.classList.add('has-enviadas');
  btn.setAttribute('aria-label', `${e.label}${statusText ? ', ' + statusText : ''}`);

  btn.innerHTML = `
    <span class="especial-icon" aria-hidden="true" style="color:var(--ink-muted)">${e.icon}</span>
    <div class="especial-info">
      <span class="especial-code">${e.id === 'PA_ASIGNAR' ? 'PA' : e.id}</span>
      <span class="especial-label-text">${statusText || e.label}</span>
    </div>
  `;
  btn.addEventListener('click', () => abrirMesa(e.id));
  return btn;
}

/* ─── Navegación ─────────────────────────────────────────────── */
function abrirMesa(id) {
  state.currentMesa = id;

  const title = document.getElementById('comanda-title');
  if (title) {
    let baseTitle;
    if (typeof id === 'number') {
      baseTitle = `Mesa ${id}`;
    } else {
      const especial = ESPECIALES.find(e => e.id === id);
      baseTitle = especial ? especial.label : id;
    }
    title.textContent = config.waiterName
      ? `${baseTitle} · ${config.waiterName}`
      : baseTitle;
  }

  renderHistorial();
  renderBorrador();
  renderCantidad();
  renderModStates();
  actualizarEnviadasBadge();
  actualizarBtnNota();

  setTimeout(() => {
    const hist = document.querySelector('.comanda-historial');
    if (hist) hist.scrollTop = hist.scrollHeight;
  }, 0);

  mostrarScreen('comanda');
}

function volverAMesas() {
  const mesa = state.currentMesa ? getMesa(state.currentMesa) : null;
  if (mesa && mesa.borrador.notaEditando) cerrarNota();

  const tieneBorrador = mesa && mesa.borrador.platos.some(p => p.items.length > 0 || p.note.trim());
  if (tieneBorrador) {
    const label = typeof state.currentMesa === 'number'
      ? `Mesa ${state.currentMesa}`
      : ESPECIALES.find(e => e.id === state.currentMesa)?.label || state.currentMesa;
    setTimeout(() => showToast(`Borrador guardado — ${label}`), 200);
  }

  state.currentMesa = null;
  renderMesas();
  mostrarScreen('mesas');
}

function actualizarSlotsConfig(group) {
  const rows = document.querySelectorAll(`.config-product-row[data-group="${group}"]`);
  let hayVacioOculto = false;

  rows.forEach(row => {
    const skuInput = row.querySelector('.config-sku-input');
    const vacio = !skuInput || !skuInput.value.trim();
    row.classList.toggle('slot-oculto', vacio);
    if (vacio) hayVacioOculto = true;
  });

  const btn = document.querySelector(`.btn-agregar-slot[data-group="${group}"]`);
  if (btn) btn.style.display = hayVacioOculto ? '' : 'none';
}

function abrirConfig() {
  // Populate form with current config values
  const waiterInput = document.getElementById('input-waiter-name');
  if (waiterInput) waiterInput.value = config.waiterName;

  const tableCountInput = document.getElementById('input-table-count');
  if (tableCountInput) tableCountInput.value = config.tableCount;

  ['tacos', 'drinks'].forEach(group => {
    const products = group === 'tacos' ? config.products.tacos : config.products.drinks;
    products.forEach((p, i) => {
      const skuInput    = document.querySelector(`.config-sku-input[data-group="${group}"][data-idx="${i}"]`);
      const nameInput   = document.querySelector(`.config-name-input[data-group="${group}"][data-idx="${i}"]`);
      const toggleBtn   = document.querySelector(`.config-product-toggle[data-group="${group}"][data-idx="${i}"]`);
      if (skuInput)  skuInput.value  = p.sku;
      if (nameInput) nameInput.value = p.name;
      if (toggleBtn) {
        const enabled = p.enabled !== false;
        toggleBtn.setAttribute('aria-pressed', String(enabled));
        toggleBtn.closest('.config-product-row').classList.toggle('disabled', !enabled);
      }
    });
  });

  config.modifiers.forEach((m, i) => {
    const skuInput  = document.querySelector(`.config-sku-input[data-group="modifiers"][data-idx="${i}"]`);
    const nameInput = document.querySelector(`.config-name-input[data-group="modifiers"][data-idx="${i}"]`);
    const toggleBtn = document.querySelector(`.config-product-toggle[data-group="modifiers"][data-idx="${i}"]`);
    if (skuInput)  skuInput.value  = m.sku;
    if (nameInput) nameInput.value = m.name;
    if (toggleBtn) {
      const enabled = m.enabled !== false;
      toggleBtn.setAttribute('aria-pressed', String(enabled));
      toggleBtn.closest('.config-product-row').classList.toggle('disabled', !enabled);
    }
  });

  ['tacos', 'drinks', 'modifiers'].forEach(actualizarSlotsConfig);

  const ipInput = document.getElementById('input-printer-ip');
  if (ipInput) ipInput.value = config.printer.ip;

  // Clear previous search result
  const resultEl = document.getElementById('config-printer-result');
  if (resultEl) resultEl.innerHTML = '';

  actualizarPrinterStatus();
  mostrarScreen('config');
}

function volverDeConfig() {
  renderMesas();
  mostrarScreen('mesas');
}

function guardarConfig() {
  // Waiter name
  const waiterInput = document.getElementById('input-waiter-name');
  config.waiterName = waiterInput ? waiterInput.value.trim() : '';

  // Table count — borrar estado de mesas eliminadas antes de actualizar
  const tableCountInput = document.getElementById('input-table-count');
  const newTableCount = tableCountInput
    ? Math.max(1, Math.min(20, parseInt(tableCountInput.value, 10) || config.tableCount))
    : config.tableCount;
  if (newTableCount < config.tableCount) {
    for (let i = newTableCount + 1; i <= config.tableCount; i++) {
      state.mesas.delete(i);
    }
    saveState();
  }
  config.tableCount = newTableCount;

  // Products
  ['tacos', 'drinks'].forEach(group => {
    const products = [];
    for (let i = 0; i < 10; i++) {
      const skuInput  = document.querySelector(`.config-sku-input[data-group="${group}"][data-idx="${i}"]`);
      const nameInput = document.querySelector(`.config-name-input[data-group="${group}"][data-idx="${i}"]`);
      const toggleBtn = document.querySelector(`.config-product-toggle[data-group="${group}"][data-idx="${i}"]`);
      const sku     = skuInput  ? skuInput.value.trim().toUpperCase().slice(0, 4) : '';
      const name    = nameInput ? nameInput.value.trim() : '';
      const enabled = toggleBtn ? toggleBtn.getAttribute('aria-pressed') !== 'false' : true;
      products.push({ sku, name: name || sku, enabled });
    }
    if (group === 'tacos') config.products.tacos  = products;
    else                   config.products.drinks = products;
  });

  // Modifiers
  const modifiers = [];
  for (let i = 0; i < 7; i++) {
    const skuInput  = document.querySelector(`.config-sku-input[data-group="modifiers"][data-idx="${i}"]`);
    const nameInput = document.querySelector(`.config-name-input[data-group="modifiers"][data-idx="${i}"]`);
    const toggleBtn = document.querySelector(`.config-product-toggle[data-group="modifiers"][data-idx="${i}"]`);
    const sku     = skuInput  ? skuInput.value.trim().toUpperCase().slice(0, 4) : '';
    const name    = nameInput ? nameInput.value.trim() : '';
    const enabled = toggleBtn ? toggleBtn.getAttribute('aria-pressed') !== 'false' : true;
    modifiers.push({ sku, name, enabled });
  }
  config.modifiers = modifiers;

  // Printer IP
  const ipInput = document.getElementById('input-printer-ip');
  config.printer.ip = ipInput ? ipInput.value.trim() : '';

  saveConfig();
  renderKeyboardRows();
  renderModifierRow();
  volverDeConfig();
  showToast('Configuración guardada');
}

function actualizarPrinterStatus() {
  const statusEl  = document.getElementById('config-printer-status');
  const probarBtn = document.getElementById('btn-probar-impresora');
  if (!statusEl) return;

  if (config.printer.ip) {
    statusEl.textContent = `Impresora: ${config.printer.ip}`;
    statusEl.classList.remove('empty');
    if (probarBtn) probarBtn.classList.remove('hidden');
  } else {
    statusEl.textContent = 'Sin impresora configurada';
    statusEl.classList.add('empty');
    if (probarBtn) probarBtn.classList.add('hidden');
  }
}

function buscarImpresora() {
  const btn    = document.getElementById('btn-buscar-impresora');
  const result = document.getElementById('config-printer-result');
  if (!result) return;

  btn.disabled = true;
  result.innerHTML = `<div class="printer-spinner"><span class="spinner"></span> Buscando impresora…</div>`;

  setTimeout(() => {
    btn.disabled = false;
    result.innerHTML = `<div class="printer-result-msg">La búsqueda automática estará disponible cuando instales la app. Ingresa la IP manualmente.</div>`;
  }, 1500);
}

function probarImpresora() {
  const ipInput = document.getElementById('input-printer-ip');
  const ip      = ipInput ? ipInput.value.trim() : config.printer.ip;
  const result  = document.getElementById('config-printer-result');

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ip || !ipRegex.test(ip)) {
    if (result) result.innerHTML = `<div class="printer-result-msg error">IP inválida. Formato esperado: 192.168.1.42</div>`;
    return;
  }

  if (result) result.innerHTML = `<div class="printer-result-msg">La prueba de impresión real estará disponible cuando instales la app. IP: ${escapeHtml(ip)}</div>`;
}

function mostrarScreen(nombre) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${nombre}`).classList.add('active');
}

/* ─── Renderizado: historial ─────────────────────────────────── */
function renderHistorial() {
  const cont = document.querySelector('.comanda-historial');
  if (!cont) return;

  const mesa = getMesa(state.currentMesa);
  cont.innerHTML = '';

  if (mesa.historial.length === 0) {
    cont.innerHTML = `
      <div class="historial-empty">
        <span class="historial-empty-icon">🍽</span>
        <span>Aquí aparecerán<br>las comandas enviadas</span>
      </div>
    `;
    return;
  }

  mesa.historial.forEach((comanda, idx) => {
    const burbuja = document.createElement('div');
    burbuja.className = 'burbuja';
    burbuja.dataset.idx = idx;

    const ticketHTML = renderTicketHTML(comanda.plates);
    const cocinaHTML = renderTicketCocinaHTML(comanda.plates);
    const num = idx + 1;

    burbuja.innerHTML = `
      <div class="burbuja-ticket">${ticketHTML}</div>
      <div class="burbuja-meta">
        <span class="burbuja-num">#${num}${comanda.sentAt ? ` · ${comanda.sentAt}` : ''}</span>
        <button class="btn-expand" data-open="false" aria-expanded="false" aria-label="Ver formato cocina">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          Cocina
        </button>
      </div>
      <div class="cocina-view">${cocinaHTML}</div>
    `;

    const btnExp    = burbuja.querySelector('.btn-expand');
    const cocinaView = burbuja.querySelector('.cocina-view');
    btnExp.addEventListener('click', () => {
      const open = btnExp.dataset.open === 'true';
      btnExp.dataset.open = String(!open);
      btnExp.setAttribute('aria-expanded', String(!open));
      cocinaView.classList.toggle('open', !open);
      btnExp.querySelector('svg').style.transform = !open ? 'rotate(180deg)' : '';
    });

    cont.appendChild(burbuja);
  });
}

/* ─── Renderizado: borrador ──────────────────────────────────── */
function renderBorrador() {
  const cont = document.querySelector('.borrador-section');
  if (!cont) return;

  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;
  const todosVacios = b.platos.every(p => p.items.length === 0 && !p.note.trim());

  if (todosVacios && !b.cantDigitos) {
    cont.innerHTML = '<div class="borrador-empty">Toca un producto para comenzar</div>';
    return;
  }

  const cursor = '<span class="cursor" aria-hidden="true"></span>';
  const lines = [];

  b.platos.forEach((plato, pi) => {
    if (pi > 0) lines.push('<hr class="ticket-sep">');

    const active = pi === b.platos.length - 1;

    if (plato.items.length > 0) {
      const itemsLine = plato.items.map(item => {
        const text = escapeHtml(formatTicketLine(item));
        const isActiveItem = active && item.sku === b.lastSku;
        return isActiveItem ? `<span class="active-item">${text}</span>` : text;
      }).join(' · ');

      if (active && b.cantDigitos) {
        lines.push(itemsLine + ' · <span class="pending-digit">' + escapeHtml(b.cantDigitos) + '</span>' + cursor);
      } else if (active) {
        lines.push(itemsLine + cursor);
      } else {
        lines.push(itemsLine);
      }
    } else if (active) {
      if (b.cantDigitos) {
        lines.push('<span class="pending-digit">' + escapeHtml(b.cantDigitos) + '</span>' + cursor);
      } else {
        lines.push(cursor);
      }
    }

    if (plato.note.trim()) {
      lines.push(`<span class="ticket-note">${escapeHtml(plato.note)}</span>`);
    }
  });

  cont.innerHTML = `<div class="borrador-ticket">${lines.join('\n')}</div>`;
}

/* ─── Renderizado: cantidad ──────────────────────────────────── */
function renderCantidad() {
  const display = document.querySelector('.cantidad-display');
  if (!display) return;

  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;

  if (b.cantDigitos) {
    display.textContent = b.cantDigitos;
    display.classList.remove('placeholder');
  } else {
    display.textContent = '1';
    display.classList.add('placeholder');
  }
}

/* ─── Renderizado: estado de modificadores ───────────────────── */
function renderModStates() {
  const mesa = getMesa(state.currentMesa);
  const b = mesa.borrador;
  const plato = platoActivo(b);

  document.querySelectorAll('.key-mod').forEach(btn => {
    const mod = btn.dataset.mod;
    if (mod === 'C/T') {
      btn.classList.remove('active');
      return;
    }
    const item = b.lastSku ? plato.items.find(i => i.sku === b.lastSku) : null;
    const hasIt = item ? item.mods.includes(mod) : false;
    btn.classList.toggle('active', hasIt);
  });
}

function actualizarEnviadasBadge() {
  const badge = document.querySelector('.comanda-enviadas-badge');
  if (!badge) return;

  const mesa = getMesa(state.currentMesa);
  const n = mesa.historial.length;
  if (n === 0) {
    badge.classList.add('empty');
  } else {
    badge.classList.remove('empty');
    badge.textContent = `${n} ✓`;
  }
}

function actualizarBtnNota() {
  const btn = document.querySelector('.btn-nota');
  if (!btn) return;

  const mesa = getMesa(state.currentMesa);
  const plato = platoActivo(mesa.borrador);
  btn.classList.toggle('has-nota', !!plato.note.trim());
  btn.querySelector('.btn-nota-texto').textContent = plato.note.trim()
    ? plato.note.trim().slice(0, 12) + (plato.note.length > 12 ? '…' : '')
    : 'Nota';
}

/* ─── Renderizado: teclado de modificadores ──────────────────── */
function keyModHTML(m) {
  if (!m.sku || m.enabled === false) {
    return `<button class="key-mod key-disabled" disabled aria-hidden="true"></button>`;
  }
  const sku = escapeHtml(m.sku);
  return `<button class="key-mod" data-mod="${sku}" aria-label="${escapeHtml(modAriaLabel(m.sku))}">${sku}</button>`;
}

function renderModifierRow() {
  const row = document.querySelector('.mods-nota-row');
  if (!row) return;

  const notaBtn = row.querySelector('.btn-nota');
  row.querySelectorAll('.key-mod').forEach(b => b.remove());

  const fragment = document.createDocumentFragment();
  config.modifiers.forEach(m => {
    const tmp = document.createElement('div');
    tmp.innerHTML = keyModHTML(m);
    fragment.appendChild(tmp.firstChild);
  });
  row.insertBefore(fragment, notaBtn);
}

/* ─── Renderizado: teclado de productos ──────────────────────── */
function keyProductoHTML(p) {
  if (!p.sku || p.enabled === false) {
    return `<button class="key-producto key-disabled" disabled aria-hidden="true"></button>`;
  }
  const sku  = escapeHtml(p.sku);
  const name = escapeHtml(p.name || p.sku);
  return `<button class="key-producto" data-sku="${sku}" aria-label="${name}" title="${name}">${sku}</button>`;
}

function renderKeyboardRows() {
  const tacosRow   = document.getElementById('key-row-tacos');
  const bebidasRow = document.getElementById('key-row-bebidas');
  if (!tacosRow || !bebidasRow) return;

  tacosRow.innerHTML   = config.products.tacos.map(p  => keyProductoHTML(p)).join('');
  bebidasRow.innerHTML = config.products.drinks.map(p => keyProductoHTML(p)).join('');
}

/* ─── Construcción del DOM ───────────────────────────────────── */
function buildDOM() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- Pantalla Mesas -->
    <div id="screen-mesas" class="screen mesas-screen active">
      <div class="mesas-header">
        <h1>Comanda <span class="mesas-activas-badge" id="mesas-activas-badge"></span></h1>
        <button class="btn-config" id="btn-config" aria-label="Configuración">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
      <div class="mesa-grid" id="mesa-grid"></div>
      <div class="especiales-section">
        <div class="especiales-label">Pedidos especiales</div>
        <div class="especiales-grid" id="especiales-grid"></div>
      </div>
    </div>

    <!-- Pantalla Comanda -->
    <div id="screen-comanda" class="screen comanda-screen">

      <!-- Header -->
      <header class="comanda-header">
        <button class="btn-back" id="btn-back" aria-label="Volver a mesas">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="comanda-title" id="comanda-title"></span>
        <span class="comanda-enviadas-badge empty"></span>
      </header>

      <!-- Historial -->
      <div class="comanda-historial"></div>

      <!-- Borrador -->
      <div class="borrador-section"></div>

      <!-- Teclado -->
      <div class="teclado">

        <!-- Números -->
        <div class="key-row">
          ${[1,2,3,4,5,6,7,8,9,0].map(d =>
            `<button class="key-num" data-digit="${d}">${d}</button>`
          ).join('')}
        </div>

        <!-- Tacos (poblado por renderKeyboardRows()) -->
        <div class="key-row" id="key-row-tacos"></div>

        <!-- Bebidas (poblado por renderKeyboardRows()) -->
        <div class="key-row" id="key-row-bebidas"></div>

        <!-- Nota input (visible al editar) -->
        <div class="nota-input-wrapper">
          <div class="nota-input-row">
            <input class="nota-input" type="text" placeholder="Nota para este plato…" maxlength="120">
            <button class="btn-nota-confirm">OK</button>
          </div>
          <span class="nota-counter" aria-live="polite"></span>
        </div>

        <!-- Modificadores + Nota (poblado por renderModifierRow()) -->
        <div class="key-row mods-nota-row">
          <button class="btn-nota">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span class="btn-nota-texto">Nota</span>
          </button>
        </div>

        <!-- Control -->
        <div class="control-row">
          <button class="btn-borrar" id="btn-borrar" aria-label="Borrar">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <line x1="18" y1="9" x2="13" y2="14"/>
              <line x1="13" y1="9" x2="18" y2="14"/>
            </svg>
          </button>
          <button class="btn-siguiente" id="btn-siguiente">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Siguiente plato
          </button>
          <button class="btn-enviar" id="btn-enviar">
            Enviar
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

      </div><!-- /.teclado -->

    </div><!-- /#screen-comanda -->

    <!-- Pantalla Configuración -->
    <div id="screen-config" class="screen config-screen">

      <header class="config-header">
        <button class="btn-back" id="btn-config-back" aria-label="Volver sin guardar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="config-title">Configuración</span>
      </header>

      <div class="config-body">

        <!-- Sección: Mesero -->
        <section class="config-section">
          <h2 class="config-section-title">Mesero</h2>
          <div class="config-field">
            <label class="config-label" for="input-waiter-name">Nombre del mesero</label>
            <input type="text" id="input-waiter-name" class="config-input"
                   placeholder="Sin nombre" maxlength="40" autocomplete="off">
          </div>
          <div class="config-field">
            <label class="config-label" for="input-table-count">Número de mesas</label>
            <input type="number" id="input-table-count" class="config-input"
                   min="1" max="20" inputmode="numeric" autocomplete="off">
          </div>
        </section>

        <!-- Sección: Productos -->
        <section class="config-section">
          <h2 class="config-section-title">Productos</h2>

          <div class="config-subsection-title">Tacos</div>
          <div class="config-product-list">
            ${Array.from({ length: 10 }, (_, i) => `
              <div class="config-product-row" data-group="tacos" data-idx="${i}">
                <button class="config-product-toggle"
                        data-group="tacos" data-idx="${i}"
                        aria-pressed="true"
                        aria-label="Activar taco ${i + 1}">
                  <span class="toggle-pill" aria-hidden="true"></span>
                </button>
                <input type="text" class="config-sku-input"
                       data-group="tacos" data-idx="${i}"
                       maxlength="4" placeholder="—" autocomplete="off"
                       aria-label="Abreviatura taco ${i + 1}">
                <input type="text" class="config-name-input"
                       data-group="tacos" data-idx="${i}"
                       placeholder="Nombre completo" autocomplete="off"
                       aria-label="Nombre taco ${i + 1}">
              </div>
            `).join('')}
          </div>
          <button class="btn-agregar-slot" data-group="tacos" type="button">+ Agregar</button>

          <div class="config-subsection-title config-subsection-title--spaced">Bebidas</div>
          <div class="config-product-list">
            ${Array.from({ length: 10 }, (_, i) => `
              <div class="config-product-row" data-group="drinks" data-idx="${i}">
                <button class="config-product-toggle"
                        data-group="drinks" data-idx="${i}"
                        aria-pressed="true"
                        aria-label="Activar bebida ${i + 1}">
                  <span class="toggle-pill" aria-hidden="true"></span>
                </button>
                <input type="text" class="config-sku-input"
                       data-group="drinks" data-idx="${i}"
                       maxlength="4" placeholder="—" autocomplete="off"
                       aria-label="Abreviatura bebida ${i + 1}">
                <input type="text" class="config-name-input"
                       data-group="drinks" data-idx="${i}"
                       placeholder="Nombre completo" autocomplete="off"
                       aria-label="Nombre bebida ${i + 1}">
              </div>
            `).join('')}
          </div>
          <button class="btn-agregar-slot" data-group="drinks" type="button">+ Agregar</button>
        </section>

        <!-- Sección: Modificadores -->
        <section class="config-section">
          <h2 class="config-section-title">Modificadores</h2>
          <div class="config-product-list">
            ${Array.from({ length: 7 }, (_, i) => `
              <div class="config-product-row" data-group="modifiers" data-idx="${i}">
                <button class="config-product-toggle"
                        data-group="modifiers" data-idx="${i}"
                        aria-pressed="true"
                        aria-label="Activar modificador ${i + 1}">
                  <span class="toggle-pill" aria-hidden="true"></span>
                </button>
                <input type="text" class="config-sku-input"
                       data-group="modifiers" data-idx="${i}"
                       maxlength="4" placeholder="—" autocomplete="off"
                       aria-label="Abreviatura modificador ${i + 1}">
                <input type="text" class="config-name-input"
                       data-group="modifiers" data-idx="${i}"
                       placeholder="Nombre completo" autocomplete="off"
                       aria-label="Nombre modificador ${i + 1}">
              </div>
            `).join('')}
          </div>
          <button class="btn-agregar-slot" data-group="modifiers" type="button">+ Agregar</button>
        </section>

        <!-- Sección: Impresora -->
        <section class="config-section">
          <h2 class="config-section-title">Impresora</h2>
          <div class="config-printer-status empty" id="config-printer-status">Sin impresora configurada</div>

          <button class="btn-buscar-impresora" id="btn-buscar-impresora" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Buscar en mi red
          </button>

          <div class="config-printer-result" id="config-printer-result"></div>

          <div class="config-field">
            <label class="config-label" for="input-printer-ip">IP manual</label>
            <input type="text" id="input-printer-ip" class="config-input"
                   placeholder="192.168.1.42" maxlength="15"
                   inputmode="decimal" autocomplete="off">
          </div>

          <button class="btn-probar-impresora hidden" id="btn-probar-impresora" type="button">
            Probar conexión
          </button>
        </section>

        <!-- Guardar -->
        <div class="config-footer">
          <button class="btn-guardar-config" id="btn-guardar-config" type="button">Guardar</button>
        </div>

      </div><!-- /.config-body -->

    </div><!-- /#screen-config -->
  `;
}

/* ─── Toast ──────────────────────────────────────────────────── */
let toastTimer = null;

function showToast(msg) {
  let toast = document.getElementById('sku-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'sku-toast';
    document.getElementById('app').appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1400);
}

/* ─── Registro de eventos ────────────────────────────────────── */
function bindEvents() {
  const app = document.getElementById('app');

  // Long-press en teclas de producto → muestra nombre completo
  let longPressTimer = null;
  app.addEventListener('touchstart', e => {
    const prodBtn = e.target.closest('[data-sku]');
    const modBtn  = e.target.closest('[data-mod]');
    if (prodBtn) {
      longPressTimer = setTimeout(() => {
        const producto = findProducto(prodBtn.dataset.sku);
        if (producto) showToast(producto.name);
      }, 500);
    } else if (modBtn) {
      longPressTimer = setTimeout(() => {
        showToast(modAriaLabel(modBtn.dataset.mod));
      }, 500);
    }
  }, { passive: true });
  app.addEventListener('touchend',  () => clearTimeout(longPressTimer));
  app.addEventListener('touchmove', () => clearTimeout(longPressTimer));

  // Delegación de eventos principal
  app.addEventListener('click', e => {

    // Configuración — abrir
    if (e.target.closest('#btn-config')) {
      abrirConfig();
      return;
    }

    // Configuración — volver sin guardar
    if (e.target.closest('#btn-config-back')) {
      volverDeConfig();
      return;
    }

    // Configuración — guardar
    if (e.target.closest('#btn-guardar-config')) {
      guardarConfig();
      return;
    }

    // Impresora — buscar
    if (e.target.closest('#btn-buscar-impresora')) {
      buscarImpresora();
      return;
    }

    // Impresora — probar
    if (e.target.closest('#btn-probar-impresora')) {
      probarImpresora();
      return;
    }

    // Revelar siguiente slot vacío en config
    const agregarBtn = e.target.closest('.btn-agregar-slot');
    if (agregarBtn) {
      const group = agregarBtn.dataset.group;
      const rows = document.querySelectorAll(`.config-product-row[data-group="${group}"]`);
      for (const row of rows) {
        if (row.classList.contains('slot-oculto')) {
          row.classList.remove('slot-oculto');
          const skuInput = row.querySelector('.config-sku-input');
          if (skuInput) skuInput.focus();
          const quedanOcultos = Array.from(rows).some(r => r.classList.contains('slot-oculto'));
          if (!quedanOcultos) agregarBtn.style.display = 'none';
          break;
        }
      }
      return;
    }

    // Toggle de producto en config
    const toggleBtn = e.target.closest('.config-product-toggle');
    if (toggleBtn) {
      const pressed = toggleBtn.getAttribute('aria-pressed') === 'true';
      toggleBtn.setAttribute('aria-pressed', String(!pressed));
      toggleBtn.closest('.config-product-row').classList.toggle('disabled', pressed);
      return;
    }

    if (state.currentMesa === null) return;

    // Dígitos
    const digitBtn = e.target.closest('[data-digit]');
    if (digitBtn) {
      accionDigito(digitBtn.dataset.digit);
      return;
    }

    // Atajos de cantidad
    const shortcut = e.target.closest('[data-n]');
    if (shortcut) {
      accionAtajo(Number(shortcut.dataset.n));
      return;
    }

    // Productos
    const prodBtn = e.target.closest('[data-sku]');
    if (prodBtn) {
      accionProducto(prodBtn.dataset.sku);
      return;
    }

    // Modificadores
    const modBtn = e.target.closest('[data-mod]');
    if (modBtn) {
      accionMod(modBtn.dataset.mod);
      return;
    }

    // Borrar
    if (e.target.closest('#btn-borrar')) {
      accionBorrar();
      return;
    }

    // Siguiente plato
    if (e.target.closest('#btn-siguiente')) {
      accionSiguientePlato();
      return;
    }

    // Enviar
    if (e.target.closest('#btn-enviar')) {
      accionEnviar();
      return;
    }

    // Nota — abrir
    if (e.target.closest('.btn-nota') && !e.target.closest('.nota-input-wrapper')) {
      abrirNota();
      return;
    }

    // Nota — confirmar
    if (e.target.closest('.btn-nota-confirm')) {
      cerrarNota();
      actualizarBtnNota();
      return;
    }
  });

  // Volver a mesas desde comanda
  app.addEventListener('click', e => {
    if (e.target.closest('#btn-back')) {
      volverAMesas();
    }
  });

  // Guardar nota al salir del input (blur)
  app.addEventListener('blur', e => {
    if (e.target.classList.contains('nota-input')) {
      const mesa = getMesa(state.currentMesa);
      if (mesa && mesa.borrador.notaEditando) {
        cerrarNota();
        actualizarBtnNota();
      }
    }
  }, true);

  // Contador de caracteres en nota
  app.addEventListener('input', e => {
    if (e.target.classList.contains('nota-input')) {
      const remaining = 120 - e.target.value.length;
      const counter = document.querySelector('.nota-counter');
      if (!counter) return;
      if (remaining <= 40) {
        counter.textContent = `${remaining}`;
        counter.classList.add('visible');
        counter.classList.toggle('warning', remaining <= 15);
      } else {
        counter.textContent = '';
        counter.classList.remove('visible', 'warning');
      }
    }

    // Forzar mayúsculas en campos SKU
    if (e.target.classList.contains('config-sku-input')) {
      const pos = e.target.selectionStart;
      e.target.value = e.target.value.toUpperCase();
      e.target.setSelectionRange(pos, pos);
    }
  });

  // Enter en nota input
  app.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList.contains('nota-input')) {
      cerrarNota();
      actualizarBtnNota();
    }
  });
}

/* ─── Util ───────────────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Init ───────────────────────────────────────────────────── */
function init() {
  loadConfig();
  loadState();
  buildDOM();
  renderKeyboardRows();
  renderModifierRow();
  bindEvents();
  renderMesas();
}

document.addEventListener('DOMContentLoaded', init);
