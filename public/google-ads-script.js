/**
 * Google Ads Script - Full Campaign Reporter
 * 
 * This script runs daily and sends comprehensive campaign data to your CRM webhook.
 * Includes: campaigns, ad groups, keywords, search terms, and all key metrics.
 * 
 * SETUP:
 * 1. Go to Google Ads → Tools & Settings → Scripts
 * 2. Click "+" to create a new script
 * 3. Paste this entire code
 * 4. Update the CONFIG section below with your details
 * 5. Click "Preview" to test
 * 6. Click "Run" to execute
 * 7. Set up a daily schedule (Tools & Settings → Scripts → click on script → Frequency)
 */

// ============ CONFIG - UPDATE THESE VALUES ============
var CONFIG = {
  // Your CRM webhook URL
  WEBHOOK_URL: 'https://YOUR_DOMAIN.com/api/webhook/google-ads',
  
  // Your business ID (from CRM settings)
  BUSINESS_ID: 'YOUR_BUSINESS_ID_HERE',
  
  // Secret key (from CRM settings - Google Ads tab)
  SECRET_KEY: 'YOUR_SECRET_KEY_HERE',
  
  // How many days back to sync (1 = yesterday only, 7 = last week)
  DAYS_BACK: 1,
};
// ======================================================

function main() {
  // Calculate date range
  var today = new Date();
  var endDate = new Date(today);
  endDate.setDate(endDate.getDate() - 1); // Yesterday
  
  var startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - CONFIG.DAYS_BACK + 1);
  
  Logger.log('Syncing data from ' + formatDate(startDate) + ' to ' + formatDate(endDate));
  
  // Get campaign performance data with all metrics
  var campaignReport = AdsApp.report(
    'SELECT ' +
    'CampaignId, ' +
    'CampaignName, ' +
    'CampaignStatus, ' +
    'Cost, ' +
    'Clicks, ' +
    'Impressions, ' +
    'Conversions, ' +
    'ConversionValue, ' +
    'Ctr, ' +
    'AverageCpc, ' +
    'CostPerConversion, ' +
    'ConversionRate, ' +
    'SearchImpressionShare, ' +
    'Date ' +
    'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
    'WHERE Date >= ' + formatDate(startDate) + ' ' +
    'AND Date <= ' + formatDate(endDate)
  );
  
  // Get ad group data
  var adGroupReport = AdsApp.report(
    'SELECT ' +
    'CampaignId, ' +
    'AdGroupId, ' +
    'AdGroupName, ' +
    'AdGroupStatus, ' +
    'Cost, ' +
    'Clicks, ' +
    'Impressions, ' +
    'Conversions, ' +
    'Ctr, ' +
    'AverageCpc, ' +
    'Date ' +
    'FROM ADGROUP_PERFORMANCE_REPORT ' +
    'WHERE Date >= ' + formatDate(startDate) + ' ' +
    'AND Date <= ' + formatDate(endDate)
  );
  
  // Get keyword data with Quality Score
  var keywordReport = AdsApp.report(
    'SELECT ' +
    'CampaignId, ' +
    'AdGroupId, ' +
    'Criteria, ' +
    'KeywordMatchType, ' +
    'QualityScore, ' +
    'Cost, ' +
    'Clicks, ' +
    'Impressions, ' +
    'Conversions, ' +
    'Ctr, ' +
    'AverageCpc, ' +
    'Date ' +
    'FROM KEYWORDS_PERFORMANCE_REPORT ' +
    'WHERE Date >= ' + formatDate(startDate) + ' ' +
    'AND Date <= ' + formatDate(endDate) + ' ' +
    'AND Impressions > 0'
  );
  
  // Get search terms (top 100 by cost)
  var searchTermReport = AdsApp.report(
    'SELECT ' +
    'CampaignId, ' +
    'Query, ' +
    'Cost, ' +
    'Clicks, ' +
    'Impressions, ' +
    'Conversions, ' +
    'Date ' +
    'FROM SEARCH_QUERY_PERFORMANCE_REPORT ' +
    'WHERE Date >= ' + formatDate(startDate) + ' ' +
    'AND Date <= ' + formatDate(endDate) + ' ' +
    'AND Impressions > 0 ' +
    'ORDER BY Cost DESC ' +
    'LIMIT 100'
  );
  
  // Process campaign data by date
  var dataByDate = {};
  var campaignRows = campaignReport.rows();
  
  while (campaignRows.hasNext()) {
    var row = campaignRows.next();
    var date = row['Date'];
    var cost = parseFloat(row['Cost'].replace(/,/g, '')) || 0;
    
    if (!dataByDate[date]) {
      dataByDate[date] = {
        totalCost: 0,
        totalClicks: 0,
        totalImpressions: 0,
        totalConversions: 0,
        totalConversionValue: 0,
        campaigns: [],
        adGroups: [],
        keywords: [],
        searchTerms: []
      };
    }
    
    dataByDate[date].totalCost += cost;
    dataByDate[date].totalClicks += parseInt(row['Clicks'].replace(/,/g, '')) || 0;
    dataByDate[date].totalImpressions += parseInt(row['Impressions'].replace(/,/g, '')) || 0;
    dataByDate[date].totalConversions += parseFloat(row['Conversions'].replace(/,/g, '')) || 0;
    dataByDate[date].totalConversionValue += parseFloat(row['ConversionValue'].replace(/,/g, '')) || 0;
    
    dataByDate[date].campaigns.push({
      id: row['CampaignId'],
      name: row['CampaignName'],
      status: row['CampaignStatus'],
      cost: cost,
      clicks: parseInt(row['Clicks'].replace(/,/g, '')) || 0,
      impressions: parseInt(row['Impressions'].replace(/,/g, '')) || 0,
      conversions: parseFloat(row['Conversions'].replace(/,/g, '')) || 0,
      conversionValue: parseFloat(row['ConversionValue'].replace(/,/g, '')) || 0,
      ctr: parseFloat(row['Ctr'].replace('%', '')) || 0,
      avgCpc: parseFloat(row['AverageCpc'].replace(/,/g, '')) || 0,
      costPerConversion: parseFloat(row['CostPerConversion'].replace(/,/g, '')) || 0,
      conversionRate: parseFloat(row['ConversionRate'].replace('%', '')) || 0,
      impressionShare: parseFloat(row['SearchImpressionShare'].replace('%', '').replace('< ', '')) || 0,
    });
  }
  
  // Process ad group data
  var adGroupRows = adGroupReport.rows();
  while (adGroupRows.hasNext()) {
    var row = adGroupRows.next();
    var date = row['Date'];
    
    if (dataByDate[date]) {
      dataByDate[date].adGroups.push({
        campaignId: row['CampaignId'],
        id: row['AdGroupId'],
        name: row['AdGroupName'],
        status: row['AdGroupStatus'],
        cost: parseFloat(row['Cost'].replace(/,/g, '')) || 0,
        clicks: parseInt(row['Clicks'].replace(/,/g, '')) || 0,
        impressions: parseInt(row['Impressions'].replace(/,/g, '')) || 0,
        conversions: parseFloat(row['Conversions'].replace(/,/g, '')) || 0,
        ctr: parseFloat(row['Ctr'].replace('%', '')) || 0,
        avgCpc: parseFloat(row['AverageCpc'].replace(/,/g, '')) || 0,
      });
    }
  }
  
  // Process keyword data
  var keywordRows = keywordReport.rows();
  while (keywordRows.hasNext()) {
    var row = keywordRows.next();
    var date = row['Date'];
    
    if (dataByDate[date]) {
      dataByDate[date].keywords.push({
        campaignId: row['CampaignId'],
        adGroupId: row['AdGroupId'],
        keyword: row['Criteria'],
        matchType: row['KeywordMatchType'],
        qualityScore: parseInt(row['QualityScore']) || 0,
        cost: parseFloat(row['Cost'].replace(/,/g, '')) || 0,
        clicks: parseInt(row['Clicks'].replace(/,/g, '')) || 0,
        impressions: parseInt(row['Impressions'].replace(/,/g, '')) || 0,
        conversions: parseFloat(row['Conversions'].replace(/,/g, '')) || 0,
        ctr: parseFloat(row['Ctr'].replace('%', '')) || 0,
        avgCpc: parseFloat(row['AverageCpc'].replace(/,/g, '')) || 0,
      });
    }
  }
  
  // Process search terms data
  var searchTermRows = searchTermReport.rows();
  while (searchTermRows.hasNext()) {
    var row = searchTermRows.next();
    var date = row['Date'];
    
    if (dataByDate[date]) {
      dataByDate[date].searchTerms.push({
        campaignId: row['CampaignId'],
        query: row['Query'],
        cost: parseFloat(row['Cost'].replace(/,/g, '')) || 0,
        clicks: parseInt(row['Clicks'].replace(/,/g, '')) || 0,
        impressions: parseInt(row['Impressions'].replace(/,/g, '')) || 0,
        conversions: parseFloat(row['Conversions'].replace(/,/g, '')) || 0,
      });
    }
  }
  
  // Send data for each date
  for (var date in dataByDate) {
    var dayData = dataByDate[date];
    
    var payload = {
      businessId: CONFIG.BUSINESS_ID,
      secretKey: CONFIG.SECRET_KEY,
      data: {
        date: formatDateISO(date),
        cost: dayData.totalCost,
        clicks: dayData.totalClicks,
        impressions: dayData.totalImpressions,
        conversions: dayData.totalConversions,
        conversionValue: dayData.totalConversionValue,
        campaigns: dayData.campaigns,
        adGroups: dayData.adGroups,
        keywords: dayData.keywords,
        searchTerms: dayData.searchTerms
      }
    };
    
    Logger.log('Sending data for ' + date + ': ₪' + dayData.totalCost.toFixed(2) + 
               ', ' + dayData.totalClicks + ' clicks, ' + 
               dayData.campaigns.length + ' campaigns, ' +
               dayData.keywords.length + ' keywords');
    
    try {
      var response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      
      var responseCode = response.getResponseCode();
      var responseBody = response.getContentText();
      
      if (responseCode === 200) {
        Logger.log('✅ Success: ' + responseBody);
      } else {
        Logger.log('❌ Error ' + responseCode + ': ' + responseBody);
      }
    } catch (e) {
      Logger.log('❌ Exception: ' + e.message);
    }
  }
  
  Logger.log('Done!');
}

// Format date as YYYYMMDD (for Google Ads query)
function formatDate(date) {
  var year = date.getFullYear();
  var month = ('0' + (date.getMonth() + 1)).slice(-2);
  var day = ('0' + date.getDate()).slice(-2);
  return year + month + day;
}

// Format date as YYYY-MM-DD (for webhook)
function formatDateISO(dateStr) {
  // If already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If in YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) {
    return dateStr.slice(0, 4) + '-' + dateStr.slice(4, 6) + '-' + dateStr.slice(6, 8);
  }
  
  // Try to parse other formats
  var date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    var year = date.getFullYear();
    var month = ('0' + (date.getMonth() + 1)).slice(-2);
    var day = ('0' + date.getDate()).slice(-2);
    return year + '-' + month + '-' + day;
  }
  
  return dateStr; // Return as-is if can't parse
}
