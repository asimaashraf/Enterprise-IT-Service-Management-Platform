# Agent Instructions

- Start with `ai-context/BRAIN.md` and `ai-context/TASKS.md`; use `ROADMAP.md` and `ARCHITECTURE.md` when relevant.
- Read only task-relevant code and documentation. Do not scan the entire repository unless the task requires it.
- Preserve existing architecture, API contracts, tenant isolation, and response conventions. Change unrelated files only with explicit need.
- Never expose, add, or commit secrets, `.env` files, credentials, or tokens.
- After code changes, run the relevant validation/tests when dependencies and required services are available.
- Update `ai-context/TASKS.md` after completed work. Update BRAIN, ROADMAP, or ARCHITECTURE only for material project changes.
- Keep memory files concise and high-signal. Do not duplicate API docs or audit details.
- Never commit or push unless explicitly instructed.
