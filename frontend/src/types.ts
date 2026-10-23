export interface Customer {
  id: number;
  customer_code: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  unit_price: string | number;
  status: string;
}

export interface SalesOrderItem {
  id: number;
  sales_order_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: string;
  unit_price: string;
  line_total: string;
  created_at: string;
}

export type OrderStatus = 'draft' | 'confirmed' | 'cancelled' | 'completed';

export interface SalesOrder {
  id: number;
  order_number: string | null;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  status: OrderStatus;
  order_date: string;
  subtotal: string;
  total_amount: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  items: SalesOrderItem[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
