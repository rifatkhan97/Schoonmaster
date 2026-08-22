'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { ProductCatalogItem, ServiceCatalogItem, CartItem } from '@/types';

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export default function StoreClient({
  products,
  services,
}: {
  products: ProductCatalogItem[];
  services: ServiceCatalogItem[];
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [serviceModal, setServiceModal] = useState<ServiceCatalogItem | null>(null);
  const [serviceForm, setServiceForm] = useState({ address: '', date: '', instructions: '' });

  const cartTotal = cart.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addProduct = useCallback((product: ProductCatalogItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id && i.type === 'PRODUCT');
      if (existing) return prev.map(i => i.id === product.id && i.type === 'PRODUCT' ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, type: 'PRODUCT', name: product.name, quantity: 1, unit_price_cents: product.price_cents }];
    });
  }, []);

  const addService = useCallback(() => {
    if (!serviceModal) return;
    setCart(prev => [...prev, {
      id: serviceModal.id,
      type: 'SERVICE',
      name: serviceModal.name,
      quantity: 1,
      unit_price_cents: serviceModal.base_price_cents,
      service_address: serviceForm.address,
      service_date: serviceForm.date,
      service_instructions: serviceForm.instructions,
    }]);
    setServiceModal(null);
    setServiceForm({ address: '', date: '', instructions: '' });
  }, [serviceModal, serviceForm]);

  const removeFromCart = useCallback((id: string, type: string) => {
    setCart(prev => prev.filter(i => !(i.id === id && i.type === type)));
  }, []);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-0)' }}>
      {/* Store Header */}
      <header style={{
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: 'var(--space-4) var(--space-6)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="auth-logo-mark" style={{ width: '2.25rem', height: '2.25rem', fontSize: '0.9rem' }}>S</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)', letterSpacing: '-0.02em' }}>
              Schoon<span style={{ color: 'var(--teal-400)' }}>master</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Services & Supplies</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link href="/login" className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
            Staff Login
          </Link>
          {cartCount > 0 && (
            <Link href="/store/cart" className="btn btn-primary" id="store-cart-btn" style={{ position: 'relative' }}>
              🛒 Cart
              <span className="cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--brand-800) 0%, var(--brand-900) 50%, rgba(20,201,184,0.1) 100%)',
        padding: 'var(--space-16) var(--space-6)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div className="auth-bg-orb" style={{ width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(16,168,152,0.15) 0%, transparent 70%)', top: '-100px', left: '50%', transform: 'translateX(-50%)', position: 'absolute', pointerEvents: 'none', filter: 'blur(60px)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-block', background: 'rgba(20,201,184,0.1)', border: '1px solid rgba(20,201,184,0.3)', borderRadius: 'var(--radius-full)', padding: '0.25rem 1rem', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--teal-300)', textTransform: 'uppercase', marginBottom: 'var(--space-4)' }}>
            Professional Cleaning Solutions
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 'var(--space-4)' }}>
            Commercial Cleaning<br />
            <span className="text-gradient">Services & Supplies</span>
          </h1>
          <p style={{ color: 'var(--gray-300)', fontSize: 'var(--text-lg)', maxWidth: '560px', margin: '0 auto var(--space-8)', lineHeight: 1.7 }}>
            Book professional cleaning services for your facility or order high-quality cleaning supplies delivered to your door.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('services')} className="btn btn-primary btn-lg" id="hero-services-btn">
              Book a Service
            </button>
            <button onClick={() => setActiveTab('products')} className="btn btn-secondary btn-lg" id="hero-products-btn">
              Shop Supplies
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container" style={{ padding: 'var(--space-12) var(--space-6)' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-8)', background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-1)', width: 'fit-content' }}>
          {(['services', 'products'] as const).map(tab => (
            <button
              key={tab}
              id={`store-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className="btn"
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg, var(--teal-500), var(--brand-400))' : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--text-muted)',
                padding: '0.5rem var(--space-5)',
                boxShadow: activeTab === tab ? 'var(--shadow-glow-teal)' : 'none',
              }}
            >
              {tab === 'services' ? '🏢 Cleaning Services' : '📦 Supplies'}
            </button>
          ))}
        </div>

        {/* Services grid */}
        {activeTab === 'services' && (
          <div>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Cleaning Services</h2>
              <p className="text-muted">Professional cleaning for offices, commercial spaces, and residential properties</p>
            </div>
            {services.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: '3rem' }}>🏢</span>
                <p className="empty-state-title">No services available yet</p>
              </div>
            ) : (
              <div className="grid-3">
                {services.map(svc => (
                  <div key={svc.id} className="product-card" id={`service-card-${svc.id}`}>
                    <div style={{ padding: 'var(--space-6)' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🏢</div>
                      <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{svc.name}</h3>
                      {svc.description && (
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
                          {svc.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                        <div>
                          <div className="product-price">{formatPrice(svc.base_price_cents)}</div>
                          {svc.duration_hours && (
                            <div className="product-price-sub">~{svc.duration_hours}h session</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setServiceModal(svc)}
                        className="btn btn-primary w-full"
                        id={`book-service-${svc.id}`}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Products grid */}
        {activeTab === 'products' && (
          <div>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>Cleaning Supplies</h2>
              <p className="text-muted">Professional-grade cleaning products for every surface and application</p>
            </div>
            {products.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: '3rem' }}>📦</span>
                <p className="empty-state-title">No products available yet</p>
              </div>
            ) : (
              <div className="grid-4">
                {products.map(product => {
                  const inCart = cart.find(i => i.id === product.id && i.type === 'PRODUCT');
                  return (
                    <div key={product.id} className="product-card" id={`product-card-${product.id}`}>
                      <div style={{ height: '160px', background: 'linear-gradient(135deg, var(--surface-2), var(--surface-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                        🧴
                      </div>
                      <div className="product-card-body">
                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>{product.name}</h3>
                        {product.description && (
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                            {product.description}
                          </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                          <div className="product-price">{formatPrice(product.price_cents)}</div>
                          <div className="product-price-sub">/{product.unit}</div>
                        </div>
                        <button
                          onClick={() => addProduct(product)}
                          className={`btn w-full ${inCart ? 'btn-secondary' : 'btn-primary'}`}
                          id={`add-product-${product.id}`}
                        >
                          {inCart ? `In Cart (${inCart.quantity})` : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating cart summary */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 'var(--space-6)', left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, var(--teal-500), var(--brand-400))',
          borderRadius: 'var(--radius-full)', padding: 'var(--space-3) var(--space-6)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
          boxShadow: 'var(--shadow-xl), var(--shadow-glow-teal)',
          zIndex: 40, animation: 'slide-up 0.3s ease',
          color: 'white', fontWeight: 700,
        }}>
          <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
          <span style={{ opacity: 0.7 }}>·</span>
          <span>{formatPrice(cartTotal)} + BTW</span>
          <Link href="/store/cart" style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 'var(--radius-full)', padding: '0.375rem var(--space-4)', color: 'white', fontWeight: 700, fontSize: 'var(--text-sm)' }} id="floating-cart-btn">
            View Cart →
          </Link>
        </div>
      )}

      {/* Service booking modal */}
      {serviceModal && (
        <div className="modal-overlay" onClick={() => setServiceModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 'var(--text-xl)' }}>Book: {serviceModal.name}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setServiceModal(null)} aria-label="Close modal">✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label htmlFor="svc-address" className="form-label">Service Address *</label>
                <input
                  id="svc-address"
                  type="text"
                  className="form-input"
                  placeholder="Street address, city"
                  value={serviceForm.address}
                  onChange={e => setServiceForm(p => ({ ...p, address: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="svc-date" className="form-label">Preferred Date & Time *</label>
                <input
                  id="svc-date"
                  type="datetime-local"
                  className="form-input"
                  value={serviceForm.date}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => setServiceForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="svc-instructions" className="form-label">Special Instructions (optional)</label>
                <textarea
                  id="svc-instructions"
                  className="form-textarea"
                  placeholder="Access codes, specific areas, special requirements…"
                  value={serviceForm.instructions}
                  onChange={e => setServiceForm(p => ({ ...p, instructions: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex-between" style={{ marginTop: 'var(--space-2)' }}>
                <div>
                  <div className="product-price">{formatPrice(serviceModal.base_price_cents)}</div>
                  <div className="product-price-sub">excl. 21% BTW</div>
                </div>
                <button
                  onClick={addService}
                  className="btn btn-primary"
                  disabled={!serviceForm.address}
                  id="add-service-to-cart"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)', padding: 'var(--space-8) var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
        <p>© {new Date().getFullYear()} Schoonmaster BV · All prices include 21% BTW · <Link href="/login" style={{ color: 'var(--teal-400)' }}>Staff Portal</Link></p>
      </footer>
    </div>
  );
}
