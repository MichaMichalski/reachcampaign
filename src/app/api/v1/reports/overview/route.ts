import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalContacts,
      newContactsThisMonth,
      newContactsPrevMonth,
      emailsSent,
      emailsOpened,
      emailsClicked,
      emailsBounced,
      activeCampaigns,
      formSubmissions,
    ] = await Promise.all([
      prisma.contact.count(),
      prisma.contact.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.contact.count({
        where: {
          createdAt: { gte: startOfPrevMonth, lt: startOfMonth },
        },
      }),
      prisma.emailLog.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] },
        },
      }),
      prisma.emailLog.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: ["OPENED", "CLICKED"] },
        },
      }),
      prisma.emailLog.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: "CLICKED",
        },
      }),
      prisma.emailLog.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: "BOUNCED",
        },
      }),
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.formSubmission.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    const totalEmailsForRates = emailsSent + emailsBounced;
    const openRate =
      totalEmailsForRates > 0
        ? Math.round((emailsOpened / totalEmailsForRates) * 1000) / 10
        : 0;
    const clickRate =
      totalEmailsForRates > 0
        ? Math.round((emailsClicked / totalEmailsForRates) * 1000) / 10
        : 0;
    const bounceRate =
      totalEmailsForRates > 0
        ? Math.round((emailsBounced / totalEmailsForRates) * 1000) / 10
        : 0;

    const contactGrowth =
      newContactsPrevMonth > 0
        ? Math.round(
            ((newContactsThisMonth - newContactsPrevMonth) /
              newContactsPrevMonth) *
              1000
          ) / 10
        : newContactsThisMonth > 0
          ? 100
          : 0;

    return jsonResponse({
      contacts: {
        total: totalContacts,
        newThisMonth: newContactsThisMonth,
        growth: contactGrowth,
      },
      emails: {
        sent: emailsSent,
        opened: emailsOpened,
        clicked: emailsClicked,
        bounced: emailsBounced,
      },
      rates: { openRate, clickRate, bounceRate },
      activeCampaigns,
      formSubmissions,
    });
  } catch {
    return errorResponse("Failed to fetch overview report", 500);
  }
}
