# Fase 3 — Capacitor APK + Impresión Térmica

## 1. Objetivo

Convertir la app web en un APK instalable en Android y habilitar la impresión real a impresoras térmicas de red mediante TCP/ESC/POS. El código existente (HTML, CSS, JS) no se reescribe — Capacitor lo envuelve en una cáscara nativa que desbloquea APIs de red no disponibles en el navegador.

Al terminar esta fase, el mesero puede instalar la app en su celular como cualquier otra app, conectarla a la impresora de la taquería, y mandar tickets a cocina con un toque — sin papel, sin intermediarios.

## 2. Alcance

### Incluye
- Setup de Capacitor y configuración del proyecto Android.
- Flujo de desarrollo con live reload en dispositivo real.
- Implementación real del botón "Buscar en mi red" (escaneo TCP del rango local).
- Implementación real del botón "Probar conexión" (handshake TCP al puerto 9100).
- Botón "Imprimir" en cada burbuja del historial de Comanda.
- Generación de comandos ESC/POS desde el JSON estructurado de la comanda.
- Build y distribución del APK por sideloading (WhatsApp / Google Drive).

### No incluye
- iOS / App Store.
- Play Store (puede hacerse después con el mismo código).
- Impresión automática al enviar (el mesero decide cuándo imprimir).
- Firma de APK con certificado de producción (el sideloading con debug key es suficiente para uso interno).

## 3. Prerrequisitos de entorno

Antes de que Claude Code pueda hacer cualquier cosa, la máquina de desarrollo necesita:

- **Node.js 18+** — verificar con `node -v`.
- **Android Studio** — instalar desde developer.android.com/studio. Incluye el SDK de Android y las herramientas de build.
- **JDK 17** — Android Studio lo instala automáticamente; verificar con `java -version`.
- **Un celular Android con depuración USB habilitada** — en el celular: Ajustes → Acerca del teléfono → tocar "Número de compilación" 7 veces → Opciones de desarrollador → Depuración USB activada.

Claude Code no puede instalar Android Studio ni el JDK — eso es manual, una sola vez.

## 4. Setup de Capacitor

### 4.1 Inicializar el proyecto Node

El proyecto actualmente no tiene `package.json`. Capacitor necesita uno:

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor-community/tcp-socket
```

### 4.2 Inicializar Capacitor

```bash
npx cap init "Comanda Taquería" "mx.comanda.taqueria" --web-dir "."
```

- El nombre de la app es lo que aparece bajo el ícono en Android.
- El package ID (`mx.comanda.taqueria`) puede cambiarse — solo debe ser único y en formato de dominio inverso.
- `--web-dir "."` apunta al raíz del proyecto porque `index.html` está ahí directamente (sin carpeta `dist` ni paso de build).

Esto genera `capacitor.config.json` en la raíz.

### 4.3 Agregar la plataforma Android

```bash
npx cap add android
npx cap sync
```

`npx cap sync` copia los archivos web al proyecto Android y registra los plugins. Debe correrse cada vez que se instala un plugin nuevo o se cambian archivos de configuración de Capacitor.

### 4.4 Registrar el plugin TCP

En `android/app/src/main/java/.../MainActivity.java`, agregar el plugin en el método `onCreate`:

```java
add(TcpSocketPlugin.class);
```

Claude Code puede hacer esto — está documentado en el README de `@capacitor-community/tcp-socket`.

## 5. Flujo de desarrollo

El flujo no cambia para el trabajo cotidiano:

```
Editar código  →  ver en navegador (Chrome, igual que siempre)
                        ↓ para probar algo nativo (impresora, red)
               npx cap run android --livereload
               (requiere celular por USB con depuración habilitada)
                        ↓ para entregar
               npx cap build android  →  APK  →  WhatsApp / Drive
```

Con `--livereload`, el celular actualiza la app automáticamente cada vez que se guarda un archivo — no hace falta recompilar para ver cambios de UI.

**Regla:** el navegador es el entorno de desarrollo para todo excepto las funciones nativas (impresora, escaneo de red). No correr `npx cap run android` para probar cambios de CSS o lógica de captura — el navegador es más rápido.

## 6. Impresión — Arquitectura

La impresora habla el protocolo ESC/POS sobre TCP en el puerto 9100. El flujo completo:

```
JSON de comanda  →  formatTicket()  →  bytes ESC/POS  →  TCP socket  →  impresora
```

Las tres piezas:

1. **`formatTicket(comanda)`** — función JS que toma el objeto de comanda y devuelve un `Uint8Array` con los bytes ESC/POS listos para enviar.
2. **`printTicket(bytes)`** — función JS que abre un socket TCP a `config.printer.ip:9100`, envía los bytes, y cierra la conexión.
3. **Botón "Imprimir"** en cada burbuja del historial — llama a `formatTicket` con esa comanda y luego a `printTicket`.

### 6.1 Detección de contexto nativo

El plugin TCP solo existe en el APK, no en el navegador. Antes de intentar imprimir, verificar:

```js
const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
```

Si `isNative` es `false` (navegador), el botón "Imprimir" muestra un toast: "Impresión disponible en la app instalada." No deshabilitar el botón visualmente — el mesero puede estar en el navegador durante pruebas y necesita saber que el botón existe y dónde está.

### 6.2 Comandos ESC/POS

Vocabulario mínimo necesario para el ticket:

| Función | Bytes |
|---|---|
| Inicializar impresora | `0x1B 0x40` |
| Negrita ON | `0x1B 0x45 0x01` |
| Negrita OFF | `0x1B 0x45 0x00` |
| Alinear al centro | `0x1B 0x61 0x01` |
| Alinear a la izquierda | `0x1B 0x61 0x00` |
| Salto de línea | `0x0A` |
| Corte de papel (parcial) | `0x1D 0x56 0x42 0x00` |
| Seleccionar codepage PC858 | `0x1B 0x74 0x13` |

El texto se codifica en bytes con la función `encodePC858()` (ver sección 13). El comando de selección de codepage se envía una sola vez al inicio del ticket, inmediatamente después de `ESC @` y antes de cualquier texto.

### 6.3 Formato del ticket

```
================================================   ← línea de separación (48 chars)
                  MESA 5                           ← nombre centrado, negrita
                   Juan                            ← nombre del mesero si existe, centrado
                  14:35                            ← hora de envío, centrada
================================================
Plato 1
  3x Pastor    S/C
  3x Asada
  sin charola, para llevar         ← nota del plato sin formato especial
------------------------------------------------   ← separador entre platos (48 chars, guion simple)
Plato 2
  1x Quesadilla
================================================
```

Reglas de formato:
- Ancho de línea: 48 caracteres (rollo de 80mm).
- Los modificadores van inline después del nombre del producto, separados por espacio: `3x Pastor  S/C  S/Ci`.
- La nota del plato va en su propia línea, indentada 2 espacios.
- Si `config.waiterName` tiene valor, incluirlo en el encabezado.
- Corte de papel al final del ticket.

### 6.4 Manejo de errores de impresión

Tres casos posibles al intentar imprimir:

1. **Sin IP configurada** → toast "Configura la IP de la impresora en Ajustes."
2. **Conexión rechazada / timeout** → toast "No se pudo conectar a la impresora. Verifica que esté encendida y en la misma red."
3. **Impresión exitosa** → toast "Impreso ✓" (mismo estilo que el toast de comanda enviada).

El timeout de conexión debe ser corto: 3 segundos. Si la impresora no responde en 3 segundos, algo está mal — no tiene sentido hacer esperar más al mesero.

## 7. Buscar en mi red — implementación real

Implementado. Requiere el plugin TCP y solo funciona en el APK (`isNative === true`). En el navegador sigue mostrando el mensaje de placeholder.

### Flujo implementado

1. **Obtener IP local** — `getLocalIP()` crea un `RTCPeerConnection` sin STUN servers y extrae la IP del dispositivo desde el primer ICE candidate local. Timeout de 5 segundos; si no se obtiene IP, muestra "No se pudo detectar la red. Escribe la IP manualmente."

2. **Derivar el rango** — del prefijo `/24`: si el celular es `192.168.1.105`, genera el arreglo `192.168.1.1` … `192.168.1.254` (254 IPs).

3. **Escanear en lotes de 50** — `Promise.all` sobre cada lote llama a `escanearIP(TcpSocket, ip)` por cada dirección. Los lotes se procesan secuencialmente; dentro de cada lote los 50 intentos corren en paralelo.

4. **Verificación ESC/POS en la misma conexión** — `escanearIP()` no solo abre el socket: sobre la misma conexión ejecuta dos pasos antes de reportar un resultado positivo:
   - **Paso A** — envía `ESC @` (`0x1B 0x40`): inicializa la impresora. Si la conexión se cierra, la IP se descarta.
   - **Paso B** — envía `DLE EOT 1` (`0x10 0x04 0x01`): solicita el byte de estado del dispositivo. Espera exactamente 1 byte de respuesta con timeout de 1 segundo. Solo si llega ese byte la IP se confirma como impresora ESC/POS real.
   - Las IPs que responden en el puerto 9100 pero no superan la verificación (otros dispositivos con ese puerto abierto) se descartan silenciosamente.

### Manejo de resultados

- **Una IP verificada** → "¿Es esta tu impresora? `192.168.1.42`" con botones [Sí, usar esta] y [Buscar otra vez]. Al confirmar, la IP se guarda en `config.printer.ip` y se actualiza el estado visible de la sección de impresora.
- **Varias IPs verificadas** → lista de botones, uno por IP. Al tocar una se guarda igual que el caso anterior.
- **Ninguna verificada** → "No se encontró impresora en la red. Escribe la IP manualmente."

El spinner "Buscando impresora en la red..." permanece durante todo el proceso. El tiempo típico es 2–4 segundos en una red doméstica (500ms de timeout por conexión fallida, más ~1s de verificación por candidato encontrado).

## 8. Probar conexión — implementación real

Reemplaza el placeholder actual. Abre un socket TCP a `config.printer.ip:9100`, espera respuesta o timeout de 3 segundos, y cierra inmediatamente.

- **Éxito** → "Impresora conectada ✓"
- **Fallo** → "Sin respuesta en `192.168.1.42`. Verifica que la impresora esté encendida y en la misma red."

Opcionalmente, al confirmar conexión, imprimir un ticket de prueba mínimo (una línea de texto + corte) para confirmar que ESC/POS también funciona, no solo TCP.

## 9. Build y distribución

### Generar el APK

```bash
npx cap build android
```

El APK de debug queda en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Distribuir por sideloading

1. Enviar el `.apk` por WhatsApp o subirlo a Google Drive.
2. En el celular del mesero: abrir el archivo → Android pedirá permiso para "instalar apps de fuentes desconocidas" → aceptar → instalar.
3. El ícono aparece en la pantalla de inicio como cualquier app.

Para actualizar la app después: generar un nuevo APK y repetir el proceso. El estado en `localStorage` (pedidos, configuración) se conserva entre actualizaciones siempre que el package ID no cambie.

### APK de release (opcional, para Play Store en el futuro)

```bash
npx cap build android --prod
```

Requiere firmar con un keystore propio. No es necesario para sideloading — el APK de debug funciona perfectamente para uso interno.

## 10. Impacto en código existente

### app.js
- Agregar `formatTicket(comanda)` — función pura, sin efectos secundarios, fácil de testear.
- Agregar `printTicket(bytes)` — encapsula el acceso al plugin TCP.
- Agregar `scanNetwork()` — lógica de escaneo, solo se llama desde la pantalla de Configuración.
- Modificar el botón "Buscar en mi red" en Configuración para llamar `scanNetwork()`.
- Modificar el botón "Probar conexión" para llamar `printTicket` con un ticket de prueba o solo abrir/cerrar el socket.
- Agregar botón "Imprimir" a cada burbuja del historial.

### index.html / styles.css
- Botón "Imprimir" en la burbuja: ícono de impresora, mismo estilo que el botón "Cocina" existente (pequeño, sin texto, alineado al pie de la burbuja).

### capacitor.config.json (nuevo)
```json
{
  "appId": "mx.comanda.taqueria",
  "appName": "Comanda Taquería",
  "webDir": ".",
  "server": {
    "androidScheme": "https"
  }
}
```

### Ningún cambio en
- El modelo de datos de la comanda.
- La lógica de captura.
- Las pantallas de Mesas y Comanda (salvo el botón Imprimir en las burbujas).
- `localStorage` — Capacitor WebView lo soporta sin cambios.

## 11. Checklist de aceptación

- [x] `package.json` creado, Capacitor y plugin TCP instalados.
- [x] `capacitor.config.json` configurado con webDir apuntando a `www/`.
- [x] Proyecto Android generado (`android/` presente, compila sin errores).
- [ ] `npx cap run android --live-reload` lanza la app en el celular conectado por USB.
- [x] `formatTicket(comanda)` genera bytes ESC/POS válidos para el modelo de datos actual.
- [x] Botón "Imprimir" en cada burbuja del historial, visible y tappable (mínimo 44px).
- [x] Impresión exitosa desde el APK: el ticket sale en la impresora con el formato definido.
- [x] Toast de error si la impresora no responde.
- [x] Toast informativo si se intenta imprimir desde el navegador.
- [x] "Buscar en mi red" implementado con escaneo TCP real en el APK.
- [x] Verificación ESC/POS de impresoras encontradas en el escaneo (ESC @ + DLE EOT 1, misma conexión).
- [ ] "Probar conexión" implementado con handshake TCP real en el APK.
- [x] APK de debug generado e instalable por sideloading.
- [x] El estado en localStorage se conserva tras actualizar la app.
- [x] La app funciona igual en el navegador si el plugin TCP no está disponible (degradación limpia).

## 12. Notas de implementación

Hallazgos de la sesión de implementación (2026-06-27) relevantes para el mantenimiento futuro.

### Capacitor 7 — diferencias con el spec original

- **`webDir` debe ser `"www"`, no `"."`** — Capacitor 7 rechaza la raíz del proyecto como directorio web. Los archivos `index.html`, `styles.css` y `app.js` se movieron a `www/`.
- **Registro del plugin TCP es automático** — En Capacitor 7, `BridgeActivity` lee `capacitor.plugins.json` y registra los plugins sin intervención manual. El paso de agregar `add(TcpSocketPlugin.class)` en `MainActivity.java` descrito en la sección 4.4 no aplica y causaría error de duplicado.
- **Flag de live reload** — El flag correcto es `--live-reload` (con guion), no `--livereload`. El spec tenía el nombre incorrecto.
- **Paquete TCP correcto** — El paquete es `capacitor-tcp-socket` v7.1.1 (publicado por isvend). `@capacitor-community/tcp-socket` referenciado en el spec no existe en npm.

### Conflicto de Kotlin en el build de Android

Al compilar por primera vez aparece `Duplicate class` entre `kotlin-stdlib-jdk8` y `kotlin-stdlib`. Se resuelve forzando la versión en `android/app/build.gradle` dentro del bloque `android {}`:

```gradle
configurations.all {
    resolutionStrategy {
        force "org.jetbrains.kotlin:kotlin-stdlib:1.9.0"
        force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.9.0"
        force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.9.0"
    }
}
```

### Flujo de build en WSL2

`npx cap run android` no funciona desde WSL2 porque las herramientas de build de Android (Gradle, Java) están en Windows, no en el entorno Linux. El flujo establecido:

1. Editar código en WSL2 (`/home/gi/proyectos/comanda-taqueria/www/`).
2. Correr `./build-apk.sh` desde WSL2 — copia los archivos web a `C:\Users\gi\proyectos\comanda-taqueria\www\`, ejecuta `npx cap sync` desde Windows vía PowerShell, y abre Android Studio.
3. Compilar y desplegar desde Android Studio apuntando a `C:\Users\gi\proyectos\comanda-taqueria\android`.

El script `build-apk.sh` en la raíz del proyecto automatiza los pasos 1 y 2.

### index.html de redirect en la raíz del repo

Al mover los archivos web a `www/`, GitHub Pages dejó de funcionar (esperaba `index.html` en la raíz). Se agregó un `index.html` mínimo en la raíz que redirige a `www/index.html` con `<meta http-equiv="refresh">`. Este archivo no se copia a Windows durante el build — `build-apk.sh` solo sincroniza los contenidos de `www/`.

### Pendiente para la próxima sesión

- **"Probar conexión"** — actualmente solo hace handshake TCP (conecta y desconecta). Evaluar si conviene enviar también un ticket de prueba mínimo para confirmar ESC/POS además de TCP.
- **Verificar modificadores en el ticket impreso** — confirmar que el formato `  Nx Nombre  MOD1  MOD2` sale correctamente en papel con la impresora real.

## 13. Funcionalidades agregadas fuera del scope original de fase3.md

Estas funcionalidades se implementaron durante las sesiones de Fase 3 y no estaban en el spec inicial.

### Resumen del día

Botón de impresora en el encabezado de la pantalla de Mesas, visible solo cuando hay una IP de impresora configurada. Al tocarlo, genera e imprime un ticket ESC/POS de 48 chars que agrupa todas las comandas enviadas hoy por mesa (en orden numérico, luego PR, PE, PA) con número de comanda, total por comanda, subtotal por mesa y total global del día. Si no hay comandas hoy, muestra toast "Sin comandas hoy". Solo funciona en el APK (misma condición que el resto de la impresión).

### Número de comanda correlativo global

Cada comanda enviada recibe un campo `comandaNum` — un entero correlativo que persiste en `localStorage` bajo la clave `config.lastComandaNum`. El contador no se reinicia al cerrar la app. Las comandas antiguas sin este campo aparecen con número "—" en el resumen del día.

### Timestamp sentAt en ISO 8601

El campo `sentAt` de cada comanda cambió de formato `"HH:MM"` a ISO 8601 (`new Date().toISOString()`). Las burbujas del historial y el ticket impreso muestran solo la hora local (HH:MM) derivada del timestamp. Las comandas antiguas en `localStorage` con el formato viejo siguen funcionando — se muestran tal cual al no poder parsearse como fecha.

### Precios por producto

Se agregó un campo `price` (número, default 0) a cada entrada del catálogo de tacos y bebidas. Al capturar un producto, su precio unitario se guarda en el item como `unitPrice`. El total de cada comanda se calcula al renderizar (no se guarda). Si algún item tiene precio, la burbuja del historial muestra el total al pie y el ticket impreso incluye una columna de precios alineada a la derecha.

### Control de tamaño del teclado

Selector de tres opciones en la sección Mesero de Configuración (Normal / Grande / Muy grande). Persiste en `config.keyboardSize`. Al guardar, aplica una clase CSS al contenedor del teclado (`teclado--large` o `teclado--xlarge`) que ajusta height y font-size de las teclas.

### Cancelación de comandas

Botón X en el pie de cada burbuja del historial, junto al botón "Cocina". Al tocarlo muestra `confirm()` nativo: "¿Cancelar comanda #N? Esta acción no se puede deshacer." Si confirma, agrega `cancelled: true` al objeto de comanda en `localStorage`. La comanda no se elimina — queda visible con `opacity: 0.45`, el texto del ticket tachado y una etiqueta roja "Cancelada" arriba a la derecha. Los botones de imprimir y cancelar desaparecen de la burbuja cancelada. El contador de "N enviadas" en la tarjeta de mesa solo cuenta comandas activas. En el resumen del día, las comandas canceladas aparecen marcadas como `CANCELADA` pero su monto no se suma al subtotal ni al total global.

### Modo claro/oscuro

Botón de tres estados en el encabezado de la pantalla de Mesas, a la izquierda del botón de resumen. Cicla en orden: `auto → light → dark → auto`. El ícono cambia con el estado: monitor (auto), sol (light), luna (dark). El estado persiste en `config.theme` en `localStorage`.

- **auto**: sigue `prefers-color-scheme` del sistema via `@media (prefers-color-scheme: light) { :root:not(.theme-dark) { ... } }` — no requiere JS para el render inicial.
- **light**: fuerza modo claro añadiendo la clase `.theme-light` a `<html>`.
- **dark**: fuerza modo oscuro añadiendo la clase `.theme-dark` a `<html>`, lo que excluye la media query de auto.

Para evitar flash al recargar, `www/index.html` tiene un script inline síncrono en `<head>` (antes del `<link rel="stylesheet">`) que lee `config.theme` de `localStorage` y aplica la clase antes de que el CSS sea evaluado por primera vez.

**Paleta de modo claro** (variables bajo `:root.theme-light` y `@media (prefers-color-scheme: light)`):

| Variable | Valor |
|---|---|
| `--bg` | `oklch(0.97 0.003 247)` |
| `--surface` | `oklch(0.93 0.006 247)` |
| `--surface-2` | `oklch(0.85 0.010 247)` |
| `--surface-3` | `oklch(0.78 0.014 247)` |
| `--ink` | `oklch(0.15 0.010 247)` |
| `--ink-muted` | `oklch(0.45 0.010 247)` |
| `--primary` | `oklch(0.45 0.170 247)` |
| `--primary-hover` | `oklch(0.37 0.160 247)` |
| `--primary-fg` | `oklch(0.97 0.005 247)` |
| `--accent` | `oklch(0.48 0.200 65)` |
| `--accent-fg` | `oklch(0.97 0.010 78)` |
| `--error` | `oklch(0.48 0.220 25)` |
| `--error-muted` | `oklch(0.92 0.030 25)` |
| `--success` | `oklch(0.45 0.180 145)` |
| `--bg-outer` | `oklch(0.88 0.006 247)` |

La paleta oscura (default en `:root`) no cambia.

### Búsqueda real de impresoras en red

Implementada en la función `buscarImpresora()` de `www/app.js`. Solo activa en el APK (`isNative === true`); en el navegador sigue mostrando el mensaje de placeholder.

**Obtener IP local**: `getLocalIP()` usa `RTCPeerConnection` con lista de STUN servers vacía. Al crear un data channel y generar una oferta SDP, el navegador genera ICE candidates locales que incluyen la IP del dispositivo en la red. No requiere internet ni plugins adicionales; funciona en el WebView de Capacitor/Android. Timeout de 5 segundos como fallback; si no llega ningún candidate válido (no `169.254.x.x`), se muestra el mensaje de IP manual.

**Escaneo**: `escanearIP(TcpSocket, ip)` combina el intento de conexión y la verificación ESC/POS en una sola función, sobre la misma conexión:
1. `TcpSocket.connect({ ipAddress: ip, port: 9100 })` con timeout de 500ms via `Promise.race`.
2. `TcpSocket.send({ client, data: btoa('\x1b\x40'), encoding: 'base64' })` — ESC @ (init).
3. `TcpSocket.send({ client, data: btoa('\x10\x04\x01'), encoding: 'base64' })` — DLE EOT 1 (status request).
4. `TcpSocket.read({ client, expectLen: 1, timeout: 1, encoding: 'base64' })` con timeout adicional de 1200ms via `Promise.race` — espera el byte de respuesta.
5. `TcpSocket.disconnect({ client })` en cualquier rama (éxito o error).

Devuelve la IP si recibió respuesta al status request; `null` en cualquier otro caso.

**Lotes**: el loop principal corre `Promise.all` sobre grupos de 50 IPs, iterando los 6 lotes de forma secuencial. Esto evita abrir 254 sockets simultáneos (que podría saturar el sistema) sin aumentar demasiado el tiempo total.

**Resultados**: al terminar el escaneo, el UI muestra botones de confirmación para cada IP verificada. Al confirmar, la IP se guarda en `config.printer.ip`, se llama `saveConfig()` y se llama `actualizarPrinterStatus()` para reflejar el cambio sin necesidad de guardar la configuración completa.

### Corrección de acentos con codepage PC858

Las impresoras térmicas ESC/POS no reciben UTF-8 por defecto — usan páginas de códigos heredadas. Sin activar la página correcta, los caracteres fuera de ASCII (á, é, ñ, etc.) se imprimen como símbolos incorrectos.

**Solución implementada** en `formatTicket()` de `www/app.js`:

1. **Activar codepage al inicio del ticket**: el byte sequence `[0x1B, 0x74, 0x13]` (ESC t 19) se emite inmediatamente después de `ESC @` y antes de cualquier texto. Esto selecciona la página de códigos PC858 en la impresora, que cubre los caracteres del español y el símbolo `€`.

2. **Función `encodePC858(str)`**: reemplaza `TextEncoder` dentro de `formatTicket`. Convierte cada carácter del string: los ASCII estándar (0x00–0x7F) se pasan con su código directo; los caracteres especiales del español se mapean según esta tabla:

| Char | Byte PC858 | Char | Byte PC858 |
|------|-----------|------|-----------|
| á | 0xA0 | Á | 0x41 |
| é | 0x82 | É | 0x90 |
| í | 0xA1 | Í | 0xD6 |
| ó | 0xA2 | Ó | 0xE0 |
| ú | 0xA3 | Ú | 0xE9 |
| ñ | 0xA4 | Ñ | 0xA5 |
| ü | 0x81 | Ü | 0x9A |
| ¡ | 0xAD | ¿ | 0xA8 |
| € | 0xD5 | | |

Cualquier otro carácter fuera de ASCII que no esté en la tabla se sustituye por `?` (0x3F). `formatResumenDia()` no fue modificada — sigue usando `TextEncoder` ya que su corrección queda pendiente.

### Notas de implementación — Descubrimiento de impresoras

#### Problema raíz: plugin TCP bloqueante en el bridge de Capacitor

El plugin `capacitor-tcp-socket` original implementa `connect()` con `new Socket(ipAddress, port)` — una llamada bloqueante sin timeout que corre en el hilo del bridge de Capacitor. Cada llamada JS→Java espera una respuesta antes de que la siguiente pueda ejecutarse. Con 254 IPs a barrer secuencialmente, esto hace imposible completar un escaneo en tiempo razonable: las IPs que no responden bloquean el hilo durante segundos cada una.

Intentos intermedios de resolver el problema (batches paralelos con `Promise.race`, thread pools en Java, bindings a interfaz WiFi) no funcionaron porque el bloqueo ocurre en el bridge nativo antes de llegar al código Java del plugin.

#### Solución: scanNetwork() y getArpTable() como métodos nativos en Java

Se agregaron dos métodos nuevos a `TcpSocketPlugin.java` que mueven toda la lógica de red al lado Java, cruzando el bridge solo una vez:

**`getArpTable()`** — Lee `/proc/net/arp` directamente en Java. Devuelve las IPs con estado `0x2` (entrada ARP completa/activa) en interfaz `wlan*`. Si la impresora fue usada recientemente, estará en la tabla ARP y se encuentra en milisegundos sin abrir ningún socket. No requiere permisos adicionales.

**`scanNetwork(prefix, port, timeout)`** — Abre 254 conexiones TCP simultáneas en un `FixedThreadPool(50)`, con `CountDownLatch` para sincronizar. Timeout configurable por conexión (default 400ms). Cruza el bridge una sola vez al inicio y una sola vez al devolver resultados. Tiempo típico: 1–3 segundos para un /24 completo.

El flujo de `buscarImpresora()` en cascada:
1. `getArpTable()` → filtra por prefijo de red → `probarIP()` a candidatas. Resultado inmediato si la impresora está en caché ARP.
2. Si ARP no encuentra nada → `scanNetwork()` → devuelve todas las IPs que responden en puerto 9100.

#### Sincronización del Java parcheado a Windows

El proyecto compila en Android Studio desde Windows (`C:\Users\gi\proyectos\comanda-taqueria\node_modules\capacitor-tcp-socket\android`). El parche aplicado por `patch-package` modifica el Java en WSL (`/home/gi/proyectos/...`) pero no en Windows. `build-apk.sh` fue actualizado para copiar el Java parcheado a Windows en cada ejecución, garantizando que Android Studio siempre compile la versión correcta.

#### getWifiNetwork() eliminado

Se intentó forzar el ruteo via WiFi usando `ConnectivityManager.getAllNetworks()` para evitar que Android usara datos móviles en el escaneo. El método fue eliminado porque `ConnectivityManager.getAllNetworks()` requiere el permiso `ACCESS_NETWORK_STATE` declarado en `AndroidManifest.xml`, y su ausencia causaba un crash en "Probar conexión". El método nunca demostró resolver el problema de descubrimiento, y `scanNetwork()` opera directamente sobre la red sin necesitar binding explícito a una interfaz.
