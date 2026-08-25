import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type SendSmsHookPayload = {
  user?: {
    id?: string;
    phone?: string;
  };
  sms?: {
    otp?: string;
  };
};

const jsonHeaders = {
  "Content-Type": "application/json",
};

function env(name: string, aliases: string[] = []): string {
  for (const key of [name, ...aliases]) {
    const value = Deno.env.get(key)?.trim();
    if (value) return value;
  }
  throw new Error(`${name} is not configured`);
}

function normalizeHookSecret(value: string): string {
  return value.replace(/^v\d+,whsec_/, "");
}

function whatsappRecipient(phone: string): string {
  return phone.replace(/^\+/, "").replace(/\D/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: { message: "Method not allowed" } }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const payload = await req.text();
    const hookSecret = normalizeHookSecret(env("SEND_SMS_HOOK_SECRET", ["SEND_SMS_HOOK_SECRETS"]));
    const verified = new Webhook(hookSecret).verify(payload, Object.fromEntries(req.headers)) as SendSmsHookPayload;

    const phone = verified.user?.phone;
    const otp = verified.sms?.otp;
    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: { message: "Missing phone or OTP in Supabase Auth hook payload" } }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const graphApiVersion = Deno.env.get("META_GRAPH_API_VERSION")?.trim() || "v21.0";
    const accessToken = env("META_WHATSAPP_ACCESS_TOKEN", ["META_WA_ACCESS_TOKEN"]);
    const phoneNumberId = env("META_WHATSAPP_PHONE_NUMBER_ID", ["META_WA_PHONE_NUMBER_ID"]);
    const templateName = env("META_WHATSAPP_TEMPLATE_NAME", ["META_WA_AUTH_TEMPLATE"]);
    const templateLanguage = Deno.env.get("META_WHATSAPP_TEMPLATE_LANGUAGE")?.trim() || "en_US";

    const response = await fetch(`https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: whatsappRecipient(phone),
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: {
            http_code: response.status,
            message: result?.error?.message || "Meta WhatsApp OTP delivery failed",
          },
        }),
        { status: response.status, headers: jsonHeaders },
      );
    }

    console.log("whatsapp_auth_otp_sent", {
      userId: verified.user?.id,
      phone,
      messageId: result?.messages?.[0]?.id,
    });

    return new Response(JSON.stringify({}), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("whatsapp_auth_otp_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({
        error: {
          http_code: 500,
          message: "Failed to send WhatsApp OTP",
        },
      }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
