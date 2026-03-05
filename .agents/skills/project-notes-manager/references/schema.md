# Notes Schema v2

## Filename

`N0001-kind-slug.md`

- `N0001`: id estable.
- `kind`: `idea|note`.
- `slug`: kebab-case ASCII estable.

No renombrar por estado; solo cambia frontmatter.

## Frontmatter Requerido

- `note_id`
- `kind` (`idea|note`)
- `phase` (`active|archived`)
- `complexity` (`simple|complex`)
- `connectivity` (`isolated|interconnected`)
- `title`
- `source_type` (`user_requested|auto_inferred`)
- `created_at` (`YYYY-MM-DD`)
- `updated_at` (`YYYY-MM-DD`)

## Campos Condicionales

- `active_state` requerido cuando `phase=active`
- `archive_reason` requerido cuando `phase=archived`
- `source_context` requerido cuando `source_type=auto_inferred`

## Campos Operativos

- `tags`
- `related_notes`
- `related_paths`
- `related_todos`
- `promoted_todos`
- `relevance_score` (`0..100`)
- `confidence` (`high|medium|low`)
- `priority_hint` (`p1|p2|p3`)
- `effort_hint` (`s|m|l`)
- `horizon` (`near|mid|far`)
- `last_reviewed_at` (`YYYY-MM-DD|null`)
- `review_after` (`YYYY-MM-DD|null`)

## Enumeraciones

- `phase`: `active|archived`
- `active_state`: `candidate|on_hold|validated`
- `archive_reason`: `promoted|rejected|obsolete`
- `source_type`: `user_requested|auto_inferred`

## Secciones Requeridas del Cuerpo

- `## Context`
- `## Insight`
- `## Proposed Actions`
- `## Evolution Log`

## Registry v2

`notes/index/registry.json` debe incluir:

- `by_id`
- `by_kind`
- `by_phase`
- `by_tag`
- `by_connectivity`
- `by_complexity`
- `graph.related_notes`
- `signals`
- `promotion_state`
- `analysis_state.last_global_summary`
- `analysis_state.last_analysis`
- `analysis_state.last_deep_analysis`
- `encoding_state`
