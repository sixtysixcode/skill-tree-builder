## Skill Tree Builder

Interactive skill-tree prototyping tool powered by the Next.js App Router, React Flow, Framer Motion, Tailwind CSS, and TypeScript. Create skills, link prerequisites, and explore the dependency graph with instant visual feedback.

### Requirements

- Node.js 18+
- Yarn (preferred package manager for this repo)

### Local Development

```bash
yarn install          # install dependencies
yarn dev              # start the Next.js dev server

# optional scripts
yarn lint             # run ESLint
yarn build && yarn start   # production build + serve
```

### Application Overview

- **Canvas (`app/components/Flow.tsx`)**  
  Uses `ReactFlow` to render nodes/edges, manage selections, and coordinate placement, deletion, reconnection, and cycle detection. Also orchestrates search highlighting and onboarding state.

- **Sidebar (`app/components/SkillSidebar.tsx`)**  
  Validated form for creating skills, toggling placement mode, triggering center placement, auto-connect, and search. Includes actions for detaching or deleting selected elements.

- **Skill nodes (`app/components/SkillNode.tsx`)**  
  Custom React Flow node renderer that shows skill metadata, status, and quick actions (edit/reset). Receives typed data via `SkillData` from `app/types/skillTypes.ts`.

- **Persistence (`app/hooks/useLocalStorage.ts`)**  
  Hydrates nodes and edges from `localStorage` so sessions survive refreshes. Flow seeds defaults and keeps refs synchronized.

- **Modals & Splash (`app/components/EditNodeModal.tsx`, `app/components/Splash.tsx`)**  
  Modal edits an existing node’s fields; splash screen offers the user the choice between starting a new tree or resuming an existing one (if data exists in localstorage).

- **Utilities & Constants**  
  - `app/constants/canvasConstants.ts`: shared layout dimensions and style defaults.  
  - `app/utils/helpers.ts`: helper functions for mathematical operations or formatting that multiple components reuse.

### Directory Layout

```
app/
├─ components/    # Flow, sidebar, splash, node renderer, modal
├─ constants/     # Canvas/graph constants
├─ hooks/         # Custom hooks (e.g., local storage sync)
├─ types/         # TypeScript definitions for nodes/edges/skills
├─ utils/         # Shared helper functions
├─ globals.css    # Tailwind + project-wide styles
├─ layout.tsx     # Root layout, metadata, fonts
└─ page.tsx       # Entry page that renders <Flow />
```

### Core Functionality

- Create skills via the sidebar form, either place-on-click or auto-place at center.
- Automatically connect new skills to the currently selected node when auto-connect is enabled.
- Prevent circular dependencies through cycle detection before edges are created (Displays toast error).
- Search by name or description to highlight matching nodes and their prerequisite path.
- Edit or reset any skill via the modal, with data stored in local storage for persistence.
- Responsive sidebar drawer that adapts to mobile layouts.

### Contributing Notes

- Use Yarn to avoid conflicting lockfiles.
- When updating node behaviors, inspect helper functions like `buildNode`, `handlePaneClick`, and `addEdgeSafely` (all in `Flow.tsx`).
- Styling favors Tailwind utilities; fall back to `globals.css` for custom selectors when needed.

Thanks for checking my project out!
