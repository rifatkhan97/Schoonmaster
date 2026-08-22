import { createClient } from '@/lib/supabase/server';
import StoreClient from './StoreClient';
import type { Metadata } from 'next';
import type { ProductCatalogItem, ServiceCatalogItem } from '@/types';

export const metadata: Metadata = {
  title: 'Cleaning Services & Supplies | Schoonmaster',
  description: 'Book professional cleaning services or order cleaning supplies directly from Schoonmaster BV.',
};

export default async function StorePage() {
  const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
  let products: ProductCatalogItem[] = [];
  let services: ServiceCatalogItem[] = [];

  try {
    const supabase = await createClient();
    const [pRes, sRes] = await Promise.all([
      supabase.from('product_catalog').select('*').eq('tenant_id', DEFAULT_TENANT_ID).eq('is_active', true).order('name'),
      supabase.from('service_catalog').select('*').eq('tenant_id', DEFAULT_TENANT_ID).eq('is_active', true).order('name'),
    ]);
    products = pRes.data ?? [];
    services = sRes.data ?? [];
  } catch (err) {
    console.error('Store page Supabase query error:', err);
  }

  return (
    <StoreClient
      products={products}
      services={services}
    />
  );
}
