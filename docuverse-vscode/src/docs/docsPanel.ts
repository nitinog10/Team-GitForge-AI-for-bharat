/**
 * Documentation Panel — Webview
 * Generates and displays AI-generated documentation for repos/files
 */

import * as vscode from 'vscode';
import { DocuVerseClient } from '../api/client';

export class DocsPanel {
  public static currentPanel: DocsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private client: DocuVerseClient;
  private repoId: string;
  private repoFullName: string;

  private constructor(panel: vscode.WebviewPanel, client: DocuVerseClient, repoId: string, repoFullName: string) {
    this.panel = panel;
    this.client = client;
    this.repoId = repoId;
    this.repoFullName = repoFullName;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'pushReadme':
            await this.pushToReadme(message.content);
            break;
        }
      },
      null,
      this.disposables
    );
  }

  static async show(
    extensionUri: vscode.Uri,
    client: DocuVerseClient,
    repoId: string,
    repoFullName: string
  ): Promise<void> {
    const column = vscode.ViewColumn.Beside;

    if (DocsPanel.currentPanel) {
      DocsPanel.currentPanel.panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'docuverseDocs',
        'DocuVerse Docs',
        column,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      DocsPanel.currentPanel = new DocsPanel(panel, client, repoId, repoFullName);
    }

    const cp = DocsPanel.currentPanel;
    cp.panel.title = `Docs: ${repoFullName}`;
    cp.panel.webview.html = DocsPanel.getLoadingHtml();

    try {
      // Start generation
      await client.generateDocs(repoId);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      while (attempts < maxAttempts) {
        const result = await client.getDocs(repoId);
        if (result.status === 'ready' && result.data) {
          cp.panel.webview.html = DocsPanel.getDocsHtml(result.data, repoFullName);
          return;
        }
        if (result.status === 'error') {
          cp.panel.webview.html = DocsPanel.getErrorHtml('Documentation generation failed');
          return;
        }
        await new Promise(r => setTimeout(r, 5000));
        attempts++;
      }
      cp.panel.webview.html = DocsPanel.getErrorHtml('Documentation generation timed out');
    } catch (err: any) {
      cp.panel.webview.html = DocsPanel.getErrorHtml(err.message);
    }
  }

  private async pushToReadme(content: string): Promise<void> {
    const [owner, repo] = this.repoFullName.split('/');
    try {
      const result = await this.client.pushReadme(owner, repo, content);
      if (result.success) {
        vscode.window.showInformationMessage(`DocuVerse: README pushed! ${result.url}`);
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`DocuVerse: Failed to push README — ${err.message}`);
    }
  }

  private static getLoadingHtml(): string {
    return `<!DOCTYPE html><html><head><style>
      body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0;
        font-family:var(--vscode-font-family); color:var(--vscode-foreground); background:var(--vscode-editor-background); }
      .spinner { width:40px; height:40px; border:3px solid rgba(255,255,255,0.1); border-top-color:#ba68c8;
        border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 16px; }
      @keyframes spin { to { transform:rotate(360deg); } }
    </style></head><body>
      <div style="text-align:center"><div class="spinner"></div><p>Generating documentation...</p>
      <p style="opacity:0.5;font-size:12px">This may take 1–3 minutes for large repos</p></div>
    </body></html>`;
  }

  private static getErrorHtml(msg: string): string {
    return `<!DOCTYPE html><html><head><style>
      body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0;
        font-family:var(--vscode-font-family); color:var(--vscode-errorForeground); background:var(--vscode-editor-background); }
    </style></head><body><div style="text-align:center"><h2>⚠️ Error</h2><p>${msg}</p></div></body></html>`;
  }

  private static getDocsHtml(data: any, repoFullName: string): string {
    const fileDocsHtml = (data.files || []).map((f: any) => {
      const sectionsHtml = (f.sections || []).map((s: any) =>
        `<div class="doc-section"><h4>${s.title}</h4><p>${s.content}</p></div>`
      ).join('');
      return `<div class="file-doc">
        <h3>📄 ${f.path}</h3>
        <p class="file-summary">${f.summary}</p>
        ${sectionsHtml}
      </div>`;
    }).join('');

    return `<!DOCTYPE html><html><head>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:var(--vscode-font-family); color:var(--vscode-foreground);
    background:var(--vscode-editor-background); padding:20px; line-height:1.6; }
  h1 { font-size:20px; color:#ba68c8; margin-bottom:8px; }
  h2 { font-size:16px; margin-top:24px; margin-bottom:8px; color:#ce93d8; }
  h3 { font-size:14px; margin-top:16px; margin-bottom:6px; }
  h4 { font-size:13px; margin-bottom:4px; color:var(--vscode-foreground); opacity:0.8; }
  p { font-size:13px; margin-bottom:8px; }

  .overview, .architecture, .deps { padding:14px; border-radius:10px;
    background:var(--vscode-input-background); border:1px solid rgba(255,255,255,0.06); margin-bottom:16px; }
  .file-doc { padding:14px; border-radius:10px; background:var(--vscode-input-background);
    border:1px solid rgba(255,255,255,0.06); margin-bottom:12px; }
  .file-summary { opacity:0.7; font-style:italic; }
  .doc-section { margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); }

  .push-btn { background:#ba68c8; border:none; color:#fff; padding:10px 20px; border-radius:8px;
    cursor:pointer; font-size:13px; font-weight:600; margin-top:16px; }
  .push-btn:hover { opacity:0.85; }
  .folder-tree { font-family:var(--vscode-editor-font-family); font-size:12px; white-space:pre-wrap;
    padding:12px; border-radius:8px; background:rgba(0,0,0,0.2); }
</style>
</head><body>
  <h1>📝 Documentation: ${repoFullName}</h1>

  <h2>Overview</h2>
  <div class="overview"><p>${data.overview || 'N/A'}</p></div>

  <h2>Architecture</h2>
  <div class="architecture"><p>${data.architecture || 'N/A'}</p></div>

  ${data.folder_tree ? `<h2>Folder Structure</h2><div class="overview"><pre class="folder-tree">${data.folder_tree}</pre></div>` : ''}

  ${data.dependencies ? `<h2>Dependencies</h2><div class="deps"><p>${data.dependencies}</p></div>` : ''}

  <h2>File Documentation</h2>
  ${fileDocsHtml || '<p>No file docs available</p>'}

  <button class="push-btn" onclick="pushReadme()">🚀 Push to README</button>

  <script>
    const vscode = acquireVsCodeApi();
    function pushReadme() {
      const content = document.body.innerText;
      vscode.postMessage({ command: 'pushReadme', content: content });
    }
  </script>
</body></html>`;
  }

  dispose(): void {
    DocsPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
