# Fase 2 — Pantalla de Configuración

## 1. Objetivo

Permitir que cualquier taquero personalice la app para su negocio sin tocar código: sus propios productos, su nombre de mesero, y la IP de su impresora térmica. Todo se guarda en `localStorage` y la app lo carga automáticamente en cada sesión.

Esta fase no modifica el flujo de captura ni las pantallas de Mesas y Comanda — solo agrega una tercera pantalla accesible desde un ícono de engranaje, y conecta el catálogo editable al teclado de captura.

## 2. Acceso

Un ícono de engranaje (⚙) en el encabezado de la pantalla de Mesas, alineado a la derecha. Al tocarlo se abre la pantalla de Configuración. Un botón de regreso en el encabezado de Configuración vuelve a Mesas.

No hay acceso a Configuración desde la pantalla de Comanda — el mesero no configura durante el servicio.

## 3. Pantalla de Configuración

### 3.1 Estructura

Cuatro secciones, en este orden:

1. **Mesero** — nombre del mesero y número de mesas
2. **Productos** — catálogo editable de tacos y bebidas
3. **Modificadores** — catálogo editable de modificadores
4. **Impresora** — IP de la impresora en red local

Un botón "Guardar" al final de la pantalla aplica todos los cambios a la vez y regresa a Mesas. Los cambios no se aplican en tiempo real mientras el taquero edita — solo al guardar, para evitar que un cambio a medias rompa el teclado durante el servicio.

### 3.2 Sección: Mesero

Dos campos:
- **Nombre del mesero** — texto libre. Se muestra en el encabezado de la pantalla de Comanda (junto al nombre de la mesa, ej. "Mesa 5 · Juan"). Si está vacío, no se muestra nada.
- **Número de mesas** — número entre 1 y 20, default 10. Determina cuántas tarjetas numeradas se muestran en la grilla de Mesas.

### 3.3 Sección: Productos

Dos subsecciones: **Tacos** (10 filas) y **Bebidas** (10 filas).

Cada fila tiene: toggle activar/desactivar + campo de abreviatura (máx. 4 chars) + campo de nombre completo. Los slots sin abreviatura se ocultan por default; un botón **+ Agregar** al final de cada subsección revela el siguiente slot vacío.

### 3.4 Sección: Modificadores

Siete slots configurables. Cada slot tiene: toggle activar/desactivar + campo de abreviatura (máx. 4 chars) + campo de nombre completo. Los primeros tres slots tienen los defaults S/V, S/C, S/CI; los cuatro restantes vienen vacíos y desactivados. Mismo comportamiento de visibilidad dinámica que en Productos.

### 3.5 Sección: Impresora

**Estado actual**: muestra la IP guardada actualmente, o un mensaje "Sin impresora configurada" si no hay ninguna.

**Botón "Buscar en mi red"**: placeholder en esta fase — muestra un spinner y luego un aviso de que el escaneo real estará disponible al instalar la app como APK. La lógica de detección TCP se implementa en Fase 3 con Capacitor.

**Campo de IP manual**: siempre disponible como alternativa.

**Botón "Probar conexión"**: aparece cuando hay una IP guardada. Valida formato y muestra un mensaje de placeholder consciente.

## 4. Persistencia

```js
config.waiterName      // string
config.tableCount      // número (1-20)
config.products.tacos  // array de 10 objetos { sku, name, enabled }
config.products.drinks // array de 10 objetos { sku, name, enabled }
config.modifiers       // array de 7 objetos { sku, name, enabled }
config.printer.ip      // string
```

## 5. Impacto en pantallas existentes

### Pantalla de Mesas
- Ícono de engranaje en el encabezado.
- Grilla renderiza `config.tableCount` tarjetas (en vez de 10 fijas).
- Si `config.waiterName` tiene valor, se muestra en el encabezado de Comanda.

### Pantalla de Comanda — Teclado
- Las teclas de tacos y bebidas leen desde `config.products`.
- Las teclas de modificadores leen desde `config.modifiers`.
- Los slots con abreviatura vacía o `enabled: false` no aparecen (`display: none`); los activos llenan el espacio con `flex: 1`.
- El JSON de comanda usa el `sku` y `name` del catálogo configurado.

## 6. Checklist de aceptación

- [x] Ícono de engranaje en el encabezado de Mesas, abre la pantalla de Configuración.
- [x] Botón de regreso en Configuración vuelve a Mesas sin guardar si el taquero no tocó "Guardar".
- [x] Campo de nombre de mesero, se guarda en `localStorage` y se muestra en Comanda.
- [x] Catálogo editable de 10 tacos + 10 bebidas, con campo de abreviatura y nombre completo por fila.
- [x] Valores por default precargados la primera vez (catálogo original completo).
- [x] Botones vacíos en el teclado quedan desactivados visualmente (implementado como `display: none`; los botones activos llenan el espacio disponible).
- [x] Los cambios al catálogo se reflejan en el teclado al guardar.
- [x] Botón "Buscar en mi red" con spinner.*
- [x] Campo de IP manual siempre disponible como alternativa.
- [x] Botón "Probar conexión" (placeholder en esta fase) cuando hay IP guardada.
- [x] Todo persiste en `localStorage` y se carga correctamente al abrir la app de nuevo.
- [x] La app funciona igual que antes si el taquero nunca abre Configuración (defaults silenciosos).

> *El spinner está implementado. La lógica real de escaneo TCP (detectar la IP del dispositivo, escanear el rango, ramificar por número de resultados) está pendiente para **Fase 3** junto con la integración de Capacitor. El placeholder actual muestra un mensaje aclaratorio y es intencional.

## 7. Adiciones fuera de scope original

Estas funcionalidades se implementaron durante o después de Fase 2 y no estaban en el spec inicial. Están completamente integradas en la app y documentadas en `docs/spec.md`.

### 7.1 Sección de Modificadores configurables

La pantalla de Configuración incluye una cuarta sección **Modificadores** con 7 slots configurables (`{ sku, name, enabled }`). Los 4 modificadores que antes eran fijos (C/T, S/V, S/C, S/Ci) ahora son configurables. Defaults: S/V, S/C, S/CI en las posiciones 1–3; las 4 restantes vacías y desactivadas. Persiste en `config.modifiers`.

### 7.2 Toggle activar/desactivar en productos y modificadores

Cada fila del catálogo tiene un switch pill a la izquierda de los campos. Cuando está desactivado, los campos se ven atenuados pero conservan su texto, y el botón en el teclado no aparece. El campo `enabled` se guarda al presionar Guardar.

### 7.3 Número de mesas configurable

Campo numérico en la sección Mesero (1–20, default 10). La grilla renderiza exactamente esa cantidad de tarjetas en 5 columnas. Al reducir el número, el estado de las mesas eliminadas se borra silenciosamente. Persiste en `config.tableCount`.

### 7.4 Visibilidad dinámica de slots vacíos con "+ Agregar"

Los slots sin abreviatura se ocultan en la pantalla de Configuración. Un botón **+ Agregar** al final de cada sección revela el siguiente slot vacío y pone el foco en su campo de abreviatura. Si todos los slots tienen abreviatura, el botón desaparece. Al guardar con abreviatura vacía, el slot vuelve a ocultarse.
