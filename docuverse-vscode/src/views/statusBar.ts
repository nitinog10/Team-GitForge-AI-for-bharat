/**
 * Status Bar Manager
 * Shows DocuVerse auth/connection state in the VS Code status bar
 */

import * as vscode from 'vscode';
import { AuthManager } from '../auth/authManager';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'docuverse.login';
    this.update();
    this.statusBarItem.show();
  }

  update(): void {
    const auth = AuthManager.getInstance();
    if (auth.isLoggedIn) {
      this.statusBarItem.text = `$(rocket) DocuVerse: ${auth.username || 'Connected'}`;
      this.statusBarItem.tooltip = 'Click to manage DocuVerse session';
      this.statusBarItem.command = 'docuverse.logout';
    } else {
      this.statusBarItem.text = '$(rocket) DocuVerse: Sign In';
      this.statusBarItem.tooltip = 'Click to sign in with GitHub';
      this.statusBarItem.command = 'docuverse.login';
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
