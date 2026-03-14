/**
 * Walkthrough Panel — Webview
 * Shows AI-generated code walkthrough with code + narration side by side.
 * Highlights active lines as the walkthrough progresses.
 */

import * as vscode from 'vscode';
import { DocuVerseClient } from '../api/client';
import { WalkthroughScript, ScriptSegment } from '../api/types';

export class WalkthroughPanel {
  public static currentPanel: WalkthroughPanel | undefined;
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
    viewMode: 'developer' | 'manager' = 'developer',
    existingWalkthrough?: WalkthroughScript
  ): Promise<void> {
    const column = vscode.ViewColumn.One;

    if (WalkthroughPanel.currentPanel) {
      WalkthroughPanel.currentPanel.panel.reveal(column);
    } else {
      const panel = vscode.window.createWebviewPanel(
        'docuverseWalkthrough',
        'Code Walkthrough',
        column,
        { enableScripts: true, retainContextWhenHidden: true }
      );
      WalkthroughPanel.currentPanel = new WalkthroughPanel(panel);
    }

    const cp = WalkthroughPanel.currentPanel;
    cp.panel.title = `Walkthrough: ${filePath.split('/').pop()}`;
    cp.panel.webview.html = WalkthroughPanel.getLoadingHtml(filePath);

    try {
      // Get file content for code display
      let codeContent = '';
      try {
        codeContent = await client.getFileContent(repoId, filePath);
      } catch {
        codeContent = '// Unable to load file content';
      }

      // Get or generate walkthrough
      let walkthrough: WalkthroughScript;
      if (existingWalkthrough) {
        walkthrough = existingWalkthrough;
      } else {
        walkthrough = await client.generateWalkthrough(repoId, filePath, viewMode);
      }

      cp.panel.webview.html = WalkthroughPanel.getWalkthroughHtml(walkthrough, codeContent, filePath);

      // Handle messages from webview (TTS playback)
      cp.panel.webview.onDidReceiveMessage(
        (message) => {
          if (message.command === 'highlightLine') {
            WalkthroughPanel.highlightEditorLine(message.startLine, message.endLine);
          }
        },
        null,
        cp.disposables
      );
    } catch (err: any) {
      cp.panel.webview.html = WalkthroughPanel.getErrorHtml(err.message);
    }
  }

  private static highlightEditorLine(startLine: number, endLine: number): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: 'rgba(255, 213, 79, 0.15)',
      borderColor: 'rgba(255, 213, 79, 0.4)',
      borderWidth: '0 0 0 3px',
      borderStyle: 'solid',
      isWholeLine: true,
    });

    const range = new vscode.Range(
      new vscode.Position(Math.max(0, startLine - 1), 0),
      new vscode.Position(Math.max(0, endLine - 1), Number.MAX_VALUE)
    );

    editor.setDecorations(decorationType, [{ range }]);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

    // Clear highlight after 8 seconds
    setTimeout(() => decorationType.dispose(), 8000);
  }

  private static getLoadingHtml(filePath: string): string {
    return `<!DOCTYPE html><html><head><style>
      body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0;
        font-family:var(--vscode-font-family); color:var(--vscode-foreground); background:var(--vscode-editor-background); }
      .spinner { width:40px; height:40px; border:3px solid rgba(255,255,255,0.1); border-top-color:#ffd54f;
        border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 16px; }
      @keyframes spin { to { transform:rotate(360deg); } }
      .subtitle { font-size:12px; opacity:0.4; margin-top:8px; }
    </style></head><body><div style="text-align:center">
      <div class="spinner"></div>
      <p>🎙️ Generating walkthrough...</p>
      <p class="subtitle">${filePath}</p>
    </div></body></html>`;
  }

  private static getErrorHtml(msg: string): string {
    return `<!DOCTYPE html><html><head><style>
      body { display:flex; align-items:center; justify-content:center; height:100vh; margin:0;
        font-family:var(--vscode-font-family); color:var(--vscode-errorForeground); background:var(--vscode-editor-background); }
    </style></head><body><div style="text-align:center"><h2>⚠️ Error</h2><p>${msg}</p></div></body></html>`;
  }

  private static escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private static getWalkthroughHtml(walkthrough: WalkthroughScript, code: string, filePath: string): string {
    const segments = walkthrough.segments || [];
    const codeLines = (typeof code === 'string' ? code : '').split('\n');
    const ext = filePath.split('.').pop() || '';

    // Build code HTML with line numbers
    const codeHtml = codeLines.map((line, i) => {
      const lineNum = i + 1;
      const escapedLine = WalkthroughPanel.escapeHtml(line) || ' ';
      return `<div class="code-line" id="line-${lineNum}" data-line="${lineNum}">
        <span class="line-num">${lineNum}</span>
        <span class="line-content">${escapedLine}</span>
      </div>`;
    }).join('');

    // Build segments HTML
    const segmentsHtml = segments.map((seg: ScriptSegment, i: number) => {
      const lineRange = seg.start_line && seg.end_line
        ? `Lines ${seg.start_line}–${seg.end_line}`
        : '';

      return `<div class="segment" data-index="${i}" data-start="${seg.start_line || 0}" data-end="${seg.end_line || 0}"
          onclick="activateSegment(${i})">
        <div class="seg-header">
          <span class="seg-num">${i + 1}</span>
          <span class="seg-lines">${lineRange}</span>
        </div>
        <div class="seg-title">${seg.code_context || `Step ${i + 1}`}</div>
        <div class="seg-narration">${seg.text || ''}</div>
      </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html><head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Top Bar */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.02); flex-shrink: 0;
  }
  .topbar-left { display: flex; align-items: center; gap: 10px; }
  .topbar-title { font-size: 13px; font-weight: 600; }
  .topbar-file { font-size: 11px; opacity: 0.4; }
  .topbar-controls { display: flex; align-items: center; gap: 8px; }
  .ctrl-btn {
    background: rgba(255,255,255,0.08); border: none; color: var(--vscode-foreground);
    padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-family: inherit;
  }
  .ctrl-btn:hover { background: rgba(255,255,255,0.14); }
  .ctrl-btn.playing { background: rgba(255, 213, 79, 0.2); color: #ffd54f; }

  /* Main content — split layout */
  .main {
    flex: 1; display: flex; overflow: hidden;
  }

  /* Left panel — Code */
  .code-panel {
    flex: 1; overflow-y: auto; overflow-x: auto;
    background: var(--vscode-editor-background);
    border-right: 1px solid rgba(255,255,255,0.06);
    min-width: 0;
  }
  .code-line {
    display: flex; font-family: var(--vscode-editor-font-family);
    font-size: var(--vscode-editor-font-size, 13px);
    line-height: 20px; transition: background 0.2s;
  }
  .code-line.active {
    background: rgba(255, 213, 79, 0.1);
    border-left: 3px solid #ffd54f;
  }
  .code-line:not(.active) { border-left: 3px solid transparent; }
  .line-num {
    min-width: 48px; text-align: right; padding: 0 12px 0 0;
    color: rgba(255,255,255,0.2); user-select: none; flex-shrink: 0;
  }
  .code-line.active .line-num { color: #ffd54f; opacity: 0.7; }
  .line-content { white-space: pre; padding-right: 16px; }

  /* Right panel — Narration */
  .narration-panel {
    width: 340px; flex-shrink: 0; overflow-y: auto;
    background: rgba(255,255,255,0.02);
    border-left: 1px solid rgba(255,255,255,0.06);
    display: flex; flex-direction: column;
  }
  .narration-header {
    padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; opacity: 0.4;
  }
  .segments-list { flex: 1; overflow-y: auto; padding: 8px; }

  .segment {
    padding: 12px; border-radius: 8px; margin-bottom: 6px;
    border: 1px solid rgba(255,255,255,0.04); cursor: pointer;
    transition: all 0.15s;
  }
  .segment:hover { border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); }
  .segment.active {
    border-color: rgba(255, 213, 79, 0.3);
    background: rgba(255, 213, 79, 0.08);
  }
  .seg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .seg-num {
    width: 20px; height: 20px; border-radius: 50%;
    background: rgba(255,255,255,0.08); display: flex;
    align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; flex-shrink: 0;
  }
  .segment.active .seg-num { background: rgba(255, 213, 79, 0.25); color: #ffd54f; }
  .seg-lines { font-size: 10px; opacity: 0.4; }
  .seg-title { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
  .seg-narration { font-size: 11px; opacity: 0.6; line-height: 1.6; }
  .segment.active .seg-narration { opacity: 0.85; }

  /* Progress bar */
  .progress-bar {
    height: 3px; background: rgba(255,255,255,0.06); flex-shrink: 0;
  }
  .progress-fill {
    height: 100%; background: #ffd54f; width: 0%; transition: width 0.3s;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
</style>
</head><body>

  <!-- Top Bar -->
  <div class="topbar">
    <div class="topbar-left">
      <span style="font-size:16px">🎙️</span>
      <div>
        <div class="topbar-title">${walkthrough.title || 'Code Walkthrough'}</div>
        <div class="topbar-file">${filePath} · ${segments.length} segments</div>
      </div>
    </div>
    <div class="topbar-controls">
      <button class="ctrl-btn" id="playBtn" onclick="togglePlay()">▶ Play</button>
      <button class="ctrl-btn" onclick="prevSegment()">◀</button>
      <button class="ctrl-btn" onclick="nextSegment()">▶</button>
    </div>
  </div>

  <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>

  <!-- Main Content -->
  <div class="main">
    <!-- Code Panel -->
    <div class="code-panel" id="codePanel">
      ${codeHtml}
    </div>

    <!-- Narration Panel -->
    <div class="narration-panel">
      <div class="narration-header">Walkthrough Steps</div>
      <div class="segments-list" id="segmentsList">
        ${segmentsHtml || '<div style="padding:20px;text-align:center;opacity:0.4">No segments available</div>'}
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const segments = ${JSON.stringify(segments)};
    let currentIndex = -1;
    let isPlaying = false;
    let playTimeout = null;

    function activateSegment(index) {
      if (index < 0 || index >= segments.length) return;
      currentIndex = index;
      const seg = segments[index];

      // Update segment UI
      document.querySelectorAll('.segment').forEach((el, i) => {
        el.classList.toggle('active', i === index);
        if (i === index) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      // Highlight code lines
      document.querySelectorAll('.code-line').forEach(el => el.classList.remove('active'));
      if (seg.start_line && seg.end_line) {
        for (let l = seg.start_line; l <= seg.end_line; l++) {
          const lineEl = document.getElementById('line-' + l);
          if (lineEl) {
            lineEl.classList.add('active');
            if (l === seg.start_line) {
              lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }

      // Update progress
      const progress = ((index + 1) / segments.length) * 100;
      document.getElementById('progressFill').style.width = progress + '%';

      // Speak narration if playing
      if (isPlaying && seg.text) {
        speak(seg.text, () => {
          if (isPlaying && currentIndex < segments.length - 1) {
            playTimeout = setTimeout(() => activateSegment(currentIndex + 1), 800);
          } else {
            stopPlay();
          }
        });
      }

      // Also highlight in VS Code editor
      if (seg.start_line && seg.end_line) {
        vscode.postMessage({
          command: 'highlightLine',
          startLine: seg.start_line,
          endLine: seg.end_line,
        });
      }
    }

    function togglePlay() {
      if (isPlaying) {
        stopPlay();
      } else {
        isPlaying = true;
        document.getElementById('playBtn').textContent = '⏸ Pause';
        document.getElementById('playBtn').classList.add('playing');
        if (currentIndex < 0) currentIndex = -1;
        activateSegment(currentIndex + 1 < segments.length ? currentIndex + 1 : 0);
      }
    }

    function stopPlay() {
      isPlaying = false;
      speechSynthesis.cancel();
      clearTimeout(playTimeout);
      document.getElementById('playBtn').textContent = '▶ Play';
      document.getElementById('playBtn').classList.remove('playing');
    }

    function prevSegment() { if (currentIndex > 0) { stopPlay(); activateSegment(currentIndex - 1); } }
    function nextSegment() { if (currentIndex < segments.length - 1) { stopPlay(); activateSegment(currentIndex + 1); } }

    function speak(text, onEnd) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onend = onEnd;
      speechSynthesis.speak(utterance);
    }

    // Auto-activate first segment
    if (segments.length > 0) {
      activateSegment(0);
    }
  </script>
</body></html>`;
  }

  dispose(): void {
    WalkthroughPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
