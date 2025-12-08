import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export function createWooCommerceClient(url: string, consumerKey: string, consumerSecret: string) {
  return new WooCommerceRestApi({
    url,
    consumerKey,
    consumerSecret,
    version: 'wc/v3',
  });
}

// Default order statuses that count as revenue
const DEFAULT_VALID_STATUSES = ['completed', 'processing', 'on-hold'];

export async function fetchOrders(
  client: WooCommerceRestApi,
  dateFrom: string,
  dateTo: string,
  validStatuses?: string[]
) {
  try {
    const statuses = validStatuses || DEFAULT_VALID_STATUSES;
    // Use dates_are_gmt=false to use the store's timezone
    const response = await client.get('orders', {
      after: `${dateFrom}T00:00:00`,
      before: `${dateTo}T23:59:59`,
      per_page: 100,
      status: statuses,
      dates_are_gmt: false,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching WooCommerce orders:', error);
    throw error;
  }
}

export async function fetchOrdersByDate(
  client: WooCommerceRestApi,
  date: string,
  validStatuses?: string[]
) {
  try {
    const statuses = validStatuses || DEFAULT_VALID_STATUSES;
    console.log(`🔍 WooCommerce query: date=${date}, statuses count=${statuses.length}`);
    console.log(`   First 5 statuses: ${statuses.slice(0, 5).join(', ')}`);
    
    // Use dates_are_gmt=false to use the store's timezone (Jerusalem)
    const response = await client.get('orders', {
      after: `${date}T00:00:00`,
      before: `${date}T23:59:59`,
      per_page: 100,
      status: statuses,
      dates_are_gmt: false,
    });
    
    console.log(`   📦 Response: ${response.data?.length || 0} orders`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching WooCommerce orders for date:', date);
    console.error('Error details:', error?.response?.data || error.message);
    throw error;
  }
}

export function calculateDailyStats(
  orders: any[], 
  fixedShippingCost: number = 0, 
  chargeShippingOnFreeOrders: boolean = true,
  freeShippingMethods: string[] = ['local_pickup', 'pickup_location', 'pickup', 'store_pickup']
) {
  const revenue = orders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
  
  // Helper to check if order is pickup (no actual shipping cost)
  const isPickupOrder = (order: any) => {
    if (!order.shipping_lines || order.shipping_lines.length === 0) return true;
    return order.shipping_lines.every((line: any) => 
      freeShippingMethods.includes(line.method_id?.toLowerCase())
    );
  };
  
  // Count orders that need shipping cost (excluding pickup orders)
  // If chargeShippingOnFreeOrders is true, count all orders that have shipping lines (even if $0) but NOT pickup
  // Otherwise, only count orders with shipping_total > 0
  const ordersWithShipping = chargeShippingOnFreeOrders
    ? orders.filter(order => {
        // Skip pickup orders - they don't have actual shipping cost
        if (isPickupOrder(order)) return false;
        // Check if order has any shipping line items (even free shipping)
        const hasShippingLines = order.shipping_lines && order.shipping_lines.length > 0;
        // Or has a shipping method set
        const hasShippingMethod = order.shipping_lines?.some((line: any) => line.method_id);
        return hasShippingLines || hasShippingMethod;
      }).length
    : orders.filter(order => {
        // Skip pickup orders
        if (isPickupOrder(order)) return false;
        return parseFloat(order.shipping_total || '0') > 0;
      }).length;
  
  // If fixed shipping cost is set, use it per order. Otherwise use customer-paid shipping.
  // Pickup orders are excluded from both calculations
  const shippingCost = fixedShippingCost > 0 
    ? ordersWithShipping * fixedShippingCost
    : orders.reduce((sum, order) => {
        // Don't add shipping cost for pickup orders
        if (isPickupOrder(order)) return sum;
        return sum + parseFloat(order.shipping_total || '0');
      }, 0);
  
  const ordersCount = orders.length;
  
  // Count total items/products sold (sum of all line_items quantities)
  const itemsCount = orders.reduce((sum, order) => {
    if (!order.line_items) return sum;
    return sum + order.line_items.reduce((itemSum: number, item: any) => {
      return itemSum + (parseInt(item.quantity) || 1);
    }, 0);
  }, 0);

  return {
    revenue,
    shippingCost,
    ordersCount,
    itemsCount,
  };
}
