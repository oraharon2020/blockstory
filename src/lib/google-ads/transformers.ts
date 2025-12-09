/**
 * Google Ads Data Transformers
 * המרת נתונים גולמיים מה-API לפורמט נוח
 */

import { 
  CampaignMetrics, 
  AdGroupMetrics, 
  Ad, 
  AdMetrics,
  KeywordMetrics, 
  SearchTermMetrics,
  AccountSummary 
} from './types';

/**
 * Convert micros to actual currency value
 */
export function microsToMoney(micros: number | string | undefined): number {
  if (!micros) return 0;
  return Number(micros) / 1_000_000;
}

/**
 * Parse campaign data from API response
 */
export function parseCampaignsResponse(response: any[]): CampaignMetrics[] {
  const results: CampaignMetrics[] = [];

  for (const batch of response) {
    if (!batch.results) continue;

    for (const row of batch.results) {
      results.push({
        campaignId: row.campaign?.id || '',
        campaignName: row.campaign?.name || '',
        date: row.segments?.date || '',
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        cost: microsToMoney(row.metrics?.costMicros),
        conversions: Number(row.metrics?.conversions || 0),
        conversionsValue: Number(row.metrics?.conversionsValue || 0),
        ctr: Number(row.metrics?.ctr || 0),
        avgCpc: microsToMoney(row.metrics?.averageCpc),
        channelType: row.campaign?.advertisingChannelType || '',
      });
    }
  }

  return results;
}

/**
 * Parse ad groups data from API response
 */
export function parseAdGroupsResponse(response: any[]): AdGroupMetrics[] {
  const results: AdGroupMetrics[] = [];

  for (const batch of response) {
    if (!batch.results) continue;

    for (const row of batch.results) {
      results.push({
        adGroupId: row.adGroup?.id || '',
        adGroupName: row.adGroup?.name || '',
        campaignId: row.campaign?.id || '',
        campaignName: row.campaign?.name || '',
        date: row.segments?.date || '',
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        cost: microsToMoney(row.metrics?.costMicros),
        conversions: Number(row.metrics?.conversions || 0),
        conversionsValue: Number(row.metrics?.conversionsValue || 0),
      });
    }
  }

  return results;
}

/**
 * Parse ads data from API response
 */
export function parseAdsResponse(response: any[]): { ads: Ad[]; metrics: AdMetrics[] } {
  const ads: Ad[] = [];
  const metrics: AdMetrics[] = [];
  const seenAds = new Set<string>();

  for (const batch of response) {
    if (!batch.results) continue;

    for (const row of batch.results) {
      const adId = row.adGroupAd?.ad?.id || '';
      
      // Add ad info (deduplicated)
      if (!seenAds.has(adId)) {
        seenAds.add(adId);
        
        // Extract headlines and descriptions
        const headlines: string[] = [];
        const descriptions: string[] = [];

        // Responsive Search Ads
        if (row.adGroupAd?.ad?.responsiveSearchAd) {
          const rsa = row.adGroupAd.ad.responsiveSearchAd;
          if (rsa.headlines) {
            for (const h of rsa.headlines) {
              if (h.text) headlines.push(h.text);
            }
          }
          if (rsa.descriptions) {
            for (const d of rsa.descriptions) {
              if (d.text) descriptions.push(d.text);
            }
          }
        }

        // Expanded Text Ads (legacy)
        if (row.adGroupAd?.ad?.expandedTextAd) {
          const eta = row.adGroupAd.ad.expandedTextAd;
          if (eta.headlinePart1) headlines.push(eta.headlinePart1);
          if (eta.headlinePart2) headlines.push(eta.headlinePart2);
          if (eta.description) descriptions.push(eta.description);
        }

        ads.push({
          id: adId,
          type: row.adGroupAd?.ad?.type || '',
          finalUrls: row.adGroupAd?.ad?.finalUrls || [],
          headlines,
          descriptions,
          adGroupId: row.adGroup?.id || '',
          adGroupName: row.adGroup?.name || '',
          campaignId: row.campaign?.id || '',
          campaignName: row.campaign?.name || '',
          status: row.adGroupAd?.status || '',
        });
      }

      // Add metrics
      metrics.push({
        adId,
        adGroupId: row.adGroup?.id || '',
        campaignId: row.campaign?.id || '',
        date: row.segments?.date || '',
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        cost: microsToMoney(row.metrics?.costMicros),
        conversions: Number(row.metrics?.conversions || 0),
        conversionsValue: Number(row.metrics?.conversionsValue || 0),
      });
    }
  }

  return { ads, metrics };
}

/**
 * Parse keywords data from API response
 */
export function parseKeywordsResponse(response: any[]): KeywordMetrics[] {
  const results: KeywordMetrics[] = [];

  for (const batch of response) {
    if (!batch.results) continue;

    for (const row of batch.results) {
      results.push({
        keyword: row.adGroupCriterion?.keyword?.text || '',
        matchType: row.adGroupCriterion?.keyword?.matchType || '',
        adGroupId: row.adGroup?.id || '',
        campaignId: row.campaign?.id || '',
        date: row.segments?.date || '',
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        cost: microsToMoney(row.metrics?.costMicros),
        conversions: Number(row.metrics?.conversions || 0),
        conversionsValue: Number(row.metrics?.conversionsValue || 0),
        ctr: Number(row.metrics?.ctr || 0),
        avgCpc: microsToMoney(row.metrics?.averageCpc),
        qualityScore: row.adGroupCriterion?.qualityInfo?.qualityScore,
      });
    }
  }

  return results;
}

/**
 * Parse search terms data from API response
 */
export function parseSearchTermsResponse(response: any[]): SearchTermMetrics[] {
  const results: SearchTermMetrics[] = [];

  for (const batch of response) {
    if (!batch.results) continue;

    for (const row of batch.results) {
      results.push({
        searchTerm: row.searchTermView?.searchTerm || '',
        adGroupId: row.adGroup?.id || '',
        campaignId: row.campaign?.id || '',
        date: row.segments?.date || '',
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        cost: microsToMoney(row.metrics?.costMicros),
        conversions: Number(row.metrics?.conversions || 0),
        conversionsValue: Number(row.metrics?.conversionsValue || 0),
      });
    }
  }

  return results;
}

/**
 * Parse account summary from API response
 */
export function parseAccountSummaryResponse(response: any[]): AccountSummary[] {
  const results: AccountSummary[] = [];

  for (const batch of response) {
    if (!batch.results) continue;

    for (const row of batch.results) {
      results.push({
        customerId: row.customer?.id || '',
        accountName: row.customer?.descriptiveName || '',
        currency: row.customer?.currencyCode || 'ILS',
        date: row.segments?.date || '',
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        cost: microsToMoney(row.metrics?.costMicros),
        conversions: Number(row.metrics?.conversions || 0),
        conversionsValue: Number(row.metrics?.conversionsValue || 0),
      });
    }
  }

  return results;
}

/**
 * Aggregate daily metrics to totals
 */
export function aggregateMetrics<T extends { cost: number; clicks: number; impressions: number; conversions: number; conversionsValue: number }>(
  data: T[]
): { totalCost: number; totalClicks: number; totalImpressions: number; totalConversions: number; totalConversionsValue: number; avgCtr: number; roas: number } {
  const totals = data.reduce(
    (acc, item) => ({
      totalCost: acc.totalCost + item.cost,
      totalClicks: acc.totalClicks + item.clicks,
      totalImpressions: acc.totalImpressions + item.impressions,
      totalConversions: acc.totalConversions + item.conversions,
      totalConversionsValue: acc.totalConversionsValue + item.conversionsValue,
    }),
    { totalCost: 0, totalClicks: 0, totalImpressions: 0, totalConversions: 0, totalConversionsValue: 0 }
  );

  return {
    ...totals,
    avgCtr: totals.totalImpressions > 0 ? (totals.totalClicks / totals.totalImpressions) * 100 : 0,
    roas: totals.totalCost > 0 ? totals.totalConversionsValue / totals.totalCost : 0,
  };
}
