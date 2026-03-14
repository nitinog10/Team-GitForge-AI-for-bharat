# DocuVerse VS Code Extension

> AI-powered code walkthroughs, impact analysis, diagrams, and documentation — right inside VS Code.

## Getting Started

1. **Install dependencies**: `npm install`
2. **Compile**: `npm run compile`
3. **Run**: Press `F5` in VS Code to launch the Extension Development Host
4. **Package**: `npm run package` then `npx vsce package`

## Features

- 🎙️ **Auto-Cast Walkthroughs** — AI narrates your code with synced line highlighting
- 📊 **Impact Analysis** — See risk scores and dependency graphs before changing code
- 📈 **AI Diagrams** — Generate flowcharts, class/sequence/ER diagrams from code
- 📝 **Documentation** — Generate repo-level docs and push to README
- 🧪 **Sandbox** — Execute code snippets via the backend

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `docuverse.apiUrl` | Production AWS URL | Backend API base URL |
| `docuverse.defaultViewMode` | `developer` | Walkthrough view mode |
| `docuverse.autoConnect` | `true` | Auto-connect workspace repo |
