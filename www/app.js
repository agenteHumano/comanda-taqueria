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
  keyboardSize: 'normal',
  theme: 'auto',
  products: {
    tacos:  TACOS.map(p  => ({ ...p })),
    drinks: BEBIDAS.map(p => ({ ...p })),
  },
  modifiers: DEFAULT_MODIFIERS.map(m => ({ ...m })),
  printer: { ip: '' },
};

const isNative = window.Capacitor?.isNativePlatform?.() ?? false;

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
      if (Array.isArray(parsed) && parsed.length === 10)
        config.products.tacos = parsed.map(p => ({ ...p, price: Number(p.price) || 0 }));
    }
    if (rawDrinks) {
      const parsed = JSON.parse(rawDrinks);
      if (Array.isArray(parsed) && parsed.length === 10)
        config.products.drinks = parsed.map(p => ({ ...p, price: Number(p.price) || 0 }));
    }

    const rawModifiers = localStorage.getItem('config.modifiers');
    if (rawModifiers) {
      const parsed = JSON.parse(rawModifiers);
      if (Array.isArray(parsed) && parsed.length === 7) config.modifiers = parsed;
    }

    config.printer.ip = localStorage.getItem('config.printer.ip') || '';

    const rawKbSize = localStorage.getItem('config.keyboardSize');
    if (['normal', 'large', 'xlarge'].includes(rawKbSize)) config.keyboardSize = rawKbSize;

    const rawTheme = localStorage.getItem('config.theme');
    if (['auto', 'light', 'dark'].includes(rawTheme)) config.theme = rawTheme;
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
    localStorage.setItem('config.keyboardSize', config.keyboardSize);
    localStorage.setItem('config.theme',        config.theme);
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
  return { sku: p.sku, name: p.name || p.sku, price: Number(p.price) || 0 };
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
    plato.items.push({ sku, name: producto.name, qty: cant, mods: [], unitPrice: producto.price || 0 });
  }

  b.lastSku = sku;
  b.cantDigitos = '';
  saveState();
  renderBorrador();
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
  renderModStates();
}

function nextComandaNum() {
  const last = parseInt(localStorage.getItem('config.lastComandaNum'), 10) || 0;
  const next = last + 1;
  localStorage.setItem('config.lastComandaNum', String(next));
  return next;
}

function formatSentAtDisplay(sentAt) {
  if (!sentAt) return '';
  if (sentAt.length > 5) {
    const d = new Date(sentAt);
    if (!isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
  }
  return sentAt;
}

function esDeHoy(sentAt) {
  if (!sentAt) return true;
  const d = new Date(sentAt);
  if (isNaN(d.getTime())) return true;
  const hoy = new Date();
  return d.getFullYear() === hoy.getFullYear() &&
         d.getMonth()    === hoy.getMonth() &&
         d.getDate()     === hoy.getDate();
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
    sentAt: now.toISOString(),
    comandaNum: nextComandaNum(),
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

/* ─── Impresión ESC/POS ──────────────────────────────────────── */
function uint8ArrayToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function encodePC858(str) {
  const MAP = {
    'á':0xA0,'é':0x82,'í':0xA1,'ó':0xA2,'ú':0xA3,'ñ':0xA4,
    'Á':0x41,'É':0x90,'Í':0xD6,'Ó':0xE0,'Ú':0xE9,'Ñ':0xA5,
    'ü':0x81,'Ü':0x9A,'¡':0xAD,'¿':0xA8,'€':0xD5,
  };
  const out = [];
  for (const ch of str) {
    if (ch.charCodeAt(0) < 0x80) out.push(ch.charCodeAt(0));
    else if (MAP[ch] !== undefined) out.push(MAP[ch]);
    else out.push(0x3F);
  }
  return out;
}

function stripAndEncodeASCII(str) {
  const STRIP = {
    'á':'a','é':'e','í':'i','ó':'o','ú':'u',
    'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U',
    'ñ':'n','Ñ':'N','ü':'u','Ü':'U','¡':'!','¿':'?','€':'E',
  };
  const out = [];
  for (const ch of str) {
    const mapped = STRIP[ch] ?? ch;
    if (mapped.charCodeAt(0) < 0x80) out.push(mapped.charCodeAt(0));
    else out.push(0x3F);
  }
  return out;
}

function formatTicket(comanda) {
  const ENCODING = 'pc858'; // 'pc858' | 'strip'
  const WIDTH = 48;
  const ESC   = 0x1B;
  const GS    = 0x1D;
  const CMD   = {
    INIT:     [ESC, 0x40],
    CODEPAGE: [ESC, 0x74, 0x13],
    BOLD_ON:  [ESC, 0x45, 0x01],
    BOLD_OFF: [ESC, 0x45, 0x00],
    CENTER:   [ESC, 0x61, 0x01],
    LEFT:     [ESC, 0x61, 0x00],
    LF:       [0x0A],
    CUT:      [GS, 0x56, 0x42, 0x00],
  };

  const encode = ENCODING === 'pc858' ? encodePC858 : stripAndEncodeASCII;

  const parts = [];
  const cmd  = (c)   => parts.push(c);
  const line = (str) => parts.push(encode(str), CMD.LF);

  cmd(CMD.INIT);
  if (ENCODING === 'pc858') cmd(CMD.CODEPAGE);
  cmd(CMD.CENTER);
  line('='.repeat(WIDTH));
  cmd(CMD.BOLD_ON);
  const label = typeof comanda.table === 'number' ? `MESA ${comanda.table}`
    : comanda.table === 'PR' ? 'PARA RECOGER'
    : comanda.table === 'PE' ? 'PARA ENVIAR'
    : 'POR ASIGNAR';
  line(label);
  cmd(CMD.BOLD_OFF);
  if (config.waiterName) line(config.waiterName);
  line(formatSentAtDisplay(comanda.sentAt));
  line('='.repeat(WIDTH));

  const hasPrice = comanda.plates.some(plate => plate.items.some(i => i.unitPrice > 0));

  cmd(CMD.LEFT);
  comanda.plates.forEach((plate, pi) => {
    if (pi > 0) line('-'.repeat(WIDTH));
    line(`Plato ${pi + 1}`);
    plate.items.forEach(item => {
      if (hasPrice) {
        const modsStr = item.mods.length > 0 ? '  ' + item.mods.join('  ') : '';
        const left = `${item.qty}x ${item.name}${modsStr}`;
        const lineTotal = (item.unitPrice || 0) > 0 ? item.qty * item.unitPrice : 0;
        const right = lineTotal > 0 ? `$${lineTotal}` : '';
        const innerWidth = WIDTH - 2;
        const content = right
          ? left.padEnd(innerWidth - right.length) + right
          : left;
        line(`  ${content}`);
      } else {
        const mods = item.mods.length > 0 ? '  ' + item.mods.join('  ') : '';
        line(`  ${item.qty}x ${item.name}${mods}`);
      }
    });
    if (plate.note) line(`  ${plate.note}`);
  });

  if (hasPrice) {
    const total = comanda.plates
      .flatMap(p => p.items)
      .reduce((sum, i) => sum + (i.unitPrice || 0) * i.qty, 0);
    line('-'.repeat(WIDTH));
    const totalStr = `TOTAL: $${total}`;
    line(totalStr.padStart(WIDTH));
  }

  line('='.repeat(WIDTH));
  cmd(CMD.CUT);

  return new Uint8Array(parts.flat());
}

async function printTicket(bytes) {
  if (!config.printer.ip) {
    showToast('Configura la IP de la impresora en Ajustes.');
    return;
  }
  if (!isNative) {
    showToast('Impresión disponible en la app instalada.');
    return;
  }

  const TcpSocket = window.Capacitor?.Plugins?.TcpSocket;
  if (!TcpSocket) {
    showToast('Plugin de impresión no disponible.');
    return;
  }

  let clientId = null;
  try {
    const result = await Promise.race([
      TcpSocket.connect({ ipAddress: config.printer.ip, port: 9100 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    clientId = result.client;
    await TcpSocket.send({ client: clientId, data: uint8ArrayToBase64(bytes), encoding: 'base64' });
    await TcpSocket.disconnect({ client: clientId });
    showToast('Impreso ✓');
  } catch (_) {
    if (clientId !== null) {
      try { await TcpSocket.disconnect({ client: clientId }); } catch (_) {}
    }
    showToast('No se pudo conectar a la impresora. Verifica que esté encendida y en la misma red.');
  }
}

/* ─── Resumen del día ───────────────────────────────────────── */
function formatResumenDia(grupos, hoy) {
  const WIDTH = 48;
  const enc   = new TextEncoder();
  const ESC   = 0x1B;
  const GS    = 0x1D;
  const CMD = {
    INIT:     [ESC, 0x40],
    BOLD_ON:  [ESC, 0x45, 0x01],
    BOLD_OFF: [ESC, 0x45, 0x00],
    CENTER:   [ESC, 0x61, 0x01],
    LEFT:     [ESC, 0x61, 0x00],
    LF:       [0x0A],
    CUT:      [GS, 0x56, 0x42, 0x00],
  };

  const parts = [];
  const cmd  = (c)   => parts.push(c);
  const line = (str) => parts.push(Array.from(enc.encode(str)), CMD.LF);
  const ral  = (left, right) =>
    left + ' '.repeat(Math.max(1, WIDTH - left.length - right.length)) + right;

  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const fechaStr = `${hoy.getDate()} ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;

  cmd(CMD.INIT);
  cmd(CMD.CENTER);
  line('='.repeat(WIDTH));
  cmd(CMD.BOLD_ON);
  line('RESUMEN DEL DIA');
  cmd(CMD.BOLD_OFF);
  line(fechaStr);
  line('='.repeat(WIDTH));

  cmd(CMD.LEFT);
  let grandTotal = 0;

  grupos.forEach((grupo, gi) => {
    if (gi > 0) line('-'.repeat(WIDTH));
    cmd(CMD.BOLD_ON);
    line(grupo.label);
    cmd(CMD.BOLD_OFF);

    let subtotal = 0;
    grupo.comandas.forEach(comanda => {
      const numStr = comanda.comandaNum != null ? `#${comanda.comandaNum}` : '-';
      if (comanda.cancelled) {
        line(`  Comanda ${numStr}  CANCELADA`);
      } else {
        const total = comanda.plates
          .flatMap(p => p.items)
          .reduce((s, i) => s + (i.unitPrice || 0) * i.qty, 0);
        line(ral(`  Comanda ${numStr}`, `$${total}.00`));
        subtotal += total;
      }
    });

    line(`  ${'-'.repeat(20)}`);
    line(ral('  Subtotal:', `$${subtotal}.00`));
    grandTotal += subtotal;
  });

  line('='.repeat(WIDTH));
  cmd(CMD.BOLD_ON);
  line(ral('TOTAL:', `$${grandTotal}.00`));
  cmd(CMD.BOLD_OFF);
  line('='.repeat(WIDTH));
  cmd(CMD.CUT);

  return new Uint8Array(parts.flat());
}

async function imprimirResumenDia() {
  if (!config.printer.ip || !isNative) {
    showToast('Impresora no configurada');
    return;
  }

  const ORDEN_ESPECIALES = ['PR', 'PE', 'PA_ASIGNAR'];
  const LABELS_ESPECIALES = { PR: 'Para recoger', PE: 'Para enviar', PA_ASIGNAR: 'Por asignar' };
  const hoy = new Date();
  const grupos = [];

  for (let i = 1; i <= config.tableCount; i++) {
    if (!state.mesas.has(i)) continue;
    const comandasHoy = state.mesas.get(i).historial.filter(c => esDeHoy(c.sentAt));
    if (comandasHoy.length > 0) grupos.push({ label: `Mesa ${i}`, comandas: comandasHoy });
  }

  ORDEN_ESPECIALES.forEach(id => {
    if (!state.mesas.has(id)) return;
    const comandasHoy = state.mesas.get(id).historial.filter(c => esDeHoy(c.sentAt));
    if (comandasHoy.length > 0) grupos.push({ label: LABELS_ESPECIALES[id], comandas: comandasHoy });
  });

  if (grupos.length === 0) {
    showToast('Sin comandas hoy');
    return;
  }

  await printTicket(formatResumenDia(grupos, hoy));
}

/* ─── Renderizado: Pantalla Mesas ────────────────────────────── */
function buildStatusText(mesa) {
  const hasBorrador = mesa.borrador.platos.some(p => p.items.length > 0 || p.note.trim());
  const numEnviadas = mesa.historial.filter(c => !c.cancelled).length;
  return {
    hasBorrador,
    numEnviadas,
    statusText: hasBorrador
      ? 'en construcción'
      : numEnviadas > 0
        ? `${numEnviadas} enviada${numEnviadas !== 1 ? 's' : ''}`
        : '',
  };
}

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

  const btnResumen = document.getElementById('btn-resumen-dia');
  if (btnResumen) btnResumen.style.display = config.printer.ip ? '' : 'none';
}

function buildMesaCard(id, label) {
  const mesa = getMesa(id);
  const { hasBorrador, numEnviadas, statusText } = buildStatusText(mesa);

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
  const { hasBorrador, numEnviadas, statusText } = buildStatusText(mesa);

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
      const priceInput  = document.querySelector(`.config-price-input[data-group="${group}"][data-idx="${i}"]`);
      const toggleBtn   = document.querySelector(`.config-product-toggle[data-group="${group}"][data-idx="${i}"]`);
      if (skuInput)   skuInput.value   = p.sku;
      if (nameInput)  nameInput.value  = p.name;
      if (priceInput) priceInput.value = p.price > 0 ? p.price : '';
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

  document.querySelectorAll('.keyboard-size-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.size === config.keyboardSize));
  });

  actualizarPrinterStatus();
  mostrarScreen('config');

  const localIPEl = document.getElementById('config-local-ip');
  if (localIPEl) {
    localIPEl.textContent = '';
    getLocalIP().then(ip => {
      if (ip && localIPEl) localIPEl.textContent = `Tu red: ${ip.split('.').slice(0, 3).join('.')}.x`;
    });
  }
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
    const slotCount = group === 'tacos' ? TACOS.length : BEBIDAS.length;
    for (let i = 0; i < slotCount; i++) {
      const skuInput   = document.querySelector(`.config-sku-input[data-group="${group}"][data-idx="${i}"]`);
      const nameInput  = document.querySelector(`.config-name-input[data-group="${group}"][data-idx="${i}"]`);
      const priceInput = document.querySelector(`.config-price-input[data-group="${group}"][data-idx="${i}"]`);
      const toggleBtn  = document.querySelector(`.config-product-toggle[data-group="${group}"][data-idx="${i}"]`);
      const sku     = skuInput  ? skuInput.value.trim().toUpperCase().slice(0, 4) : '';
      const name    = nameInput ? nameInput.value.trim() : '';
      const enabled = toggleBtn ? toggleBtn.getAttribute('aria-pressed') !== 'false' : true;
      const price   = priceInput ? (parseInt(priceInput.value, 10) || 0) : 0;
      products.push({ sku, name: name || sku, enabled, price });
    }
    if (group === 'tacos') config.products.tacos  = products;
    else                   config.products.drinks = products;
  });

  // Modifiers
  const modifiers = [];
  for (let i = 0; i < DEFAULT_MODIFIERS.length; i++) {
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

  const activeSizeBtn = document.querySelector('.keyboard-size-btn[aria-pressed="true"]');
  config.keyboardSize = activeSizeBtn ? activeSizeBtn.dataset.size : 'normal';

  saveConfig();
  renderKeyboardRows();
  renderModifierRow();
  applyKeyboardSize();
  volverDeConfig();
  showToast('Configuración guardada');
}

function applyKeyboardSize() {
  const teclado = document.querySelector('.teclado');
  if (!teclado) return;
  teclado.classList.remove('teclado--large', 'teclado--xlarge');
  if (config.keyboardSize === 'large')  teclado.classList.add('teclado--large');
  if (config.keyboardSize === 'xlarge') teclado.classList.add('teclado--xlarge');
}

function themeIconHTML(theme) {
  if (theme === 'light') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  }
  if (theme === 'dark') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`;
}

function applyTheme() {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (config.theme === 'light') root.classList.add('theme-light');
  if (config.theme === 'dark')  root.classList.add('theme-dark');
}

function actualizarBtnTheme() {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  btn.innerHTML = themeIconHTML(config.theme);
  const labels = { auto: 'Tema: automático', light: 'Tema: claro', dark: 'Tema: oscuro' };
  btn.setAttribute('aria-label', labels[config.theme] || 'Cambiar tema');
}

function ciclarTema() {
  const ciclo = { auto: 'light', light: 'dark', dark: 'auto' };
  config.theme = ciclo[config.theme] || 'auto';
  localStorage.setItem('config.theme', config.theme);
  applyTheme();
  actualizarBtnTheme();
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

function getLocalIP() {
  return new Promise((resolve) => {
    let resolved = false;
    let pc;
    try {
      pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => { if (!resolved) { resolved = true; resolve(null); } });

      pc.onicecandidate = (e) => {
        if (resolved || !e.candidate) return;
        const match = /(\d+\.\d+\.\d+\.\d+)/.exec(e.candidate.candidate);
        if (match && !match[1].startsWith('169.254')) {
          resolved = true;
          resolve(match[1]);
          try { pc.close(); } catch (_) {}
        }
      };
    } catch (_) {
      resolved = true;
      resolve(null);
      return;
    }
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
        try { pc.close(); } catch (_) {}
      }
    }, 5000);
  });
}

async function probarIP(ip, timeoutMs = 3000) {
  if (!isNative) return false;
  const TcpSocket = window.Capacitor?.Plugins?.TcpSocket;
  if (!TcpSocket) return false;

  let clientId = null;
  try {
    const result = await Promise.race([
      TcpSocket.connect({ ipAddress: ip, port: 9100 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
    clientId = result.client;
    await TcpSocket.send({
      client: clientId,
      data: btoa(String.fromCharCode(0x1B, 0x40)),
      encoding: 'base64'
    });
    await TcpSocket.disconnect({ client: clientId });
    return true;
  } catch (e) {
    if (clientId !== null) {
      try { await TcpSocket.disconnect({ client: clientId }); } catch (_) {}
    }
    return false;
  }
}


async function buscarImpresora() {
  const btn    = document.getElementById('btn-buscar-impresora');
  const result = document.getElementById('config-printer-result');
  if (!result) return;

  btn.disabled = true;

  if (!isNative) {
    setTimeout(() => {
      btn.disabled = false;
      result.innerHTML = `<div class="printer-result-msg">La búsqueda automática estará disponible cuando instales la app. Ingresa la IP manualmente.</div>`;
    }, 1500);
    result.innerHTML = `<div class="printer-spinner"><span class="spinner"></span> Buscando impresora en la red...</div>`;
    return;
  }

  const setStatus = (msg) => {
    result.innerHTML = `<div class="printer-spinner"><span class="spinner"></span> ${escapeHtml(msg)}</div>`;
  };

  const TcpSocket = window.Capacitor?.Plugins?.TcpSocket;
  if (!TcpSocket) {
    btn.disabled = false;
    result.innerHTML = `<div class="printer-result-msg error">Plugin TCP no disponible.</div>`;
    return;
  }

  const localIP = await getLocalIP();
  if (!localIP) {
    btn.disabled = false;
    result.innerHTML = `<div class="printer-result-msg">No se pudo detectar la red. Escribe la IP manualmente.</div>`;
    return;
  }
  const prefix = localIP.split('.').slice(0, 3).join('.');

  let encontradas = [];

  // Paso 1 — ARP (rápido: solo dispositivos ya conocidos en la red)
  setStatus('Revisando red local...');
  try {
    const arpResult = await TcpSocket.getArpTable();
    const arpIPs = (arpResult.ips || []).filter(ip => ip.startsWith(prefix + '.'));
    console.log('ARP candidatas:', arpIPs);
    for (const ip of arpIPs) {
      if (await probarIP(ip, 3000)) { encontradas.push(ip); }
    }
  } catch (e) {
    console.log('Paso 1 (ARP) omitido:', e.message);
  }

  // Paso 2 — scanNetwork en Java (solo si ARP no encontró nada)
  if (encontradas.length === 0) {
    setStatus('Escaneando red completa...');
    try {
      const scanResult = await TcpSocket.scanNetwork({ prefix, port: 9100, timeout: 400 });
      encontradas = scanResult.ips || [];
      console.log('scanNetwork encontró:', encontradas);
    } catch (e) {
      console.log('Paso 2 (scanNetwork) falló:', e.message);
    }
  }

  btn.disabled = false;

  if (encontradas.length === 0) {
    result.innerHTML = `<div class="printer-result-msg">No se encontró impresora en la red. Escribe la IP manualmente.</div>`;
  } else if (encontradas.length === 1) {
    const ip = encontradas[0];
    result.innerHTML = `
      <div class="printer-result-found">
        <p>¿Es esta tu impresora? <strong>${escapeHtml(ip)}</strong></p>
        <div class="printer-result-btns">
          <button class="btn-printer-confirm" data-ip="${escapeHtml(ip)}" type="button">Sí, usar esta</button>
          <button class="btn-printer-retry" type="button">Buscar otra vez</button>
        </div>
      </div>`;
  } else {
    const opciones = encontradas.map(ip =>
      `<button class="btn-printer-confirm" data-ip="${escapeHtml(ip)}" type="button">${escapeHtml(ip)}</button>`
    ).join('');
    result.innerHTML = `
      <div class="printer-result-found">
        <p>Se encontraron varias impresoras. Elige una:</p>
        <div class="printer-result-btns">${opciones}</div>
      </div>`;
  }
}

async function probarImpresora() {
  const ipInput = document.getElementById('input-printer-ip');
  const ip      = ipInput ? ipInput.value.trim() : config.printer.ip;
  const result  = document.getElementById('config-printer-result');

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ip || !ipRegex.test(ip)) {
    if (result) result.innerHTML = `<div class="printer-result-msg error">IP inválida. Formato esperado: 192.168.1.42</div>`;
    return;
  }

  if (!isNative) {
    if (result) result.innerHTML = `<div class="printer-result-msg">La prueba real estará disponible cuando instales la app. IP: ${escapeHtml(ip)}</div>`;
    return;
  }

  const TcpSocket = window.Capacitor?.Plugins?.TcpSocket;
  if (!TcpSocket) return;

  if (result) result.innerHTML = `<div class="printer-result-msg"><span class="spinner"></span> Conectando…</div>`;

  let clientId = null;
  try {
    const res = await Promise.race([
      TcpSocket.connect({ ipAddress: ip, port: 9100 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);
    clientId = res.client;
    await TcpSocket.disconnect({ client: clientId });
    if (result) result.innerHTML = `<div class="printer-result-msg success">Impresora conectada ✓</div>`;
  } catch (_) {
    if (clientId !== null) {
      try { await TcpSocket.disconnect({ client: clientId }); } catch (_) {}
    }
    if (result) result.innerHTML = `<div class="printer-result-msg error">Sin respuesta en ${escapeHtml(ip)}. Verifica que la impresora esté encendida y en la misma red.</div>`;
  }
}

function mostrarScreen(nombre) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${nombre}`).classList.add('active');
}

/* ─── Cancelar comanda ───────────────────────────────────────── */
function cancelarComanda(mesaId, idx) {
  const mesa = getMesa(mesaId);
  const comanda = mesa.historial[idx];
  const num = comanda.comandaNum != null ? comanda.comandaNum : (idx + 1);
  if (!confirm(`¿Cancelar comanda #${num}? Esta acción no se puede deshacer.`)) return;
  comanda.cancelled = true;
  saveState();
  renderHistorial();
  actualizarEnviadasBadge();
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
    const isCancelled = !!comanda.cancelled;
    const burbuja = document.createElement('div');
    burbuja.className = isCancelled ? 'burbuja cancelled' : 'burbuja';
    burbuja.dataset.idx = idx;

    const ticketHTML = renderTicketHTML(comanda.plates);
    const cocinaHTML = renderTicketCocinaHTML(comanda.plates);
    const num = idx + 1;
    const allItems = comanda.plates.flatMap(p => p.items);
    const comandaTotal = allItems.reduce((s, i) => s + (i.unitPrice || 0) * i.qty, 0);
    const totalHTML = (!isCancelled && comandaTotal > 0)
      ? `<div class="burbuja-total">Total: $${comandaTotal}</div>`
      : '';

    burbuja.innerHTML = `
      ${isCancelled ? '<div class="burbuja-cancelled-label">Cancelada</div>' : ''}
      <div class="burbuja-ticket">${ticketHTML}</div>
      ${totalHTML}
      <div class="burbuja-meta">
        <span class="burbuja-num">#${num}${comanda.sentAt ? ` · ${formatSentAtDisplay(comanda.sentAt)}` : ''}</span>
        <div class="burbuja-actions">
          ${!isCancelled ? `<button class="btn-imprimir" aria-label="Imprimir comanda">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          </button>` : ''}
          ${!isCancelled ? `<button class="btn-cancelar" aria-label="Cancelar comanda">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>` : ''}
          <button class="btn-expand" data-open="false" aria-expanded="false" aria-label="Ver formato cocina">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            Cocina
          </button>
        </div>
      </div>
      <div class="cocina-view">${cocinaHTML}</div>
    `;

    if (!isCancelled) {
      burbuja.querySelector('.btn-imprimir').addEventListener('click', () => {
        printTicket(formatTicket(comanda));
      });
      burbuja.querySelector('.btn-cancelar').addEventListener('click', () => {
        cancelarComanda(state.currentMesa, idx);
      });
    }

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
  const n = mesa.historial.filter(c => !c.cancelled).length;
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
        <div class="mesas-header-actions">
          <button class="btn-config" id="btn-theme" aria-label="Cambiar tema"></button>
          <button class="btn-config" id="btn-resumen-dia" aria-label="Resumen del día">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          </button>
          <button class="btn-config" id="btn-config" aria-label="Configuración">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
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
          <div class="config-field">
            <label class="config-label">Tamaño del teclado</label>
            <div class="keyboard-size-row">
              <button class="keyboard-size-btn" data-size="normal" aria-pressed="true" type="button">Normal</button>
              <button class="keyboard-size-btn" data-size="large" aria-pressed="false" type="button">Grande</button>
              <button class="keyboard-size-btn" data-size="xlarge" aria-pressed="false" type="button">Muy grande</button>
            </div>
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
                <input type="text" class="config-price-input"
                       data-group="tacos" data-idx="${i}"
                       inputmode="numeric" maxlength="6" placeholder="$0"
                       autocomplete="off"
                       aria-label="Precio taco ${i + 1}">
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
                <input type="text" class="config-price-input"
                       data-group="drinks" data-idx="${i}"
                       inputmode="numeric" maxlength="6" placeholder="$0"
                       autocomplete="off"
                       aria-label="Precio bebida ${i + 1}">
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

          <div class="config-local-ip" id="config-local-ip"></div>
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

    // Tema — ciclar
    if (e.target.closest('#btn-theme')) {
      ciclarTema();
      return;
    }

    // Resumen del día
    if (e.target.closest('#btn-resumen-dia')) {
      imprimirResumenDia();
      return;
    }

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

    // Impresora — confirmar IP del escaneo
    const confirmBtn = e.target.closest('.btn-printer-confirm');
    if (confirmBtn) {
      const ip = confirmBtn.dataset.ip;
      const ipInput = document.getElementById('input-printer-ip');
      if (ipInput) ipInput.value = ip;
      config.printer.ip = ip;
      saveConfig();
      actualizarPrinterStatus();
      const result = document.getElementById('config-printer-result');
      if (result) result.innerHTML = `<div class="printer-result-msg success">IP guardada: ${escapeHtml(ip)} ✓</div>`;
      return;
    }

    // Impresora — buscar otra vez
    if (e.target.closest('.btn-printer-retry')) {
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

    // Tamaño del teclado — selección
    const kbSizeBtn = e.target.closest('.keyboard-size-btn');
    if (kbSizeBtn) {
      document.querySelectorAll('.keyboard-size-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
      kbSizeBtn.setAttribute('aria-pressed', 'true');
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

    // Volver a mesas desde comanda
    if (e.target.closest('#btn-back')) {
      volverAMesas();
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
  applyKeyboardSize();
  applyTheme();
  actualizarBtnTheme();
  renderMesas();
}

document.addEventListener('DOMContentLoaded', init);
