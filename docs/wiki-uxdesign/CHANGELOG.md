# Historial de Cambios (Wiki UX GeneaSketch)

## Alcance de este changelog
Este archivo registra solo cambios de estructura, contenido y gobernanza de `docs/wiki-uxdesign/`.
No registra cambios de contrato `.gsk` (ver `../wiki-gsk/CHANGELOG.md`) ni cambios de guía de usuario general (ver `../wiki-software/CHANGELOG.md`) ni release pública global (ver `../../CHANGELOG.md`).

## [1.2.0] - 2026-03-04
### Añadido
- Refinamiento de anatomía del Right Panel para mostrar prefijos, sufijos y títulos nobiliarios (Soporte Issue #020).
- Nueva clase `.detail-title` definida en el capítulo 9 para consistencia en metadatos honoríficos.

## [1.1.0] - 2026-03-03
### Cambiado
- Integración del contexto normativo UX directamente en `12_instrucciones_agentes_ia.md` como contrato de referencia para agentes.

### Eliminado
- Archivo legado `design_Contex.md` (reemplazado por el capítulo 12).
- Archivo legado `wike_datos_base.md` (ya absorbido por la wiki por capítulos).
- Copia documental `docs/wiki-uxdesign/tokens.css` (se mantiene solo ubicación runtime en `src/styles/tokens.css`).

## [1.0.0] - 2026-03-03
### Añadido
- Estructura canónica de wiki UX por 12 capítulos + README.
- Navegación estándar entre capítulos y documento raíz.
- Definición explícita de `src/styles/tokens.css` como ubicación primaria runtime.

### Mejorado
- Normalización de organización documental UX para uso por agentes y mantenimiento continuo.

## Navegación
[<- Anterior: 12_instrucciones_agentes_ia](./12_instrucciones_agentes_ia.md) | [Volver a README ->](./README.md)
