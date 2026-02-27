# CLAUDE.md — GitHub Repo Explainer

This file provides guidance for AI assistants (Claude and others) working in this repository.

---

## Project Overview

**GitHub Repo Explainer** is a Chrome browser extension that uses Google's Gemini AI to generate instant summaries of GitHub repositories. When a user visits any GitHub repository page, the extension extracts the README and injects an AI-generated summary directly into the page.

- **Type:** Chrome Extension (Manifest V3)
- **Language:** Vanilla JavaScript (no build tools, no TypeScript, no frameworks)
- **External dependencies:** None (no `package.json`, no `node_modules`)
- **License:** MIT

---

## Repository Structure

```
github-repo-explainer/
├── manifest.json        # Chrome Extension configuration (entry point)
├── background.js        # Service worker — handles Gemini API calls
├── content.js           # Content script — runs on GitHub pages
├── popup.html           # Extension popup UI (toolbar icon click)
├── popup.js             # Popup logic — API key storage/retrieval
├── options.html         # Full settings page (opened from popup or extension menu)
├── styles.css           # Injected CSS for the in-page summary box
├── images/              # Extension icons (16, 32, 48, 128px) + logo.png
├── plans/               # Development planning documents (not shipped)
├── README.md            # User-facing documentation
├── LICENSE              # MIT License
└── CLAUDE.md            # This file
```

---

## Architecture

### Data Flow

```
User visits GitHub repo
        ↓
content.js detects repo root page
        ↓
Extract README (DOM selectors → fallback to GitHub REST API)
        ↓
chrome.runtime.sendMessage() → background.js
        ↓
background.js reads API key from chrome.storage.sync
        ↓
POST to Google Gemini API with README text
        ↓
Response sent back to content.js
        ↓
Summary injected into GitHub page DOM
```

### Component Responsibilities

| File | Role |
|------|------|
| `manifest.json` | Declares permissions, entry points, icons, host rules |
| `background.js` | Service worker; owns all external HTTP calls to Gemini |
| `content.js` | DOM reading, GitHub SPA navigation detection, UI injection |
| `popup.js` | API key management UI; reused by both `popup.html` and `options.html` |
| `styles.css` | Injected stylesheet; respects GitHub light/dark theme via CSS variables |

### External APIs

| API | Purpose | Auth |
|-----|---------|------|
| Google Gemini (`generativelanguage.googleapis.com`) | README summarization | User-provided API key stored in `chrome.storage.sync` |
| GitHub REST API (`api.github.com`) | README fallback fetch | None (public repos) |
| Chrome Extensions API | Storage, messaging, scripting | Native (no key needed) |

---

## Key Conventions

### No Build Step
There is no build system. Files are loaded directly by Chrome as an unpacked extension. Do **not** introduce bundlers (Webpack, Vite, etc.), transpilers (Babel, TypeScript), or a `package.json` unless explicitly requested — this is a deliberate design constraint for simplicity.

### No Automated Tests
There is no test framework configured. Unit testing a Chrome extension requires mocking the `chrome.*` APIs; this has not been set up. Do not add a test framework unless asked.

### API Key Handling
- API keys are **never** hard-coded or stored in source files.
- Keys are stored via `chrome.storage.sync` under the key `geminiApiKey`.
- This syncs across the user's Chrome devices automatically.
- Do not introduce `.env` files — configuration is handled entirely through the Chrome Storage API.

### CSS / Theming
- The injected summary box uses CSS variables that map to GitHub's design tokens.
- Light and dark mode are handled with `@media (prefers-color-scheme: dark)` in `styles.css`.
- Keep styles consistent with GitHub's UI (`#f6f8fa` / `#0d1117` backgrounds, matching border radius and font sizes).

### Chrome Extension Manifest V3
- The extension uses Manifest V3 (current standard).
- Background logic runs in a **service worker** (`background.js`), not a persistent background page.
- Service workers are stateless — do not store state in module-level variables expecting persistence between calls.
- Content scripts (`content.js`) cannot make cross-origin requests directly; route all external API calls through the service worker via `chrome.runtime.sendMessage`.

### GitHub SPA Navigation
- GitHub is a Single Page App (SPA) — standard `load` events do not fire on navigation.
- `content.js` uses a `MutationObserver` to detect GitHub's client-side route changes and re-initializes the summary on each repo page visit.
- Do not replace this observer pattern with simple `DOMContentLoaded` or `load` listeners.

### README Detection
- `content.js` tries multiple DOM selectors to find the README (GitHub changes its DOM structure periodically).
- If DOM parsing fails, it falls back to the GitHub REST API (`/repos/{owner}/{repo}/readme`).
- When adding new selectors, append to the existing list rather than replacing it.

---

## Development Workflow

### Loading the Extension Locally

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the repository root directory
4. The extension icon will appear in the toolbar

### Making Changes

Since there is no build step, changes to any `.js`, `.html`, `.css`, or `manifest.json` file take effect after reloading the extension:

- Go to `chrome://extensions/`
- Click the **refresh icon** on the GitHub Repo Explainer card
- Reload the GitHub tab you're testing on

### Debugging

| Component | How to debug |
|-----------|-------------|
| `content.js` | Open DevTools on the GitHub tab → Console tab |
| `background.js` | Go to `chrome://extensions/` → Click **"Service Worker"** link → DevTools opens for the worker |
| `popup.js` | Right-click the extension icon → **Inspect popup** |
| `options.html` | Open from popup or `chrome://extensions/` → right-click → Inspect |

### Testing a Change Manually

1. Load/reload the unpacked extension
2. Navigate to any public GitHub repository (e.g., `https://github.com/torvalds/linux`)
3. Verify the summary box appears below the repository description
4. Check both light and dark GitHub themes

---

## Git Workflow

- **Main branch:** `master`
- **Feature branches:** Use `claude/<description>-<id>` pattern for AI-assisted work
- **Commit style:** Imperative, descriptive messages (e.g., `"Add dark mode support to summary box"`)
- The repository uses SSH key-based commit signing (`commit.gpgsign=true`)

---

## Permissions Declared in `manifest.json`

| Permission | Reason |
|-----------|--------|
| `activeTab` | Access current tab URL and DOM |
| `scripting` | Inject content scripts programmatically |
| `storage` | Persist API key via `chrome.storage.sync` |
| `https://github.com/*` | Content script host permission |
| `https://api.github.com/*` | README fallback fetching |
| `https://generativelanguage.googleapis.com/*` | Gemini API calls from service worker |

---

## Common Tasks for AI Assistants

### Adding a new UI element to the summary box
- Edit `content.js` (the `injectUI()` function) for the HTML structure
- Edit `styles.css` for styling — maintain light/dark mode compatibility

### Changing the AI model or prompt
- Edit `background.js` — the `summarizeRepo()` function contains the Gemini API call and prompt string
- The current model is `gemini-3-flash-preview` — update the endpoint URL if switching models

### Adding a new setting/option
- Add the input to both `popup.html` and `options.html`
- Add storage read/write logic to `popup.js` using `chrome.storage.sync`
- Read the setting in whichever component needs it (`background.js` or `content.js`)

### Updating README selectors for GitHub DOM changes
- Edit the `findReadmeInDOM()` function in `content.js`
- Add new selectors to the existing array rather than replacing old ones (GitHub A/B tests UI)

### Changing extension icons
- Replace files in the `images/` directory
- Icons must be PNG format at the exact pixel sizes: 16, 32, 48, 128
- `manifest.json` references them at `images/icon{size}.png`
