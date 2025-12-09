# BlockStory CRM - Google Ads API Integration
## Design Documentation

### 1. Overview
BlockStory CRM is an internal business management tool for e-commerce companies. The Google Ads API integration allows users to track and analyze their advertising performance directly within the CRM dashboard.

### 2. Purpose
- Track Google Ads campaign performance (impressions, clicks, cost, conversions)
- Analyze keyword and search term performance
- Calculate ROAS (Return on Ad Spend)
- Provide AI-powered insights for campaign optimization

### 3. Data Access
The tool accesses the following Google Ads data (READ-ONLY):
- Campaign metrics (cost, clicks, impressions, conversions)
- Ad group performance
- Keyword statistics
- Search terms report

### 4. Authentication
- OAuth 2.0 for user authentication
- Refresh tokens stored securely in database
- Users connect their own Google Ads accounts

### 5. User Flow
1. User navigates to Settings → Google Ads
2. Clicks "Connect with Google"
3. Authorizes access via Google OAuth
4. Data syncs automatically to CRM dashboard

### 6. Data Storage
- Data is stored in Supabase (PostgreSQL)
- Only aggregated metrics are stored (no PII)
- Data is isolated per business account

### 7. Security
- All API credentials stored as environment variables
- HTTPS encryption for all communications
- Row-level security in database

### 8. Technical Stack
- Next.js 14 (React framework)
- Supabase (Database)
- Google Ads API v15

### 9. Contact
- Company: Nalla LTD
- Email: info@nalla.co.il
- Website: https://nalla.co.il
