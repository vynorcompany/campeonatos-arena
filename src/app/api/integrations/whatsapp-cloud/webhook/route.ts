import { cloudDeliveryWebhook } from "@/lib/integrations/whatsapp-cloud/delivery-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function handlers() {
  return cloudDeliveryWebhook({
    appSecret: process.env.WHATSAPP_CLOUD_APP_SECRET,
    verifyToken: process.env.WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN,
    phoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID,
    messagingAccountId: process.env.WHATSAPP_CLOUD_MESSAGING_ACCOUNT_ID,
  }, event => console.info("[whatsapp-cloud:delivery]", event));
}
export function GET(request: Request) { return handlers().GET(request); }
export function POST(request: Request) { return handlers().POST(request); }
