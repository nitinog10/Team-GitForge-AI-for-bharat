/**
 * Walkthrough Tree Provider
 * Lists existing walkthroughs for the connected repos
 */

import * as vscode from 'vscode';
import { DocuVerseClient } from '../api/client';
import { AuthManager } from '../auth/authManager';
import { WalkthroughScript } from '../api/types';

export class WalkthroughTreeProvider implements vscode.TreeDataProvider<WalkthroughTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<WalkthroughTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private client: DocuVerseClient;
  private currentRepoId: string | null = null;

  constructor(client: DocuVerseClient) {
    this.client = client;
  }

  setRepoId(repoId: string): void {
    this.currentRepoId = repoId;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: WalkthroughTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<WalkthroughTreeItem[]> {
    const auth = AuthManager.getInstance();
    if (!auth.isLoggedIn || !this.currentRepoId) {
      return [];
    }

    try {
      const walkthroughs = await this.client.getWalkthroughsForRepo(this.currentRepoId);
      if (walkthroughs.length === 0) {
        return [new WalkthroughTreeItem('No walkthroughs yet', vscode.TreeItemCollapsibleState.None)];
      }
      return walkthroughs.map(wt => {
        const item = new WalkthroughTreeItem(
          wt.title || wt.file_path,
          vscode.TreeItemCollapsibleState.None
        );
        item.description = `${wt.view_mode} · ${Math.round(wt.total_duration)}s`;
        item.tooltip = `${wt.file_path}\nMode: ${wt.view_mode}\nDuration: ${Math.round(wt.total_duration)}s\n${wt.summary || ''}`;
        item.iconPath = new vscode.ThemeIcon('play-circle');
        item.walkthroughId = wt.id;
        item.walkthroughData = wt;
        item.command = {
          command: 'docuverse.openWalkthrough',
          title: 'Open Walkthrough',
          arguments: [wt],
        };
        return item;
      });
    } catch {
      return [new WalkthroughTreeItem('Error loading walkthroughs', vscode.TreeItemCollapsibleState.None)];
    }
  }
}

export class WalkthroughTreeItem extends vscode.TreeItem {
  walkthroughId?: string;
  walkthroughData?: WalkthroughScript;
}
