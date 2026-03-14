/**
 * Diagram Panel — Webview
 * Generates and displays Mermaid.js diagrams from code
 */

import * as vscode from 'vscode';
import { DocuVerseClient } from '../api/client';
import { Diagram, DiagramType } from '../api/types';

export class DiagramPanel {
  public static currentPanel: DiagramPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static async show(
    extensionUri: vscode.Uri,
    client: DocuVerseClient,
    repoId: string,
    filePath: string,
    diagramType: DiagramType
  ): Promise<void> {
    const column = vscode.ViewColumn.Beside;

    if (DiagramPanel.currentPanel) {
      DiagramPanel.currentPanel.panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'docuverseDiagram',
        'DocuVerse Diagram',
        column,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      DiagramPanel.currentPanel = new DiagramPanel(panel);
    }

    const cp = DiagramPanel.currentPanel;
    cp.panel.title = `Diagram: ${filePath.split('/').pop()}`;
    cp.panel.webview.html = DiagramPanel.getLoadingHtml();

    try {
      const diagram = await client.generateDiagram(repoId, diagramType, filePath);
      cp.panel.webview.html = DiagramPanel.getDiagramHtml(diagram);
    } catch (err: any) {
      cp.panel.webview.html = DiagramPanel.getErrorHtml(err.message);
    }
  }

  private static getLoadingHtml(): string {
    return `<!DOCTYPE html><html><head><style>
      body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0;
        font-family:var(--vscode-font-family); color:var(--vscode-foreground); background:var(--vscode-editor-background); }
      .spinner { width:40px; height:40px; border:3px solid rgba(255,255,255,0.1); border-top-color:#81c784;
        border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 16px; }
      @keyframes spin { to { transform:rotate(360deg); } }
    </style></head><body><div style="text-align:center"><div class="spinner"></div><p>Generating diagram...</p></div></body></html>`;
  }

  private static getErrorHtml(msg: string): string {
    return `<!DOCTYPE html><html><head><style>
      body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0;
        font-family:var(--vscode-font-family); color:var(--vscode-errorForeground); background:var(--vscode-editor-background); }
    </style></head><body><div style="text-align:center"><h2>⚠️ Error</h2><p>${msg}</p></div></body></html>`;
  }

  private static getDiagramHtml(diagram: Diagram): string {
    const escapedCode = diagram.mermaid_code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return `<!DOCTYPE html><html><head>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:var(--vscode-font-family); color:var(--vscode-foreground);
    background:var(--vscode-editor-background); padding:20px; }
  h1 { font-size:18px; margin-bottom:4px; color:#81c784; }
  .type-badge { display:inline-block; padding:2px 10px; border-radius:10px; font-size:11px;
    background:rgba(129,199,132,0.15); color:#81c784; font-weight:600; margin-bottom:16px; }
  .diagram-container { padding:20px; border-radius:10px; background:var(--vscode-input-background);
    border:1px solid rgba(255,255,255,0.06); text-align:center; margin-bottom:16px; overflow:auto; }
  .mermaid { font-size: 14px; }
  .code-section { margin-top:16px; }
  .code-section h2 { font-size:13px; margin-bottom:8px; opacity:0.7; }
  .code-block { font-family:var(--vscode-editor-font-family); font-size:12px; padding:12px;
    border-radius:8px; background:var(--vscode-input-background); white-space:pre-wrap;
    border:1px solid rgba(255,255,255,0.06); overflow-x:auto; }
  .copy-btn { background:rgba(255,255,255,0.1); border:none; color:var(--vscode-foreground);
    padding:6px 14px; border-radius:6px; cursor:pointer; font-size:12px; margin-top:8px; }
  .copy-btn:hover { background:rgba(255,255,255,0.2); }
</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
</head><body>
  <h1>📊 ${diagram.title}</h1>
  <span class="type-badge">${diagram.type}</span>

  <div class="diagram-container">
    <pre class="mermaid">${escapedCode}</pre>
  </div>

  <div class="code-section">
    <h2>Mermaid Source Code</h2>
    <pre class="code-block" id="mermaidCode">${escapedCode}</pre>
    <button class="copy-btn" onclick="copyCode()">📋 Copy Code</button>
  </div>

  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
    });

    function copyCode() {
      const code = document.getElementById('mermaidCode').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = '📋 Copy Code', 2000);
      });
    }
  </script>
</body></html>`;
  }

  dispose(): void {
    DiagramPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
