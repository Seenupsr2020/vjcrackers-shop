export interface Product {
  id: number;
  product_serial_no: string;
  product_name: string;
  product_image: string;
  regular_price: number;
  sale_price: number;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Invoice {
  id: number;
  first_name: string;
  last_name: string;
  address: string;
  state: string;
  city: string;
  phone_number: string;
  email?: string;
  total_amount: number;
  date: string;
  is_deleted: number;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name?: string;
  product_serial_no?: string;
}

export interface Stats {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
}

export interface AppSettings {
  company_name: string;
  company_logo: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  invoice_prefix: string;
  invoice_number_digits: string;
  invoice_footer: string;
  min_order_value: string;
  banner_url: string;
}
