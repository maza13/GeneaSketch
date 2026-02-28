# Historial de Cambios (Changelog)

Todos los cambios notables en **GeneaSketch** serÃ¡n documentados en este archivo.

## 27 de February de 2026 - 0.3.5 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rapido)
- **Generador de Arboles Mock** — Nueva herramienta para crear arboles genealogicos procedimentales y reproducibles (con semilla), ideal para pruebas y demostraciones.
- **Visualizacion de Endogamia Mejorada** — Se ha implementado un nuevo esquema de color bicromatico (de Amarillo a Rojo) para la vista de endogamia, resaltando los niveles de consanguinidad de forma clara.

### Detalle tecnico
- **Generador de Datos Aleatorios** — Implementacion de un LCG (Linear Congruential Generator) para garantizar resultados reproducibles en la generacion de arboles.
- **Lógica de Color Consanguinea** — Nuevo sistema de mapeo de niveles de parentesco a colores especificos en la vista de colapso de pedigri, sin afectar otras visualizaciones.

### Known Issues
- [TODO] Pendiente de validacion final en builds de produccion.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de February de 2026 - 0.3.4 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rapido)
- [TODO] Resumen funcional para usuarios familiares.
- [TODO] Que cambia en su flujo diario.

### Detalle tecnico
- [TODO] Cambios tecnicos principales.
- [TODO] Riesgos y validaciones ejecutadas.

### Known Issues
- [TODO] Limitaciones conocidas y workaround.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de February de 2026 - 0.3.3 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rapido)
- [TODO] Resumen funcional para usuarios familiares.
- [TODO] Que cambia en su flujo diario.

### Detalle tecnico
- [TODO] Cambios tecnicos principales.
- [TODO] Riesgos y validaciones ejecutadas.

### Known Issues
- [TODO] Limitaciones conocidas y workaround.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de February de 2026 - 0.3.2 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rapido)
- [TODO] Resumen funcional para usuarios familiares.
- [TODO] Que cambia en su flujo diario.

### Detalle tecnico
- [TODO] Cambios tecnicos principales.
- [TODO] Riesgos y validaciones ejecutadas.

### Known Issues
- [TODO] Limitaciones conocidas y workaround.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de February de 2026 - 0.3.1 (Beta IA Assistant, Desktop)

### Para usuarios (resumen rapido)
- [TODO] Resumen funcional para usuarios familiares.
- [TODO] Que cambia en su flujo diario.

### Detalle tecnico
- [TODO] Cambios tecnicos principales.
- [TODO] Riesgos y validaciones ejecutadas.

### Known Issues
- [TODO] Limitaciones conocidas y workaround.

### Compatibilidad
- Desktop (Tauri) Windows.
- Canal visible: beta.
- Codename: ia-assistant.

## 27 de febrero de 2026 - 0.3.0 (Beta IA Assistant, Desktop)

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

### Nuevo: AnÃ¡lisis de Parentesco Interactivo ðŸ” âœ¨
- **Experiencia Unificada** â€” Las vistas de CÃ¡lculo de Parentesco y AnÃ¡lisis GenÃ©tico se han fusionado en un Ãºnico modo interactivo: **"AnÃ¡lisis de Parentesco"**.
- **CÃ¡lculo con un Clic** â€” Ahora puedes calcular instantÃ¡neamente el parentesco y la ruta biolÃ³gica hacia cualquier persona simplemente haciendo clic en su nodo mientras la vista de anÃ¡lisis estÃ¡ activa.
- **OptimizaciÃ³n de Memoria (Memoization)** â€” Se ha implementado una capa de cachÃ© inteligente que evita recalcular el mapa genÃ©tico innecesariamente, haciendo que las consultas sucesivas sean instantÃ¡neas.
- **Skills EstratÃ©gicas del Agente** â€” Se han integrado skills de nivel profesional para visualizaciÃ³n con D3, gestiÃ³n de escritorio con Tauri y reportes de alta calidad para potenciar el desarrollo avanzado.

### Mejorado: NavegaciÃ³n y Visuales âš¡
- **IluminaciÃ³n Universal de Rutas** â€” Todas las capas de resaltado (Parentesco, ADN-Y, ADN-mt y objetivos del Mapa de Calor) ahora iluminan la ruta biolÃ³gica completa, incluyendo los nodos de uniÃ³n familiar, para un flujo estructural mÃ¡s intuitivo.
- **Renderizado de Alto Rendimiento** â€” El Ã¡rbol ahora mantiene una fluidez estable de **60 FPS** tras eliminar fugas de cÃ¡lculos redundantes en el bucle de renderizado.
- **Interfaz de Parentesco Premium** â€” La insignia de resultado de parentesco ha sido rediseÃ±ada con un estilo mÃ¡s prominente, acentos dorados y tipografÃ­a profesional.

### Corregido: InteracciÃ³n y DiseÃ±o ðŸ›
- **RestauraciÃ³n del Clic en Nodos** â€” Se solucionÃ³ un problema donde el activador del cÃ¡lculo de parentesco se habÃ­a perdido tras los Ãºltimos cambios en la interfaz.
- **ResoluciÃ³n de Identidad** â€” Se corrigiÃ³ un error donde los nodos alias o las copias del grÃ¡fico rompÃ­an el resaltado de las rutas.
- **PrecisiÃ³n de Tooltips** â€” Se solucionÃ³ un problema donde los marcadores de contemporaneidad a veces parpadeaban al pasar el cursor.

---

## 26 de febrero de 2026 (Alpha 0.2.x)

### Nuevo: Capas de Linaje ðŸ§¬
- **Vista de Linaje Combinado** â€” Se aÃ±adiÃ³ un modo de "Linaje PÃºrpura" que resalta a individuos que portan tanto rasgos paternos (ADN-Y) como maternos (ADN-mt).
- **Mapa de Calor GenÃ©tico** â€” Se introdujo la visualizaciÃ³n base de contribuciÃ³n genÃ©tica con lÃ³gica recursiva (ahora evolucionada a *AnÃ¡lisis de Parentesco*).

### Corregido
- **DiseÃ±o de PedigrÃ­** â€” Se corrigieron problemas de espaciado entre hermanos y se centraron los nodos de familia con mayor precisiÃ³n entre los padres.
- **Panel de DiagnÃ³stico** â€” Se mejorÃ³ la detecciÃ³n de inconsistencias de datos en archivos GEDCOM grandes.



