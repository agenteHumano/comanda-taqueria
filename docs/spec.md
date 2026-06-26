# Comanda Chat para Taquería — Especificación técnica

Documento de referencia del estado actual de la app. Integra el brief original, las decisiones de diseño del prototipado iterativo y todo lo implementado en Fase 2. Donde haya diferencia entre versiones anteriores y este documento, manda lo que está aquí.

## 1. Resumen del proyecto

Componente independiente de captura rápida de comandas para una taquería, pensado para integrarse después en cualquier sistema (Node.js, Firebase u otro backend). No es un POS completo: es la pieza de captura que un mesero usa en el momento de tomar el pedido, optimizada para velocidad por encima de todo. La meta de producto es simple: que un mesero prefiera capturar en el celular antes que en una libreta de papel, porque es más rápido, no porque se vea más bonito.

La interfaz combina dos referencias familiares para cualquier usuario de celular: la lógica de una libreta de mesero (agrupar por plato, anotar rápido) y la lógica de una app de mensajería (historial como burbujas, captura abajo). No se trata de copiar visualmente ninguna de las dos, solo de aprovechar que el usuario ya sabe usarlas.

## 2. Alcance de esta versión

### Incluye
- Pantalla de selección de mesa / pedido especial, con número de mesas configurable (1–20).
- Pantalla de comanda por mesa, con historial, vista previa y teclado de captura.
- Pantalla de configuración: nombre de mesero, catálogo editable de productos y modificadores, número de mesas e IP de impresora.
- Modelo de datos estructurado (no solo texto) listo para conectarse a una API después.
- Estado independiente por mesa (cada mesa conserva su historial y su borrador aunque el mesero navegue a otra).
- Persistencia completa en `localStorage` — estado de cada mesa y toda la configuración.

### No incluye (a propósito)
- Usuarios / inicio de sesión.
- Pagos.
- Inventario.
- Impresión real desde el navegador (requiere Capacitor/APK — pendiente para Fase 3).
- Backend.
- Reportes.
- Vista de cocina en tiempo real en pantalla separada (sí se incluye una vista expandible "para cocina" dentro de cada burbuja del historial, pero no pantalla separada ni sincronización entre dispositivos).

## 3. Arquitectura de pantallas

La app tiene tres pantallas. No hay menú de navegación adicional.

### 3.1 Pantalla "Mesas"

Es la pantalla de entrada. Muestra:

- Una grilla de **N mesas numeradas** (configurable entre 1 y 20, default 10), en cuadrícula de 5 columnas. Cada tarjeta muestra el número grande y, si aplica, un estado pequeño debajo: "en construcción" (si hay un pedido a medio capturar) o "N enviadas" (si ya se mandaron comandas). Sin estado = mesa sin actividad. Las tarjetas tienen altura fija para que la grilla no salte al cambiar de estado.
- Una sección separada, debajo, para **tres pedidos especiales** que no tienen mesa física:
  - `PR` — Para recoger (ícono de bolsa)
  - `PE` — Para enviar (ícono de camión de reparto)
  - `PA` — Por asignar (pedido ya tomado, cliente en camino, sin mesa todavía; ícono de reloj)

  Cada una se comporta exactamente igual que una mesa numerada: tiene su propio historial y su propio borrador, y muestra el mismo tipo de estado.

  Nota: el código `PA` de "por asignar" coincide con la abreviatura de producto `PA` (Pastor) del teclado. Viven en pantallas distintas así que en uso real no debería confundir, pero queda documentado por si se prefiere cambiar a otro código al implementar.

- Ícono de engranaje (⚙) en el encabezado, alineado a la derecha, que abre la pantalla de Configuración.
- Tocar cualquier tarjeta (numerada o especial) abre la pantalla de Comanda para ese identificador.

### 3.2 Pantalla "Comanda"

Se abre al seleccionar una mesa o pedido especial. Tiene, de arriba a abajo:

1. **Encabezado**: botón de regreso a la pantalla de Mesas, el nombre de la mesa o pedido especial (ej. "Mesa 5" o "Mesa 5 · Juan" si hay nombre de mesero configurado), y un contador de comandas ya enviadas para ese identificador.
2. **Historial**: las comandas ya enviadas para esa mesa, como burbujas alineadas a la derecha (estilo "mensaje enviado"), en orden cronológico. Cada burbuja muestra el pedido en formato de ticket (ver sección 6) y tiene un botón pequeño para expandir/contraer el detalle tipo cocina.
3. **Vista previa / borrador**: el pedido que se está armando en este momento, antes de enviar, en el mismo formato de ticket. Si no hay nada capturado, muestra un placeholder invitando a tocar un producto.
4. **Teclado de captura**: ver sección 5.

No hay acceso a Configuración desde esta pantalla.

### 3.3 Pantalla "Configuración"

Accesible solo desde el ícono de engranaje en la pantalla de Mesas. Tiene cuatro secciones:

1. **Mesero** — nombre del mesero (texto libre, opcional) y número de mesas (1–20, default 10).
2. **Productos** — dos subsecciones: Tacos (10 slots) y Bebidas (10 slots). Cada slot tiene toggle activar/desactivar + abreviatura (máx. 4 chars) + nombre completo. Los slots vacíos se ocultan; un botón "+ Agregar" al final de cada subsección revela el siguiente slot disponible.
3. **Modificadores** — 7 slots configurables con la misma estructura que los productos. Defaults: S/V, S/C, S/CI en posiciones 1–3; los 4 restantes vacíos y desactivados.
4. **Impresora** — estado de la IP guardada, botón "Buscar en mi red" (placeholder hasta Fase 3), campo de IP manual, y botón "Probar conexión" cuando hay IP guardada.

Un botón "Guardar" al final aplica todos los cambios y regresa a Mesas. Volver con el botón de regreso descarta los cambios sin guardar.

## 4. Modelo de datos

### 4.1 Comanda (objeto enviado)

```js
{
  table: 5,        // número (1 a N, configurable) para mesas, o "PR" | "PE" | "PA" para pedidos especiales
  sentAt: "14:32", // hora de envío en formato HH:MM
  plates: [
    {
      items: [
        { sku: "PA", name: "Pastor", qty: 3, mods: ["S/C"] },
        { sku: "AS", name: "Asada",  qty: 3, mods: [] }
      ],
      note: "sin charola, para llevar en bolsa aparte" // opcional, se omite si está vacío
    },
    {
      items: [
        { sku: "QU", name: "Quesadilla", qty: 1, mods: [] }
      ]
    }
  ]
}
```

Reglas:
- `mods` es un arreglo — un producto puede llevar varios modificadores combinados.
- `note` vive a nivel de plato, no de producto. Un plato puede tener `note` sin `items` (se conserva al filtrar antes de enviar).
- `sku` y `name` vienen del catálogo configurado en `config.products` / `config.modifiers`.

### 4.2 Configuración (localStorage)

```js
config.waiterName      // string — nombre del mesero (puede estar vacío)
config.tableCount      // número entero, 1–20, default 10
config.products.tacos  // array de 10 objetos { sku, name, enabled }
config.products.drinks // array de 10 objetos { sku, name, enabled }
config.modifiers       // array de 7 objetos { sku, name, enabled }
config.printer.ip      // string — IP de la impresora (puede estar vacío)
```

Valores por default de `config.products.tacos`:

| SKU | Nombre |
|---|---|
| PA | Pastor |
| AS | Asada |
| BI | Bistec |
| CH | Chorizo |
| TR | Tripa |
| GR | Gringa |
| QU | Quesadilla |
| VOL | Volcán |
| BUR | Burrito |
| RA | Rajas |

Valores por default de `config.products.drinks`:

| SKU | Nombre |
|---|---|
| REF | Refresco |
| AGU | Agua |
| CER | Cerveza |
| JAR | Jarrito |
| LIM | Limonada |
| ORG | Horchata |
| TAM | Tamarindo |
| MAN | Mango |
| TOM | Tomate |
| JUG | Jugo |

Valores por default de `config.modifiers` (posiciones 4–7 vacías y con `enabled: false`):

| Pos | SKU | Nombre | enabled |
|---|---|---|---|
| 1 | S/V | Sin verdura | true |
| 2 | S/C | Sin cebolla | true |
| 3 | S/CI | Sin cilantro | true |
| 4–7 | — | — | false |

### 4.3 Estado por mesa (localStorage)

```js
// Clave: 'comanda-taqueria'
{
  mesas: [
    [id, {
      historial: Comanda[],
      borrador: {
        platos: [{ items: Item[], note: string }],
        cantDigitos: string,
        lastSku: string | null,
        notaEditando: boolean
      }
    }]
  ]
}
```

## 5. Teclado y lógica de captura

### 5.1 Layout del teclado

Inspirado en la disposición de Gboard de Android, reemplazando el alfabeto por las funciones de la taquería:

1. **Fila de números** (1–0): sirve para escribir la cantidad.
2. **Fila de tacos** (hasta 10 teclas): lee desde `config.products.tacos`. Los slots con `enabled: false` o abreviatura vacía no aparecen (`display: none`); los activos llenan el ancho disponible con `flex: 1`.
3. **Fila de bebidas** (hasta 10 teclas): lee desde `config.products.drinks`. Mismo comportamiento.
4. **Fila de modificadores + nota**: hasta 7 teclas desde `config.modifiers`, con el mismo comportamiento de visibilidad, más el botón **Nota** fijo al final (siempre visible, no configurable).
5. **Fila de control**: Borrar (izquierda) · Siguiente plato (centro, la más ancha) · Enviar (derecha).

### 5.2 Flujo de captura

```
cantidad (opcional, default 1) → producto → [modificador opcional] → [nota opcional] → siguiente plato → ... → enviar
```

### 5.3 Cantidad
- Tocar dígitos acumula un número (máximo 2 dígitos).
- Si no se toca ningún dígito antes de tocar un producto, la cantidad por default es 1.
- Al confirmar un producto, el contador de cantidad se reinicia.

### 5.4 Productos
- Tocar un producto agrega `{ sku, name, qty, mods: [] }` al plato activo.
- Si el mismo SKU ya existe en el plato activo, se suma la cantidad en vez de duplicar la línea.
- El producto recién agregado queda marcado internamente como "último producto tocado" — recibirá el siguiente modificador.

### 5.5 Modificadores
- Se aplican siempre al **último producto tocado**.
- Si el SKU del modificador es `C/T`: vacía el arreglo `mods` del producto activo (acción de limpiar, no se guarda como tag).
- Cualquier otro SKU: se agrega si no estaba, o se quita si ya estaba (toggle).
- Se pueden combinar varios modificadores en el mismo producto.
- El "último producto tocado" se resalta visualmente en el borrador.

### 5.6 Nota libre
- Botón "Nota" en la fila de modificadores, fijo al extremo derecho.
- Al tocarlo aparece un `<input type="text">` que dispara el teclado nativo del dispositivo.
- La nota se guarda a nivel de plato (no de producto ni de comanda completa).
- Se confirma al presionar Enter, tocar "OK", o perder el foco (auto-guardado).

### 5.7 Borrado inteligente
Prioridad, en orden:
1. Si hay dígitos de cantidad sin confirmar → borra el último dígito.
2. Si no → borra el último producto del plato activo.
3. Si el plato activo está vacío y hay más de un plato → elimina ese plato vacío.
4. Si no hay nada que borrar → no hace nada.

### 5.8 Siguiente plato
- Solo tiene efecto si el plato activo tiene al menos un producto.
- Crea un nuevo plato vacío y lo vuelve el activo. El "último producto tocado" se limpia.

### 5.9 Enviar comanda
- Se descartan los platos completamente vacíos (sin productos y sin nota).
- Si no queda ningún plato válido, el botón no hace nada.
- Al enviar: se arma el objeto de comanda, se agrega al historial de esa mesa como nueva burbuja, se limpia el borrador, y se emite el JSON por `console.log` para facilitar la integración con un backend.
- Dispara vibración corta (60 ms) si el dispositivo lo soporta.

## 6. Historial y vista previa

El borrador y las comandas enviadas usan el mismo formato de "ticket": productos del plato separados por ` · ` (ej. `3 PA · 3 AS`), separador visual entre platos, modificadores en corchetes junto al producto, nota en cursiva debajo del plato.

El borrador funciona en tiempo real: el dígito tecleado antes de confirmar un producto aparece en color muted con un cursor parpadeante. El JSON estructurado no cambia — esto es solo representación visual.

Las comandas enviadas tienen además una vista expandible "para cocina", con formato más explícito:

```
Plato 1
- 3 Pastor (sin cebolla)
- 3 Asada

Plato 2
- 1 Quesadilla
```

## 7. Mesas y pedidos especiales (estado independiente)

Cada mesa numerada y cada pedido especial (`PR`, `PE`, `PA`) tiene su propio estado completamente independiente: historial de comandas enviadas y borrador en construcción.

El mesero puede entrar a una mesa, capturar parcialmente, regresar a Mesas, entrar a otra mesa, y al volver a la primera encontrará exactamente donde lo dejó. La grilla refleja el estado de cada tarjeta de un vistazo.

Al reducir el número de mesas desde Configuración, el estado de las mesas eliminadas se borra silenciosamente al guardar.

## 8. Estilo visual

- Mobile-first, responsive. App centrada a máx. 430px en desktop.
- Limpio y de alto contraste; botones grandes pensados para usarse con una sola mano, bajo presión, con ruido y calor.
- Minimalista: sin textos de ayuda constantes ni iconografía decorativa. Las etiquetas de los controles (Borrar, Siguiente plato, Enviar) son suficientes.
- Los estados vacíos (sin historial, sin productos en el borrador) muestran un mensaje breve de orientación.
- Tipografía monoespaciada en las líneas de ticket para alineación visual.
- Las tarjetas de mesa tienen altura fija para que la grilla no salte al cambiar de estado.
- Palette OKLCH, design tokens con variables CSS, fuente UI: Inter, fuente mono: JetBrains Mono.

## 9. Stack técnico y notas de implementación

- HTML, CSS y JavaScript puro (sin framework), como componente independiente integrable a cualquier sistema.
- Sin backend. Estado de mesas y configuración persisten en `localStorage` — la app es completamente funcional offline.
- Claves de `localStorage`:
  - `comanda-taqueria` — estado de todas las mesas (historial + borrador).
  - `config.waiterName`, `config.tableCount`, `config.products.tacos`, `config.products.drinks`, `config.modifiers`, `config.printer.ip` — configuración.
- Estructura de archivos: `index.html`, `styles.css`, `app.js`.
- Impresión térmica (ESC/POS por TCP, puerto 9100) requiere `capacitor-community/tcp-socket` y se implementa en Fase 3 cuando la app se empaquete como APK con Capacitor.

## 10. Checklist de aceptación

### Fase 1 — Captura de comandas
- [x] Pantalla de Mesas con mesas numeradas + 3 pedidos especiales (PR, PE, PA), cada una mostrando su estado (vacía / en construcción / N enviadas).
- [x] Navegación a la pantalla de Comanda al tocar una mesa o pedido especial, con botón de regreso.
- [x] Historial de comandas enviadas como burbujas, con formato de ticket y vista expandible para cocina.
- [x] Vista previa del pedido en construcción, en el mismo formato de ticket.
- [x] Teclado con fila de números, fila de tacos, fila de bebidas, fila de modificadores + nota, y fila de control (Borrar / Siguiente plato / Enviar).
- [x] Cantidad por dígitos, con default de 1 si no se especifica. Dígito pendiente visible en tiempo real con cursor parpadeante.
- [x] Productos se agregan al plato activo, sumando cantidad si el producto se repite.
- [x] Modificadores aplican al último producto tocado, combinables.
- [x] Nota libre por plato vía input de texto nativo.
- [x] Borrado inteligente con la prioridad descrita en 5.7.
- [x] Siguiente plato solo si el plato activo tiene productos.
- [x] Enviar descarta platos vacíos, limpia el borrador, y emite el objeto JSON estructurado.
- [x] Estado (historial + borrador) independiente y persistente por mesa/pedido especial en `localStorage`.
- [x] Estilo mobile-first, alto contraste, sin elementos decorativos innecesarios.

### Fase 2 — Configuración
- [x] Pantalla de Configuración accesible desde el ícono de engranaje en Mesas.
- [x] Botón de regreso vuelve a Mesas sin guardar.
- [x] Campo de nombre de mesero; se muestra en el encabezado de Comanda.
- [x] Catálogo editable de 10 tacos + 10 bebidas + 7 modificadores, con abreviatura, nombre completo y toggle activar/desactivar por slot.
- [x] Slots vacíos ocultos por default; botón "+ Agregar" por sección revela el siguiente slot disponible.
- [x] Valores por default precargados si no hay configuración guardada.
- [x] Slots inactivos o vacíos no aparecen en el teclado (`display: none`); los activos llenan el ancho de la fila.
- [x] Cambios al catálogo se reflejan en el teclado al guardar.
- [x] Número de mesas configurable (1–20); al reducir, borra el estado de las mesas eliminadas.
- [x] Campo de IP manual para la impresora, siempre disponible.
- [x] Botón "Probar conexión" (placeholder) cuando hay IP guardada.
- [x] Toda la configuración persiste en `localStorage` y se carga al abrir la app.
- [ ] Lógica real de escaneo de red ("Buscar en mi red") — pendiente Fase 3 (requiere Capacitor).
