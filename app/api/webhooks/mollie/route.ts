import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createMollieClient } from '@mollie/api-client';
import sgMail from '@sendgrid/mail';

/**
 * POST /api/webhooks/mollie
 * Called by Mollie on payment status changes
 * No auth required — verified by fetching the order from Mollie directly
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const mollieOrderId = params.get('id');

  if (!mollieOrderId) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey || apiKey.includes('placeholder')) {
    return NextResponse.json({ received: true });
  }

  const mollie = createMollieClient({ apiKey });
  const mollieOrder = await mollie.orders.get(mollieOrderId);

  const admin = createAdminClient();

  // Find our order by mollie_order_id
  const { data: order } = await admin
    .from('orders')
    .select('id, customer_email, customer_name, total_cents, payment_status')
    .eq('mollie_order_id', mollieOrderId)
    .single();

  if (!order) {
    console.error(`Webhook: no order found for Mollie order ${mollieOrderId}`);
    return NextResponse.json({ received: true }); // Return 200 to prevent Mollie retries
  }

  // Map Mollie status to our payment_status enum
  const statusMap: Record<string, string> = {
    created:    'PENDING',
    paid:       'PAID',
    authorized: 'AUTHORIZED',
    canceled:   'CANCELLED',
    shipping:   'AUTHORIZED',
    completed:  'PAID',
    expired:    'CANCELLED',
  };

  const newStatus = statusMap[mollieOrder.status] ?? 'PENDING';

  if (newStatus === order.payment_status) {
    return NextResponse.json({ received: true }); // No change
  }

  // Update order status
  await admin
    .from('orders')
    .update({ payment_status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', order.id);

  // Write audit log
  await admin.from('audit_logs').insert({
    tenant_id: '00000000-0000-0000-0000-000000000001',
    action: 'ORDER_PAYMENT_UPDATE',
    payload: {
      order_id: order.id,
      mollie_order_id: mollieOrderId,
      old_status: order.payment_status,
      new_status: newStatus,
    },
  });

  // Send confirmation email on successful payment
  if (newStatus === 'PAID' && order.payment_status !== 'PAID') {
    const sendgridKey = process.env.SENDGRID_API_KEY;
    if (sendgridKey && !sendgridKey.includes('placeholder')) {
      try {
        sgMail.setApiKey(sendgridKey);
        await sgMail.send({
          to: order.customer_email,
          from: { email: process.env.SENDGRID_FROM_EMAIL!, name: process.env.SENDGRID_FROM_NAME ?? 'Schoonmaster' },
          subject: `Payment Confirmed — Order #${order.id.slice(0, 8).toUpperCase()}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f1117;color:#e0e0e0;padding:40px;border-radius:12px;">
              <div style="background:linear-gradient(135deg,#10a898,#2558a0);border-radius:8px;padding:24px;text-align:center;margin-bottom:32px;">
                <h1 style="color:white;margin:0;font-size:24px;">Payment Confirmed ✅</h1>
              </div>
              <p>Dear ${order.customer_name},</p>
              <p>Your payment of <strong>€${(order.total_cents / 100).toFixed(2)}</strong> has been confirmed.</p>
              <p><strong>Order reference:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
              <p>Our team will be in touch shortly to coordinate your service or delivery.</p>
              <hr style="border:none;border-top:1px solid #333;margin:24px 0;" />
              <p style="font-size:12px;color:#888;">Schoonmaster BV · Operations Platform</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
