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
- Ícono de impresora en el encabezado, a la izquierda del engranaje, visible solo cuando hay una IP de impresora configurada. Al tocarlo ejecuta el **Resumen del día** (ver sección 3.4).
- Ícono de tema (monitor / sol / luna) en el encabezado, a la izquierda del botón de resumen. Cicla entre tres estados al tocarlo: `auto` (sigue `prefers-color-scheme` del sistema), `light` (fuerza modo claro), `dark` (fuerza modo oscuro). Persiste en `config.theme`. Ver sección 8 para la paleta de colores.
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

1. **Mesero** — nombre del mesero (texto libre, opcional), número de mesas (1–20, default 10), y selector de **tamaño del teclado** (Normal / Grande / Muy grande). El tamaño aplica clases CSS al contenedor del teclado y ajusta height y font-size de las teclas. Persiste en `config.keyboardSize`.
2. **Productos** — dos subsecciones: Tacos (10 slots) y Bebidas (10 slots). Cada slot tiene toggle activar/desactivar + abreviatura (máx. 4 chars) + nombre completo + precio unitario en pesos. Los slots vacíos se ocultan; un botón "+ Agregar" al final de cada subsección revela el siguiente slot disponible. El precio es opcional (default 0); si es 0, el producto funciona igual pero no imprime precio.
3. **Modificadores** — 7 slots configurables con la misma estructura que los productos (sin campo de precio). Defaults: S/V, S/C, S/CI en posiciones 1–3; los 4 restantes vacíos y desactivados.
4. **Impresora** — estado de la IP guardada, botón "Buscar en mi red", campo de IP manual, y botón "Probar conexión" cuando hay IP guardada. "Buscar en mi red" ejecuta el escaneo TCP real en el APK (ver sección 9.1); en el navegador muestra un mensaje informativo.

Un botón "Guardar" al final aplica todos los cambios y regresa a Mesas. Volver con el botón de regreso descarta los cambios sin guardar.

### 3.4 Resumen del día

Función accesible desde el botón de impresora en el encabezado de Mesas. Genera e imprime un ticket ESC/POS de 48 chars con todas las comandas enviadas hoy, agrupadas por mesa.

**"Hoy"**: comandas cuyo `sentAt` corresponde a la fecha actual en la zona horaria local. Las comandas sin `sentAt` (guardadas antes de implementar el timestamp ISO) se incluyen siempre.

**Orden**: mesas numeradas en orden ascendente (1–20), luego PR, PE, PA. Se omiten las mesas sin comandas hoy.

**Formato**:
```
================================================
          RESUMEN DEL DIA
          26 jun 2026
================================================
Mesa 1
  Comanda #23        $45.00
  Comanda #24       $300.00
  --------------------
  Subtotal:         $345.00
------------------------------------------------
Mesa 3
  Comanda #25        $80.00
  --------------------
  Subtotal:          $80.00
================================================
TOTAL:              $425.00
================================================
```

El total de cada comanda es la suma de `item.unitPrice × item.qty`. Si una comanda no tiene precios configurados, su total es `$0.00`. La línea TOTAL siempre aparece. Corte de papel al final.

Si no hay comandas hoy: toast "Sin comandas hoy". Si no hay impresora configurada o no es plataforma nativa: toast "Impresora no configurada".

## 4. Modelo de datos

### 4.1 Comanda (objeto enviado)

```js
{
  table: 5,             // número (1 a N, configurable) para mesas, o "PR" | "PE" | "PA" para pedidos especiales
  sentAt: "2026-06-27T20:32:00.000Z", // timestamp ISO del momento de envío (new Date().toISOString())
  comandaNum: 42,       // número correlativo global; incrementa con cada comanda enviada
  plates: [
    {
      items: [
        { sku: "PA", name: "Pastor", qty: 3, mods: ["S/C"], unitPrice: 25 },
        { sku: "AS", name: "Asada",  qty: 3, mods: [],      unitPrice: 25 }
      ],
      note: "sin charola, para llevar en bolsa aparte" // opcional, se omite si está vacío
    },
    {
      items: [
        { sku: "QU", name: "Quesadilla", qty: 1, mods: [], unitPrice: 0 }
      ]
    }
  ]
}
```

Reglas:
- `mods` es un arreglo — un producto puede llevar varios modificadores combinados.
- `note` vive a nivel de plato, no de producto. Un plato puede tener `note` sin `items` (se conserva al filtrar antes de enviar).
- `sku` y `name` vienen del catálogo configurado en `config.products` / `config.modifiers`.
- `unitPrice` se copia del catálogo al momento de agregar el producto; si el producto no tiene precio configurado vale `0`. El total de la línea (`qty × unitPrice`) se calcula al renderizar, no se guarda.
- `comandaNum` persiste en `localStorage` como `config.lastComandaNum` y no se reinicia entre sesiones. Las comandas antiguas sin este campo se tratan como válidas.
- `cancelled` es un campo booleano opcional. Ausente o `false` = comanda activa. `true` = comanda cancelada; el campo no se revierte una vez asignado. Las comandas canceladas permanecen en el historial pero se excluyen de conteos y totales.

### 4.2 Configuración (localStorage)

```js
config.waiterName      // string — nombre del mesero (puede estar vacío)
config.tableCount      // número entero, 1–20, default 10
config.keyboardSize    // "normal" | "large" | "xlarge", default "normal"
config.products.tacos  // array de 10 objetos { sku, name, enabled, price }
config.products.drinks // array de 10 objetos { sku, name, enabled, price }
config.modifiers       // array de 7 objetos { sku, name, enabled }
config.printer.ip      // string — IP de la impresora (puede estar vacío)
config.lastComandaNum  // número entero — contador global de comandas enviadas
config.theme           // "auto" | "light" | "dark", default "auto"
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
- Tocar un producto agrega `{ sku, name, qty, mods: [], unitPrice }` al plato activo. `unitPrice` se copia del catálogo en ese momento.
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

Si al menos un item de la comanda tiene `unitPrice > 0`, la burbuja muestra el total al pie (`Total: $N`) y el ticket impreso incluye una columna de precios alineada a la derecha en 48 chars, más una línea `TOTAL: $N` al final. Si ningún item tiene precio, la burbuja y el ticket quedan igual que antes.

Las comandas canceladas permanecen visibles en el historial con `opacity: 0.45`, el texto del ticket tachado y una etiqueta "Cancelada" en color de error. Los botones de imprimir y cancelar desaparecen; solo permanece el botón "Cocina". El contador de "N enviadas" en la tarjeta de mesa y el badge en el encabezado de Comanda cuentan únicamente comandas activas (sin `cancelled: true`). En el resumen del día, las comandas canceladas aparecen en el ticket como `Comanda #N  CANCELADA` pero no suman al subtotal ni al total.

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
- La app soporta modo claro y modo oscuro. El tema se controla mediante clases en `<html>`: `.theme-light` para claro explícito, `.theme-dark` para oscuro explícito. Sin clase (`config.theme = "auto"`), la app responde a `prefers-color-scheme` del dispositivo. La paleta oscura es el default en `:root`; la paleta clara sobreescribe las mismas variables bajo `:root.theme-light` y `@media (prefers-color-scheme: light) { :root:not(.theme-dark) }`. Un script inline síncrono en `<head>` aplica la clase antes del primer render para evitar flash de tema.

## 9. Stack técnico y notas de implementación

- HTML, CSS y JavaScript puro (sin framework), como componente independiente integrable a cualquier sistema.
- Sin backend. Estado de mesas y configuración persisten en `localStorage` — la app es completamente funcional offline.
- Claves de `localStorage`:
  - `comanda-taqueria` — estado de todas las mesas (historial + borrador).
  - `config.waiterName`, `config.tableCount`, `config.keyboardSize`, `config.theme`, `config.products.tacos`, `config.products.drinks`, `config.modifiers`, `config.printer.ip`, `config.lastComandaNum` — configuración.
- Estructura de archivos: los archivos web (`index.html`, `styles.css`, `app.js`) viven en `www/`. La raíz del repo tiene un `index.html` de redirect para GitHub Pages.
- La app corre también como APK Android usando Capacitor. El plugin TCP (`capacitor-tcp-socket`) habilita la impresión térmica ESC/POS por red.
- Script `build-apk.sh` en la raíz: copia `www/` a la copia Windows del proyecto y ejecuta `npx cap sync` vía PowerShell para sincronizar antes de cada build en Android Studio.

### 9.1 Impresión ESC/POS — detalles de implementación

#### Secuencia de bytes al inicio de cada ticket

Todo ticket generado por `formatTicket()` abre con esta secuencia antes de cualquier texto:

```
ESC @          (0x1B 0x40)       — inicializar impresora
ESC t 19       (0x1B 0x74 0x13)  — seleccionar codepage PC858
```

El comando `ESC t 19` le indica a la impresora que el texto que sigue está codificado en PC858. Sin este comando los caracteres acentuados del español se imprimen como símbolos incorrectos.

#### Codificación de texto: función encodePC858()

`formatTicket()` usa `encodePC858(str)` en lugar de `TextEncoder`. Los caracteres ASCII (0x00–0x7F) se pasan tal cual; los caracteres especiales del español se mapean a sus equivalentes en PC858:

| Char | Byte | Char | Byte | Char | Byte |
|------|------|------|------|------|------|
| á | 0xA0 | é | 0x82 | í | 0xA1 |
| ó | 0xA2 | ú | 0xA3 | ñ | 0xA4 |
| Á | 0x41 | É | 0x90 | Í | 0xD6 |
| Ó | 0xE0 | Ú | 0xE9 | Ñ | 0xA5 |
| ü | 0x81 | Ü | 0x9A | ¡ | 0xAD |
| ¿ | 0xA8 | € | 0xD5 | | |

Cualquier carácter fuera de ASCII no incluido en la tabla se sustituye por `?` (0x3F).

#### Verificación de impresora en el escaneo de red

Al buscar impresoras, no basta con que un dispositivo acepte la conexión en el puerto 9100 — cualquier servidor TCP puede responder en ese puerto. La verificación se hace en dos pasos sobre la **misma** conexión TCP:

1. **ESC @** (`0x1B 0x40`) — inicialización ESC/POS. Si la conexión se cierra al recibir esto, el dispositivo no es una impresora ESC/POS.
2. **DLE EOT 1** (`0x10 0x04 0x01`) — solicitud de byte de estado. La impresora responde con exactamente 1 byte. Timeout de 1 segundo. Si llega el byte, la IP se confirma como impresora real.

Solo las IPs que superan ambos pasos aparecen en los resultados del escaneo.

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
- [x] Lógica real de escaneo de red ("Buscar en mi red") con verificación ESC/POS — implementado en Fase 3.

### Fase 3 — Capacitor + Impresión térmica
- [x] APK Android generado con Capacitor, instalable por sideloading.
- [x] Impresión térmica ESC/POS por TCP (puerto 9100) desde el APK.
- [x] Botón "Imprimir" en cada burbuja del historial.
- [x] Toast de error si la impresora no responde; toast informativo en el navegador.
- [x] Script `build-apk.sh` para sincronizar WSL → Windows antes del build.

### Adiciones posteriores
- [x] Campo `price` en productos del catálogo; `unitPrice` guardado en cada item al capturar.
- [x] Total por comanda en burbuja del historial y en ticket impreso (cuando hay precios).
- [x] Selector de tamaño del teclado (Normal / Grande / Muy grande) en Configuración.
- [x] Timestamp `sentAt` ISO 8601 en cada comanda enviada.
- [x] Número correlativo `comandaNum` en cada comanda enviada; persiste en `config.lastComandaNum`.
- [x] Resumen del día: botón en Mesas, agrupa por mesa, imprime ticket con subtotales y total global.
- [x] Cancelación de comandas: botón X en burbuja, confirmación nativa, burbuja tachada con etiqueta "Cancelada", excluida de conteos y totales.
- [x] Modo claro/oscuro: botón de tres estados (auto/light/dark) en encabezado de Mesas, sin flash al cargar, persiste en `config.theme`.
- [x] Búsqueda real de impresoras en red: escaneo TCP en lotes de 50, verificación ESC/POS en dos pasos (ESC @ + DLE EOT 1) sobre la misma conexión; solo muestra IPs confirmadas como impresoras.
- [x] Corrección de acentos en tickets: codepage PC858 activada con ESC t 19 al inicio de cada ticket; `encodePC858()` reemplaza `TextEncoder` en `formatTicket()`.
