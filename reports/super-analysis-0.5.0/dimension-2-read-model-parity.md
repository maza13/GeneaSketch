# Super Analysis 0.5.0 - Dimension 2 Read-model parity

- generatedAt: 2026-03-06T05:25:17.063Z
- fixtureCount: 7
- semanticMismatchCount: 24

| Fixture | Category | Persons | Families | Total mismatches | Semantic mismatches |
| :--- | :--- | ---: | ---: | ---: | ---: |
| canonical_basico | canonical | 1 | 0 | 0 | 0 |
| canonical_tipico | canonical | 3 | 1 | 8 | 8 |
| canonical_edgecases | canonical | 1 | 0 | 0 | 0 |
| synthetic_multi_union | synthetic | 5 | 2 | 0 | 0 |
| synthetic_adoption | synthetic | 3 | 1 | 0 | 0 |
| compat_missing_union_repair | compat | 2 | 1 | 16 | 16 |
| real_sample_nunez_mendoza | real | 206 | 73 | 0 | 0 |

## Semantic mismatches

- canonical_tipico :: persons :: [0].fams[0]
- canonical_tipico :: persons :: [1].fams[0]
- canonical_tipico :: persons :: [2].famc[0]
- canonical_tipico :: families :: [0].id
- canonical_tipico :: timeline :: families[0].id
- canonical_tipico :: timeline :: persons[0].fams[0]
- canonical_tipico :: timeline :: persons[1].fams[0]
- canonical_tipico :: timeline :: persons[2].famc[0]
- compat_missing_union_repair :: persons :: [0].famc[0]
- compat_missing_union_repair :: persons :: [0].id
- compat_missing_union_repair :: persons :: [1].fams[0]
- compat_missing_union_repair :: persons :: [1].id
- compat_missing_union_repair :: families :: [0].childrenIds[0]
- compat_missing_union_repair :: families :: [0].husbandId
- compat_missing_union_repair :: families :: [0].id
- compat_missing_union_repair :: search :: [0].id
- compat_missing_union_repair :: search :: [1].id
- compat_missing_union_repair :: timeline :: families[0].childrenIds[0]
- compat_missing_union_repair :: timeline :: families[0].husbandId
- compat_missing_union_repair :: timeline :: families[0].id
- compat_missing_union_repair :: timeline :: persons[0].famc[0]
- compat_missing_union_repair :: timeline :: persons[0].id
- compat_missing_union_repair :: timeline :: persons[1].fams[0]
- compat_missing_union_repair :: timeline :: persons[1].id
