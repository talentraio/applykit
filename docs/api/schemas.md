# Schemas (high level)

All schema definitions live in `@int/schema` (Zod + inferred TS types).

## Resume root
- `personal` (name, title, contacts, location)
- `summary`
- `skills[]`
- `experience[]`
- `education[]`
- `projects? string[]` (optional)
- `links? { name, link }[]` (optional)
- `languages? { language, level }[]` (root-level)

Dates:
- Use `YYYY-MM`

## Vacancy
- company: required
- jobPosition: optional
- description: string (MVP)
- url: optional
- notes: optional
- generatedVersions: array (store as array even if UI shows only latest)

## Relevance metrics (store now, visualize later)
Inside `generatedVersions[n].metrics`:
- `matchBefore: number` (0..100)
- `matchAfter: number` (0..100)
- `delta: number`
- `tuning: number` (0..100, user-controlled “push closer to vacancy”)

MVP UI: show a simple percentage number.
Backlog: dashboards and visualisations.
