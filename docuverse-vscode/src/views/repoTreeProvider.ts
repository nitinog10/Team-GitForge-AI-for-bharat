/**
 * Repository Explorer — Tree Data Provider
 * Shows connected repos and their file trees in the DocuVerse sidebar
 */

import * as vscode from 'vscode';
import { DocuVerseClient } from '../api/client';
import { AuthManager } from '../auth/authManager';
import { Repository, FileNode } from '../api/types';

export class RepoTreeProvider implements vscode.TreeDataProvider<RepoTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RepoTreeItem | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private repos: Repository[] = [];
  private fileTrees: Map<string, FileNode[]> = new Map();
  private client: DocuVerseClient;

  constructor(client: DocuVerseClient) {
    this.client = client;
  }

  refresh(): void {
    this.fileTrees.clear();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: RepoTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: RepoTreeItem): Promise<RepoTreeItem[]> {
    const auth = AuthManager.getInstance();
    if (!auth.isLoggedIn) {
      return [new RepoTreeItem('Sign in to DocuVerse...', vscode.TreeItemCollapsibleState.None, 'login')];
    }

    if (!element) {
      // Root level — list connected repos
      try {
        this.repos = await this.client.listRepos();
        if (this.repos.length === 0) {
          return [new RepoTreeItem('No repositories connected', vscode.TreeItemCollapsibleState.None, 'empty')];
        }
        return this.repos.map(repo => {
          const item = new RepoTreeItem(
            repo.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            'repository'
          );
          item.description = repo.full_name;
          item.tooltip = `${repo.full_name}${repo.description ? ' — ' + repo.description : ''}`;
          item.iconPath = new vscode.ThemeIcon('repo');
          item.repoId = repo.id;
          item.repoFullName = repo.full_name;
          return item;
        });
      } catch (err: any) {
        return [new RepoTreeItem(`Error: ${err.message}`, vscode.TreeItemCollapsibleState.None, 'error')];
      }
    }

    if (element.contextValue === 'repository' && element.repoId) {
      // Repo children — file tree
      try {
        let tree = this.fileTrees.get(element.repoId);
        if (!tree) {
          tree = await this.client.getFileTree(element.repoId);
          this.fileTrees.set(element.repoId, tree);
        }
        return this.buildFileItems(tree, element.repoId, element.repoFullName || '');
      } catch (err: any) {
        return [new RepoTreeItem(`Error loading files: ${err.message}`, vscode.TreeItemCollapsibleState.None, 'error')];
      }
    }

    if (element.contextValue === 'directory' && element.repoId && element.children) {
      return this.buildFileItems(element.children, element.repoId, element.repoFullName || '');
    }

    return [];
  }

  private buildFileItems(nodes: FileNode[], repoId: string, repoFullName: string): RepoTreeItem[] {
    return nodes.map(node => {
      const state = node.is_directory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;

      const item = new RepoTreeItem(
        node.name,
        state,
        node.is_directory ? 'directory' : 'file'
      );

      item.repoId = repoId;
      item.repoFullName = repoFullName;
      item.filePath = node.path;

      if (node.is_directory) {
        item.iconPath = vscode.ThemeIcon.Folder;
        item.children = node.children;
      } else {
        item.iconPath = vscode.ThemeIcon.File;
        item.resourceUri = vscode.Uri.file(node.path);
        item.tooltip = `${node.path} (${node.language || 'unknown'})`;
      }

      return item;
    });
  }
}

export class RepoTreeItem extends vscode.TreeItem {
  repoId?: string;
  repoFullName?: string;
  filePath?: string;
  children?: FileNode[];

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string
  ) {
    super(label, collapsibleState);
  }
}
