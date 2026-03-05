# DTree V3 Control Plane

## Objetivo
Este documento define la gobernanza operativa para la migracion `DTree V3` (issues `065..072`) y evita drift entre:

- runtime
- calidad/performance
- documentacion

## Ruta Critica
1. `065` habilita control plane, validaciones y formato de evidencia.
2. `066` fija baseline y gates de SLO (entrada obligatoria para el resto).
3. `067` y `068` solo pueden avanzar con gate de `066` en verde.
4. `069` depende de `067 + 068`.
5. `070` depende de `069`.
6. `071` depende de `070`.
7. `072` depende de `071` y cierra la migracion.

## Politica de Gates
1. Cada fase debe pasar sus comandos de `Verification Commands`.
2. Si falla un gate de performance (SLO absoluto o regresion >10%), se bloquea la siguiente fase.
3. Ningun issue hijo se marca `complete` sin checklist de `Acceptance Criteria`.
4. `065` permanece abierto hasta cierre comprobado de `072`.

## Politica de Excepciones
1. Excepciones de alcance solo se aceptan si se registran primero en `065`.
2. Toda excepcion debe incluir:
   - motivo tecnico
   - riesgo aceptado
   - plan de remediacion con fecha
3. Excepciones sin evidencia en Work Log invalidan el cierre de fase.

## Formato de Evidencia por Fase
Cada cierre o avance de fase debe dejar en `Work Log`:

1. Fecha ISO (`YYYY-MM-DD`).
2. Autor.
3. Comandos ejecutados.
4. Resultado resumido (pass/fail y metricas clave).
5. Referencia de revision (`git rev-parse --short HEAD`).

## Validacion Automatica
Cadena validada por script:

- archivo: `tools/dtree-v3/validate-todo-chain.mjs`
- comando: `npm run plan:dtree-v3:validate`

El validador revisa:
1. Existencia de `065..072`.
2. `issue_id` consistente con prefijo de archivo.
3. Dependencias esperadas por fase.
4. Secciones obligatorias en cada TODO.

## Estado Operativo
- Control plane: activo.
- Gate `066` respecto a `067`: obligatorio.
- Fallback `v2`: retirado en `072` (hard-cut final).

## Estado de Cierre (2026-03-04)
1. Cadena `065..072` completada y validada.
2. Render runtime consolidado en camino unico V3 (sin fallback runtime V2).
3. Layout runtime consolidado en camino unico vnext (sin fallback `v2 -> vnext`).
4. Persistencia migrada con lectura tolerante legacy + write-back a contrato final.
5. Gates finales en verde:
   - `npm run test`
   - `npm run build`
   - `npm run test:perf:layout`
   - `npm run test:perf:overlays`
   - `npm run plan:dtree-v3:validate`
