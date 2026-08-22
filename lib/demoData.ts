import type { ProductCatalogItem, ServiceCatalogItem } from '@/types';

export const DEMO_SERVICES: ServiceCatalogItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Commercial Office Deep Clean',
    description: 'Comprehensive sanitization, floor scrubbing, desk disinfection, and glass cleaning for commercial facilities.',
    base_price_cents: 18900, // €189.00
    duration_hours: 3,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Post-Construction & Fitout Cleaning',
    description: 'Industrial dust extraction, paint/adhesive residue removal, and final polish for building handovers.',
    base_price_cents: 34900, // €349.00
    duration_hours: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000103',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Medical & Healthcare Facility Sanitation',
    description: 'Strict ISO-compliant hospital-grade bio-sanitization and high-touch surface disinfection.',
    base_price_cents: 27500, // €275.00
    duration_hours: 4,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000104',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Window & High-Rise Glass Washing',
    description: 'Pure water ionic pole system for exterior and interior commercial glass facades.',
    base_price_cents: 14500, // €145.00
    duration_hours: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const DEMO_PRODUCTS: ProductCatalogItem[] = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'EcoClean Multi-Surface Concentrate (5L)',
    description: 'Biodegradable industrial detergent formula for all hard floors, tile, and sealed surfaces.',
    price_cents: 2495, // €24.95
    unit: '5L Jug',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'MicroFiber Ultra Towels (Pack of 20)',
    description: 'Color-coded anti-bacterial lint-free microfiber cloths for designated hygiene zones.',
    price_cents: 1850, // €18.50
    unit: 'Pack of 20',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000203',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'BioSanitizer Hospital-Grade Spray (750ml)',
    description: 'Rapid 30-second kill time for viruses, bacteria, and spores. Certified surface disinfectant.',
    price_cents: 895, // €8.95
    unit: '750ml Spray',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000204',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Professional Heavy-Duty Floor Squeegee (60cm)',
    description: 'Reinforced dual-blade rubber squeegee for wet maintenance and rapid liquid clearance.',
    price_cents: 3250, // €32.50
    unit: 'Unit',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000205',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Industrial HEPA Filter Pack (5 Pcs)',
    description: 'High-efficiency particulate air filters compatible with all Schoonmaster commercial vacuums.',
    price_cents: 1599, // €15.99
    unit: 'Pack of 5',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000206',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Nitrile Protective Gloves (Box of 100)',
    description: 'Chemical-resistant powder-free ergonomic cleaning gloves for professional technicians.',
    price_cents: 1250, // €12.50
    unit: 'Box of 100',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
