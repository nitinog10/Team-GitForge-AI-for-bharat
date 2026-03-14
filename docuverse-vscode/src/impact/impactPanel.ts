/**
 * Impact Analysis Panel — Webview
 * Shows file change impact with risk scoring and dependency visualization
 */

import * as vscode from 'vscode';
import { DocuVerseClient } from '../api/client';
import { ImpactAnalysis } from '../api/types';

export class ImpactPanel {
  public static currentPanel: ImpactPanel | undefined;
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
    filePath: string
  ): Promise<void> {
    const column = vscode.ViewColumn.Beside;

    if (ImpactPanel.currentPanel) {
      ImpactPanel.currentPanel.panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'docuverseImpact',
        'Impact Analysis',
        column,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      ImpactPanel.currentPanel = new ImpactPanel(panel);
    }

    const cp = ImpactPanel.currentPanel;
    cp.panel.title = `Impact: ${filePath.split('/').pop()}`;
    cp.panel.webview.html = ImpactPanel.getLoadingHtml();

    try {
      const impact = await client.getImpact(repoId, filePath);
      cp.panel.webview.html = ImpactPanel.getImpactHtml(impact);
    } catch (err: any) {
      cp.panel.webview.html = ImpactPanel.getErrorHtml(err.message);
    }
  }

  private static getLoadingHtml(): string {
    return `<!DOCTYPE html><html><head><style>
      body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0;
        font-family:var(--vscode-font-family); color:var(--vscode-foreground); background:var(--vscode-editor-background); }
      .spinner { width:40px; height:40px; border:3px solid rgba(255,255,255,0.1); border-top-color:#4fc3f7;
        border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 16px; }
      @keyframes spin { to { transform:rotate(360deg); } }
    </style></head><body><div style="text-align:center"><div class="spinner"></div><p>Analyzing impact...</p></div></body></html>`;
  }

  private static getErrorHtml(msg: string): string {
    return `<!DOCTYPE html><html><head><style>
      body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0;
        font-family:var(--vscode-font-family); color:var(--vscode-errorForeground); background:var(--vscode-editor-background); }
    </style></head><body><div style="text-align:center"><h2>⚠️ Error</h2><p>${msg}</p></div></body></html>`;
  }

  private static getImpactHtml(impact: ImpactAnalysis): string {
    const riskColors: Record<string, string> = {
      low: '#4caf50', medium: '#ff9800', high: '#f44336',
    };
    const riskColor = riskColors[impact.risk_level] || '#ff9800';

    const affectedHtml = impact.affected_files
      .map(f => `<li class="affected-file">${f}</li>`)
      .join('');

    const stepsHtml = impact.recommended_refactor_steps
      .map((s, i) => `<li>${i + 1}. ${s}</li>`)
      .join('');

    return `<!DOCTYPE html><html><head>
<style>
  :root { --risk-color: ${riskColor}; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:var(--vscode-font-family); color:var(--vscode-foreground);
    background:var(--vscode-editor-background); padding:20px; }
  h1 { font-size:18px; margin-bottom:16px; }

  .risk-card { display:flex; align-items:center; gap:16px; padding:16px; border-radius:10px;
    background:var(--vscode-input-background); border:1px solid rgba(255,255,255,0.06); margin-bottom:20px; }
  .risk-score { font-size:42px; font-weight:700; color:var(--risk-color); line-height:1; }
  .risk-label { font-size:14px; color:var(--risk-color); font-weight:600; text-transform:uppercase; }
  .risk-detail { font-size:12px; opacity:0.6; margin-top:4px; }

  .section { margin-bottom:20px; }
  .section h2 { font-size:14px; margin-bottom:8px; color:var(--risk-color); }
  .section ul { list-style:none; padding:0; }
  .section li { padding:6px 10px; border-radius:6px; margin-bottom:4px; font-size:13px;
    background:var(--vscode-input-background); }
  .affected-file { cursor:pointer; }
  .affected-file:hover { background:rgba(255,255,255,0.08); }

  .mermaid-container { padding:16px; border-radius:10px; background:var(--vscode-input-background);
    border:1px solid rgba(255,255,255,0.06); overflow-x:auto; }
  .mermaid-code { font-family:var(--vscode-editor-font-family); font-size:12px; white-space:pre-wrap;
    color:var(--vscode-foreground); opacity:0.8; }

  .briefing { padding:14px; border-radius:10px; background:var(--vscode-input-background);
    border-left:3px solid var(--risk-color); font-size:13px; line-height:1.6; }
</style>
</head><body>
  <h1>📊 Impact Analysis: ${impact.target_file}</h1>

  <div class="risk-card">
    <div class="risk-score">${impact.risk_score}</div>
    <div>
      <div class="risk-label">${impact.risk_level} Risk</div>
      <div class="risk-detail">${impact.total_affected} file${impact.total_affected !== 1 ? 's' : ''} affected · ${impact.direct_dependents.length} direct dependent${impact.direct_dependents.length !== 1 ? 's' : ''}</div>
    </div>
  </div>

  <div class="section">
    <h2>🎯 Affected Files</h2>
    <ul>${affectedHtml || '<li>No affected files</li>'}</ul>
  </div>

  ${impact.circular_dependencies.length > 0 ? `
  <div class="section">
    <h2>⚠️ Circular Dependencies</h2>
    <ul>${impact.circular_dependencies.map(c => `<li>🔄 ${c.join(' → ')}</li>`).join('')}</ul>
  </div>` : ''}

  <div class="section">
    <h2>🛠️ Recommended Steps</h2>
    <ul>${stepsHtml}</ul>
  </div>

  ${impact.impact_mermaid ? `
  <div class="section">
    <h2>📈 Dependency Graph</h2>
    <div class="mermaid-container">
      <pre class="mermaid-code">${impact.impact_mermaid}</pre>
    </div>
  </div>` : ''}

  ${impact.brief_script ? `
  <div class="section">
    <h2>🎙️ Impact Briefing</h2>
    <div class="briefing">${impact.brief_script}</div>
  </div>` : ''}
</body></html>`;
  }

  dispose(): void {
    ImpactPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
