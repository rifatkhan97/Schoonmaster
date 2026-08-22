import { createClient } from '@/lib/supabase/server';
import StoreClient from './StoreClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cleaning Services & Supplies | Schoonmaster',
  description: 'Book professional cleaning services or order cleaning supplies directly from Schoonmaster BV.',
};

export default async function StorePage() {
  const supabase = await createClient();
  const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

  const [{ data: products }, { data: services }] = await Promise.all([
    supabase.from('product_catalog').select('*').eq('tenant_id', DEFAULT_TENANT_ID).eq('is_active', true).order('name'),
    supabase.from('service_catalog').select('*').eq('tenant_id', DEFAULT_TENANT_ID).eq('is_active', true).order('name'),
  ]);

  return (
    <StoreClient
      products={products ?? []}
      services={services ?? []}
    />
  );
}
