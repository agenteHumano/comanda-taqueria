# Comanda Chat para Taquería — Especificación técnica

Documento de referencia para implementar el componente de captura de comandas. Este documento integra el brief original más las decisiones de diseño tomadas durante un proceso de prototipado iterativo. Donde haya diferencia entre "la idea original" y "lo que se decidió después", manda lo que está aquí.

## 1. Resumen del proyecto

Componente independiente de captura rápida de comandas para una taquería, pensado para integrarse después en cualquier sistema (Node.js, Firebase u otro backend). No es un POS completo: es la pieza de captura que un mesero usa en el momento de tomar el pedido, optimizada para velocidad por encima de todo. La meta de producto es simple: que un mesero prefiera capturar en el celular antes que en una libreta de papel, porque es más rápido, no porque se vea más bonito.

La interfaz combina dos referencias familiares para cualquier usuario de celular: la lógica de una libreta de mesero (agrupar por plato, anotar rápido) y la lógica de una app de mensajería (historial como burbujas, captura abajo). No se trata de copiar visualmente ninguna de las dos, solo de aprovechar que el usuario ya sabe usarlas.

## 2. Alcance de esta versión

### Incluye
- Pantalla de selección de mesa / pedido especial.
- Pantalla de comanda por mesa, con historial, vista previa y teclado de captura.
- Modelo de datos estructurado (no solo texto) listo para conectarse a una API después.
- Estado independiente por mesa (cada mesa conserva su historial y su borrador en construcción aunque el mesero navegue a otra).

### No incluye (a propósito)
- Usuarios / inicio de sesión.
- Pagos.
- Inventario.
- Impresoras térmicas.
- Base de datos / persistencia real entre sesiones de la app (ver nota técnica en sección 9 sobre `localStorage`).
- Backend.
- Reportes.
- Vista de cocina en tiempo real (sí se incluye una vista "para cocina" dentro de la misma pantalla, ver sección 6, pero no una pantalla separada ni sincronización entre dispositivos).

## 3. Arquitectura de pantallas

La app tiene dos pantallas. No hay menú de navegación adicional, solo se entra de una a la otra.

### 3.1 Pantalla "Mesas"

Es la pantalla de entrada. Muestra:

- Una grilla de **10 mesas numeradas** (1 a 10), en cuadrícula de 5 columnas x 2 filas. Cada tarjeta muestra el número grande y, si aplica, un estado pequeño debajo: "en construcción" (si hay un pedido a medio capturar) o "N enviadas" (si ya se mandaron comandas). Sin estado = mesa sin actividad.
- Una sección separada, debajo, para **tres pedidos especiales** que no tienen mesa física:
  - `PR` — Para recoger (ícono de bolsa)
  - `PE` — Para enviar (ícono de camión de reparto)
  - `PA` — Por asignar (pedido ya tomado, cliente en camino, sin mesa todavía; ícono de reloj)

  Cada una se comporta exactamente igual que una mesa numerada: tiene su propio historial y su propio borrador, y muestra el mismo tipo de estado.

  Nota: el código `PA` de "por asignar" coincide con la abreviatura de producto `PA` (Pastor) del teclado. Viven en pantallas distintas así que en uso real no debería confundir, pero queda documentado por si se prefiere cambiar a otro código (por ejemplo `SM` de "sin mesa") al implementar.

- Tocar cualquier tarjeta (numerada o especial) abre la pantalla de Comanda para ese identificador.

### 3.2 Pantalla "Comanda"

Se abre al seleccionar una mesa o pedido especial. Tiene, de arriba a abajo:

1. **Encabezado**: botón de regreso a la pantalla de Mesas (no hay flechas de "mesa anterior / siguiente": la navegación entre mesas es siempre a través de la grilla), el nombre de la mesa o pedido especial (ej. "Mesa 5" o "Para recoger"), y un contador de comandas ya enviadas para ese identificador.
2. **Historial**: las comandas ya enviadas para esa mesa, como burbujas alineadas a la derecha (estilo "mensaje enviado"), en orden cronológico. Cada burbuja muestra el pedido en formato de ticket (ver sección 6) y tiene un botón pequeño (ícono de flecha, sin texto) para expandir/contraer el detalle tipo cocina.
3. **Vista previa / borrador**: el pedido que se está armando en este momento, antes de enviar, en el mismo formato de ticket. Si no hay nada capturado, muestra un placeholder invitando a tocar un producto.
4. **Teclado de captura**: ver sección 5.

## 4. Modelo de datos

El pedido se guarda estructurado, no como texto plano. Forma final de una comanda enviada:

```js
{
  table: 12, // número (1-10) para mesas, o "PR" | "PE" | "PA" para pedidos especiales
  plates: [
    {
      items: [
        { sku: "PA", name: "Pastor", qty: 3, mods: ["S/C"] },
        { sku: "AS", name: "Asada", qty: 3, mods: [] }
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

Reglas del modelo:
- `mods` es un arreglo porque un mismo producto puede llevar varios modificadores combinados (ej. sin cebolla y sin cilantro a la vez).
- `note` vive a nivel de **plato**, no a nivel de producto ni a nivel de comanda completa. Razonamiento: lo "raro" casi siempre es general al grupo, no a un taco específico, pero como es texto libre el mesero puede mencionar el producto si hace falta ("la de pastor sin limón"). Un plato puede tener `note` sin tener `items` (por ejemplo si el mesero quiere anotar algo antes de elegir productos), así que al filtrar antes de enviar hay que conservar platos que tengan nota aunque no tengan productos.
- Catálogo de productos para esta primera versión:

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
| REF | Refresco |

- Catálogo de modificadores:

| Código | Significado | Comportamiento |
|---|---|---|
| C/T | Con todo | No se guarda como tag: es una acción que limpia (vacía) el arreglo `mods` del producto activo. |
| S/V | Sin verdura | Se agrega/quita del arreglo `mods` (toggle). |
| S/C | Sin cebolla | Se agrega/quita del arreglo `mods` (toggle). |
| S/Ci | Sin cilantro | Se agrega/quita del arreglo `mods` (toggle). |

## 5. Teclado y lógica de captura

### 5.1 Layout del teclado

Inspirado deliberadamente en la disposición de Gboard de Android, para que sea instantáneamente familiar, pero reemplazando el alfabeto por las funciones de la taquería:

1. **Fila de números** (1-0): exactamente como la fila numérica superior de Gboard. Sirve para escribir la cantidad.
2. **Fila de productos** (10 teclas, ancho completo): ocupa el lugar donde Gboard pondría `qwertyuiop` — no es casualidad, son exactamente 10 abreviaturas de producto para 10 teclas.
3. **Fila de modificadores** (4 teclas: C/T, S/V, S/C, S/Ci).
4. **Botón de nota libre** (ver 5.6).
5. **Fila de control**, con tres botones que reutilizan el significado real de las teclas especiales de un teclado:
   - Izquierda: **Borrar** (ícono de retroceso). Mapeo directo y obvio.
   - Centro (posición de barra espaciadora, la tecla más ancha): **Siguiente plato**. La barra espaciadora separa palabras; este botón separa grupos dentro del mismo pedido — incluye un pequeño ícono de línea horizontal.
   - Derecha (posición de Enter/Return): **Enviar comanda**. Esta es la convención real en apps de mensajería (WhatsApp, Slack, iMessage): cuando estás escribiendo un mensaje, esa tecla se convierte en el botón de enviar. No va en la barra espaciadora — ese fue un error de diseño corregido durante el prototipado: el tamaño de una tecla no determina su importancia, su función sí.

Encima del teclado, en vez de un campo con la etiqueta "Cantidad", solo se muestra el número grande (o "1" en gris si no se ha tocado nada), junto con tres atajos rápidos para las cantidades 1, 2 y 3 (las más comunes), inspirados en la barra de sugerencias de palabras de Gboard.

### 5.2 Flujo de captura

```
cantidad (opcional, default 1) → producto → [modificador opcional] → [nota opcional] → siguiente plato → ... → enviar
```

### 5.3 Cantidad
- Tocar dígitos acumula un número (máximo 2 dígitos).
- Los atajos 1/2/3 sobrescriben directamente el valor en vez de acumular.
- Si no se toca ningún dígito antes de tocar un producto, la cantidad por default es 1.
- Al confirmar un producto, el contador de cantidad se reinicia.

### 5.4 Productos
- Tocar un producto agrega `{ sku, name, qty, mods: [] }` al plato activo (el último de la lista; si no existe ninguno, se crea uno nuevo).
- Si el mismo producto ya existe en el plato activo, se suma la cantidad en vez de duplicar la línea.
- El producto recién agregado o modificado queda marcado internamente como "último producto tocado" — es el que recibirá el siguiente modificador.

### 5.5 Modificadores
- Se aplican siempre al **último producto tocado**, nunca requieren seleccionar manualmente a qué producto aplicar (se evaluó la opción de selección múltiple y se descartó por ser más lenta y por introducir un modo de selección que el brief original explícitamente quiere evitar).
- Tocar `C/T` vacía los modificadores del producto activo (sirve como "deshacer" si se tocó algo por error).
- Tocar `S/V`, `S/C` o `S/Ci` los agrega si no estaban, o los quita si ya estaban (toggle, para poder corregir un toque accidental).
- Se pueden combinar varios modificadores en el mismo producto.
- Es útil mostrar visualmente en la vista previa cuál es el "último producto tocado" (por ejemplo resaltándolo), para que el mesero sepa a quién le va a pegar el siguiente modificador que toque.

### 5.6 Nota libre
- Existe un botón "Nota para este plato" debajo de los modificadores, para los casos extremos que no caben en las abreviaturas ni en los 4 modificadores predefinidos.
- Al tocarlo aparece un campo de texto normal (`<input type="text">`). No hace falta construir un teclado QWERTY: en un dispositivo real, cualquier input de texto estándar dispara automáticamente el teclado nativo del sistema operativo.
- La nota se guarda en el **plato activo** (no en un producto específico ni en la comanda completa), como texto libre. Si el mesero necesita referirse a un producto puntual, lo escribe dentro del texto.
- Se guarda al presionar Enter, al tocar un botón de confirmar, o al perder el foco el campo (auto-guardado al tocar fuera).

### 5.7 Borrado inteligente
Un solo botón de "Borrar" con esta prioridad, en orden:
1. Si hay dígitos de cantidad sin confirmar, borra el último dígito.
2. Si no, borra el último producto del plato activo.
3. Si el plato activo está vacío y hay más de un plato, elimina ese plato vacío (deshace un "siguiente plato").
4. Si no hay nada que borrar, no hace nada.

### 5.8 Siguiente plato
- Solo tiene efecto si el plato activo tiene al menos un producto (evita crear platos vacíos por accidente).
- Crea un nuevo plato vacío y lo vuelve el activo. El "último producto tocado" se limpia (no hay nada en el nuevo plato todavía).

### 5.9 Enviar comanda
- Antes de enviar, se descartan los platos completamente vacíos (sin productos y sin nota).
- Si no queda ningún plato válido, el botón no hace nada.
- Al enviar: se arma el objeto de la comanda (ver sección 4), se agrega al historial de esa mesa/pedido especial como una nueva burbuja, y se limpia el borrador (cantidad, platos, último producto tocado, nota en edición) para empezar el siguiente pedido.
- El objeto estructurado debe quedar disponible para conectarse después a una API (como mínimo, emitirlo en algún punto accesible del código — log, callback, evento — para que sea trivial engancharlo a un backend más adelante).

## 6. Historial y vista previa

Tanto el borrador en construcción como las comandas ya enviadas se muestran con el mismo formato de "ticket": cada plato es una línea con los productos separados por " · " (ej. `3 PA · 3 AS`), y entre un plato y el siguiente va una línea divisoria (no es texto, es un separador visual). Si un producto tiene modificadores, se muestran junto a él de forma compacta. Si un plato tiene nota, se muestra debajo en una línea aparte, en cursiva.

Las comandas ya enviadas tienen además una vista expandible "para cocina", con este formato más explícito:

```
Plato 1
- 3 Pastor (sin cebolla)
- 3 Asada

Plato 2
- 1 Quesadilla
```

## 7. Mesas y pedidos especiales (estado independiente)

Cada mesa numerada y cada pedido especial (`PR`, `PE`, `PA`) tiene su propio estado, completamente independiente:
- Su propio historial de comandas enviadas.
- Su propio borrador en construcción (platos, productos, cantidad pendiente, nota en edición).

El mesero puede entrar a una mesa, capturar parcialmente un pedido, regresar a la grilla de Mesas, entrar a otra mesa, y al volver a la primera debe encontrar exactamente donde lo dejó. La grilla de Mesas debe reflejar de un vistazo el estado de cada una (vacía / en construcción / con comandas enviadas) para que el mesero sepa dónde hay pendientes sin tener que entrar a cada una.

## 8. Estilo visual

- Mobile-first, responsive.
- Limpio y de alto contraste; botones grandes pensados para usarse con una sola mano, bajo presión, con ruido y calor.
- Minimalista a propósito: se quitaron en una iteración los textos de ayuda ("letreritos") que explicaban cada control (por ejemplo una leyenda sobre la fila de modificadores, o la palabra "Cantidad" antes del número). La interfaz se apoya en la posición y la forma de los elementos para comunicar su función, no en texto instructivo constante. Las etiquetas que sí deben quedar son las de los controles mismos (Borrar, Siguiente plato, Enviar), no explicaciones sobre qué hacen.
- Los estados vacíos (sin historial, sin productos en el borrador) sí deben tener un mensaje breve, porque ahí cumplen una función real de orientación.
- Sin exceso de íconos, animaciones ni elementos decorativos. Nada de carrito de compras, categorías de menú ni flujos de selección múltiple.
- Debe sentirse como una herramienta de trabajo real, no como una app de delivery para clientes.
- Las líneas del ticket (productos del plato) se benefician de una tipografía monoespaciada para que las columnas y separadores se vean alineados, como un ticket de cocina real.

## 9. Stack técnico y notas de implementación

- HTML, CSS y JavaScript puro para esta primera versión (sin framework), como componente independiente integrable después a un sistema con Node.js, Firebase u otra tecnología.
- Sin backend ni base de datos en esta versión. Para que el estado sobreviva a un refresh de página dentro de esta misma versión (recomendado para que sea usable de verdad en un piso de taquería), usar `localStorage` del navegador — no hay restricción técnica para esto fuera del entorno de prototipado de chat donde se diseñó la idea original, así que es la opción recomendada para la implementación real.
- Existe un prototipo interactivo de referencia (construido como demo dentro de una conversación con Claude, usando el sistema de diseño propio de esa interfaz de chat). Sirve para validar el flujo de interacción descrito en este documento, pero su código no debe copiarse literalmente: usaba variables CSS y una fuente de íconos específicas de ese entorno de demo que no aplican a una implementación real. Tomar de ahí la lógica de interacción, no el código.
- Estructura de archivos sugerida: `index.html`, `styles.css`, `app.js` (o el equivalente que prefiera la convención del proyecto donde se vaya a integrar este componente).

## 10. Checklist de aceptación

- [ ] Pantalla de Mesas con 10 mesas numeradas + 3 pedidos especiales (PR, PE, PA), cada una mostrando su estado (vacía / en construcción / N enviadas).
- [ ] Navegación a la pantalla de Comanda al tocar una mesa o pedido especial, con botón de regreso.
- [ ] Historial de comandas enviadas como burbujas, con formato de ticket y vista expandible para cocina.
- [ ] Vista previa del pedido en construcción, en el mismo formato de ticket.
- [ ] Teclado con fila de números, fila de 10 productos, fila de 4 modificadores, botón de nota libre, y fila de control (Borrar / Siguiente plato / Enviar) en ese orden de izquierda a derecha.
- [ ] Cantidad por dígitos + atajos rápidos 1/2/3, con default de 1 si no se especifica.
- [ ] Productos se agregan al plato activo, sumando cantidad si el producto se repite.
- [ ] Modificadores aplican al último producto tocado, combinables, con C/T como acción de limpiar.
- [ ] Nota libre por plato vía input de texto nativo.
- [ ] Borrado inteligente con la prioridad descrita en 5.7.
- [ ] Siguiente plato solo si el plato activo tiene productos.
- [ ] Enviar descarta platos vacíos, limpia el borrador, y deja disponible el objeto JSON estructurado.
- [ ] Estado (historial + borrador) independiente y persistente por mesa/pedido especial dentro de la sesión (idealmente con `localStorage`).
- [ ] Estilo mobile-first, alto contraste, sin elementos decorativos innecesarios.
