/**
 * Welcome View — Webview Provider
 * Shown when user is NOT logged in. Beautiful onboarding experience.
 */

import * as vscode from 'vscode';

export class WelcomeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'docuverse-welcome';

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage((message) => {
      if (message.command === 'login') {
        vscode.commands.executeCommand('docuverse.login');
      }
    });
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html><head>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .logo { font-size: 36px; margin-bottom: 12px; }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .tagline { font-size: 12px; opacity: 0.5; margin-bottom: 24px; line-height: 1.5; }

  .features {
    width: 100%;
    margin-bottom: 24px;
  }
  .feature {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    text-align: left;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .feature:last-child { border: none; }
  .feature-icon { font-size: 18px; min-width: 24px; text-align: center; padding-top: 1px; }
  .feature-text h3 { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
  .feature-text p { font-size: 11px; opacity: 0.5; line-height: 1.4; }

  .login-btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: #238636;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.2s;
  }
  .login-btn:hover { opacity: 0.85; }

  .footer { margin-top: 20px; font-size: 10px; opacity: 0.3; }
</style>
</head><body>
  <div class="logo">🚀</div>
  <h1>DocuVerse AI</h1>
  <p class="tagline">AI explains your code like a senior engineer.<br>Audio walkthroughs · Diagrams · Impact analysis</p>

  <div class="features">
    <div class="feature">
      <span class="feature-icon">🎙️</span>
      <div class="feature-text">
        <h3>Explain Any File</h3>
        <p>AI narrates your code with audio — lines highlight as it speaks</p>
      </div>
    </div>
    <div class="feature">
      <span class="feature-icon">⚡</span>
      <div class="feature-text">
        <h3>Impact Analysis</h3>
        <p>"What breaks if I change this?" — answered in seconds</p>
      </div>
    </div>
    <div class="feature">
      <span class="feature-icon">📊</span>
      <div class="feature-text">
        <h3>Auto Diagrams</h3>
        <p>Generate flowcharts, class & sequence diagrams from code</p>
      </div>
    </div>
    <div class="feature">
      <span class="feature-icon">📝</span>
      <div class="feature-text">
        <h3>Auto Documentation</h3>
        <p>Generate complete docs and push to README in one click</p>
      </div>
    </div>
  </div>

  <button class="login-btn" onclick="login()">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
    Sign in with GitHub
  </button>

  <p class="footer">Free · Connects to your DocuVerse account</p>

  <script>
    const vscode = acquireVsCodeApi();
    function login() { vscode.postMessage({ command: 'login' }); }
  </script>
</body></html>`;
  }
}
