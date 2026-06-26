# Fase 2 — Pantalla de Configuración

## 1. Objetivo

Permitir que cualquier taquero personalice la app para su negocio sin tocar código: sus propios productos, su nombre de mesero, y la IP de su impresora térmica. Todo se guarda en `localStorage` y la app lo carga automáticamente en cada sesión.

Esta fase no modifica el flujo de captura ni las pantallas de Mesas y Comanda — solo agrega una tercera pantalla accesible desde un ícono de engranaje, y conecta el catálogo editable al teclado de captura.

## 2. Acceso

Un ícono de engranaje (⚙) en el encabezado de la pantalla de Mesas, alineado a la derecha. Al tocarlo se abre la pantalla de Configuración. Un botón de regreso en el encabezado de Configuración vuelve a Mesas.

No hay acceso a Configuración desde la pantalla de Comanda — el mesero no configura durante el servicio.

## 3. Pantalla de Configuración

### 3.1 Estructura

Tres secciones, en este orden:

1. **Mesero** — nombre del mesero
2. **Productos** — catálogo editable (tacos y bebidas)
3. **Impresora** — IP de la impresora en red local

Un botón "Guardar" al final de la pantalla aplica todos los cambios a la vez y regresa a Mesas. Los cambios no se aplican en tiempo real mientras el taquero edita — solo al guardar, para evitar que un cambio a medias rompa el teclado durante el servicio.

### 3.2 Sección: Mesero

Un campo de texto: **Nombre del mesero**. Se muestra en el encabezado de la pantalla de Comanda (junto al nombre de la mesa) y en el ticket de cocina cuando se implemente la impresión. Si está vacío, no se muestra nada — no es obligatorio.

### 3.3 Sección: Productos

Dos subsecciones: **Tacos** (10 filas) y **Bebidas** (10 filas).

Cada fila tiene dos campos:
- **Abreviatura** — lo que aparece en el botón del teclado. Máximo 4 caracteres. Si está vacío, el botón se desactiva (queda en gris, no responde a toques).
- **Nombre completo** — lo que aparece en el ticket y en el JSON estructurado. Si la abreviatura tiene texto pero el nombre completo está vacío, el nombre completo toma el mismo valor que la abreviatura como fallback.

Valores por default (precargados la primera vez):

**Tacos:**
| Abreviatura | Nombre completo |
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

**Bebidas:**
| Abreviatura | Nombre completo |
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

El taquero puede cambiar tanto la abreviatura como el nombre completo de cualquier fila. Por ejemplo: cambiar `BI / Bistec` por `SU / Suadero`. Los cambios se reflejan en el teclado de captura al guardar.

### 3.4 Sección: Impresora

**Estado actual**: muestra la IP guardada actualmente, o un mensaje "Sin impresora configurada" si no hay ninguna.

**Botón "Buscar en mi red"**: escanea el rango local en paralelo buscando dispositivos que respondan en el puerto 9100 (el puerto estándar ESC/POS). Flujo:

1. Detecta la IP del dispositivo actual para deducir el rango de red (ej. si el celular es `192.168.1.105`, escanea `192.168.1.1` a `192.168.1.254`).
2. Muestra un spinner con el texto "Buscando impresora…" (3-8 segundos típicamente).
3. Si encuentra una o más IPs respondiendo en 9100:
   - Si encuentra una sola: muestra "¿Es esta tu impresora? `192.168.1.42`" con botones [Sí, usar esta] / [Buscar otra vez].
   - Si encuentra varias: las lista para que el taquero elija.
4. Si no encuentra ninguna: muestra "No se encontró impresora" con un campo de texto para escribir la IP manualmente.

**Campo de IP manual**: siempre disponible debajo del botón de búsqueda, para el caso de que la búsqueda automática falle o el taquero ya conozca la IP.

**Botón "Probar conexión"**: aparece cuando hay una IP guardada. En esta fase (antes de implementar Capacitor) solo valida que la IP tenga formato correcto y muestra un mensaje explicando que la prueba real de impresión estará disponible cuando la app se instale como APK. Esto es un placeholder consciente — se implementa de verdad en la fase 3.

Nota técnica: el escaneo de red por TCP requiere el plugin `capacitor-community/tcp-socket` cuando la app corra como APK. En el navegador, esta funcionalidad está limitada — el botón de búsqueda puede estar deshabilitado o mostrar un aviso de que solo funciona en la app instalada. El campo de IP manual siempre funciona en ambos contextos.

## 4. Persistencia

Todo se guarda en `localStorage` bajo estas claves:

```js
config.waiterName      // string — nombre del mesero
config.products.tacos  // array de 10 objetos { sku, name } — puede tener entradas vacías
config.products.drinks // array de 10 objetos { sku, name } — puede tener entradas vacías
config.printer.ip      // string — IP de la impresora, ej. "192.168.1.42"
```

Al arrancar la app, si no existe `config.products.tacos` ni `config.products.drinks` en `localStorage`, se cargan los valores por default del catálogo original. Esto garantiza que la app funcione correctamente desde la primera vez sin que el taquero tenga que configurar nada.

## 5. Impacto en pantallas existentes

### Pantalla de Mesas
- Se agrega el ícono de engranaje en el encabezado.
- Si `config.waiterName` tiene valor, se muestra como subtítulo o en el encabezado ("Mesa 5 · Juan").

### Pantalla de Comanda — Teclado
- Las teclas de tacos y bebidas leen su abreviatura y nombre desde `config.products` en vez de tener el catálogo hardcodeado.
- Las teclas con abreviatura vacía se renderizan desactivadas (visualmente en gris, sin evento de toque).
- El JSON de comanda usa el `sku` y `name` del catálogo configurado, no los valores por default.

### Modelo de datos — sin cambios
La estructura del objeto de comanda no cambia. `sku` y `name` siguen siendo los mismos campos — solo cambia de dónde vienen esos valores (ahora del catálogo configurado en vez de hardcodeado).

## 6. Checklist de aceptación

- [ ] Ícono de engranaje en el encabezado de Mesas, abre la pantalla de Configuración.
- [ ] Botón de regreso en Configuración vuelve a Mesas sin guardar si el taquero no tocó "Guardar".
- [ ] Campo de nombre de mesero, se guarda en `localStorage` y se muestra en Comanda.
- [ ] Catálogo editable de 10 tacos + 10 bebidas, con campo de abreviatura y nombre completo por fila.
- [ ] Valores por default precargados la primera vez (catálogo original completo).
- [ ] Botones vacíos en el teclado quedan desactivados visualmente.
- [ ] Los cambios al catálogo se reflejan en el teclado al guardar.
- [ ] Botón "Buscar en mi red" con spinner y lógica de resultados (una IP / varias / ninguna).
- [ ] Campo de IP manual siempre disponible como alternativa.
- [ ] Botón "Probar conexión" (placeholder en esta fase) cuando hay IP guardada.
- [ ] Todo persiste en `localStorage` y se carga correctamente al abrir la app de nuevo.
- [ ] La app funciona igual que antes si el taquero nunca abre Configuración (defaults silenciosos).
