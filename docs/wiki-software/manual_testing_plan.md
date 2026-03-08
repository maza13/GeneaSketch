# Plan de Pruebas Manuales - GeneaSketch v0.4.5 (Beta Genraph)

Este documento contiene pruebas paso a paso para verificar estabilidad de motores visuales, logicos y de interfaz antes de un corte de release.

---

## Bloque A: Navegacion y Atajos (UX)
Objetivo: Verificar que los atajos auditados funcionan correctamente.

1. Enfoque maestro:
- Selecciona a cualquier persona en el arbol.
- Mueve la camara lejos de esa persona usando el mouse.
- Presiona la tecla `Espacio`.
- Resultado esperado: la camara se centra suavemente en la persona seleccionada.

2. Visibilidad de paneles:
- Presiona `[` para cerrar el panel izquierdo.
- Presiona `]` para cerrar el panel derecho.
- Presiona `Mayus + T` para cerrar/abrir el panel de linea de tiempo.
- Resultado esperado: los paneles colapsan y se expanden sin errores visuales.

3. Buscador (Omnisearch):
- Presiona `Ctrl + F` (o `Ctrl + K`).
- Escribe el nombre de una persona existente.
- Resultado esperado: el panel de busqueda aparece y filtra resultados en tiempo real.

---

## Bloque B: Kindra y overlays
Objetivo: Validar capas de visualizacion del subsystema visual.

1. Ajuste a pantalla:
- Haz zoom out hasta que el arbol sea pequeno.
- Presiona `F` (Ajustar a pantalla).
- Resultado esperado: el arbol completo se reajusta al centro.

2. Mapa de calor genetico:
- En el panel izquierdo, activa modo de color geografico o generacional.
- Cambia entre modo vibrante y monocromo.
- Resultado esperado: colores de nodos actualizados de inmediato segun leyenda.

3. Deteccion de endogamia:
- Carga el ejemplo "Endogamy Scenario" desde el menu `Avanzado`.
- Ubica el icono de alerta en nodos afectados.
- Resultado esperado: al pasar el mouse, se resalta la ruta de endogamia.

---

## Bloque C: Genraph y GEDCOM (Integridad)
Objetivo: Asegurar que el hardening del motor de datos es efectivo.

1. Persistencia del historial (journal):
- Realiza un cambio menor (por ejemplo, nombre de una persona).
- Cierra la app (o recarga navegador/Tauri).
- Resultado esperado: el cambio persiste al abrir de nuevo.

2. Importacion GEDCOM:
- Importa un archivo `.ged`.
- Revisa advertencias en barra de estado o panel de importacion.
- Resultado esperado: el sistema procesa el archivo y reporta inconsistencias en auditoria/cuarentena.

---

## Bloque D: AncestrAI (IA)
Objetivo: Verificar flujo de AncestrAI y reversibilidad.

1. Asistente local:
- Abre el panel de una persona y haz clic en "AncestrAI".
- Solicita "Generar una biografia basada en sus hechos".
- Resultado esperado: respuesta coherente basada en datos del nodo.

2. Batch Apply y Undo:
- Solicita un cambio masivo (por ejemplo, estandarizar nombres).
- Haz clic en "Aplicar Cambios".
- Usa "Deshacer lote AncestrAI" en menu `Edit`.
- Resultado esperado: los cambios se aplican en bloque y se revierten al estado anterior.
