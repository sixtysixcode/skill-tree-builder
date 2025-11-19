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
  Uses `ReactFlow` to render nodes/edges, manage selections, and coordinate placement, deletion, reconnection, and cycle detection. Also orchestrates search highlighting and Supabase persistence.

- **Sidebar (`app/components/SkillSidebar.tsx`)**  
  Validated form for creating skills, toggling placement mode, triggering center placement, auto-connect, and search. Includes actions for detaching or deleting selected elements.

- **Skill nodes (`app/components/SkillNode.tsx`)**  
  Custom React Flow node renderer that shows skill metadata, status, and quick actions (edit/reset). Receives typed data via `SkillData` from `app/types/skillTypes.ts`.

- **Data + realtime**  
  Supabase stores trees/nodes/edges and broadcasts changes so multiple users can work on a shared tree.

- **Modals (`app/components/EditNodeModal.tsx`)**  
  Modal edits an existing node’s fields directly on the canvas.

- **Utilities & Constants**  
  - `app/constants/canvasConstants.ts`: shared layout dimensions and style defaults.  
  - `app/utils/helpers.ts`: helper functions for mathematical operations or formatting that multiple components reuse.

### Directory Layout

```
app/
├─ components/    # Flow, sidebar, node renderer, modal
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
- Edit or reset any skill via the modal, with data stored in Supabase for persistence.
- Responsive sidebar drawer that adapts to mobile layouts.


### Bonuses
- Handled prevention of circular dependencies using `wouldCreateCycle` function inside Flow.tsx. Display Toast error notification.
- Added node search functionality with search bar inside SkillSidebar.tsx. Finds nodes with name/description matching search query, highlights nodes with an orange border and highlights tree path to matching node.
- If a primary node is active and a new node (inactive) is connected (becoming the primary node) the active node (now secondary) is automatically reverted to inactive.
- Created a database on Supabase to store tree, skill_node and skill_edge's. 
- Used Supabase Realtime to display collaborator mouse position, node creation, editing and deletion.
- When a new tree is created the user can set a password which can be shared with collaborators for security.

### Collaboration & Realtime Sync
- **Supabase Channels:** `tree-updates:{treeId}` streams Postgres changes for `skill_nodes` and `skill_edges`, allowing every client to patch React Flow state incrementally. `tree-presence:{treeId}` tracks active collaborators and broadcasts cursor positions + action messages.  
- **Cursor Broadcasts:** Flow throttles pointer moves and node drag updates (`sendCursorPosition`, `sendNodePosition`) so remote users see live intent without spamming the channel. Remote cursors are rendered in an overlay synced with the viewport/zoom.  
- **Optimistic UI:** Node edits, unlocks, and resets update state immediately while invoking `supabase.update(...)`. Incoming realtime events run through helpers (`mergeNodeRow`, `ensureNodeBehavior`) to preserve local position/handlers even when Supabase omits columns.  
- **Shared Tree Security:** The share modal lets the owner copy a tree URL, view the ID, and manage an optional password. Password hashes live on the `trees` table, and new collaborators must supply it before Supabase data loads.  
- **Cross-client notifications:** Actions such as locking/unlocking or resetting nodes call `broadcastAction`, so collaborators see inline status pills below remote cursors and know when data changed.  
- **Debounced metadata:** Tree title updates are debounced in Flow and persisted to Supabase, so everyone sees the new name without jitter and without clobbering positions during the update broadcast.

### AI Usage
- Used to scaffold initial components, help with Supabase Realtime implementation, define types and write unit tests. All AI generated code reviewed and refactored where necessary.

### Contributing Notes

- Use Yarn to avoid conflicting lockfiles.
- When updating node behaviors, inspect helper functions like `buildNode`, `handlePaneClick`, and `addEdgeSafely` (all in `Flow.tsx`).
- Styling favors Tailwind utilities; fall back to `globals.css` for custom selectors when needed.

Thanks for checking my project out!
