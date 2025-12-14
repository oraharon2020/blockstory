/**
 * Google Analytics Module
 * 
 * ייצוא כל הפונקציות של מודול GA4
 */

export {
  // פונקציות בסיסיות
  getTrafficBySource,
  getConversionsByCampaign,
  getDailyMetrics,
  calculateChannelMetrics,
  // פונקציות חדשות לטאבים
  getTrafficAnalytics,
  getSalesAnalytics,
  getProductsAnalytics,
  // Token refresh
  refreshAccessToken,
} from './client';

export type {
  GACredentials,
  GADateRange,
  GAConversionsBySource,
  GATrafficOverview,
  GASourceBreakdown,
} from './client';

import { supabase } from '@/lib/supabase';
import { refreshAccessToken, GACredentials } from './client';

/**
 * קבלת credentials עם רענון אוטומטי של token אם צריך
 */
export async function getValidCredentials(businessId: string): Promise<{ credentials: GACredentials; propertyId: string } | { error: string; needsAuth?: boolean; needsPropertySelection?: boolean }> {
  const { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('credentials, settings')
    .eq('business_id', businessId)
    .eq('type', 'google_analytics')
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) {
    return { error: 'Google Analytics not connected', needsAuth: true };
  }

  if (!integration.settings?.property_id) {
    return { error: 'No GA4 property selected', needsPropertySelection: true };
  }

  let accessToken = integration.credentials.access_token;
  const refreshToken = integration.credentials.refresh_token;
  const expiryDate = integration.credentials.expiry_date;

  // Check if token is expired or about to expire (5 minutes buffer)
  const isExpired = expiryDate && Date.now() > expiryDate - 5 * 60 * 1000;

  if (isExpired && refreshToken) {
    console.log('🔄 GA token expired, refreshing...');
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      accessToken = newTokens.access_token;

      // Update tokens in database
      await supabase
        .from('integrations')
        .update({
          credentials: {
            ...integration.credentials,
            access_token: newTokens.access_token,
            expiry_date: newTokens.expiry_date,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)
        .eq('type', 'google_analytics');

      console.log('✅ GA token refreshed successfully');
    } catch (e: any) {
      console.error('❌ Failed to refresh GA token:', e.message);
      return { error: 'Token expired and refresh failed', needsAuth: true };
    }
  }

  return {
    credentials: {
      access_token: accessToken,
      refresh_token: refreshToken,
      property_id: integration.settings.property_id,
    },
    propertyId: integration.settings.property_id,
  };
}
