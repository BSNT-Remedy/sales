import { api } from './api';
import {
  Customer,
  PaginatedResponse,
  Product,
  SalesOrder,
  SalesOrderItem,
} from '../types';

type ListResponse<T> = PaginatedResponse<T> | T[];

function unwrapList<T>(data: ListResponse<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

export async function getCustomers(search = '') {
  const { data } = await api.get<ListResponse<Customer>>('/customers/', {
    params: { search: search || undefined, page_size: 100 },
  });
  return unwrapList(data);
}

export async function searchProducts(search: string) {
  const { data } = await api.get<Product[]>('/products/', {
    params: { search },
  });
  return data;
}

export async function getOrders(params: {
  page?: number;
  status?: string;
  order_number?: string;
}) {
  const { data } = await api.get<PaginatedResponse<SalesOrder> | SalesOrder[]>('/sales-orders/', {
    params,
  });
  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null };
  }
  return data;
}

export async function getOrder(id: string) {
  const { data } = await api.get<SalesOrder>(`/sales-orders/${id}/`);
  return data;
}

export async function createOrder(customer_id: number) {
  const { data } = await api.post<SalesOrder>('/sales-orders/', { customer_id });
  return data;
}

export async function addOrderItem(order: number, product: number, quantity: string) {
  const { data } = await api.post<SalesOrderItem>('/sales-order-items/', {
    sales_order_id: order,
    product_id: product,
    quantity,
  });
  return data;
}

export async function updateOrderItemQuantity(id: number, quantity: string) {
  const { data } = await api.patch<SalesOrderItem>(`/sales-order-items/${id}/`, { quantity });
  return data;
}

export async function deleteOrderItem(id: number) {
  await api.delete(`/sales-order-items/${id}/`);
}

export async function confirmOrder(id: number) {
  const { data } = await api.post<SalesOrder>(`/sales-orders/${id}/confirm/`);
  return data;
}
