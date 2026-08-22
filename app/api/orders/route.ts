import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createMollieClient, OrderCreateParams } from '@mollie/api-client';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const BTW_RATE = 0.21; // Dutch VAT 21%

const OrderSchema = z.object({
  customer_name: z.string().min(2),
  customer_email: z.string().email(),
  customer_phone: z.string().optional(),
  delivery_address: z.string().optional(),
  payment_method: z.enum(['ONLINE_CARD', 'ONLINE_IDEAL', 'CASH_ON_DELIVERY', 'CASH_PICKUP']),
  notes: z.string().optional(),
  items: z.array(z.object({
    type: z.enum(['SERVICE', 'PRODUCT']),
    catalog_id: z.string().uuid(),
    name: z.string(),
    quantity: z.number().int().positive(),
    unit_price_cents: z.number().int().nonnegative(),
    service_address: z.string().optional(),
    service_date: z.string().optional(),
    service_instructions: z.string().optional(),
  })).min(1),
});

/**
 * POST /api/orders
 * Guest checkout — create order + Mollie payment session (for online payments)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parse = OrderSchema.safeParse(body);

  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid order data', details: parse.error.issues }, { status: 400 });
  }

  const data = parse.data;

  // Business rule: physical products require online payment
  const hasPhysicalProduct = data.items.some(i => i.type === 'PRODUCT');
  if (hasPhysicalProduct && ['CASH_ON_DELIVERY', 'CASH_PICKUP'].includes(data.payment_method)) {
    return NextResponse.json({
      error: 'Physical products require online payment (card or iDEAL).',
    }, { status: 422 });
  }

  // Cash options require service-only or local delivery
  if (['CASH_ON_DELIVERY', 'CASH_PICKUP'].includes(data.payment_method) && !data.delivery_address && data.items.some(i => i.type === 'PRODUCT')) {
    return NextResponse.json({ error: 'Cash payment is only available for service delivery or local pickup.' }, { status: 422 });
  }

  // Calculate totals
  const subtotal_cents = data.items.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);
  const tax_cents = Math.round(subtotal_cents * BTW_RATE);
  const total_cents = subtotal_cents + tax_cents;

  const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'; // Schoonmaster BV
  const admin = createAdminClient();

  // Create order record
  const { data: order, error: orderError } = await admin
    .from('orders')
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      delivery_address: data.delivery_address,
      items: data.items,
      subtotal_cents,
      tax_cents,
      total_cents,
      payment_method: data.payment_method,
      payment_status: 'PENDING',
      notes: data.notes,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }

  const orderId = order.id;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // For online payments — create Mollie payment session
  if (['ONLINE_CARD', 'ONLINE_IDEAL'].includes(data.payment_method)) {
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey || apiKey.includes('placeholder')) {
      return NextResponse.json({
        error: 'Online payment gateway is not yet configured on this environment. Please choose cash payment or contact support.',
      }, { status: 503 });
    }

    const mollie = createMollieClient({ apiKey });

    const mollieMethod = data.payment_method === 'ONLINE_IDEAL' ? 'ideal' : undefined;

    const mollieOrder = await mollie.orders.create({
      orderNumber: orderId.slice(0, 8).toUpperCase(),
      locale: 'nl_NL',
      amount: {
        value: (total_cents / 100).toFixed(2),
        currency: 'EUR',
      },
      method: mollieMethod as OrderCreateParams['method'],
      redirectUrl: `${appUrl}/store/confirmation/${orderId}`,
      webhookUrl: `${appUrl}/api/webhooks/mollie`,
      billingAddress: {
        streetAndNumber: data.delivery_address ?? 'N/A',
        city: 'Amsterdam',
        country: 'NL',
        givenName: data.customer_name.split(' ')[0],
        familyName: data.customer_name.split(' ').slice(1).join(' ') || '.',
        email: data.customer_email,
      },
      lines: data.items.map(item => ({
        type: item.type === 'PRODUCT' ? 'physical' : 'digital' as const,
        name: item.name,
        quantity: item.quantity,
        unitPrice: { value: (item.unit_price_cents / 100).toFixed(2), currency: 'EUR' as const },
        totalAmount: { value: ((item.unit_price_cents * item.quantity) / 100).toFixed(2), currency: 'EUR' as const },
        vatRate: '21.00',
        vatAmount: { value: ((item.unit_price_cents * item.quantity * BTW_RATE) / 100).toFixed(2), currency: 'EUR' as const },
      })),
    } as OrderCreateParams);

    // Update order with Mollie reference
    await admin.from('orders').update({
      mollie_order_id: mollieOrder.id,
      mollie_checkout_url: mollieOrder._links?.checkout?.href,
    }).eq('id', orderId);

    // Log telemetry
    await admin.from('telemetry_events').insert({
      tenant_id: DEFAULT_TENANT_ID,
      event_type: 'ORDER_CREATED',
      metadata: { order_id: orderId, total_cents, payment_method: data.payment_method },
    });

    return NextResponse.json({
      order_id: orderId,
      checkout_url: mollieOrder._links?.checkout?.href,
      payment_required: true,
    });
  }

  // Cash order — immediately confirmed
  await admin.from('orders').update({ payment_status: 'AUTHORIZED' }).eq('id', orderId);

  // Send confirmation email (fire-and-forget)
  fetch(`${appUrl}/api/notifications/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: data.customer_email,
      subject: `Order Confirmed — #${orderId.slice(0, 8).toUpperCase()}`,
      type: 'ORDER_CONFIRMATION',
      data: { order_id: orderId, customer_name: data.customer_name, total_cents, payment_method: data.payment_method },
    }),
  }).catch(() => {}); // non-blocking

  return NextResponse.json({ order_id: orderId, payment_required: false });
}
