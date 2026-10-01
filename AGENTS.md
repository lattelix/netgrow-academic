# NetGrow Academic Project

This repository contains an independent academic information system. It must not reference, copy, import from, or disclose GrowNet, TalentBay, their repositories, APIs, designs, screenshots, package names, or production data.

## Engineering rules

- Use TypeScript in strict mode.
- Keep modules small and give public contracts explicit types.
- Use the existing stack and patterns once the project is scaffolded.
- Use synthetic Russian-language demo data only.
- Never add secrets or real personal data.
- Implement loading, empty, error, and permission-denied states.
- Keep the UI responsive and keyboard accessible.
- Do not use em dashes in Russian user-facing copy.
- Do not commit generated build output, local databases, credentials, or environment files.
- Before finishing, run lint, typecheck, unit tests, production build, and Playwright smoke tests.
- Do not publish or push the repository. Leave all changes local for review.

## Product boundary

NetGrow is an information system for forming project teams and coordinating educational activities in a children's health camp. It is not a general-purpose social network and is not connected to any real commercial product.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
