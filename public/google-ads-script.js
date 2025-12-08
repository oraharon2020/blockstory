/**
 * Google Ads Script - Daily Spend Reporter
 * 
 * This script runs daily and sends spend data to your CRM webhook.
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
  
  // Get campaign data
  var report = AdsApp.report(
    'SELECT ' +
    'CampaignId, ' +
    'CampaignName, ' +
    'CampaignStatus, ' +
    'Cost, ' +
    'Clicks, ' +
    'Impressions, ' +
    'Conversions, ' +
    'Date ' +
    'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
    'WHERE Date >= ' + formatDate(startDate) + ' ' +
    'AND Date <= ' + formatDate(endDate)
  );
  
  // Group by date
  var dataByDate = {};
  var rows = report.rows();
  
  while (rows.hasNext()) {
    var row = rows.next();
    var date = row['Date'];
    var cost = parseFloat(row['Cost'].replace(/,/g, '')) || 0;
    
    if (!dataByDate[date]) {
      dataByDate[date] = {
        totalCost: 0,
        campaigns: []
      };
    }
    
    dataByDate[date].totalCost += cost;
    dataByDate[date].campaigns.push({
      id: row['CampaignId'],
      name: row['CampaignName'],
      status: row['CampaignStatus'],
      cost: cost,
      clicks: parseInt(row['Clicks'].replace(/,/g, '')) || 0,
      impressions: parseInt(row['Impressions'].replace(/,/g, '')) || 0,
      conversions: parseFloat(row['Conversions'].replace(/,/g, '')) || 0,
    });
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
        campaigns: dayData.campaigns
      }
    };
    
    Logger.log('Sending data for ' + date + ': ₪' + dayData.totalCost.toFixed(2));
    
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
  // Input: "2025-12-09" or "Dec 9, 2025" depending on account settings
  // Try to parse and return ISO format
  
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
