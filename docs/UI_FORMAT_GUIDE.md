# Guia Base de Formato UI

Este documento define el formato visual base para toda pantalla nueva y para refactors:

- Campos de formulario
- Secciones del menu lateral
- Modales
- Tarjetas del dashboard
- Botones y textos auxiliares
- Chips / badges de estado
- Tablas
- Toolbars (busqueda + filtros)
- Empty states, banners y toasts
- Encabezados de pagina
- Encabezado del hub global (eventos / usuarios / archivo / logs)
- Switch / collapsible / money input
- Tipografia numerica
- Tags monoespaciados (`uiKbd`)
- Dividers con etiqueta (`uiDivider`)
- Segmented controls (`uiSegment`)
- Stat tiles (`uiStat`)
- Skeletons / loading (`uiSkeleton`)
- Avatares con iniciales (`uiAvatar`)
- Filas de listado (`uiListRow`)

Fuente de verdad tecnica: `src/ui/uiFormatClasses.js`.

## 1) Regla principal

Cada bloque nuevo debe reutilizar clases del archivo base (`uiShell`, `uiForm`, `uiButtons`, `uiModal`, `uiBadge`, `uiSection`, `uiTable`, `uiToolbar`, `uiEmptyState`, `uiFeedback`, `uiPageHeader`, `uiHubHeader`, `uiControls`, `uiTypography`, `uiKbd`, `uiDivider`, `uiSegment`, `uiStat`, `uiSkeleton`, `uiAvatar`, `uiListRow`) o seguirlas 1:1.

Evitar crear variantes ad-hoc cuando ya existe una clase base equivalente.

## 2) Modales

Usar siempre:

- `uiModal.overlay` (o `uiModal.overlayNested` para confirmaciones anidadas)
- `uiModal.backdrop`
- `uiModal.panel` / `panelSm|panelMd|panelLg|panelXl`
- `uiModal.header`
- `uiModal.title`
- `uiModal.body`
- `uiModal.footer`
- `uiButtons.closeIcon`

Comportamiento obligatorio:

- Cerrar por `Esc`
- Cerrar por click en backdrop
- `aria-modal="true"` + `role="dialog"`
- Bloqueo de scroll del body cuando esta abierto

Niveles de z-index acordados:

- Modal normal: `z-[200]` (ya viene en `uiModal.overlay`)
- Confirmacion dentro de modal: `z-[220]` (`uiModal.overlayNested`)
- Toasts: `z-[240]` (ya viene en `uiFeedback.toast*`)

## 3) Tarjetas y secciones (dashboard y formularios)

Contenedor generico:

- `uiShell.card` (card blanco de pantalla completa)
- `uiDashboard.card` (card de dashboard)
- `uiSectionPanel(color)` (panel de seccion dentro de formulario)

Cabecera de tarjeta:

- `uiShell.cardHeader`

Texto:

- Titulos: `font-black`, jerarquia compacta
- Ayudas: `uiForm.help` / `uiUserEdit.helper`

## 4) Campos de formulario

Etiquetas:

- `uiForm.labelXs`

Inputs/select/textarea:

- `uiForm.input` o `uiForm.inputCompact`
- Campo requerido invalido: concatenar `uiForm.required`

No mezclar estilos de borde/fondo distintos sin justificar.

## 5) Botones

Usar familias:

- Primario: `uiButtons.primary`
- Secundario: `uiButtons.secondary`
- Destructivo solido: `uiButtons.danger`
- Destructivo pastel: `uiButtons.dangerSoft`
- Icono solo: `uiButtons.iconOnly` / `iconOnlyDanger`
- Tonales (acento por contexto): `uiTonalButton(color)` / `uiTonalSolid(color)`
- Pildora de filtros superiores: `uiButtons.filterPill`
- WhatsApp (verde oficial): `uiButtons.whatsapp` (agregar estilo inline `backgroundColor: '#25D366'`)
- Cerrar modal: `uiButtons.closeIcon`

Paletas admitidas para tonales: `indigo | emerald | amber | rose | violet | sky | teal | fuchsia | slate`.

## 6) Sidebar/menu lateral

Botones de navegacion:

- `sidebarNavButtonClass(isActive)`

Labels y wrappers:

- `uiSidebar.sectionLabel`
- `uiSidebar.sectionWrap`

No duplicar strings largos de clases para cada item del menu.

## 7) Modo oscuro

Todo bloque nuevo debe incluir variante dark para:

- fondo
- borde
- texto
- hover/focus

Checklist minima antes de cerrar cambio:

1. Light y dark revisados visualmente.
2. Build exitoso.
3. Sin lints en archivos modificados.

Regla adicional para secciones financieras con acento (corte/gastos/saldos):

4. Cuando el bloque representa una alerta operativa o conciliacion (ej. "Saldo pendiente de devolucion"), usar `fondo neutro` (`bg-white` / `dark:bg-slate-900`) y `solo borde de color` (amber/emerald/rose segun semantica). Evitar fondos pastel fuertes en dark mode.

## 8) Politica de unificacion

Cuando se toque una zona existente (modal, card, sidebar, form), se migra al formato base en ese mismo cambio.
No dejar mezcla de estilos viejos y nuevos en el mismo bloque funcional.

## 9) Guia UI: Dropdowns

Base en `uiDropdown`:

- Trigger: `uiDropdown.trigger`
- Menu: `uiDropdown.menu`
- Titulos de bloque: `uiDropdown.sectionTitle`
- Opciones/rows: `uiDropdown.optionRow`

Reglas:

1. Siempre cerrar al click fuera.
2. Contador de filtros activos en badge superior derecho (usar `uiToolbar.countBadge`).
3. Maximo ancho responsive (`max-w-[90vw]`) para no romper en movil.

## 10) Guia UI: Cuadros de texto (textarea)

Base en `uiTextarea`:

- Normal: `uiTextarea.base`
- Variante suave contextual: `uiTextarea.soft`

Reglas:

1. Placeholder legible en dark mode.
2. `focus:ring-*` visible en claro/oscuro.
3. Texto en `font-semibold` para consistencia con inputs.

## 11) Guia UI: Secciones de edicion de usuarios

Base en `uiUserEdit`:

- Contenedor: `uiUserEdit.section`
- Encabezado: `uiUserEdit.title`
- Ayuda/descripcion: `uiUserEdit.helper`

Reglas:

1. Cada bloque funcional (perfil, contrasena, permisos, accesos) va en su propia tarjeta de seccion.
2. No mezclar botones primarios/secundarios fuera del pie de la seccion si no es accion contextual.
3. Campos de solo lectura deben usar el mismo input base + estado visual deshabilitado.

## 12) Guia UI: Tarjetas del dashboard

Base en `uiDashboard`:

- Tarjeta: `uiDashboard.card`
- Espaciado interno: `uiDashboard.cardBody`
- Titulo: `uiDashboard.title`
- Subtitulo: `uiDashboard.subtitle`

Reglas:

1. Evitar variantes de borde/sombra distintas dentro de la misma fila de tarjetas.
2. Mantener jerarquia tipografica estable (titulo, metrica principal, ayuda).
3. Si hay controles dentro de tarjeta, usar botones base (`uiButtons`).

## 13) Guia UI: Nuevas secciones de menu lateral

Base en `uiSidebar`:

- Label de seccion: `uiSidebar.sectionLabel`
- Wrapper de seccion: `uiSidebar.sectionWrap`
- Boton de item: `sidebarNavButtonClass(isActive)`

Reglas:

1. Toda nueva seccion debe tener label en uppercase con tracking fijo.
2. Todo item nuevo debe usar `sidebarNavButtonClass` para estado activo/inactivo.
3. Evitar copiar/pegar clases largas de items manualmente.

## 14) Guia UI: Badges / chips de estado

Base en `uiBadge`:

- Pill estandar: `uiBadge.base`
- Pill mini (8–9px en roster): `uiBadge.baseMini`
- Cuadrado (etiquetas de permiso): `uiBadge.baseSq`

Helpers:

- `uiBadgeSolid(color)` — fondo lleno + texto blanco
- `uiBadgeSoft(color)` — pastel con borde
- `uiBadgeMini(color, 'solid'|'soft')`

Paletas y semantica sugerida:

- `emerald` — entregado / bautizado / pagado / confirmado
- `amber` — pendiente / beca / advertencia
- `rose` — faltante / archivar / peligro
- `sky` — bautizo / informativo
- `indigo` — rol principal / "Tu" / default
- `teal` — empleado / descuento
- `violet` — cortesia / responsiva
- `fuchsia` — servidor / alias
- `slate` — neutro

Reglas:

1. Nunca mezclar `text-[8px]` con `text-[10px]` en la misma fila de chips.
2. Si dos chips pertenecen al mismo registro, mantener la misma variante (`solid` o `soft`).
3. No inventar paletas nuevas sin actualizar este archivo.

## 15) Guia UI: Encabezados de seccion (`uiSection`)

Reemplaza los `h4` con clases largas copiadas en formularios y paneles:

- Titulo: `uiSectionHeading(color)` — `text-[10px] font-black uppercase tracking-[0.18em]` con borde inferior coloreado.
- Panel contenedor: `uiSectionPanel(color)` — `rounded-xl border p-3 space-y-3` con fondo pastel del color.

Paletas admitidas: `slate | indigo | amber | teal | violet | rose | emerald | sky | fuchsia`.

Cada seccion de edicion (Datos personales, Contacto, Medica, Pagos, Acompanantes, Responsiva…) usa una paleta estable y reconocible. Acompanantes = violet, Responsiva = indigo, Campa = amber, Medica = rose.

## 16) Guia UI: Tablas (`uiTable`)

- Wrapper: `uiTable.wrap`
- Tabla: `uiTable.table`
- Head: `uiTable.thead` + `uiTable.th` / `uiTable.thRight`
- Body: `uiTable.tbody`
- Fila hover: `uiTable.tr`
- Celdas: `uiTable.td` / `tdMoney` / `tdMuted`
- Fila de totales: `uiTable.footerRow`

Reglas:

1. `tracking-widest` obligatorio en `th`.
2. `tabular-nums` obligatorio en celdas monetarias o numericas.
3. Dark mode completo (thead y tbody).
4. Si la tabla tiene totales, usar `footerRow` para el separador visual.

## 17) Guia UI: Toolbars (`uiToolbar`)

Barra de busqueda + filtros sobre listas/roster:

- Wrapper: `uiToolbar.wrap`
- Buscador: `uiToolbar.searchWrap` + `searchIcon` + `searchInput`
- Boton de filtros: reutilizar `uiDropdown.trigger`
- Contador de filtros activos: `uiToolbar.countBadge`
- Linea de estado: `uiToolbar.statusLine`

Reglas:

1. El boton de filtros siempre muestra un `countBadge` cuando hay filtros activos.
2. El input de busqueda usa `focus:ring-indigo-500` en TODAS las pantallas (incluido login).
3. Si la toolbar tiene mas de 3 acciones, agruparlas detras de un dropdown.

## 18) Guia UI: Estados vacios (`uiEmptyState`)

- Wrapper: `uiEmptyState.wrap`
- Icono (opcional): `uiEmptyState.icon`
- Titulo: `uiEmptyState.title`
- Descripcion: `uiEmptyState.help`

Reglas:

1. Todo listado / tabla / seccion que pueda estar vacia debe tener un empty state explicito.
2. Nunca dejar `italic text-slate-400` inline como unica indicacion.

## 19) Guia UI: Feedback (`uiFeedback`)

Banners in-content:

- Clases: `uiBanner(kind)` donde `kind = 'warning'|'danger'|'info'|'success'|'neutral'`.
- Siempre con icono `AlertTriangle` (warning/danger) o `Info` (info/neutral) / `CheckCircle` (success).

Toasts:

- Estandar: `uiFeedback.toast` (fondo slate-800)
- Exito: `uiFeedback.toastSuccess`
- Error: `uiFeedback.toastDanger`
- z-index fijo `z-[240]`.

Reglas:

1. Un solo toast visible a la vez por vista.
2. Dismisable automaticamente en 3–5s segun gravedad.
3. Banner queda hasta que la condicion deja de cumplirse.

## 20) Guia UI: Encabezado de pagina (`uiPageHeader`)

Para secciones **dentro del workspace de un evento** (Bautizados, Responsivas, Becados, Corte…), no para el hub global de eventos.

- Wrap: `uiPageHeader.wrap`
- Icono coloreado: `uiPageHeaderIcon(color)` (paletas: `indigo | emerald | amber | rose | violet | sky | teal | fuchsia | slate`)
- Titulo: `uiPageHeader.title`
- Subtitulo: `uiPageHeader.subtitle`
- Zona de acciones a la derecha: `uiPageHeader.actions`

Reglas:

1. Toda pagina dentro del workspace de evento debe usar este header.
2. El color del icono es el color de la seccion en el sidebar.
3. El subtitulo se usa para contar registros / resumen corto.
4. **No usar** `uiPageHeader` ni `uiPageHeaderIcon` en la cabecera del hub global (`EventHubScreen`); ahi va `uiHubHeader` (§34).

## 21) Guia UI: Controles adicionales (`uiControls`)

Switch estilo iOS:

- Wrap: `uiControls.switchWrap`
- Input oculto: `uiControls.switchInput`
- Track: `uiControls.switchTrack`

Collapsible (`<details>`/`<summary>`):

- Wrap: `uiControls.collapsibleWrap`
- Summary: `uiControls.collapsibleSummary`
- Body: `uiControls.collapsibleBody`

Money input (`$` como prefijo):

- Wrap: `uiControls.moneyInputWrap`
- Prefijo: `uiControls.moneyPrefix`
- Input: `uiControls.moneyInput`

Reglas:

1. El switch debe tener `aria-label` descriptivo.
2. Collapsible usa `<details>/<summary>` nativo; no reinventar con JS si es estatico.
3. El money input usa `focus:ring-emerald-500` para diferenciarlo de inputs regulares.

## 22) Tipografia numerica (`uiTypography`)

- Dinero base: `uiTypography.money`
- Dinero tenue (sub-total tachado, proyecciones): `uiTypography.moneyMuted`
- Positivo (ingreso, saldo a favor): `uiTypography.moneyPositive`
- Negativo (gasto, adeudo): `uiTypography.moneyNegative`
- Numerico generico: `uiTypography.num`

Reglas:

1. Cualquier cifra en tabla o listado usa `tabular-nums` (viene en todas las variantes).
2. No usar colores ad-hoc para dinero; siempre `positive` o `negative`.

## 23) Guia UI: Tags mono / Kbd (`uiKbd`)

Para mostrar versiones, IDs cortos, hashes, user-agent resumido, atajos de teclado:

- `uiKbd.base` — pill monospace 10px con borde slate
- `uiKbd.sm` — version mini 9px para tablas

Reglas:

1. Siempre `font-mono` y `tabular-nums` para que las cifras alineen.
2. No usar para texto corriente ni badges de estado (para eso: `uiBadge*`).

## 24) Guia UI: Divider con etiqueta (`uiDivider`)

Linea separadora dentro de formularios o paneles largos:

- Linea simple: `uiDivider.plain`
- Con etiqueta central: `uiDivider.withLabelWrap` + dos `uiDivider.withLabelLine` + `uiDivider.withLabelText`

Reglas:

1. La etiqueta va en uppercase con tracking fijo (consistente con `uiForm.labelXs`).
2. Solo usar con etiqueta cuando separa bloques semanticamente distintos.

## 25) Guia UI: Segmented control (`uiSegment`)

Grupo de botones tipo tabs internos (Activos / Archivados / Todos, Dia / Semana / Mes):

- Wrap: `uiSegment.wrap`
- Item: `uiSegmentItem(isActive)`

Reglas:

1. Solo un item activo a la vez.
2. Siempre dentro de toolbar o tarjeta, no suelto en pagina.
3. Maximo 4 opciones; si hay mas, usar `uiDropdown`.

## 26) Guia UI: Stat tile (`uiStat`)

Tarjeta compacta de metrica numerica (resumen del evento, dashboard, corte):

- Tile: `uiStatTile(color)` — paletas: `slate | indigo | emerald | amber | rose | violet | sky | teal | fuchsia`
- Label: `uiStat.label`
- Valor: `uiStat.value` (grande) o `uiStat.valueSm`
- Ayuda: `uiStat.help`
- Delta positivo/negativo: `uiStat.deltaPositive` / `uiStat.deltaNegative`

Reglas:

1. La etiqueta va SIEMPRE arriba en uppercase.
2. El valor principal ocupa una sola linea.
3. Color pastel del tile = color semantico (emerald = pagado/ok, amber = pendiente, rose = faltante, etc.).
4. En una misma fila de tiles, mantener el mismo tamano de valor (`value` o `valueSm`).

## 27) Guia UI: Skeleton / loading (`uiSkeleton`)

Placeholders animados para cargas:

- Linea: `uiSkeleton.line`, `uiSkeleton.lineShort`
- Bloque: `uiSkeleton.block`
- Avatar: `uiSkeleton.avatar`
- Chip: `uiSkeleton.chip`

Reglas:

1. Toda pantalla con fetch asincrono debe mostrar skeleton, no "Cargando..." plano.
2. Skeleton debe emular la forma del contenido final (lineas = texto, block = card).
3. Maximo 3 ciclos de animacion visibles; si carga mas, usar toast.

## 28) Guia UI: Avatar / iniciales (`uiAvatar`)

Avatar circular con iniciales (sidebar, historial, comentarios, sesiones):

- Clase: `uiAvatarClass(color, size)`
- Tamanos: `sm | md | lg | xl`
- Paletas: `slate | indigo | emerald | amber | rose | violet | sky | teal | fuchsia`

Reglas:

1. Color del avatar derivado del id/nombre del usuario (hash modulo paletas) para ser estable.
2. Siempre mayusculas y 1-2 caracteres.
3. Si hay imagen disponible, preferirla; avatar de iniciales es fallback.

## 29) Guia UI: List row (`uiListRow`)

Fila estandar de listado (Bautizados, Becados, Acompanantes, Responsivas, Corte):

- Wrap: `uiListRow.wrap` (o `uiListRow.wrapCompact`)
- Zona principal: `uiListRow.main`
  - Titulo: `uiListRow.primary`
  - Subtitulo: `uiListRow.secondary`
- Meta (badges/chips a media linea): `uiListRow.meta`
- Acciones (botones icono a la derecha): `uiListRow.actions`
- Estado "seleccionada"/"destacada": anadir `uiListRow.pressed`

Reglas:

1. Una sola fila por participante; no abrir informacion extra con otra fila suelta.
2. Los chips de estado van en `.meta`, nunca dentro de `.primary`.
3. Las acciones destructivas van en `.actions` con `uiButtons.iconOnlyDanger`.
4. Si la fila se vuelve muy ancha en movil, debe re-flow vertical (ya viene con `flex-wrap`).

## 30) Referencia rapida de uso

- Modales: `uiModal.*` + `uiButtons.closeIcon`
- Inputs/select: `uiForm.input`, `uiForm.inputCompact`, `uiForm.required`
- Textareas: `uiTextarea.*`
- Dropdowns: `uiDropdown.*`
- Cards: `uiShell.card` / `uiDashboard.card`
- Usuario edicion: `uiUserEdit.*`
- Sidebar: `uiSidebar.*` + `sidebarNavButtonClass()`
- Badges: `uiBadgeSolid(color)` / `uiBadgeSoft(color)` / `uiBadgeMini(...)`
- Secciones de form: `uiSectionHeading(color)` + `uiSectionPanel(color)`
- Tablas: `uiTable.*`
- Toolbar de lista: `uiToolbar.*`
- Empty state: `uiEmptyState.*`
- Banner / toast: `uiBanner(kind)` / `uiFeedback.toast*`
- Page header (workspace): `uiPageHeader.*` + `uiPageHeaderIcon(color)`
- Hub global (eventos / usuarios / archivo / logs): `uiHubHeader.*` (§34)
- Switch / details / money: `uiControls.*`
- Dinero / numeros: `uiTypography.*`
- Botones destructivos / tonales: `uiButtons.danger` / `dangerSoft` / `uiTonalButton(color)` / `uiTonalSolid(color)`
- Kbd / mono: `uiKbd.base` / `uiKbd.sm`
- Divider con etiqueta: `uiDivider.*`
- Segmented control: `uiSegment.wrap` + `uiSegmentItem(isActive)`
- Stat tile: `uiStatTile(color)` + `uiStat.*`
- Skeleton: `uiSkeleton.*`
- Avatar: `uiAvatarClass(color, size)`
- List row: `uiListRow.*`
- Menús móvil: `uiMobileMenu.*` + `MobileCompactToolbar` / `MobileMenuSection` / `MobileSearchField`

### Nota de implementacion (corte de caja y lista de gastos)

- Bloques de captura o conciliacion financiera con color semantico usan: fondo neutro + borde de color.
- Ejemplo recomendado:
  - Light: `bg-white border-amber-300`
  - Dark: `dark:bg-slate-900 dark:border-amber-500/45`
- Inputs internos mantienen base neutra (`bg-white/dark:bg-slate-950`) y solo el borde comunica el estado.

## 31) Guia UI: Densidad Visual y Compactación Vertical (High Density UI)

Para pantallas complejas de administración o gestión de datos densos, se deben aplicar reglas de compactación vertical estables para maximizar la información en pantalla y reducir el scroll excesivo:

1. **Tablas de Alta Densidad**:
   - Cabeceras y celdas deben reducir el padding vertical a un mínimo (ej. `py-1.5` en cabeceras `th` y `py-1` en celdas `td`).
   - Usar `align-middle` en lugar de `align-top` para asegurar una alineación perfecta de avatares, badges de rol y botones de acción cuando las celdas tienen alturas reducidas.
   - Mantener el tamaño de fuente en `text-xs`.

2. **Listas Móviles Compactas**:
   - Reducir el padding de tarjetas a `px-3 py-2` o `p-2.5`.
   - Limitar la altura de avatares a `w-7 h-7` o `w-8 h-8` y utilizar gaps reducidos (ej. `gap-2`).

3. **Modales y Contenedores Densos**:
   - Limitar el padding de contenedor del modal principal a `p-4 sm:p-5` (evitando `p-6` o `p-8` en flujos densos).
   - Reducir gaps en rejillas de campos (`gap-4` -> `gap-3` o `gap-2.5`).
   - Los espaciados entre secciones deben limitarse a `space-y-3.5` o `space-y-4` en lugar de `space-y-6`.

4. **Acordeones y Checkboxes**:
   - Resúmenes de acordeones `<summary>` deben usar paddings de `px-3.5 py-2` y summaries delgados.
   - Listas de checkboxes en rejillas deben compactar los labels a un padding de `px-2.5 py-1.5` y radios/inputs a un tamaño de `w-3.5 h-3.5`.
   - En paneles avanzados o centros de seguridad, reducir paddings de etiquetas a `p-2.5` y el redondeado de tarjeta externa a `rounded-xl`.

5. **Botones de Acción en Modales**:
   - Reducir la separación superior del pie del modal a `pt-3 border-t`.
   - Ajustar el padding vertical de los botones de cancelar/guardar a `py-2` con esquinas redondeadas de tipo `rounded-lg` o `rounded-xl` y fuentes compactas de tipo `text-xs`.

## 32) Roster / listados en móvil (<md)

Patrón estándar para tablas anchas (registro por sede, global, becados, etc.):

1. **Dos vistas**: `md:hidden` tarjetas + `hidden md:block` tabla desktop.
2. **Tokens**: `uiRosterMobile.*`, `uiShell.pagePad`, `uiShell.pageStack`.
3. **Componentes**: `RosterParticipantMobileCard` (roster con acciones), `ListMobileCard` (listados simples).
4. **Detalle expandido**: `renderExpandedRosterDetailTableRow(..., { layout: 'block' })` dentro de la tarjeta móvil.
5. **Acciones táctiles**: `min-h-[44px]`; texto de botón con `hidden sm:inline` en pantallas muy pequeñas.
6. **Toolbars**: apilar en `flex-col sm:flex-row`; dropdowns con `max-w-[90vw]`.

## 33) Menús móvil compactos (max-md)

Patrón unificado para filtros, toolbars y paneles secundarios en pantallas pequeñas:

1. **Barra fija** (`uiMobileMenu.stickyBar` + `MobileCompactToolbar`):
   - Búsqueda con icono inline (`MobileSearchField`; nunca `position:absolute` sobre el texto).
   - Un control esencial (ej. «Últimos N», orden).
   - Botón **Opciones** (`SlidersHorizontal`) con punto si hay filtros activos.

2. **Panel colapsable** (`MobileCompactToolbarPanel` + `MobileMenuSection`):
   - Debajo de la barra, **no** dentro del sticky.
   - Secciones con `uiMobileMenu.section` y grid 2 columnas en móvil.
   - Botones admin/filtro: `uiMobileMenu.btnCompact` + textos abreviados + `title` completo.

3. **Escritorio (`md+`)**: toolbars y dropdowns actuales sin cambio funcional.

4. **Tokens**: `uiMobileMenu.*` en `uiFormatClasses.js`.
5. **Componentes**: `src/components/mobile/MobileCompactToolbar.jsx`, `MobileMenuSection.jsx`, `MobileSearchField.jsx`.
6. **Navegación drawer**: `sidebarNavButtonClassCompact` en `<lg`.
7. **No usar** dropdown `absolute` en móvil donde exista panel colapsable equivalente.

Aplicar reglas de densidad de §31 a menús y acordeones internos.

## 34) Guia UI: Encabezado del hub global (`uiHubHeader`)

Cabecera unificada de `EventHubScreen` (vistas Eventos, Usuarios, Archivo, Logs). **Móvil y escritorio comparten los mismos tokens de color**; en escritorio solo cambia el layout (`desktop*`).

Fuente: `uiHubHeader` en `uiFormatClasses.js`.

### Estructura

| Zona | Móvil | Escritorio |
|------|-------|------------|
| Contenedor | `mobileWrap` | `desktopShell` |
| Título | `title` | `desktopTitle` + `desktopSubtitle` |
| Navegación atrás/adelante | `navIconBtn` | `desktopNavGroup` + `navIconBtn` |
| Usuario / sesiones | `userChip` + `userName` + `sessionBadge` | igual en `desktopMeta` |
| Tema claro/oscuro | `navIconBtn` | `navIconBtn` |
| Sin conexión | `offlineBanner` | `offlineBanner` |
| Acciones rápidas | `navScroll` (píldoras) + panel Opciones | `desktopToolbar` + `desktopToolGroup` |

### Colores y controles compartidos

**Iconos y navegación**

- `navIconBtn` — flechas, tema: fondo `slate-100` / `slate-800`, borde slate, hover indigo.

**Texto**

- `title` — móvil: `text-base font-black text-slate-800 dark:text-slate-100`
- `desktopTitle` — escritorio: `text-2xl` con los mismos colores de texto
- `desktopSubtitle` — `text-slate-500 dark:text-slate-400`
- `desktopToolLabel` — etiquetas «Ir a» / «Herramientas»: `text-slate-500 dark:text-slate-400`

**Usuario**

- `userChip` — pill neutra (`slate-100` / `slate-800`, borde slate)
- `userName` — `text-slate-600 dark:text-slate-300`
- `sessionBadge` — emerald pastel (superusuario)

**Offline**

- `offlineBanner` — amber (`bg-amber-100` / `dark:bg-amber-950/50`, borde amber). No usar `uiBanner('warning')` en el hub.

**Píldoras de acción** (concatenar `pillBase` + paleta):

| Paleta | Token | Uso semántico |
|--------|-------|----------------|
| Indigo | `pillIndigo` | Eventos, Usuarios, PWA, vista principal |
| Slate | `pillSlate` | Archivo, Logs, navegación secundaria |
| Rose | `pillRose` | Cerrar sesión |
| Emerald | `pillEmerald` | Herramientas de mantenimiento (ej. rellenar contadores) |
| Rojo | `pillDanger` / `pillDangerActive` | Modo depuración (`pillDangerActive` + `animate-pulse` si activo) |

Forma:

- Barra horizontal (móvil `navScroll`, toolbar escritorio): `pillBase` + paleta → píldora `rounded-full`.
- Panel Opciones móvil: `panelBtn` + misma paleta → botón ancho `rounded-lg`.

Ejemplo en pantalla:

```javascript
const hubPillIndigo = `${uiHubHeader.pillBase} ${uiHubHeader.pillIndigo}`;
const hubPanelBtnIndigo = `${uiHubHeader.panelBtn} ${uiHubHeader.pillIndigo}`;
```

**Opciones móvil**

- `optionsBtn(active)` — toggle del panel; activo = borde/fondo indigo.

### Reglas

1. **No mezclar** en el hub: `uiTonalButton`, `uiTonalSolid`, `uiPageHeader`, `uiPageHeaderIcon`, `uiButtons.dangerSoft`, `uiButtons.iconOnly` ni `uiBanner` para los mismos controles.
2. Escritorio y móvil deben usar **exactamente** las paletas `pill*` / `navIconBtn` / `offlineBanner` anteriores.
3. Los tokens `desktop*` son solo layout (grid, padding, toolbar); no definir colores alternativos ahí.
4. Referencia de implementación: `src/screens/EventHubScreen.jsx`.

