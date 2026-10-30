<div align="center">

# 💗🍓 Bibble 🍓💗

### A soft little corner of the internet to grow what you know ☁️

**NSOC26 · Learn gently. Connect ideas. Celebrate small progress.**

<img src="https://readme-typing-svg.demolab.com?font=Nunito&weight=700&size=20&pause=1400&color=DE7895&center=true&vCenter=true&width=560&lines=Make+room+for+what+you%E2%80%99re+learning+%F0%9F%8C%B7;Small+steps+still+count+%F0%9F%92%97;A+cozy+space+to+learn+at+your+own+pace+%E2%98%81%EF%B8%8F" alt="Make room for what you're learning; small steps still count; a cozy space to learn at your own pace" />

<br />

![Made with love](https://img.shields.io/badge/made%20with-%E2%99%A5%20and%20tea-e89aaa?style=flat)
![Next.js](https://img.shields.io/badge/Next.js-16-272536?style=flat&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-8c9ed6?style=flat&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?style=flat&logo=tailwindcss&logoColor=white)
![Prototype](https://img.shields.io/badge/status-frontend%20prototype-f2c58b?style=flat)

**[Explore the repository](https://github.com/anshika-guleria/bibble)** · **[Contributing guide](./CONTRIBUTING.md)** · **[Report a bug](https://github.com/anshika-guleria/bibble/issues)**

</div>

---

## 💌 A little note

Bibble is a cozy learning-space concept designed to make studying feel less lonely and less overwhelming. Find a study room, settle into a focus session, and turn what you learn into a visual map of connected ideas—one little **bibble** at a time. 💗

The project is currently a **front-end prototype** for learning maps and study rooms. Email/password authentication and authenticated custom-map persistence use Supabase, while guest and existing local-map edits remain available in browser `localStorage`. Study rooms, sample maps, and their illustrative content are not live or shared backend data. Numbers, hosts, and participant counts shown in sample content are illustrative UI data, not live users.

---
## 📸 Take a peek inside

The following screenshots show the main areas of Bibble and its learning-map workflow.

### 🏡 Home

**Screenshot file:** `docs/screenshots/home.png`

![Home](docs/screenshots/home.png)

### 🪴 Study Rooms

**Screenshot file:** `docs/screenshots/studyrooms.png`

![Study Rooms](docs/screenshots/studyrooms.png)

### 🗺️ Explore Learning Maps

**Screenshot file:** `docs/screenshots/explorerunningmaps.png`

![Explore Learning Maps](docs/screenshots/explorerunningmaps.png)

### 🎨 Create a Learning Map

**Screenshot file:** `docs/screenshots/create_a_learning_map_01.png`

![Create a Learning Map](docs/screenshots/create_a_learning_map_01.png)

### 🧠 Learning Map Editor & Bibble Details

**Screenshot file:** `docs/screenshots/Learning map editor and bibble details.png`

![Learning Map Editor and Bibble Details](docs/screenshots/Learning%20map%20editor%20and%20bibble%20details.png)

## 🌷 What you can explore

| Area | What it does |
| --- | --- |
| **Home** | Introduces Bibble and previews study rooms and a sample learning map. |
| **Study rooms** | Browses and searches sample rooms by room name, topic, and tags. Room pages provide a focused study-space experience. |
| **Explore maps** | Searches sample learning maps and filters them by category. |
| **Learning map viewer** | Displays ideas as nodes (called *bibbles*) connected by edges. Select a bibble to inspect its details. |
| **Create a map** | Starts a map with a title, description, and category, then opens the map editor. |
| **Map editor** | Adds, moves, connects, selects, and removes bibbles, and saves map changes locally. |
| **Bibble details** | Edits descriptions and notes, tracks status and progress, and provides a save action for changes. |
| **Theme controls** | Switches between Strawberry Red, Refreshing Green, and Strawberry Lemonade Beach themes, with light and dark modes. |
| **Local persistence** | Stores learning-map data and theme preferences in the current browser. Clearing browser storage can remove locally saved maps or preferences. |

### 🌱 The basic learning flow

1. Browse **Study rooms** to find a sample study space, or open **Explore maps** to find a roadmap.
2. Open a learning map and select a bibble to view its details.
3. Use **Create a map** to start your own learning map.
4. In the editor, add bibbles and connect related ideas.
5. Update each bibble's status, notes, description, and progress, then use the relevant save controls.
6. Return to the map in the same browser to continue where you left off.

---

## 🧰 Tech stack

| Technology | Role in Bibble |
| --- | --- |
| [Next.js 16](https://nextjs.org/) | App framework, file-based routing, and development/build commands. |
| [React 19](https://react.dev/) | Component-based user interface. |
| [TypeScript 5](https://www.typescriptlang.org/) | Typed components, map data, and application logic. |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling foundation. |
| [XYFlow / React Flow](https://xyflow.com/) | Interactive node-and-edge canvas for learning maps. |
| [Lucide React](https://lucide.dev/) | Interface icons. |
| [Motion](https://motion.dev/) | UI transitions and animated details panel. |
| [Radix UI](https://www.radix-ui.com/) and [shadcn](https://ui.shadcn.com/) | UI primitives and styling integration used by the project. |
| [Supabase Auth](https://supabase.com/docs/guides/auth) | Email/password accounts, confirmation, and secure cookie sessions. |
| [Supabase](https://supabase.com/) | Hosted PostgreSQL and private Storage for authenticated map persistence and exports. |
| Browser `localStorage` | Guest/local cache persistence for maps and theme preferences. |

---

## 🏡 Get set up locally

### Prerequisites

- [Node.js](https://nodejs.org/) installed (use a current LTS release).
- npm, which is included with Node.js.
- Git installed and a GitHub account to contribute.

### 1. Fork and clone

For contributions, fork the repository on GitHub first, then clone **your fork**:

```bash
git clone https://github.com/<your-username>/bibble.git
cd bibble
```

To simply run the original project locally, clone the upstream repository instead:

```bash
git clone https://github.com/anshika-guleria/bibble.git
cd bibble
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Changes to application files should appear through Next.js development refresh.

### 4. Check the project

Run the linter:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Run the production server after a successful build:

```bash
npm run start
```

> **Tip:** If the default port is already in use, Next.js may select another port. Use the local URL printed in your terminal.

---

## 🗂️ Project structure

The paths below describe the main areas of the repository. Some routes also use colocated components and styles not shown here.

```text
bibble/
├── app/
│   ├── page.tsx                   # Home page
│   ├── layout.tsx                 # Root layout, fonts, metadata, theme bootstrap
│   ├── globals.css                # Global styles and theme integration
│   ├── explore/
│   │   └── page.tsx               # Map search and category filters
│   ├── rooms/
│   │   ├── page.tsx               # Study-room directory
│   │   └── [id]/page.tsx          # Individual room route
│   ├── create/
│   │   ├── page.tsx               # Create-map flow
│   │   └── _components/           # Create form, intro, and header
│   ├── map/
│   │   └── [id]/
│   │       ├── page.tsx           # Learning-map viewer
│   │       └── edit/page.tsx      # Learning-map editor
│   └── (auth)/                    # Authentication-related UI components/routes
├── components/
│   ├── bibble/                    # Bibble node and details panel
│   ├── explore/                   # Map cards and exploration UI
│   ├── map/                       # Map canvas, headers, toolbar, previews
│   ├── rooms/                     # Study-room cards, previews, and room UI
│   └── ui/                        # Shared controls, including theme picker
├── data/
│   ├── categories.ts              # Explore categories
│   ├── sample-maps.ts             # Sample map content and progress helper
│   ├── study-rooms.ts             # Sample study-room content
│   └── themes.ts                  # Theme definitions
├── hooks/
│   ├── use-local-storage.ts       # Browser storage helper
│   └── use-theme.ts               # Theme and light/dark mode state
├── lib/
│   ├── maps/                      # Learning-map creation helpers
│   └── map-utils.ts               # Convert map data to/from canvas structures
├── types/
│   ├── map.ts                     # Learning-map and bibble types
│   ├── room.ts                    # Study-room types
│   └── theme.ts                   # Theme types
├── public/                        # Static assets
├── CONTRIBUTING.md                # Contribution workflow and PR expectations
├── package.json                   # Scripts and dependencies
└── README.md                      # Project documentation
```

### How the main pieces fit together

- **Routes in `app/`** compose each page and choose their page-level components.
- **Reusable UI in `components/`** separates the home, room, map, and bibble interfaces into maintainable pieces.
- **Static example content in `data/`** provides sample maps, room cards, categories, and themes.
- **Types in `types/`** describe learning maps, bibbles, their connections, rooms, and theme settings.
- **Hooks in `hooks/`** manage browser persistence and theme preferences.
- **Map helpers in `lib/`** create learning maps and translate between Bibble's map model and the XYFlow canvas representation.

---

## ⌨️ Map editor keyboard shortcuts

In the map editor (`/map/[id]/edit`), press `?` or use the keyboard icon in the toolbar to open the in-app shortcuts guide. The list lives in `lib/map-shortcuts.ts`.

| Shortcut | Action |
| --- | --- |
| `N` | Add a new bibble |
| `F` | Fit the whole map in view |
| `Ctrl/Cmd + S` | Save the map |
| `?` | Open or close the shortcuts guide |
| `Tab` | Move focus to the next bibble |
| `Enter` / `Space` | Select the focused bibble |
| `Esc` | Deselect the focused bibble |
| Arrow keys | Move the selected bibble (`Shift` for bigger steps) |
| `Backspace` | Delete the selected bibbles or connections |
| `Shift` + drag | Box-select bibbles |
| `Ctrl/Cmd` + click | Add or remove a bibble from the selection |
| `Space` + drag | Pan the canvas |
| `Ctrl/Cmd` + scroll | Zoom the canvas |

Single-key shortcuts are ignored while typing in a text field. The canvas shortcuts come from React Flow's defaults; if you change canvas key props, update `lib/map-shortcuts.ts` too.

---

## 🧩 Core concepts for contributors

### Learning map

A learning map contains a title, description, category, accent, a collection of bibbles, and connections between bibbles. A map's progress is calculated from the progress values of its bibbles.

### Bibble

A **bibble** is an individual learning idea or step in a map. It can include a title, description, status, progress percentage, position on the canvas, notes, and resources. The current statuses are:

- `not-started`
- `learning`
- `completed`

Progress is represented from 0 to 100. Marking a bibble completed sets its progress to 100 in the details UI.

### Connections

Edges connect one bibble to another to express relationships or learning order. The map editor uses XYFlow to render and interact with nodes and edges.

### Local data vs. a backend

Learning maps remain local to the browser under the `bibble-maps` local-storage key, and theme selection is also persisted locally. Local changes are tied to that browser/device and are not automatically synced to another browser or another user. Email/password authentication and user/session persistence are handled by the backend, but study rooms and sample maps are still illustrative content rather than live shared data.

The UI includes log-in and sign-up flows for authenticated accounts. Keep documentation precise about what works in the current code, especially the distinction between backend-backed accounts and locally stored learning maps.

---

## 🎨 Themes

Bibble currently defines three visual themes:

- 🍓 **Strawberry Red**
- 🍏 **Refreshing Green**
- 🌺 **Strawberry Lemonade Beach**

The theme picker also offers light and dark modes. Theme and mode preferences are stored in browser local storage, allowing the selection to persist for that browser.

When adding a theme, check its definition in `data/themes.ts`, the motif/type definitions, and theme handling in `hooks/use-theme.ts`. Keep the palette readable and accessible in both light and dark modes.

---

## 🔐 Authentication

Bibble supports email/password accounts through Supabase Auth. Supabase manages password hashing, email confirmation, and persistent cookie-based sessions. Authenticated custom learning maps are persisted in Supabase PostgreSQL; guests and existing local maps continue to use browser storage.

For local development:

```bash
copy .env.example .env
npm install
npm run dev
```

Create a Supabase project, then copy its URL and publishable key from **Project Settings → API** into `.env`:

```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

In the Supabase Dashboard:

1. Enable the **Email** provider under **Authentication → Providers**.
2. Set the site URL to `http://localhost:3000` under **Authentication → URL Configuration**.
3. Add `http://localhost:3000/auth/callback` to the allowed redirect URLs (and add the equivalent production callback URL before deploying).
4. Set the password policy to at least 12 characters with an uppercase letter, lowercase letter, number, and special character so it matches the client and server validation.

Apply the checked-in SQL migration in `supabase/migrations/20261026000000_learning_maps.sql` from the Supabase SQL Editor (or your normal Supabase migration workflow). It creates the map, bibble, and edge tables, enables Row Level Security, and configures the private `map-exports` Storage bucket. The application never uses a service-role key; all database and Storage access uses the authenticated publishable client and RLS.

New accounts receive a confirmation email when email confirmation is enabled. The callback exchanges the confirmation code for a secure Supabase session. Guest browsing, sample maps, previews, and browser-local map editing remain available without an account.

Never commit `.env`, database files, session secrets, or plaintext passwords. Sample maps and guest browsing remain available without an account. Existing localStorage maps are not automatically migrated or deleted; sign-in only enables persistence for maps created or saved through the authenticated flow.

## 🧑‍💻 Contributing

Contributions of all sizes are welcome: documentation fixes, usability improvements, accessibility, bug fixes, and focused features.

Before coding, read **[CONTRIBUTING.md](./CONTRIBUTING.md)**. It covers branch naming, pull-request conventions, and the project workflow.

A typical contribution workflow looks like this:

```bash
# Start from the latest main branch
git switch main
git pull origin main

# Create a focused branch
git switch -c docs/short-description

# Make and review your changes
git status
git diff

# Run checks before opening a pull request
npm run lint
npm run build
```

For a fork-based contribution, push your branch to your fork:

```bash
git push -u origin docs/short-description
```

Then open a pull request from your fork's branch into `anshika-guleria/bibble:main`. Use a focused title such as `docs(readme): document project structure` or `fix(maps): preserve edited progress`.

### Contribution guidelines

- Keep pull requests focused and small enough to review.
- Follow the existing TypeScript and component patterns.
- Preserve Bibble's warm visual style, responsive behavior, and keyboard accessibility.
- Do not commit credentials, local environment files, generated output, or unrelated changes.
- Add or update documentation when behavior changes.
- Test the affected page locally and include screenshots for UI changes when useful.
- Be clear in the pull request about checks run and any remaining limitations.

---

## 📋 Pull Request Template

When opening a pull request, use the following template to keep contributions clear and easy to review.

```markdown
## 📌 What does this PR do?

<!-- Briefly describe what you changed and why. -->


## 🔗 Related Issue

<!-- Link the issue this PR addresses. Example: Closes #38 -->

Closes #


## ✨ Changes Made

- 
- 
- 


## 📸 Screenshots

<!-- For UI changes, add before/after screenshots if applicable. -->

### Before

<!-- Add screenshot here -->


### After

<!-- Add screenshot here -->


## 🧪 Testing

- [ ] Tested the affected page/feature locally
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Checked responsive layout
- [ ] Checked that existing functionality still works


## ✅ Checklist

- [ ] My changes are focused and related to this PR
- [ ] I followed the existing project structure and coding style
- [ ] I did not commit credentials, environment files, or generated files
- [ ] I updated documentation if needed
- [ ] I tested my changes locally
- [ ] I have reviewed my own changes before submitting this PR


## 📝 Additional Notes

<!-- Mention anything the maintainer should know, including limitations or follow-up work. -->


Thank you for contributing to Bibble! 💗🍓
```

> **Tip:** Copy the template above when creating your pull request and replace the comments/placeholders with the details of your contribution.

---

## 🧪 Testing checklist

Before submitting a change, consider checking:

- [ ] Home page renders and navigation links work.
- [ ] Study-room search filters the available sample rooms.
- [ ] Map search and category filters work together.
- [ ] A new map can be created with a title, description, and category.
- [ ] The editor can add a bibble, move/select nodes, connect bibbles, and save changes.
- [ ] Bibble status, notes, description, and progress behave as expected.
- [ ] Saved maps persist after refresh in the same browser.
- [ ] Theme selection and light/dark mode work.
- [ ] Layout remains usable on a narrow screen.
- [ ] `npm run lint` and `npm run build` complete, or any failures are documented.

---

## 🛣️ Current limitations and future opportunities

Bibble is a prototype, so some UI ideas are still illustrative rather than server-backed. Potential areas for future work include:

- Cloud syncing and sharing of learning maps.
- Real multi-user study rooms and presence.
- More robust resource editing and management.
- Expanded automated tests and accessibility checks.
- Improved mobile and small-screen map editing.

These are possible directions, not claims that the features already exist.

---

## 💝 Helpful links

- [Repository](https://github.com/anshika-guleria/bibble)
- [Open issues](https://github.com/anshika-guleria/bibble/issues)
- [Contribution guide](./CONTRIBUTING.md)
- [Node.js](https://nodejs.org/)
- [Next.js documentation](https://nextjs.org/docs)
- [React documentation](https://react.dev/learn)
- [Pull Request Template](https://github.com/anshika-guleria/bibble/blob/main/.github/pull_request_template.md)
- [XYFlow documentation](https://xyflow.com/)

---

<div align="center">

### Thanks for stopping by. You're always welcome here 💗

*Made with care, curiosity, and probably a cup of tea.* 🍵

</div>
