import { createClient } from 'npm:@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const requiredEnv = (name: string): string => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

function normalizeE164(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const compact = input.trim().replace(/[\s().-]/g, '');
  const normalized = compact.startsWith('+') ? compact : `+${compact}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `+${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function writeDeliveryLog(input: {
  userId?: string | null;
  phone: string;
  messageId?: string | null;
  template: string;
  status: 'accepted' | 'failed';
  errorCode?: string | null;
}) {
  try {
    const admin = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from('auth_delivery_logs').insert({
      user_id: input.userId || null,
      phone_hash: await sha256(input.phone),
      phone_masked: maskPhone(input.phone),
      provider: 'meta_whatsapp',
      provider_message_id: input.messageId || null,
      template: input.template,
      status: input.status,
      error_code: input.errorCode || null,
    });
    if (error) console.error('auth_delivery_log_write_failed', { code: error.code });
  } catch (error) {
    console.error('auth_delivery_log_write_failed', { type: error instanceof Error ? error.name : 'unknown' });
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let templateName = 'unknown';
  let phoneForFailureLog: string | null = null;
  let userIdForFailureLog: string | null = null;

  try {
    const hookSecret = requiredEnv('SEND_SMS_HOOK_SECRET').replace(/^v1,whsec_/, '');
    const payload = await req.text();
    const verified = new Webhook(hookSecret).verify(payload, Object.fromEntries(req.headers.entries())) as {
      user?: { id?: string; phone?: string };
      sms?: { otp?: string };
    };

    const phone = normalizeE164(verified?.user?.phone);
    const otp = verified?.sms?.otp;
    if (!phone || typeof otp !== 'string' || !/^\d{6,10}$/.test(otp)) {
      return json(400, { error: 'invalid_hook_payload' });
    }
    phoneForFailureLog = phone;
    userIdForFailureLog = verified.user?.id || null;

    const accessToken = requiredEnv('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = requiredEnv('META_WHATSAPP_PHONE_NUMBER_ID');
    requiredEnv('META_WHATSAPP_WABA_ID');
    templateName = requiredEnv('META_WHATSAPP_TEMPLATE_NAME');
    const language = requiredEnv('META_WHATSAPP_TEMPLATE_LANGUAGE');
    const graphVersion = requiredEnv('META_GRAPH_API_VERSION').replace(/^\//, '');

    const metaResponse = await fetch(`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: otp }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
          ],
        },
      }),
    });

    let providerBody: any = null;
    try { providerBody = await metaResponse.json(); } catch { providerBody = null; }
    const messageId = typeof providerBody?.messages?.[0]?.id === 'string' ? providerBody.messages[0].id : null;

    if (!metaResponse.ok || !messageId) {
      const providerCode = providerBody?.error?.code != null ? String(providerBody.error.code) : `http_${metaResponse.status}`;
      await writeDeliveryLog({ userId: verified.user?.id || null, phone, template: templateName, status: 'failed', errorCode: providerCode });
      console.error('meta_whatsapp_delivery_failed', { status: metaResponse.status, code: providerCode });
      return json(502, { error: 'otp_delivery_failed' });
    }

    await writeDeliveryLog({ userId: verified.user?.id || null, phone, messageId, template: templateName, status: 'accepted' });
    return new Response(null, { status: 200 });
  } catch (error) {
    const safeCode = error instanceof Error && error.message.startsWith('missing_') ? 'provider_not_configured' : 'hook_verification_or_delivery_failed';
    if (phoneForFailureLog) {
      await writeDeliveryLog({ userId: userIdForFailureLog, phone: phoneForFailureLog, template: templateName, status: 'failed', errorCode: safeCode });
    }
    console.error('send_whatsapp_auth_otp_failed', { code: safeCode, type: error instanceof Error ? error.name : 'unknown' });
    return json(safeCode === 'provider_not_configured' ? 503 : 401, { error: safeCode });
  }
});
