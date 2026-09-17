# Alexandria — Personal Academy

Alexandria is a personal intellectual operating system for turning books, observations, experience, and questions into judgment, capability, and action. This repository is a faithful migration of the original ChatGPT Sites prototype into a standard Next.js codebase.

The application remains public by design: it contains no mandatory account system, workspace restriction, or sign-in gate.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS, with exact visual tokens and component styles in `app/globals.css`
- Browser local storage for the prototype Universal Capture inbox
- Standard npm scripts, ready for GitHub and Vercel

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production verification:

```bash
npm run typecheck
npm run build
npm start
```

No environment variables are needed for the current prototype. Copy `.env.example` to `.env.local` only when adding server-side AI or database services.

## Repository structure

```text
alexandria/
├── app/
│   ├── api/                 # Future server-side API route boundary
│   ├── globals.css          # Alexandria visual system and responsive rules
│   ├── icon.svg
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── views/               # Library and Academy working surfaces
│   ├── alexandria-app.tsx   # Client navigation and interaction shell
│   ├── navigation.tsx
│   ├── page-header.tsx
│   └── universal-capture.tsx
├── data/
│   └── mock-data.ts         # Replaceable typed prototype content
├── database/                # Future persistence guidance
├── lib/
│   └── capture-store.ts     # Current local capture persistence
├── mcp/                     # Future MCP server architecture
├── models/
│   └── domain.ts            # Alexandria domain interfaces
├── public/
│   └── assets/              # Local artwork, covers, and future media
├── services/
│   ├── ai/                  # AI provider boundary and contracts
│   ├── import/              # Spreadsheet parsing/validation boundary
│   ├── mcp/                 # Optional browser MCP tool registration
│   ├── retrieval/           # Library repository interface
│   └── voice/               # Dictation adapter contract
├── .env.example
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

## Alexandria Architecture

### THE LIBRARY

The Library is Alexandria's external knowledge system. It begins with sources—books, articles, conversations, experiences, observations, and experiments—and follows ideas through highlights, interpretations, principles, connections, applications, feedback, and revisions.

The Library is designed to preserve provenance. A principle should remain connected to where it came from, how it was interpreted, where it was tested, what happened, and why it later changed.

### THE ACADEMY

The Academy is Alexandria's internal capability system. It develops retrieval, reasoning, first-principles thinking, synthesis, oratory, application, and intellectual honesty through the Interrogation Chamber, the Agora, the Forum, and the Capability Map.

The Library records what is known. The Academy tests what can be recalled, rebuilt, communicated, and used under pressure.

### Core learning loop

> Encounter → Recall → Interrogate → Reduce → Rebuild → Connect → Articulate → Apply → Observe → Revise → Retrieve Again

## Domain model

`models/domain.ts` defines interfaces for:

- `Source`
- `Book`
- `Highlight`
- `Interpretation`
- `Principle`
- `Connection`
- `Application`
- `Feedback`
- `Revision`
- `ReadingSession`
- `Question`
- `InterrogationSession`
- `AgoraSession`
- `ForumSession`
- `CapabilityEvidence`

The mock records in `data/mock-data.ts` use these structures, so a database can replace them without embedding content inside presentation components.

## Voice-first input

Universal Capture, Interrogation, the Agora, and the Forum use ordinary textareas and therefore accept dictation from system-level tools such as Wispr Flow today. `services/voice/voice-input.ts` defines the adapter contract for a future first-party speech-to-text integration. Domain records preserve their `inputSource` so dictated input remains distinguishable without becoming a separate content type.

## AI integration

`services/ai/contracts.ts` defines one provider-neutral boundary for:

- library retrieval and semantic search
- Socratic interrogation
- first-principles reduction
- knowledge synthesis
- Agora scenario generation
- Forum and oratory feedback
- structured extraction from voice transcripts
- knowledge record creation

Implement AI calls in server-only route handlers beneath `app/api`. Never import API keys into a client component or expose them with a `NEXT_PUBLIC_` prefix.

## Spreadsheet import

The Scriptorium keeps voice-first capture primary and spreadsheet import secondary. `services/import/spreadsheet-import.ts` defines template columns, validation issues, import rows, previews, and the parser contract. Add an XLSX parser only when spreadsheet import is implemented; map approved rows into the domain models before persistence.

## MCP support

The planned server tool surface is documented in `mcp/README.md`. MCP tools should call the same domain services and repositories as the web application. The prototype's optional in-browser MCP tools are preserved in `services/mcp/browser-tools.ts` and register only when a compatible host provides `document.modelContext`.

## Push to GitHub

Create an empty GitHub repository, then run from this directory:

```bash
git init
git add .
git commit -m "Initial Alexandria migration"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

You can then clone the repository and work with GitHub, Codex, Claude, or any normal Git-compatible development workflow.

## Deploy publicly with Vercel

1. Push the project to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Keep the detected framework as **Next.js**.
4. Deploy. No environment variables or authentication settings are required for the current prototype.

For future AI or database features, add secrets in Vercel's project environment settings and redeploy. Do not commit `.env.local`.

## Fidelity and current prototype boundaries

The visual identity, responsive layout, content, navigation surfaces, local Universal Capture, interrogation sequence, Agora timer and scenarios, and Forum feedback interaction have been transferred.

The original prototype did not include a production database, real semantic retrieval, live AI feedback, a functioning XLSX parser, or server-side voice transcription. Those remain explicit service boundaries rather than simulated production features. Universal Capture still uses browser local storage, so captures remain on the current device until persistence is connected. The School of Athens artwork retains the original remote Wikimedia source and placement; it can be replaced with a locally licensed asset in `public/assets` later.
