/**
 * What happens once a Checkout Session is paid, shared by the Stripe webhook
 * and the order page (which settles the order itself if the webhook is late).
 * Only the call that creates the order sends the emails and the Airtable copy.
 */

import { siteOrigin } from './http.js';
import { createOrderFromSession } from './orders.js';
import { sendOrderConfirmation, sendOrderTeamNotice } from './mail.js';
import { mirrorOrder } from './airtable-orders.js';

export const isPaid = (cs) => cs && cs.mode === 'payment' && ['paid', 'no_payment_required'].includes(cs.payment_status);

export async function onPaidSession(context, cs) {
  const { request, env } = context;
  const result = await createOrderFromSession(env, cs);
  if (result.created) {
    const { order, items } = result;
    const origin = siteOrigin(request, env);
    console.log('order', order.number, order.total, order.country);
    if (env.EMAIL) {
      context.waitUntil(sendOrderConfirmation(env, { order, items, origin }).catch((err) => console.error('order email', err && err.message)));
      context.waitUntil(sendOrderTeamNotice(env, { order, items, origin }).catch((err) => console.error('order team email', err && err.message)));
    }
    context.waitUntil(mirrorOrder(env, order, items).catch((err) => console.error('airtable order', err && err.message)));
  }
  return result;
}
