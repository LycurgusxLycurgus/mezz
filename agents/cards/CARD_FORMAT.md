# Card Format (LLM-Friendly)

Preferred working format for cards in `agents/cards`: **TSV** (`.tsv`) with one card per line.

## Why TSV
- One-row-per-card is easy to diff, scan, and patch.
- Stable field order avoids accidental schema drift.
- Low token overhead vs nested JSON.

## Core Pronunciation TSV Order
1. `id`
2. `cluster`
3. `es`
4. `esMirror`
5. `en`
6. `enMirror`
7. `notaEn`
8. `notaEs`

## Workflow
1. Edit first in `agents/cards/*.tsv`.
2. Validate content and ordering.
3. Sync into runtime JSON under `js/assets/`.
