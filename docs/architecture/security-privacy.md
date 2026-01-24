# Security & privacy notes (MVP guardrails)

This is not legal advice. It’s a practical checklist to avoid obvious mistakes.

## API keys (BYOK)

- Do NOT store user LLM keys in cookies.
  - Cookies are attached to every request, increase exposure, and can leak via logs/misconfig.
- MVP: store keys only in the browser (localStorage / IndexedDB) and send as `x-api-key` header to our server.
- Still apply minimal rate limits even with BYOK.

## User data (EU / GDPR shape)

If we collect CVs and personal data, we need:

- data minimisation (collect only what we need)
- storage limitation (define retention; don’t keep data forever)
- security measures and deletion flows

Important: if we ever want to reuse resumes to build a dataset, do it as an explicit opt-in.
Do NOT tie consent for dataset reuse to “basic product usage”.

## Account activation gate

MVP gate after resume import:

- allow resume upload + parsing without extra friction
- before generating adapted resumes:
  - ask user to confirm key profile fields (name, email, country/region, languages)
  - phone is optional; support multiple numbers if provided

## “Multi-brand SEO” (post-MVP)

Treat as an experiment with risks.
Avoid tactics that look like doorway sites or duplicate content; it can backfire and damage trust.
Prefer one strong brand + clear landing pages per region/role and real content.
