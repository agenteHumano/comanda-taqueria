# Comanda Chat para Taquería

Componente independiente de captura de comandas para taquería, optimizado para velocidad en mobile. HTML/CSS/JS puro sin frameworks, integrable después a cualquier backend. La app corre también como APK Android empaquetada con Capacitor.

## Estructura del proyecto

Los archivos web (`index.html`, `styles.css`, `app.js`) viven en `www/`. La raíz del repo tiene un `index.html` de redirect a `www/index.html` para mantener GitHub Pages funcionando.

## Correr localmente (navegador)

Sin build step. Abrir `www/index.html` directamente en el navegador, o servir con cualquier servidor estático:

```bash
npx serve .
# o
python3 -m http.server
```

## Build del APK (Android)

Requiere Android Studio instalado en Windows. El flujo desde WSL2:

```bash
./build-apk.sh   # copia www/ a Windows y ejecuta cap sync
```

Luego compilar y desplegar desde Android Studio apuntando a `C:\Users\gi\proyectos\comanda-taqueria\android`.

## Convenciones

- Sin frameworks (Vanilla JS, CSS y HTML puros).
- Mobile-first en todo momento.
- Sin dependencias externas en el código web.

## Especificación completa

@docs/spec.md

## Estado por fase

- **Fase 2** (Configuración): completa — ver `docs/fase2.md`.
- **Fase 3** (Capacitor + impresión térmica): completa — ver `docs/fase3.md`.
