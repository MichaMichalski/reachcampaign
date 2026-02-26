import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Mail,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Eye,
  AlertTriangle,
  GitBranch,
  FormInput,
} from "lucide-react";
import {
  LineChartComponent,
  BarChartComponent,
  AreaChartComponent,
  MultiLineChartComponent,
} from "@/components/shared/charts";

export const dynamic = "force-dynamic";

const DAYS = 30;

async function getOverviewStats() {
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
    prisma.contact.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.contact.count({
      where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } },
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
      where: { createdAt: { gte: startOfMonth }, status: "CLICKED" },
    }),
    prisma.emailLog.count({
      where: { createdAt: { gte: startOfMonth }, status: "BOUNCED" },
    }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.formSubmission.count({ where: { createdAt: { gte: startOfMonth } } }),
  ]);

  const total = emailsSent + emailsBounced;
  const openRate = total > 0 ? Math.round((emailsOpened / total) * 1000) / 10 : 0;
  const clickRate = total > 0 ? Math.round((emailsClicked / total) * 1000) / 10 : 0;
  const bounceRate = total > 0 ? Math.round((emailsBounced / total) * 1000) / 10 : 0;
  const contactGrowth =
    newContactsPrevMonth > 0
      ? Math.round(((newContactsThisMonth - newContactsPrevMonth) / newContactsPrevMonth) * 1000) / 10
      : newContactsThisMonth > 0
        ? 100
        : 0;

  return {
    totalContacts,
    newContactsThisMonth,
    contactGrowth,
    emailsSent,
    emailsOpened,
    emailsClicked,
    emailsBounced,
    openRate,
    clickRate,
    bounceRate,
    activeCampaigns,
    formSubmissions,
  };
}

async function getEmailPerformanceData() {
  const since = new Date();
  since.setDate(since.getDate() - DAYS);
  since.setHours(0, 0, 0, 0);

  const logs = await prisma.emailLog.findMany({
    where: { createdAt: { gte: since } },
    select: { status: true, createdAt: true },
  });

  const dayMap = new Map<string, { sent: number; opened: number; clicked: number; bounced: number }>();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { sent: 0, opened: 0, clicked: 0, bounced: 0 });
  }

  for (const log of logs) {
    const key = log.createdAt.toISOString().slice(0, 10);
    const entry = dayMap.get(key);
    if (!entry) continue;
    if (["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(log.status)) entry.sent++;
    if (["OPENED", "CLICKED"].includes(log.status)) entry.opened++;
    if (log.status === "CLICKED") entry.clicked++;
    if (log.status === "BOUNCED") entry.bounced++;
  }

  return Array.from(dayMap.entries()).map(([date, counts]) => ({
    date: date.slice(5),
    ...counts,
    openRate: counts.sent > 0 ? Math.round((counts.opened / counts.sent) * 100) : 0,
    bounceRate: counts.sent + counts.bounced > 0
      ? Math.round((counts.bounced / (counts.sent + counts.bounced)) * 100)
      : 0,
  }));
}

async function getCampaignPerformance() {
  const campaigns = await prisma.emailCampaign.findMany({
    where: { status: { in: ["SENT", "SENDING"] } },
    orderBy: { sentAt: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      totalSent: true,
      totalOpened: true,
      totalClicked: true,
      totalBounced: true,
    },
  });

  return campaigns.map((c) => ({
    name: c.name.length > 20 ? c.name.slice(0, 20) + "…" : c.name,
    sent: c.totalSent,
    opened: c.totalOpened,
    clicked: c.totalClicked,
  }));
}

async function getTopEmails() {
  const emails = await prisma.emailCampaign.findMany({
    where: { totalSent: { gt: 0 } },
    orderBy: { totalOpened: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      totalRecipients: true,
      totalSent: true,
      totalOpened: true,
      totalClicked: true,
      totalBounced: true,
      sentAt: true,
    },
  });

  return emails;
}

async function getContactGrowthData() {
  const since = new Date();
  since.setDate(since.getDate() - DAYS);
  since.setHours(0, 0, 0, 0);

  const contacts = await prisma.contact.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const dayMap = new Map<string, number>();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (DAYS - 1 - i));
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }

  for (const c of contacts) {
    const key = c.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, dayMap.get(key)! + 1);
  }

  let cumulative = 0;
  return Array.from(dayMap.entries()).map(([date, count]) => {
    cumulative += count;
    return { date: date.slice(5), newContacts: count, cumulative };
  });
}

export default async function ReportsPage() {
  const [stats, emailPerf, campaignPerf, topEmails, contactGrowth] =
    await Promise.all([
      getOverviewStats(),
      getEmailPerformanceData(),
      getCampaignPerformance(),
      getTopEmails(),
      getContactGrowthData(),
    ]);

  const statCards = [
    {
      title: "Total Contacts",
      value: stats.totalContacts.toLocaleString(),
      sub: `+${stats.newContactsThisMonth} this month`,
      trend: stats.contactGrowth,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Emails Sent",
      value: stats.emailsSent.toLocaleString(),
      sub: "This month",
      icon: Mail,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Open Rate",
      value: `${stats.openRate}%`,
      sub: `${stats.emailsOpened.toLocaleString()} opens`,
      icon: Eye,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Click Rate",
      value: `${stats.clickRate}%`,
      sub: `${stats.emailsClicked.toLocaleString()} clicks`,
      icon: MousePointerClick,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      title: "Bounce Rate",
      value: `${stats.bounceRate}%`,
      sub: `${stats.emailsBounced.toLocaleString()} bounces`,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Active Campaigns",
      value: stats.activeCampaigns.toLocaleString(),
      sub: "Currently running",
      icon: GitBranch,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Form Submissions",
      value: stats.formSubmissions.toLocaleString(),
      sub: "This month",
      icon: FormInput,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Reports &amp; Analytics
        </h2>
        <p className="text-sm text-slate-500">
          Monitor your email performance, contact growth, and campaign results.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-500">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-1.5 ${card.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-slate-900">{card.value}</div>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  {"trend" in card && card.trend !== undefined && (
                    <span
                      className={`inline-flex items-center gap-0.5 font-medium ${
                        card.trend >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {card.trend >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(card.trend)}%
                    </span>
                  )}
                  {card.sub}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Email Sends Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Sends (Last 30 Days)</CardTitle>
            <CardDescription>Daily email volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <MultiLineChartComponent
              data={emailPerf}
              xKey="date"
              lines={[
                { key: "sent", color: "#6366f1", label: "Sent" },
                { key: "opened", color: "#10b981", label: "Opened" },
                { key: "clicked", color: "#8b5cf6", label: "Clicked" },
              ]}
              height={280}
            />
          </CardContent>
        </Card>

        {/* Open Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Rate Trend</CardTitle>
            <CardDescription>Daily open rate percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={emailPerf}
              xKey="date"
              yKey="openRate"
              color="#10b981"
              height={280}
            />
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Performance</CardTitle>
            <CardDescription>Opens per campaign (recent campaigns)</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignPerf.length > 0 ? (
              <BarChartComponent
                data={campaignPerf}
                xKey="name"
                yKey="opened"
                color="#6366f1"
                height={280}
              />
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">
                No campaign data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Growth</CardTitle>
            <CardDescription>New contacts added over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChartComponent
              data={contactGrowth}
              xKey="date"
              yKey="cumulative"
              color="#6366f1"
              height={280}
            />
          </CardContent>
        </Card>

        {/* Bounce Rate Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Bounce Rate Trend</CardTitle>
            <CardDescription>Daily bounce rate percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={emailPerf}
              xKey="date"
              yKey="bounceRate"
              color="#ef4444"
              height={250}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Performing Emails</CardTitle>
          <CardDescription>Campaigns ranked by total opens</CardDescription>
        </CardHeader>
        <CardContent>
          {topEmails.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4">Campaign</th>
                    <th className="pb-3 pr-4 text-right">Recipients</th>
                    <th className="pb-3 pr-4 text-right">Sent</th>
                    <th className="pb-3 pr-4 text-right">Opened</th>
                    <th className="pb-3 pr-4 text-right">Clicked</th>
                    <th className="pb-3 pr-4 text-right">Open Rate</th>
                    <th className="pb-3 text-right">Click Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topEmails.map((email) => {
                    const or = email.totalSent > 0
                      ? Math.round((email.totalOpened / email.totalSent) * 1000) / 10
                      : 0;
                    const cr = email.totalSent > 0
                      ? Math.round((email.totalClicked / email.totalSent) * 1000) / 10
                      : 0;
                    return (
                      <tr key={email.id} className="text-slate-700">
                        <td className="py-3 pr-4 font-medium">{email.name}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {email.totalRecipients.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {email.totalSent.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {email.totalOpened.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {email.totalClicked.toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          <span className="text-emerald-600 font-medium">{or}%</span>
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          <span className="text-violet-600 font-medium">{cr}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              No email campaigns sent yet. Data will appear here once you send your first campaign.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
