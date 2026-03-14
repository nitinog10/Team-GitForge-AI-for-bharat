# DocuVerse MCP Server

This is the official Model Context Protocol (MCP) server for **DocuVerse AI**, the world's first generative media documentation engine.

This server allows anyone in the world to connect to DocuVerse via an MCP-compatible client (like **Claude Desktop**, **Cursor IDE**, or **Windsurf**). The AI inside your IDE can autonomously connect repositories, clone the codebase for you, analyze complex cyclic dependencies, and even generate narrated audio walkthroughs that you can listen to!

## Prerequisites

1.  **Node.js**: `v18` or higher
2.  **DocuVerse account and token**: You will need a JWT token to authenticate with the DocuVerse APIs. 
    * Log into [DocuVerse (logorhythms.in)](https://logorhythms.in)
    * Extract the `JWT Bearer Token` from your browser's local storage or network requests.

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Build the TypeScript server:
    ```bash
    npm run build
    ```

3.  Set up environment variables:
    ```bash
    cp .env.example .env
    ```
    Then, edit the `.env` file and set the `DOCUVERSE_JWT_TOKEN` variable with your token.

## The End User Journey

The MCP server handles the entire lifecycle of interacting with DocuVerse.

1. **Find Repositories:** Ask your IDE's AI "What GitHub repositories do I have?" -> Uses `search_github_repos`
2. **Connect a Repository:** Ask your AI "Connect username/repo to DocuVerse" -> Uses `connect_repository` & polls with `get_repository_status`
3. **Bring the Code Local:** In a blank codebase, ask your AI: "Get the repository URL and clone it here." -> Uses `get_repository_clone_url` to get the git url, and the AI runs `git clone` for you natively in the terminal.
4. **Analyze Code Impact:** Ask "Analyze the impact of modifying auth.py." -> Uses `analyze_file_impact` to query for cyclic dependencies or high-risk modules before you write code.
5. **Listen to Narration:** At any point, ask "Generate an audio walkthrough for auth.py". The IDE will trigger the Bedrock TTS generator via `generate_walkthrough` and hand you a playback URL in the chat to listen on logorhythims.in!

## IDE Integration Setup

### 1. Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "docuverse": {
      "command": "node",
      "args": ["/absolute/path/to/logorhythms/mcp-server/dist/index.js"],
      "env": {
        "DOCUVERSE_JWT_TOKEN": "your_jwt_token_here",
        "DOCUVERSE_API_URL": "https://xpbgkuukxp.ap-south-1.awsapprunner.com/api"
      }
    }
  }
}
```

Make sure to replace `/absolute/path/.../dist/index.js` with the actual absolute path to the `dist/index.js` file on your system, and `"your_jwt_token_here"` with your valid JWT token.

### 2. Cursor IDE

1. Go to Cursor Settings -> Features -> **MCP**. 
2. Click **+ Add New MCP Server**.
3. Choose **command** type. Name: `DocuVerse`
4. Set Command: `node /absolute/path/to/logorhythms/mcp-server/dist/index.js`
5. Note: Since Cursor doesn't support manual ENV injection yet via UI, make sure your `.env` file in the `mcp-server` directory has the `DOCUVERSE_JWT_TOKEN` loaded!

## 🛠️ Complete Available Tools

The MCP Server wraps the entirety of DocuVerse's backend API, surfacing all of these capabilities contextually:

### Authentication & Repositories
- `get_current_user`
- `search_github_repos`
- `connect_repository`
- `list_repositories`
- `get_repository_clone_url` (Useful for having the AI run `git clone`)
- `get_repository_status`
- `trigger_repository_index`
- `delete_repository`

### Code Investigation & AI Analysis
- `get_file_tree`
- `get_file_content`
- `get_file_ast` (Full tree-sitter node breakdowns)
- `analyze_file_impact`
- `analyze_codebase_impact`
- `get_full_dependency_graph`

### Media Generation
- `generate_walkthrough` (Returns a Playable Audio URL!)
- `get_walkthroughs_for_file`
- `delete_walkthrough`

### Full Documentation
- `generate_repository_documentation`
- `get_repository_documentation`
- `generate_file_documentation`
- `generate_diagram` (Mermaid flowcharts)

### Autonomous Action
- `sandbox_execute` (Sandbox code execution)
- `github_push_readme`
- `github_create_issue`
- `github_implement_fix` (Fully Autonomous Multi-File Refactor + PR)
