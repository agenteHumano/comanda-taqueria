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

const PRODUCTOS = [...TACOS, ...BEBIDAS];

const MODIFICADORES = ['C/T', 'S/V', 'S/C', 'S/Ci'];

const ESPECIALES = [
  { id: 'PR', label: 'Para recoger', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>` },
  { id: 'PE', label: 'Para enviar',  icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>` },
  { id: 'PA_ASIGNAR', label: 'Por asignar', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>` },
];

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

/* ─── Persistencia ───────────────────────────────────────────── */
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
  const producto = PRODUCTOS.find(p => p.sku === sku);

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
    // Flash sutil en el borrador para confirmar la eliminación
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

  if (plato.items.length === 0) return; // sin efecto si plato vacío

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

  // Si la nota estaba abierta, guardarla antes de enviar
  if (b.notaEditando) {
    const input = document.querySelector('.nota-input');
    if (input) platoActivo(b).note = input.value.trim();
    b.notaEditando = false;
  }

  // Filtrar platos sin items ni nota
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

  // Exponer objeto estructurado para integración futura
  console.log('[comanda-taqueria] nueva comanda:', JSON.stringify(comanda, null, 2));

  // Feedback háptico al enviar (si el dispositivo lo soporta)
  if (navigator.vibrate) navigator.vibrate(60);

  saveState();
  renderHistorial();
  renderBorrador();
  renderCantidad();
  renderModStates();
  actualizarEnviadasBadge();

  // Scroll historial al fondo
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
  const map = { 'S/V': 'sin verdura', 'S/C': 'sin cebolla', 'S/Ci': 'sin cilantro', 'C/T': 'con todo' };
  return map[mod] || mod;
}

function modAriaLabel(mod) {
  const map = { 'C/T': 'Con todo (limpiar modificadores)', 'S/V': 'Sin verdura', 'S/C': 'Sin cebolla', 'S/Ci': 'Sin cilantro' };
  return map[mod] || mod;
}

/* ─── Renderizado: Pantalla Mesas ────────────────────────────── */
function renderMesas() {
  const grid = document.getElementById('mesa-grid');
  const especiales = document.getElementById('especiales-grid');
  if (!grid || !especiales) return;

  grid.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    grid.appendChild(buildMesaCard(i, String(i)));
  }

  especiales.innerHTML = '';
  ESPECIALES.forEach(e => {
    especiales.appendChild(buildEspecialCard(e));
  });

  // Contador de mesas activas en el header
  const allIds = [1,2,3,4,5,6,7,8,9,10, ...ESPECIALES.map(e => e.id)];
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

  // Título del header
  const title = document.getElementById('comanda-title');
  if (title) {
    if (typeof id === 'number') {
      title.textContent = `Mesa ${id}`;
    } else {
      const especial = ESPECIALES.find(e => e.id === id);
      title.textContent = especial ? especial.label : id;
    }
  }

  renderHistorial();
  renderBorrador();
  renderCantidad();
  renderModStates();
  actualizarEnviadasBadge();
  actualizarBtnNota();

  // Scroll historial al fondo
  setTimeout(() => {
    const hist = document.querySelector('.comanda-historial');
    if (hist) hist.scrollTop = hist.scrollHeight;
  }, 0);

  mostrarScreen('comanda');
}

function volverAMesas() {
  const mesa = state.currentMesa ? getMesa(state.currentMesa) : null;
  if (mesa && mesa.borrador.notaEditando) cerrarNota();

  // Avisar que el borrador persiste si hay algo capturado
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

    const btnExp = burbuja.querySelector('.btn-expand');
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

  if (todosVacios) {
    cont.innerHTML = '<div class="borrador-empty">Toca un producto para comenzar</div>';
    return;
  }

  // Construir HTML del ticket: una línea por plato, items separados por " · "
  const lines = [];
  b.platos.forEach((plato, pi) => {
    if (pi > 0) lines.push('<hr class="ticket-sep">');
    if (plato.items.length > 0) {
      const isActivePlate = pi === b.platos.length - 1;
      const itemsLine = plato.items.map(item => {
        const text = escapeHtml(formatTicketLine(item));
        const isActive = isActivePlate && item.sku === b.lastSku;
        return isActive ? `<span class="active-item">${text}</span>` : text;
      }).join(' · ');
      lines.push(itemsLine);
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

/* ─── Construcción del DOM ───────────────────────────────────── */
function buildDOM() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- Pantalla Mesas -->
    <div id="screen-mesas" class="screen mesas-screen active">
      <div class="mesas-header">
        <h1>Comanda <span class="mesas-activas-badge" id="mesas-activas-badge"></span></h1>
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

        <!-- Tacos -->
        <div class="key-row">
          ${TACOS.map(p =>
            `<button class="key-producto" data-sku="${p.sku}" aria-label="${p.name}" title="${p.name}">${p.sku}</button>`
          ).join('')}
        </div>

        <!-- Bebidas -->
        <div class="key-row">
          ${BEBIDAS.map(p =>
            `<button class="key-producto" data-sku="${p.sku}" aria-label="${p.name}" title="${p.name}">${p.sku}</button>`
          ).join('')}
        </div>

        <!-- Nota input (visible al editar) -->
        <div class="nota-input-wrapper">
          <div class="nota-input-row">
            <input class="nota-input" type="text" placeholder="Nota para este plato…" maxlength="120">
            <button class="btn-nota-confirm">OK</button>
          </div>
          <span class="nota-counter" aria-live="polite"></span>
        </div>

        <!-- Modificadores + Nota -->
        <div class="key-row mods-nota-row">
          ${MODIFICADORES.map(m =>
            `<button class="key-mod" data-mod="${m}" aria-label="${modAriaLabel(m)}">${m}</button>`
          ).join('')}
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
        const producto = PRODUCTOS.find(p => p.sku === prodBtn.dataset.sku);
        if (producto) showToast(producto.name);
      }, 500);
    } else if (modBtn) {
      longPressTimer = setTimeout(() => {
        showToast(modAriaLabel(modBtn.dataset.mod));
      }, 500);
    }
  }, { passive: true });
  app.addEventListener('touchend', () => clearTimeout(longPressTimer));
  app.addEventListener('touchmove', () => clearTimeout(longPressTimer));

  // Delegación de eventos para el teclado
  app.addEventListener('click', e => {
    if (state.currentMesa === null) return;

    const mesa = getMesa(state.currentMesa);

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

  // Volver a mesas
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
    if (!e.target.classList.contains('nota-input')) return;
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
  loadState();
  buildDOM();
  bindEvents();
  renderMesas();
}

document.addEventListener('DOMContentLoaded', init);
