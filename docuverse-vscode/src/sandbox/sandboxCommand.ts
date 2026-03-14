/**
 * Sandbox Command
 * Execute selected code via the DocuVerse backend sandbox
 */

import * as vscode from 'vscode';
import { DocuVerseClient } from '../api/client';
import { AuthManager } from '../auth/authManager';

const outputChannel = vscode.window.createOutputChannel('DocuVerse Sandbox');

export async function runSandbox(client: DocuVerseClient): Promise<void> {
  const auth = AuthManager.getInstance();
  if (!auth.isLoggedIn) {
    vscode.window.showWarningMessage('DocuVerse: Please sign in first.');
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('DocuVerse: No active editor.');
    return;
  }

  // Get selected text or full file
  const selection = editor.selection;
  const code = selection.isEmpty
    ? editor.document.getText()
    : editor.document.getText(selection);

  if (!code.trim()) {
    vscode.window.showWarningMessage('DocuVerse: No code selected.');
    return;
  }

  // Detect language
  const langId = editor.document.languageId;
  let sandboxLang: string;
  switch (langId) {
    case 'python':
      sandboxLang = 'python';
      break;
    case 'javascript':
    case 'javascriptreact':
    case 'typescript':
    case 'typescriptreact':
      sandboxLang = 'javascript';
      break;
    default:
      const picked = await vscode.window.showQuickPick(['python', 'javascript'], {
        placeHolder: 'Select language for sandbox execution',
      });
      if (!picked) { return; }
      sandboxLang = picked;
  }

  outputChannel.show(true);
  outputChannel.appendLine('─'.repeat(60));
  outputChannel.appendLine(`🧪 DocuVerse Sandbox — ${sandboxLang.toUpperCase()}`);
  outputChannel.appendLine(`📄 Running ${code.split('\n').length} lines...`);
  outputChannel.appendLine('─'.repeat(60));

  try {
    const result = await client.executeSandbox(code, sandboxLang);

    if (result.success) {
      outputChannel.appendLine('✅ Execution successful');
      outputChannel.appendLine(`⏱️  ${result.execution_time.toFixed(3)}s`);
      outputChannel.appendLine('');
      outputChannel.appendLine('OUTPUT:');
      outputChannel.appendLine(result.output || '(no output)');
    } else {
      outputChannel.appendLine('❌ Execution failed');
      outputChannel.appendLine('');
      outputChannel.appendLine('ERROR:');
      outputChannel.appendLine(result.error || 'Unknown error');
      if (result.output) {
        outputChannel.appendLine('');
        outputChannel.appendLine('OUTPUT:');
        outputChannel.appendLine(result.output);
      }
    }
  } catch (err: any) {
    outputChannel.appendLine(`❌ API Error: ${err.message}`);
  }

  outputChannel.appendLine('');
}
