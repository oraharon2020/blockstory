import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export function createWooCommerceClient(url: string, consumerKey: string, consumerSecret: string) {
  return new WooCommerceRestApi({
    url,
    consumerKey,
    consumerSecret,
    version: 'wc/v3',
  });
}

// Order statuses that count as revenue
const VALID_ORDER_STATUSES = ['completed', 'processing', 'on-hold'];

export async function fetchOrders(
  client: WooCommerceRestApi,
  dateFrom: string,
  dateTo: string
) {
  try {
    const response = await client.get('orders', {
      after: `${dateFrom}T00:00:00+02:00`,
      before: `${dateTo}T23:59:59+02:00`,
      per_page: 100,
      status: VALID_ORDER_STATUSES,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching WooCommerce orders:', error);
    throw error;
  }
}

export async function fetchOrdersByDate(
  client: WooCommerceRestApi,
  date: string
) {
  try {
    // Use wider time range to account for timezone differences
    // Israel is UTC+2/+3, so we extend the range
    const response = await client.get('orders', {
      after: `${date}T00:00:00+02:00`,
      before: `${date}T23:59:59+02:00`,
      per_page: 100,
      status: VALID_ORDER_STATUSES,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching WooCommerce orders for date:', date, error);
    throw error;
  }
}

export function calculateDailyStats(orders: any[]) {
  const revenue = orders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
  const shippingCost = orders.reduce((sum, order) => sum + parseFloat(order.shipping_total || '0'), 0);
  const ordersCount = orders.length;

  return {
    revenue,
    shippingCost,
    ordersCount,
  };
}
