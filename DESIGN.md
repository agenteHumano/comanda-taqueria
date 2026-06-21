---
name: Comanda Taquería
description: Sistema de captura rápida de comandas para meseros — oscuro, preciso, sin adornos.
colors:
  bg:           "oklch(0.09 0.000   0)"
  surface:      "oklch(0.20 0.014 247)"
  surface-2:    "oklch(0.30 0.018 247)"
  surface-3:    "oklch(0.38 0.022 247)"
  ink:          "oklch(0.94 0.005 247)"
  ink-muted:    "oklch(0.52 0.010 247)"
  primary:      "oklch(0.82 0.170 247)"
  primary-fg:   "oklch(0.10 0.030 247)"
  accent:       "oklch(0.62 0.220  65)"
  accent-fg:    "oklch(0.97 0.010  78)"
  error:        "oklch(0.62 0.220  25)"
  success:      "oklch(0.68 0.180 145)"
typography:
  ui:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
  key:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1
  ticket:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.6
  display:
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "20px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
components:
  btn-enviar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-fg}"
    rounded: "{rounded.sm}"
    height: "52px"
    padding: "0 24px"
  btn-enviar-active:
    backgroundColor: "oklch(0.74 0.160 247)"
    textColor: "{colors.primary-fg}"
    rounded: "{rounded.sm}"
    height: "52px"
  key-producto:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "48px"
  key-producto-active:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "48px"
  key-mod-applied:
    backgroundColor: "oklch(0.82 0.170 247 / 0.18)"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    height: "40px"
  mesa-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  mesa-card-borrador:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  burbuja:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
---

# Design System: Comanda Taquería

## 1. Overview

**Creative North Star: "El Ticket de Cocina"**

Este sistema se construye como un ticket térmico digital: monoespaciado donde importa, sin color donde no hay función, oscuro como la cocina en turno de noche. La interfaz no busca impresionar — busca desaparecer. El mesero no debería pensar en la app; debería pensar en el pedido.

La atmósfera es la de una herramienta de oficio profesional usada bajo presión: ruido de plancha, calor, luz variable, prisa. Cada decisión visual viene de ese contexto real. El fondo es carbón porque un fondo blanco deslumbra. Los botones son grandes porque los dedos se mueven rápido. El monospace en los tickets es porque un ticket de cocina tiene que leerse de un vistazo desde otro ángulo.

Lo que este sistema rechaza explícitamente: la estética de apps de delivery para clientes (Rappi, UberEats — fotos de comida, carrito de compras, tonos cálidos de marketing), el onboarding elaborado, las animaciones decorativas, y todo lo que haga sentir que esto fue diseñado para impresionar a alguien en lugar de para que funcione bajo presión.

**Key Characteristics:**
- Oscuro por necesidad operativa, no por moda
- Monospace en el historial y borrador — el ticket como lenguaje
- Un solo acento cromático (cobalt) para acciones; ámbar solo para estados de alerta
- Botones grandes como teclas de caja registradora real
- Sin texto instructivo — la posición y la forma comunican

## 2. Colors: La Paleta de Carbón e Instrumento

Estrategia Restrained: neutros tintados en azul-cobalto sobre fondo carbón, con un solo acento de acción (cobalt) y un solo acento de estado (ámbar). El color nunca es decorativo — cada aparición tiene una función.

### Primary
- **Azul Instrumento** (`oklch(0.82 0.170 247)` ≈ `#5ba6f4`): El único color saturado de alta prominencia. Reservado para el botón Enviar, estados activos en el teclado, indicadores de "N enviadas", y el badge del encabezado. Aparece como "luz encendida" sobre el carbón — análogo a un dígito iluminado en un panel de instrumentos. Prohibido en cualquier elemento decorativo o sin función de acción/estado.

### Secondary
- **Ámbar de Alerta** (`oklch(0.62 0.220 65)` ≈ `#c08500`): Exclusivo para el estado "en construcción" en las tarjetas de mesa. Cálido entre tanto frío; advierte sin interrumpir, como una luz de tablero. No es urgente, es operativo — hay algo aquí que necesita atención cuando puedas.

### Tertiary
- **Rojo Error** (`oklch(0.62 0.220 25)` ≈ `#c03838`): Reservado para errores y estados destructivos. No aparece en el flujo normal de captura.
- **Verde Confirmación** (`oklch(0.68 0.180 145)` ≈ `#3a9a60`): Para confirmaciones y estados de éxito cuando aplique.

### Neutral
- **Carbón** (`oklch(0.09 0.000 0)` ≈ `#161616`): El fondo de toda la app. Negro puro semántico — sin tinte de hue, sin calidez artificial.
- **Panel** (`oklch(0.20 0.014 247)` ≈ `#2a3040`): Fondo de tarjetas, burbujas, y secciones de contenido. Ligeramente tintado en cobalt.
- **Tecla** (`oklch(0.30 0.018 247)` ≈ `#3e4a5e`): Fondo de teclas de producto en reposo. La diferencia con Panel es lo que hace visible el teclado como zona de acción.
- **Tecla Activa** (`oklch(0.38 0.022 247)` ≈ `#505f75`): Estado pressed y modificadores activos. Más claro que Tecla, confirma el toque.
- **Tinta** (`oklch(0.94 0.005 247)` ≈ `#edf0f4`): Texto principal sobre fondo oscuro. Levemente azulado hacia el brand, no blanco puro.
- **Tinta Atenuada** (`oklch(0.52 0.010 247)` ≈ `#73808f`): Texto secundario — estados vacíos, etiquetas descriptivas, contadores. Contraste ≥3.5:1 vs carbón.

### Named Rules
**La Regla del Color Funcional.** Si un elemento usa color y no es una acción primaria (cobalt) ni un estado de alerta/en-construcción (ámbar) ni un error (rojo), el color está de más. Quítalo.

**La Regla de la Rareza.** El Azul Instrumento aparece en ≤15% de cualquier pantalla. Su escasez es lo que lo hace visible como señal de acción.

## 3. Typography

**Fuente de interfaz:** Inter (con fallback a system-ui, -apple-system, sans-serif)
**Fuente de ticket:** JetBrains Mono (con fallback a Fira Code, Cascadia Code, monospace)

**Carácter:** Una sola familia sans para toda la interfaz — botones, etiquetas, números, encabezados. La jerarquía se construye con peso y tamaño, no con familias distintas. El monospace aparece únicamente en el historial y la vista previa del borrador, donde la alineación tipo ticket es funcional, no decorativa.

### Hierarchy
- **Display** (700, 3rem/48px, lh 1, ls -0.04em): El número de cantidad activa encima del teclado. El único elemento en pantalla que "grita" — intencionalmente, porque es lo que el mesero necesita confirmar de un vistazo.
- **Title** (700, 1.375rem/22px, lh 1.3): Nombre de la mesa en el encabezado de Comanda. Una sola instancia por pantalla.
- **Key** (700, 0.875rem/14px, lh 1): Etiquetas de las teclas del teclado. Bold siempre — son botones de acción, no labels informativos.
- **Body** (400, 1rem/16px, lh 1.5): Texto general, labels de sección.
- **Label** (600, 0.8125rem/13px, lh 1.3): Estados de mesa, badges, texto secundario de acción.
- **Ticket** (monospace 400, 0.8125rem/13px, lh 1.6): Exclusivo para el historial de burbujas y la vista previa del borrador. Nunca fuera de ese contexto.
- **Caption** (400, 0.6875rem/11px): Número de comanda en la burbuja, etiqueta de "Pedidos especiales".

### Named Rules
**La Regla del Monospace Funcional.** JetBrains Mono aparece únicamente en el historial y el borrador — los dos contextos donde la alineación de columnas importa para lectura rápida como ticket. Fuera de esos dos contextos, cualquier monospace es decorativo y está prohibido.

## 4. Elevation

Este sistema es **tonal-layered**, no shadow-based. La profundidad se comunica mediante diferencias de luminosidad entre superficies, no mediante sombras proyectadas. El fondo (Carbón L=0.09) es el nivel más bajo; cada capa de superficie sube en luminosidad: Panel (L=0.20) → Tecla (L=0.30) → Tecla Activa (L=0.38).

Las teclas de producto tienen una sombra mínima de definición (`box-shadow: 0 1px 0 oklch(0 0 0 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.06)`) que simula el perfil físico de una tecla de teclado mecánico. Esto no es decorativo — es feedback visual de que el elemento es tappable.

### Shadow Vocabulary
- **Key Definition** (`0 1px 0 oklch(0 0 0 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.06)`): Exclusivo para teclas de producto y número. Efecto de tecla mecánica, confirma que el elemento es presionable.
- **App Container** (`0 0 0 1px var(--surface), 0 24px 80px oklch(0 0 0 / 0.6)`): Sombra del contenedor de la app en desktop, para separarla del fondo oscuro del body.

### Named Rules
**La Regla Plana por Defecto.** Fuera de las teclas del teclado y el contenedor de desktop, ningún elemento tiene sombra. Profundidad = diferencia de luminosidad entre superficies. Las sombras no están "prohibidas" — están reservadas para elementos que físicamente se elevan sobre la superficie (teclas, modales si existieran).

## 5. Components

### Buttons — Enviar (Primary Action)

El botón más importante de la interfaz. Inspirado en el botón Send de apps de mensajería: posición de "Enter", prominencia de Azul Instrumento, texto oscuro para contraste máximo.

- **Shape:** Gently curved (6px radius, `{rounded.sm}`)
- **Primary (Enviar):** Azul Instrumento fill (`{colors.primary}`) + texto carbón-cobalt oscuro (`{colors.primary-fg}`), altura 52px, padding 0 24px, `font-weight: 700`
- **Hover/Active:** Oscurece a `oklch(0.74 0.160 247)` con `transform: scale(0.96)`, 100ms ease-out-quart
- **Disabled:** `opacity: 0.35`, `pointer-events: none` — sin cambio de color

### Keys — Producto (Core Interaction)

El elemento más tocado de toda la app. Diseñado como tecla física: superficie levantada, feedback de press táctil.

- **Shape:** Curved (6px), altura 48px, ancho flexible (10 teclas en una fila, cada una `flex: 1`)
- **Reposo:** Tecla (`{colors.surface-2}`) fill, tinta (`{colors.ink}`) texto, key-shadow para definición
- **Press:** `background: {colors.surface-3}`, `transform: scale(0.92)`, 100ms

### Keys — Número y Modificador

Jerarquía visual secundaria — las teclas de número son más pequeñas (38px), las de modificador ligeramente diferentes (sin la key-shadow de las de producto).

- **Número:** Surface (`{colors.surface}`) fill, 38px, mismo tratamiento de press
- **Modificador reposo:** Surface fill, tinta atenuada texto — comunica "aún no activo"
- **Modificador aplicado:** Cobalt tint bg (`oklch(0.82 0.170 247 / 0.18)`), tinta cobalt texto — confirma visualmente que el mod está aplicado al último producto

### Cards — Mesa

Las tarjetas de mesa comunican estado de un vistazo. El número grande es lo único que importa al escanear.

- **Shape:** Rounded medium (10px), altura mínima 80px
- **Background:** Panel (`{colors.surface}`)
- **Estado vacío:** Sin badge, número en tinta plena, sin estado textual
- **Estado "en construcción":** Ring ámbar (`box-shadow: 0 0 0 1.5px {colors.accent}`), texto de estado en ámbar
- **Estado "N enviadas":** Ring cobalt semitransparente, texto de estado en cobalt

### Burbuja de Historial

Las comandas enviadas se muestran como mensajes enviados — alineadas a la derecha, radio asimétrico tipo chat.

- **Alineación:** `align-self: flex-end`, `max-width: 88%`
- **Shape:** `border-radius: 16px 6px 16px 16px` (asimétrico — esquina superior derecha más afilada, como burbuja de chat)
- **Background:** Panel (`{colors.surface}`)
- **Tipografía interna:** Ticket (JetBrains Mono, 13px) para las líneas de productos; UI para notas (italics, tinta atenuada)
- **Animación de entrada:** `translateY(8px) + scale(0.97)` → normal, 180ms ease-out-quart

### Inputs — Nota Libre

Aparece únicamente cuando el mesero toca "Nota para este plato". Input nativo del sistema operativo — no construimos QWERTY, el dispositivo lo provee.

- **Reposo:** Surface-2 fill, border 1.5px surface-3, 36px altura
- **Focus:** Border cambia a primary (cobalt), sin glow ni shadow adicional
- **Botón OK:** Primary fill, mismas reglas que Enviar a escala pequeña

## 6. Do's and Don'ts

### Do:
- **Do** usar Azul Instrumento exclusivamente para acciones primarias (Enviar), estados activos de teclado, e indicadores de "N enviadas". Nunca en elementos decorativos.
- **Do** usar JetBrains Mono únicamente en el historial de burbujas y la vista previa del borrador — los dos contextos de ticket.
- **Do** mantener el botón Enviar como el elemento más visualmente prominente del teclado. Si otro elemento compite con él en prominencia, está mal.
- **Do** comunicar el estado de las mesas solo mediante: ring de color (ámbar o cobalt) + texto de estado en la misma paleta. Sin iconos adicionales, sin badges flotantes.
- **Do** escalar el fondo de las teclas claramente por encima del fondo de la app (`surface-2` L=0.30 sobre bg L=0.09). En pantalla real bajo luz, la diferencia tiene que ser obvia.
- **Do** respetar el área de toque mínima de 44px en todos los botones interactivos. En condiciones de uso real (calor, prisa, dedos húmedos), el área importa más que la apariencia.

### Don't:
- **Don't** usar fotos de comida, íconos de carrito, flujos de selección de categorías, ni ningún elemento visual que se asocie con apps de delivery para clientes (Rappi, UberEats). Este sistema es para el mesero, no para el comensal.
- **Don't** agregar onboarding elaborado, pantallas de bienvenida, ni animaciones de entrada al cargar. La app abre en el trabajo — el mesero no tiene tiempo para una pantalla splash.
- **Don't** usar `border-left` o `border-right` mayor a 1px como acento de color en tarjetas o ítems de lista.
- **Don't** usar gradient text (`background-clip: text` con gradiente).
- **Don't** usar glassmorphism ni blur decorativo.
- **Don't** usar monospace fuera del historial y el borrador.
- **Don't** agregar texto instructivo persistente explicando qué hace cada control. La posición y la forma comunican; si se necesita texto explicativo, el control está mal diseñado.
- **Don't** usar colores de acento (cobalt o ámbar) en elementos inactivos o decorativos. Su rareza es lo que los hace funcionales como señales.
- **Don't** reducir el contraste de las teclas para "verse más sutil". En luz variable y bajo presión, la diferencia entre botón y fondo tiene que ser obvia.
