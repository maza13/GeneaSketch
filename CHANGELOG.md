# Historial de Cambios (Changelog)

Todos los cambios notables en **GeneaSketch** se documentan en este archivo.

## 2 de marzo de 2026 - 0.4.0 (GSchema: El Salto de Paradigma)

### Novedades Principales
- **Motor GSchema (v0.1.x)**: Transición a un modelo de datos basado en grafos semánticos y afirmaciones (claims).
- **Journal de Operaciones**: Cada cambio se registra ahora de forma atómica y auditable, permitiendo el despliegue de futuras funciones de sincronización y deshacer multinivel.
- **Formato Nativo .gsk**: Introducción del paquete GeneaSketch (.gsk), un archivo comprimido que agrupa el grafo, el historial de operaciones, las imágenes y la configuración de la interfaz.
- **Migrador Automático**: Los archivos .ged y .gsz de versiones anteriores se convierten automáticamente al nuevo formato al abrirse.
- **Proyección en Tiempo Real**: El motor genera una vista compatible con la interfaz actual, garantizando que todas las herramientas sigan funcionando sin cambios.

## 2 de marzo de 2026 - 0.3.7 (Refactorización del Store y Estabilidad)

### Para usuarios (resumen rápido)
- **Mejora drástica en estabilidad**: Se ha reestructurado el corazón de la aplicación (el "Store") para hacerlo más robusto y rápido.
- **Corrección de carga de archivos**: Se solucionó un problema intermitente que impedía ver los datos inmediatamente después de abrir un archivo.
- **Preparación para el futuro**: Esta versión sienta las bases técnicas para la gran actualización 0.4.0 (GSchema).

### Detalle técnico
- **Desacoplamiento del Store**: El `store.ts` monolítico se dividió en slices modulares (`DocSlice`, `ViewSlice`, `SessionSlice`, `AiSlice`).
- **Extracción de Lógica de Negocio**: Se crearon los motores `GeneaEngine.ts` y `UiEngine.ts` para separar la manipulación de datos de la lógica de interfaz.
- **Estabilización de Baseline**: Se activó un gate de CI (`baseline-qa001`) que garantiza que las funciones críticas de análisis y expansión del gráfico no sufran regresiones.
- **Corrección de Inicialización**: Se implementó una inicialización determinista de `viewConfig` al cargar documentos, eliminando estados de pantalla vacía.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: core-refactor.

## 28 de febrero de 2026 - 0.3.6 (Buscador Avanzado y Refinamiento IA)

### Para usuarios (resumen rápido)
- **Buscador semántico central**: nueva interfaz de búsqueda con consultas en lenguaje natural (ej: "hijos de...", "padres de...") y autocompletado.
- **Ordenación de resultados**: ahora puedes ordenar personas por ID, Nombre o Apellido en orden ascendente o descendente.
- **Refinamiento de nacimiento con IA**: mejora en precisión de fechas y lugares sugeridos a partir de hechos y contexto familiar.

### Detalle técnico
- Se desacopló el motor de búsqueda en módulos dedicados (`searchEngine.ts` y parser de consulta) para reducir acoplamiento con la UI.
- Se incorporaron acciones de estado para limpiar modos visuales y overlays de forma determinista.
- Se amplió el flujo de edición asistida con operaciones de notas (`notesAppend` y `notesReplace`).

### Known Issues
- Se mantiene pendiente optimizar el tamaño de algunos chunks del bundle web para mejorar tiempos de carga en equipos de gama media.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de febrero de 2026 - 0.3.5 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rápido)
- **Generador de árboles mock**: herramienta para crear árboles procedimentales y reproducibles mediante semilla.
- **Visualización de endogamia mejorada**: escala bicromática (amarillo a rojo) con lectura visual más clara por nivel de consanguinidad.

### Detalle técnico
- Se implementó un generador pseudoaleatorio (LCG) para escenarios repetibles de prueba y demo.
- Se ajustó el mapeo de color de endogamia sin alterar el resto de capas de visualización.

### Known Issues
- Pendiente validación final de build de producción en todos los perfiles de empaquetado desktop.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de febrero de 2026 - 0.3.4 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rápido)
- **Estabilidad del flujo IA**: la revisión de propuestas quedó más predecible al aplicar cambios por lotes.
- **Mejor continuidad de edición**: se redujeron interrupciones al alternar entre panel de búsqueda, detalle y edición de persona.

### Detalle técnico
- Se consolidaron ajustes en store y comandos de edición para mantener consistencia entre selección activa y mutaciones.
- Se endurecieron validaciones de flujos de revisión para evitar aplicar borradores incompletos.

### Known Issues
- Persisten casos ambiguos en personas homónimas que requieren confirmación manual antes de aplicar cambios.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de febrero de 2026 - 0.3.3 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rápido)
- **Asistente IA más usable**: mejoras en textos, claridad de acciones y recuperación ante fallos temporales.
- **Menos fricción en revisión**: se reforzó la trazabilidad de propuestas antes de confirmar cambios.

### Detalle técnico
- Se refinaron prompts y defaults del asistente para respuestas más consistentes en extracción y resolución.
- Se robusteció el manejo de errores transitorios (timeout/red/proveedor) en la cadena de orquestación.

### Known Issues
- En sesiones largas pueden aparecer diferencias de contexto entre sugerencias antiguas y estado actual del árbol; se recomienda refrescar revisión.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de febrero de 2026 - 0.3.2 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rápido)
- **Mejoras de calidad en importación GEDCOM**: mayor tolerancia en fechas y estructura de registros.
- **Paneles de persona más consistentes**: ajustes de presentación para datos personales, fuentes y notas.

### Detalle técnico
- Se añadieron mejoras de parseo/serialización GEDCOM para reducir pérdida de información en import/export.
- Se aplicaron correcciones de binding en editor de persona para mantener sincronía entre formulario y estado.

### Known Issues
- Algunos formatos de fecha complejos siguen siendo normalizados de forma conservadora y pueden requerir edición manual.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de febrero de 2026 - 0.3.1 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rápido)
- **Base del canal beta IA Assistant**: primer corte estable de integración entre edición manual y asistencia IA.
- **Mejor visibilidad operativa**: mensajes y estados más claros para seguimiento de ejecución.

### Detalle técnico
- Se introdujo la infraestructura inicial de configuración de proveedor/modelo y flujo de aplicación de propuestas.
- Se añadieron validaciones de seguridad para evitar cambios destructivos sin revisión explícita.

### Known Issues
- El rendimiento puede degradarse en árboles grandes durante operaciones de análisis intensivo; se recomienda usar vistas acotadas.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.
### 27 de febrero de 2026 - 0.3.0 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rapido)
- **Asistente IA para actualizar el arbol**: Ahora puedes pegar texto libre y obtener propuestas de cambios genealogicos auditables.
- **Dos formas de entrada**: flujo local por nodo (desde la persona seleccionada) y flujo global (desde `Edit`) para cargas mas amplias.
- **Revision antes de aplicar**: cada cambio propuesto se revisa por item antes de confirmar el lote.
- **Mayor seguridad de edicion**: eliminaciones en modo reversible (soft delete) con opcion de deshacer.

### Detalle tecnico
- **Pipeline en dos etapas**: extraccion estructural y resolucion sobre el arbol vivo.
- **Modos de ejecucion IA**: `Hibrido`, `Solo ChatGPT`, `Solo Gemini`.
- **Failover automatico**: ante `429`, `5xx` o timeout/red, se reintenta y puede cambiar de proveedor para continuar.
- **Aplicacion por lote**: los cambios aprobados se aplican en una transaccion unica con trazabilidad.
- **Auditoria**: se registra informante/evidencia, proveedor/modelo por etapa y eventos de fallback.

### Tambien incluye
- Mejoras de estabilidad general en flujo desktop.
- Refinamientos de interfaz para configuracion y revision de propuestas IA.
- Mensajes de error mas accionables para diagnostico de ejecucion.

### Known Issues (beta)
- Puede fallar la carga o validacion de credenciales en algunos entornos locales; usar reintento y volver a guardar credenciales.
- Si ambos proveedores devuelven errores repetidos (`429`, `5xx` o red), el proceso puede terminar con borrador parcial.
- En escenarios con homonimos complejos, algunas acciones quedan como ambiguas y requieren seleccion manual.

### Compatibilidad y migracion
- Esta beta se soporta oficialmente en **desktop (Tauri)**.
- El flujo de edicion manual existente sigue operativo.
- Si faltan credenciales de un proveedor, el sistema degrada al proveedor disponible con fallback limitado.
## 27 de febrero de 2026

### Nuevo: Análisis de Parentesco Interactivo 🔍 ✨
- **Experiencia Unificada** — Las vistas de Cálculo de Parentesco y Análisis Genético se han fusionado en un único modo interactivo: **"Análisis de Parentesco"**.
- **Cálculo con un Clic** — Ahora puedes calcular instantáneamente el parentesco y la ruta biológica hacia cualquier persona simplemente haciendo clic en su nodo mientras la vista de análisis está activa.
- **Optimización de Memoria (Memoization)** — Se ha implementado una capa de caché inteligente que evita recalcular el mapa genético innecesariamente, haciendo que las consultas sucesivas sean instantáneas.
- **Skills Estratégicas del Agente** — Se han integrado skills de nivel profesional para visualización con D3, gestión de escritorio con Tauri y reportes de alta calidad para potenciar el desarrollo avanzado.

### Mejorado: Navegación y Visuales ⚡
- **Iluminación Universal de Rutas** — Todas las capas de resaltado (Parentesco, ADN-Y, ADN-mt y objetivos del Mapa de Calor) ahora iluminan la ruta biológica completa, incluyendo los nodos de unión familiar, para un flujo estructural más intuitivo.
- **Renderizado de Alto Rendimiento** — El árbol ahora mantiene una fluidez estable de **60 FPS** tras eliminar fugas de cálculos redundantes en el bucle de renderizado.
- **Interfaz de Parentesco Premium** — La insignia de resultado de parentesco ha sido rediseñada con un estilo más prominente, acentos dorados y tipografía profesional.

### Corregido: Interacción y Diseño 🐞
- **Restauración del Clic en Nodos** — Se solucionó un problema donde el activador del cálculo de parentesco se había perdido tras los últimos cambios en la interfaz.
- **Resolución de Identidad** — Se corrigió un error donde los nodos alias o las copias del gráfico rompían el resaltado de las rutas.
- **Precisión de Tooltips** — Se solucionó un problema donde los marcadores de contemporaneidad a veces parpadeaban al pasar el cursor.

---

## 26 de febrero de 2026 (Alpha 0.2.x)

### Nuevo: Capas de Linaje 🧬
- **Vista de Linaje Combinado** — Se añadió un modo de "Linaje Púrpura" que resalta a individuos que portan tanto rasgos paternos (ADN-Y) como maternos (ADN-mt).
- **Mapa de Calor Genético** — Se introdujo la visualización base de contribución genética con lógica recursiva (ahora evolucionada a *Análisis de Parentesco*).

### Corregido
- **Diseño de Pedigrí** — Se corrigieron problemas de espaciado entre hermanos y se centraron los nodos de familia con mayor precisión entre los padres.
- **Panel de Diagnóstico** — Se mejoró la detección de inconsistencias de datos en archivos GEDCOM grandes.
