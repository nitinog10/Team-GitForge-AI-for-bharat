/**
 * Hub View — Webview Provider
 * Main panel shown when user IS logged in.
 * Shows: user header → repo selector → file tree → quick actions
 */

import * as vscode from 'vscode';
import { DocuVerseClient } from '../api/client';
import { AuthManager } from '../auth/authManager';
import { Repository, FileNode } from '../api/types';

export class HubViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'docuverse-hub';

  private webviewView?: vscode.WebviewView;
  private client: DocuVerseClient;
  private repos: Repository[] = [];
  private selectedRepoId: string | null = null;
  private fileTree: FileNode[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    client: DocuVerseClient
  ) {
    this.client = client;
  }

  getSelectedRepoId(): string | null {
    return this.selectedRepoId;
  }

  getSelectedRepoFullName(): string | null {
    const repo = this.repos.find(r => r.id === this.selectedRepoId);
    return repo ? repo.full_name : null;
  }

  refresh(): void {
    if (this.webviewView) {
      this.loadAndRender();
    }
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'selectRepo':
          this.selectedRepoId = message.repoId;
          await this.loadFileTree();
          this.renderHub();
          break;
        case 'connectRepo':
          vscode.commands.executeCommand('docuverse.connectRepo');
          break;
        case 'fileAction':
          this.handleFileAction(message.action, message.filePath);
          break;
        case 'viewFile':
          if (this.selectedRepoId && message.filePath) {
            vscode.commands.executeCommand('docuverse.viewFile', {
              repoId: this.selectedRepoId,
              filePath: message.filePath,
            });
          }
          break;
        case 'explain':
          vscode.commands.executeCommand('docuverse.explainFile');
          break;
        case 'impact':
          vscode.commands.executeCommand('docuverse.showImpact');
          break;
        case 'diagram':
          vscode.commands.executeCommand('docuverse.generateDiagram');
          break;
        case 'docs':
          vscode.commands.executeCommand('docuverse.generateDocs');
          break;
        case 'sandbox':
          vscode.commands.executeCommand('docuverse.runSandbox');
          break;
        case 'logout':
          vscode.commands.executeCommand('docuverse.logout');
          break;
        case 'refresh':
          this.loadAndRender();
          break;
      }
    });

    this.loadAndRender();
  }

  private handleFileAction(action: string, filePath: string): void {
    if (!this.selectedRepoId || !filePath) { return; }
    switch (action) {
      case 'explain':
        vscode.commands.executeCommand('docuverse.explainFile', { repoId: this.selectedRepoId, filePath });
        break;
      case 'impact':
        vscode.commands.executeCommand('docuverse.showImpact', { repoId: this.selectedRepoId, filePath });
        break;
      case 'diagram':
        vscode.commands.executeCommand('docuverse.generateDiagram', { repoId: this.selectedRepoId, filePath });
        break;
    }
  }

  private async loadAndRender(): Promise<void> {
    if (!this.webviewView) { return; }
    this.webviewView.webview.html = this.getLoadingHtml();

    try {
      this.repos = await this.client.listRepos();
      if (this.repos.length > 0 && !this.selectedRepoId) {
        this.selectedRepoId = this.repos[0].id;
      }
      if (this.selectedRepoId) {
        await this.loadFileTree();
      }
    } catch {
      this.repos = [];
      this.fileTree = [];
    }

    this.renderHub();
  }

  private async loadFileTree(): Promise<void> {
    if (!this.selectedRepoId) { return; }
    try {
      this.fileTree = await this.client.getFileTree(this.selectedRepoId);
    } catch {
      this.fileTree = [];
    }
  }

  private renderHub(): void {
    if (!this.webviewView) { return; }
    this.webviewView.webview.html = this.getHubHtml();
  }

  private getLoadingHtml(): string {
    return `<!DOCTYPE html><html><head><style>
      body { font-family: var(--vscode-font-family); color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background); padding: 20px; text-align: center; }
      .spin { width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1);
        border-top-color: #ffd54f; border-radius: 50%; animation: s 0.8s linear infinite; margin: 40px auto 12px; }
      @keyframes s { to { transform: rotate(360deg); } }
    </style></head><body><div class="spin"></div><p style="font-size:12px;opacity:0.5">Loading...</p></body></html>`;
  }

  private renderFileTreeHtml(nodes: FileNode[], depth: number = 0): string {
    let html = '';
    // Sort: directories first, then files alphabetically
    const sorted = [...nodes].sort((a, b) => {
      if (a.is_directory && !b.is_directory) { return -1; }
      if (!a.is_directory && b.is_directory) { return 1; }
      return a.name.localeCompare(b.name);
    });

    for (const node of sorted) {
      const indent = depth * 16;
      if (node.is_directory) {
        const children = node.children || [];
        const childCount = children.length;
        html += `<div class="tree-dir" style="padding-left:${indent}px">
          <span class="tree-toggle" onclick="toggleDir(this)">▶</span>
          <span class="dir-icon">📁</span>
          <span class="dir-name">${node.name}</span>
          <span class="tree-count">${childCount}</span>
        </div>
        <div class="tree-children" style="display:none">
          ${this.renderFileTreeHtml(children, depth + 1)}
        </div>`;
      } else {
        const ext = node.name.split('.').pop()?.toLowerCase() || '';
        let icon = '📄';
        if (['py'].includes(ext)) { icon = '🐍'; }
        else if (['ts', 'tsx'].includes(ext)) { icon = '🔷'; }
        else if (['js', 'jsx'].includes(ext)) { icon = '🟨'; }
        else if (['json'].includes(ext)) { icon = '📋'; }
        else if (['md'].includes(ext)) { icon = '📝'; }
        else if (['css', 'scss'].includes(ext)) { icon = '🎨'; }
        else if (['html'].includes(ext)) { icon = '🌐'; }
        else if (['yaml', 'yml', 'toml'].includes(ext)) { icon = '⚙️'; }
        else if (['java'].includes(ext)) { icon = '☕'; }
        else if (['go'].includes(ext)) { icon = '🔵'; }
        else if (['rs'].includes(ext)) { icon = '🦀'; }
        else if (['cpp', 'c', 'h'].includes(ext)) { icon = '⚡'; }
        else if (['sh', 'bash'].includes(ext)) { icon = '🖥️'; }
        else if (['Dockerfile'].includes(node.name) || ext === 'dockerfile') { icon = '🐳'; }

        const filePath = node.path || node.name;
        html += `<div class="tree-file" style="padding-left:${indent + 16}px" data-path="${filePath}" onclick="viewFile('${filePath}')">
          <span class="file-icon">${icon}</span>
          <span class="file-name">${node.name}</span>
          <div class="file-actions">
            <button class="fa-btn" onclick="event.stopPropagation();fileAction('explain','${filePath}')" title="Explain">🎙️</button>
            <button class="fa-btn" onclick="event.stopPropagation();fileAction('impact','${filePath}')" title="Impact">⚡</button>
            <button class="fa-btn" onclick="event.stopPropagation();fileAction('diagram','${filePath}')" title="Diagram">📊</button>
          </div>
        </div>`;
      }
    }
    return html;
  }

  private getHubHtml(): string {
    const auth = AuthManager.getInstance();
    const hasRepo = this.repos.length > 0 && this.selectedRepoId;

    const repoOptions = this.repos
      .map(r => `<option value="${r.id}" ${r.id === this.selectedRepoId ? 'selected' : ''}>${r.name}</option>`)
      .join('');

    const fileTreeHtml = hasRepo ? this.renderFileTreeHtml(this.fileTree) : '';

    return `<!DOCTYPE html>
<html><head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 0;
    font-size: 12px;
  }

  /* Header */
  .header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .user { display: flex; align-items: center; gap: 6px; }
  .user-name { font-size: 11px; font-weight: 600; }
  .header-actions { display: flex; gap: 4px; }
  .icon-btn { background: none; border: none; color: var(--vscode-foreground);
    opacity: 0.5; cursor: pointer; font-size: 12px; padding: 3px; }
  .icon-btn:hover { opacity: 1; }

  /* Repo Selector */
  .repo-bar {
    padding: 8px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; gap: 6px; align-items: center;
  }
  .repo-select {
    flex: 1; padding: 5px 8px; border-radius: 4px; font-size: 11px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.1));
    font-family: inherit;
  }
  .add-btn {
    background: none; border: 1px solid rgba(255,255,255,0.12); color: var(--vscode-foreground);
    padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; opacity: 0.6;
  }
  .add-btn:hover { opacity: 1; border-color: rgba(255,255,255,0.25); }

  /* Section headers */
  .section-header {
    padding: 6px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;
    opacity: 0.4; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.04);
    background: rgba(255,255,255,0.02); display: flex; justify-content: space-between;
  }

  /* File Tree */
  .file-tree {
    max-height: 45vh; overflow-y: auto; overflow-x: hidden;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .tree-dir {
    display: flex; align-items: center; gap: 4px; padding: 3px 8px;
    cursor: pointer; user-select: none;
  }
  .tree-dir:hover { background: rgba(255,255,255,0.04); }
  .tree-toggle { font-size: 8px; min-width: 12px; opacity: 0.5; transition: transform 0.15s; }
  .tree-toggle.open { transform: rotate(90deg); }
  .dir-icon { font-size: 13px; }
  .dir-name { font-size: 12px; opacity: 0.8; }
  .tree-count { font-size: 9px; opacity: 0.3; margin-left: auto; }

  .tree-file {
    display: flex; align-items: center; gap: 4px; padding: 3px 8px;
    cursor: pointer; position: relative;
  }
  .tree-file:hover { background: rgba(255,255,255,0.04); }
  .file-icon { font-size: 12px; }
  .file-name { font-size: 12px; opacity: 0.7; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-actions {
    display: none; gap: 2px; margin-left: auto; flex-shrink: 0;
  }
  .tree-file:hover .file-actions { display: flex; }
  .fa-btn {
    background: none; border: none; cursor: pointer; font-size: 11px; padding: 2px;
    opacity: 0.5; border-radius: 3px;
  }
  .fa-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }

  /* Quick Actions */
  .quick-actions { padding: 8px 14px; }
  .qa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .qa-btn {
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 10px 6px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);
    background: var(--vscode-input-background); color: var(--vscode-foreground);
    cursor: pointer; font-family: inherit; text-align: center; transition: all 0.15s;
  }
  .qa-btn:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.04); }
  .qa-btn:active { transform: scale(0.97); }
  .qa-icon { font-size: 18px; }
  .qa-label { font-size: 10px; font-weight: 600; line-height: 1.3; }
  .qa-btn.primary { border-color: rgba(255, 213, 79, 0.2); background: rgba(255, 213, 79, 0.06); }
  .qa-btn.primary:hover { border-color: rgba(255, 213, 79, 0.35); background: rgba(255, 213, 79, 0.12); }

  /* Empty state */
  .empty { text-align: center; padding: 30px 14px; opacity: 0.5; }
  .empty-icon { font-size: 28px; margin-bottom: 8px; }
  .empty p { font-size: 12px; line-height: 1.5; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
</style>
</head><body>

  <!-- Header -->
  <div class="header">
    <div class="user">
      <span style="font-size:12px">👤</span>
      <span class="user-name">${auth.username || 'Connected'}</span>
    </div>
    <div class="header-actions">
      <button class="icon-btn" onclick="send('refresh')" title="Refresh">🔄</button>
      <button class="icon-btn" onclick="send('logout')" title="Sign Out">🚪</button>
    </div>
  </div>

  <!-- Repo Selector -->
  <div class="repo-bar">
    ${this.repos.length > 0
      ? `<select class="repo-select" onchange="send('selectRepo', this.value)">${repoOptions}</select>`
      : '<span style="opacity:0.5;font-size:11px">No repos</span>'}
    <button class="add-btn" onclick="send('connectRepo')">+ Add</button>
  </div>

  ${hasRepo ? `
  <!-- File Explorer -->
  <div class="section-header">
    <span>Files</span>
    <span>${this.countFiles(this.fileTree)} files</span>
  </div>
  <div class="file-tree">
    ${fileTreeHtml || '<div class="empty"><p>No files indexed yet</p></div>'}
  </div>

  <!-- Quick Actions -->
  <div class="section-header"><span>Quick Actions</span></div>
  <div class="quick-actions">
    <div class="qa-grid">
      <button class="qa-btn primary" onclick="send('explain')">
        <span class="qa-icon">🎙️</span>
        <span class="qa-label">Explain File</span>
      </button>
      <button class="qa-btn" onclick="send('impact')">
        <span class="qa-icon">⚡</span>
        <span class="qa-label">Impact Analysis</span>
      </button>
      <button class="qa-btn" onclick="send('diagram')">
        <span class="qa-icon">📊</span>
        <span class="qa-label">Diagram</span>
      </button>
      <button class="qa-btn" onclick="send('docs')">
        <span class="qa-icon">📝</span>
        <span class="qa-label">Generate Docs</span>
      </button>
      <button class="qa-btn" onclick="send('sandbox')">
        <span class="qa-icon">🧪</span>
        <span class="qa-label">Sandbox</span>
      </button>
    </div>
  </div>
  ` : `
  <div class="empty">
    <div class="empty-icon">📂</div>
    <p>Connect a GitHub repository to get started!</p>
  </div>
  `}

  <script>
    const vscode = acquireVsCodeApi();
    function send(cmd, value) {
      vscode.postMessage({ command: cmd, repoId: value });
    }
    function fileAction(action, path) {
      vscode.postMessage({ command: 'fileAction', action, filePath: path });
    }
    function viewFile(path) {
      vscode.postMessage({ command: 'viewFile', filePath: path });
    }
    function toggleDir(el) {
      el.classList.toggle('open');
      const children = el.parentElement.nextElementSibling;
      if (children) {
        children.style.display = children.style.display === 'none' ? 'block' : 'none';
      }
    }
  </script>
</body></html>`;
  }

  private countFiles(nodes: FileNode[]): number {
    let count = 0;
    for (const n of nodes) {
      if (n.is_directory) {
        count += this.countFiles(n.children || []);
      } else {
        count++;
      }
    }
    return count;
  }
}
