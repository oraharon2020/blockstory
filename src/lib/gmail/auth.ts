/**
 * Gmail OAuth2 Client
 * ניהול אימות והתחברות ל-Gmail
 */

import { google } from 'googleapis';
import { GMAIL_SCOPES, getRedirectUri, getGmailCredentials } from './config';
import { GmailTokens } from './types';

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
  const { clientId, clientSecret } = getGmailCredentials();
  
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    getRedirectUri()
  );
}

/**
 * Generate authorization URL
 */
export function getAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GMAIL_SCOPES,
    prompt: 'consent', // Force consent to get refresh token
    state: state || '',
  });
}

/**
 * Exchange code for tokens
 */
export async function getTokensFromCode(code: string): Promise<GmailTokens> {
  const oauth2Client = createOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  return {
    access_token: tokens.access_token || '',
    refresh_token: tokens.refresh_token || '',
    expiry_date: tokens.expiry_date || 0,
    token_type: tokens.token_type || 'Bearer',
    scope: tokens.scope || '',
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GmailTokens> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  return {
    access_token: credentials.access_token || '',
    refresh_token: credentials.refresh_token || refreshToken, // Keep old if not returned
    expiry_date: credentials.expiry_date || 0,
    token_type: credentials.token_type || 'Bearer',
    scope: credentials.scope || '',
  };
}

/**
 * Get authenticated Gmail client
 */
export function getGmailClient(tokens: GmailTokens) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });
  
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Get user email from tokens
 */
export async function getUserEmail(tokens: GmailTokens): Promise<string> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  
  return data.email || '';
}

/**
 * Check if tokens are expired
 */
export function isTokenExpired(tokens: GmailTokens): boolean {
  if (!tokens.expiry_date) return true;
  // Add 5 minute buffer
  return Date.now() >= tokens.expiry_date - 5 * 60 * 1000;
}

/**
 * Ensure valid tokens (refresh if needed)
 */
export async function ensureValidTokens(tokens: GmailTokens): Promise<GmailTokens> {
  if (!isTokenExpired(tokens)) {
    return tokens;
  }
  
  if (!tokens.refresh_token) {
    throw new Error('No refresh token available');
  }
  
  return refreshAccessToken(tokens.refresh_token);
}
