/**
 * DocuVerse Auth Manager
 * Handles GitHub OAuth flow and JWT token storage via VS Code SecretStorage
 */

import * as vscode from 'vscode';
import { DocuVerseClient } from '../api/client';

const TOKEN_KEY = 'docuverse.jwt-token';

export class AuthManager {
  private static instance: AuthManager;
  private secretStorage: vscode.SecretStorage;
  private _onDidChangeAuth = new vscode.EventEmitter<boolean>();
  readonly onDidChangeAuth = this._onDidChangeAuth.event;

  private _isLoggedIn = false;
  private _username: string | null = null;

  private constructor(context: vscode.ExtensionContext) {
    this.secretStorage = context.secrets;
  }

  static init(context: vscode.ExtensionContext): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager(context);
    }
    return AuthManager.instance;
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      throw new Error('AuthManager not initialized. Call AuthManager.init() first.');
    }
    return AuthManager.instance;
  }

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  get username(): string | null {
    return this._username;
  }

  async getToken(): Promise<string | null> {
    const token = await this.secretStorage.get(TOKEN_KEY);
    return token ?? null;
  }

  async setToken(token: string): Promise<void> {
    await this.secretStorage.store(TOKEN_KEY, token);
    this._isLoggedIn = true;
    this._onDidChangeAuth.fire(true);
  }

  async clearToken(): Promise<void> {
    await this.secretStorage.delete(TOKEN_KEY);
    this._isLoggedIn = false;
    this._username = null;
    this._onDidChangeAuth.fire(false);
  }

  /**
   * Attempt to restore session from stored token
   */
  async tryRestoreSession(client: DocuVerseClient): Promise<boolean> {
    const token = await this.getToken();
    if (!token) {
      return false;
    }

    try {
      const result = await client.verifyToken();
      if (result.valid && result.user) {
        this._isLoggedIn = true;
        this._username = result.user.username;
        this._onDidChangeAuth.fire(true);
        return true;
      }
    } catch {
      // Token expired or invalid — clear it
      await this.clearToken();
    }
    return false;
  }

  /**
   * Login flow: opens the DocuVerse web app's /extension-auth page.
   * User logs in via normal GitHub OAuth on the website, copies the JWT
   * token, and pastes it into VS Code. No additional redirect URIs needed.
   */
  async login(client: DocuVerseClient): Promise<boolean> {
    try {
      // Build the extension-auth URL from the configured API URL
      // e.g. "https://xpbgkuukxp.ap-south-1.awsapprunner.com/api" → use frontend URL
      const apiUrl = vscode.workspace.getConfiguration('docuverse').get<string>('apiUrl') || '';
      let frontendUrl = 'https://logorhythms.in'; // production default
      if (apiUrl.includes('localhost')) {
        frontendUrl = 'http://localhost:3000';
      }

      const extensionAuthUrl = `${frontendUrl}/extension-auth`;

      // Open the extension auth page in the user's browser
      await vscode.env.openExternal(vscode.Uri.parse(extensionAuthUrl));

      // Wait for user to paste the token from the web page
      const token = await vscode.window.showInputBox({
        title: 'DocuVerse AI — Paste Auth Token',
        prompt: 'Sign in on the browser page, then click "Copy Token" and paste it here.',
        placeHolder: 'eyJhbGciOiJIUzI1NiIs...',
        password: true,
        ignoreFocusOut: true,
      });

      if (token) {
        await this.setToken(token);
        // Verify the token
        try {
          const result = await client.verifyToken();
          if (result.valid && result.user) {
            this._username = result.user.username;
            vscode.window.showInformationMessage(
              `DocuVerse: Logged in as ${result.user.username}`
            );
            return true;
          }
        } catch {
          await this.clearToken();
          vscode.window.showErrorMessage('DocuVerse: Invalid token. Please try again.');
          return false;
        }
      }

      return false;
    } catch (err: any) {
      vscode.window.showErrorMessage(`DocuVerse: Login failed — ${err.message}`);
      return false;
    }
  }

  /**
   * Handle URI callback from the browser (vscode://docuverse.docuverse-ai/callback?token=...)
   */
  async handleUriCallback(uri: vscode.Uri, client: DocuVerseClient): Promise<void> {
    const params = new URLSearchParams(uri.query);
    const token = params.get('token');

    if (token) {
      await this.setToken(token);
      try {
        const result = await client.verifyToken();
        if (result.valid && result.user) {
          this._username = result.user.username;
          vscode.window.showInformationMessage(
            `DocuVerse: Logged in as ${result.user.username}`
          );
        }
      } catch {
        await this.clearToken();
        vscode.window.showErrorMessage('DocuVerse: Token verification failed.');
      }
    }
  }

  async logout(): Promise<void> {
    await this.clearToken();
    vscode.window.showInformationMessage('DocuVerse: Logged out');
  }
}
