// AI Chat Module Types

export interface BusinessMetrics {
  // Revenue & Orders
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  
  // Expenses breakdown
  totalExpenses: number;
  expensesVat: number;
  expensesNoVat: number;
  employeeCosts: number;
  adsCosts: {
    google: number;
    facebook: number;
    tiktok: number;
    total: number;
  };
  shippingCosts: number;
  materialsCosts: number;
  creditCardFees: number;
  customerRefunds: number;
  
  // Profit
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  
  // VAT
  vatCollected: number;
  vatDeductible: number;
  vatPayable: number;
  
  // Period info
  period: {
    type: 'day' | 'week' | 'month' | 'year' | 'custom';
    startDate: string;
    endDate: string;
    daysCount: number;
  };
  
  // Trends (compared to previous period)
  trends?: {
    revenueChange: number;
    ordersChange: number;
    profitChange: number;
    expensesChange: number;
  };
}

export interface DailyMetrics {
  date: string;
  revenue: number;
  orders: number;
  expenses: number;
  profit: number;
  adsCost: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

export interface AIContext {
  businessName: string;
  metrics: BusinessMetrics;
  dailyData: DailyMetrics[];
  topProducts?: TopProduct[];
  insights?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: AIContext;
}

export interface AIQueryType {
  type: 'revenue' | 'expenses' | 'profit' | 'comparison' | 'trend' | 'recommendation' | 'general';
  timeframe?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';
  startDate?: string;
  endDate?: string;
}
