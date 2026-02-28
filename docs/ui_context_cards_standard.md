# Estandar Global de Tarjetas Contextuales

A partir de esta iteracion, las tarjetas contextuales son el patron oficial de detalle contextual en GeneaSketch.

## Regla de uso
- Vista primaria: frase/etiqueta breve y legible.
- Detalle: tarjeta contextual al hover usando componentes reutilizables.

## Componentes oficiales
- `src/ui/context/ContextCard.tsx`
- `src/ui/context/ContextHoverAnchor.tsx`

## Alcance actual
- Panel de estadisticas (`PersonStatsPanel`) para ventana de hijos.
- Capa de consanguinidad (`DTreeView`, layer-endogamy).

## Convencion de datos
- Mostrar `Estimado` cuando exista inferencia por fecha parcial.
- Fallback consistente: `No documentado` / `N/D`.

## Roadmap de migracion
- Timeline tooltips.
- Tooltips de capas de diagnostico.
- Cualquier nuevo detalle contextual debe usar este estandar.
