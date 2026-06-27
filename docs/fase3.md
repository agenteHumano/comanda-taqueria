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

El texto se codifica en bytes con `TextEncoder` (UTF-8). La mayoría de las impresoras térmicas de red soportan UTF-8 o Latin-1; si los acentos no salen bien, cambiar a `latin1` con una tabla de conversión simple.

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

Reemplaza el placeholder actual. Requiere el plugin TCP y solo funciona en el APK (`isNative === true`).

### Flujo

1. Obtener la IP local del dispositivo via `@capacitor/network` o mediante una conexión de prueba al gateway.
2. Derivar el rango: si el celular es `192.168.1.105`, escanear `192.168.1.1` a `192.168.1.254`.
3. Intentar conectar a cada IP en el puerto 9100 en paralelo, con timeout de 500ms por intento.
4. Agrupar las IPs que respondan.

### Manejo de resultados

- **Una IP responde** → "¿Es esta tu impresora? `192.168.1.42`" con botones [Sí, usar esta] / [Buscar otra vez].
- **Varias IPs responden** → lista de opciones para que el taquero elija.
- **Ninguna responde** → "No se encontró impresora en la red. Escribe la IP manualmente."

El escaneo de 254 IPs en paralelo con timeout de 500ms tarda típicamente 1–3 segundos en una red local. Mostrar spinner con "Buscando impresora…" durante ese tiempo.

En el navegador (`isNative === false`), el botón "Buscar en mi red" sigue mostrando el mensaje de placeholder actual — no cambia.

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
- [ ] "Buscar en mi red" implementado con escaneo TCP real en el APK.
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

### Pendiente para la próxima sesión

- **"Buscar en mi red"** — escaneo TCP del rango local (sección 7). Requiere obtener la IP del dispositivo y paralelizar conexiones de prueba al puerto 9100 con timeout de 500ms.
- **"Probar conexión"** — actualmente solo hace handshake TCP (conecta y desconecta). Evaluar si conviene enviar también un ticket de prueba mínimo para confirmar ESC/POS además de TCP.
- **Verificar modificadores en el ticket impreso** — confirmar que el formato `  Nx Nombre  MOD1  MOD2` sale correctamente en papel con la impresora real.
