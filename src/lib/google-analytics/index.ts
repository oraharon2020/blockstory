/**
 * Google Analytics Module
 * 
 * ייצוא כל הפונקציות של מודול GA4
 */

export {
  getTrafficBySource,
  getConversionsByCampaign,
  getDailyMetrics,
  calculateChannelMetrics,
} from './client';

export type {
  GACredentials,
  GADateRange,
  GAConversionsBySource,
  GATrafficOverview,
  GASourceBreakdown,
} from './client';
