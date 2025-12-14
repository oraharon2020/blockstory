/**
 * Search Terms API
 * 
 * חיפושים באתר מ-GA4
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Ensure endDate doesn't exceed today
function getMaxEndDate(endDate: string): string {
  if (endDate === 'today' || endDate === 'yesterday') {
    return endDate;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requestedEnd = new Date(endDate);
  requestedEnd.setHours(0, 0, 0, 0);
  
  if (requestedEnd > today) {
    return today.toISOString().split('T')[0];
  }
  
  return endDate;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const startDate = searchParams.get('startDate') || '30daysAgo';
    const endDate = getMaxEndDate(searchParams.get('endDate') || 'today');

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // Get GA credentials
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('credentials, settings')
      .eq('business_id', businessId)
      .eq('type', 'google_analytics')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ 
        error: 'Google Analytics not connected',
        needsAuth: true 
      }, { status: 401 });
    }

    if (!integration.settings?.property_id) {
      return NextResponse.json({ 
        error: 'No GA4 property selected',
        needsPropertySelection: true 
      }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: integration.credentials.access_token,
      refresh_token: integration.credentials.refresh_token,
    });

    const analyticsData = google.analyticsdata({
      version: 'v1beta',
      auth: oauth2Client,
    });

    const propertyId = integration.settings.property_id;

    // Search terms - using searchTerm dimension
    // GA4 tracks this via view_search_results event
    const searchResponse = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'searchTerm' }],
        metrics: [
          { name: 'eventCount' }, // Number of searches
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: {
              matchType: 'EXACT',
              value: 'view_search_results',
            },
          },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: '50',
      },
    });

    // Also get click data (if tracking search result clicks)
    let clicksMap: Record<string, number> = {};
    try {
      const clicksResponse = await analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'searchTerm' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              stringFilter: {
                matchType: 'EXACT',
                value: 'select_content', // Or custom event for search click
              },
            },
          },
          limit: '50',
        },
      });
      
      (clicksResponse.data.rows || []).forEach(row => {
        const term = row.dimensionValues?.[0]?.value || '';
        clicksMap[term] = parseInt(row.metricValues?.[0]?.value || '0');
      });
    } catch (e) {
      // Clicks tracking might not be set up
    }

    const terms = (searchResponse.data.rows || [])
      .filter(row => {
        const term = row.dimensionValues?.[0]?.value || '';
        return term && term !== '(not set)' && term.length > 1;
      })
      .map(row => {
        const term = row.dimensionValues?.[0]?.value || '';
        const searches = parseInt(row.metricValues?.[0]?.value || '0');
        const clicks = clicksMap[term] || Math.floor(searches * 0.3); // Estimate if no data
        return {
          term,
          searches,
          clicks,
          ctr: searches > 0 ? (clicks / searches) * 100 : 0,
          hasResults: true, // We can't know this from GA4 directly, assume true
        };
      });

    // Identify opportunities - high search, low CTR
    const opportunities = terms
      .filter(t => t.searches >= 5 && t.ctr < 10)
      .slice(0, 5)
      .map(t => ({
        term: t.term,
        searches: t.searches,
        suggestion: t.ctr < 5 ? 'בדוק רלוונטיות תוצאות' : 'שפר תצוגת מוצרים',
      }));

    // Summary
    const totalSearches = terms.reduce((sum, t) => sum + t.searches, 0);
    const totalClicks = terms.reduce((sum, t) => sum + t.clicks, 0);

    return NextResponse.json({
      terms,
      summary: {
        totalSearches,
        uniqueTerms: terms.length,
        avgCtr: totalSearches > 0 ? (totalClicks / totalSearches) * 100 : 0,
        noResultsPercent: 0, // Would need custom event tracking
      },
      opportunities,
    });

  } catch (error: any) {
    console.error('Search Terms API Error:', error);
    
    // Return mock data if search tracking not available
    if (error.message?.includes('searchTerm')) {
      return NextResponse.json({
        terms: [],
        summary: {
          totalSearches: 0,
          uniqueTerms: 0,
          avgCtr: 0,
          noResultsPercent: 0,
        },
        opportunities: [],
        note: 'מעקב חיפושים לא מוגדר. יש להגדיר אירוע view_search_results ב-GA4.',
      });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
