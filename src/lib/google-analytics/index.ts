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
} from './client';

export type {
  GACredentials,
  GADateRange,
  GAConversionsBySource,
  GATrafficOverview,
  GASourceBreakdown,
} from './client';
