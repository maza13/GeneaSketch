// import { startHandler } from "@tauri-apps/plugin-oauth";
// import { Stronghold, Store } from "@tauri-apps/plugin-stronghold";

/**
 * FamilySearch OAuth 2.0 & Session Management
 * 
 * [SHELVED] Temporarily using localStorage fallback due to environment/npm issues.
 * Native Tauri plugins (Stronghold/OAuth) logic is commented out.
 */

const CLIENT_ID = "WC9Z-9NWC-W9NW-9NWC-W9NW-9NWC-W9NW-9NWC";
const AUTH_URL = "https://ident.familysearch.org/cis-web/oauth2/v3/authorization";
const TOKEN_URL = "https://ident.familysearch.org/cis-web/oauth2/v3/token";

const TOKEN_STORAGE_KEY = "geneasketch.fs.access_token";
const REFRESH_STORAGE_KEY = "geneasketch.fs.refresh_token";
const EXPIRES_STORAGE_KEY = "geneasketch.fs.expires_at";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export class FamilySearchAuth {
  private static instance: FamilySearchAuth;
  private initialized = false;

  private constructor() { }

  static getInstance() {
    if (!FamilySearchAuth.instance) {
      FamilySearchAuth.instance = new FamilySearchAuth();
    }
    return FamilySearchAuth.instance;
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    // Native Tauri Stronghold backend logic shelved.
  }

  async login(): Promise<string> {
    await this.init();
    // For local development/browser fallback, we return the URL
    // In Tauri native mode, this would use startHandler()
    const redirectUri = "http://localhost:1337";
    return `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email`;
  }

  async handleRedirect(code: string, redirectUri: string = "http://localhost:1337"): Promise<TokenResponse> {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", errorText);
      throw new Error("Failed to exchange token: " + errorText);
    }

    const tokens: TokenResponse = await response.json();
    await this.saveTokens(tokens);
    return tokens;
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (!refreshToken) return null;

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID
      })
    });

    if (!response.ok) {
      await this.logout();
      return null;
    }

    const tokens: TokenResponse = await response.json();
    await this.saveTokens(tokens);
    return tokens.access_token;
  }

  private async saveTokens(tokens: TokenResponse) {
    localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access_token);
    const expiration = Date.now() + (tokens.expires_in * 1000);
    localStorage.setItem(EXPIRES_STORAGE_KEY, expiration.toString());

    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_STORAGE_KEY, tokens.refresh_token);
    }
  }

  async getAccessToken(): Promise<string | null> {
    const expiresAtStr = localStorage.getItem(EXPIRES_STORAGE_KEY);
    if (expiresAtStr) {
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Date.now() > expiresAt - 300000) {
        return await this.refreshAccessToken();
      }
    }

    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_STORAGE_KEY);
    localStorage.removeItem(EXPIRES_STORAGE_KEY);
  }
}
