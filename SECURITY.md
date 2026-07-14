# Security Policy

## Reporting a vulnerability

Please do not disclose vulnerabilities in public issues. Contact the repository owner privately with:

- a concise description of the issue;
- reproduction steps;
- affected files or endpoints;
- potential impact;
- a suggested mitigation, if available.

## Secrets and local data

- Never commit `.env.local` or API keys.
- Never commit exported user state or files from `data/`.
- Use Supabase row-level security for cloud state.
- Configure production secrets through the hosting provider's encrypted environment settings.
