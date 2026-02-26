import Handlebars from "handlebars";
import type { Contact } from "@prisma/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type RenderParams = {
  html: string;
  contact: Contact;
  extraVars?: Record<string, unknown>;
  emailLogId?: string;
  campaignId?: string;
};

function buildUnsubscribeUrl(contactId: string, campaignId?: string): string {
  const params = new URLSearchParams({ cid: contactId });
  if (campaignId) params.set("campaign", campaignId);
  return `${APP_URL}/unsubscribe?${params.toString()}`;
}

function buildTrackingPixelUrl(emailLogId?: string): string {
  if (!emailLogId) return "";
  return `${APP_URL}/api/v1/tracking/open/${emailLogId}`;
}

function buildClickTrackingUrl(
  originalUrl: string,
  emailLogId?: string,
  _contactId?: string
): string {
  if (!emailLogId) return originalUrl;
  const payload = Buffer.from(
    JSON.stringify({ emailLogId, url: originalUrl })
  ).toString("base64");
  return `${APP_URL}/api/v1/tracking/click/${encodeURIComponent(payload)}`;
}

function replaceLinksWithTracking(
  html: string,
  emailLogId?: string,
  contactId?: string
): string {
  if (!emailLogId) return html;

  return html.replace(
    /<a\s([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
    (_match, before: string, url: string, after: string) => {
      if (
        url.startsWith("mailto:") ||
        url.startsWith("tel:") ||
        url.includes("/unsubscribe") ||
        url.startsWith("#")
      ) {
        return `<a ${before}href="${url}"${after}>`;
      }
      const tracked = buildClickTrackingUrl(url, emailLogId, contactId);
      return `<a ${before}href="${tracked}"${after}>`;
    }
  );
}

export function renderEmailTemplate({
  html,
  contact,
  extraVars,
  emailLogId,
  campaignId,
}: RenderParams): string {
  const trackingPixelUrl = buildTrackingPixelUrl(emailLogId);
  const unsubscribeUrl = buildUnsubscribeUrl(contact.id, campaignId);

  const templateVars = {
    contact: {
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email,
      company: contact.company || "",
      title: contact.title || "",
    },
    unsubscribeUrl,
    trackingPixelUrl,
    ...extraVars,
  };

  const template = Handlebars.compile(html);
  let rendered = template(templateVars);

  rendered = replaceLinksWithTracking(rendered, emailLogId, contact.id);

  if (trackingPixelUrl && !rendered.includes(trackingPixelUrl)) {
    const pixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none" />`;
    rendered = rendered.replace("</body>", `${pixel}</body>`);
    if (!rendered.includes(pixel)) {
      rendered += pixel;
    }
  }

  return rendered;
}
