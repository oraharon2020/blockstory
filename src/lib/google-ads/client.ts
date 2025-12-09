/**
 * Google Ads API Client
 * מודול בסיסי ליצירת חיבור ל-Google Ads API
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || '';
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

export interface GoogleAdsCredentials {
  refreshToken: string;
  customerId?: string;
}

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Get a fresh access token using refresh token
 */
export async function getAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get access token: ${error.error_description || error.error}`);
  }

  const data: AccessTokenResponse = await response.json();
  return data.access_token;
}

/**
 * Make a request to Google Ads API
 */
export async function googleAdsRequest<T>(
  customerId: string,
  query: string,
  refreshToken: string
): Promise<T> {
  const accessToken = await getAccessToken(refreshToken);
  
  // Remove dashes from customer ID
  const cleanCustomerId = customerId.replace(/-/g, '');

  const response = await fetch(
    `https://googleads.googleapis.com/v15/customers/${cleanCustomerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Google Ads API Error:', error);
    throw new Error(`Google Ads API Error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data as T;
}

/**
 * List accessible customer accounts
 */
export async function listAccessibleCustomers(refreshToken: string): Promise<string[]> {
  const accessToken = await getAccessToken(refreshToken);

  const response = await fetch(
    'https://googleads.googleapis.com/v15/customers:listAccessibleCustomers',
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list customers: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return data.resourceNames?.map((name: string) => name.replace('customers/', '')) || [];
}
