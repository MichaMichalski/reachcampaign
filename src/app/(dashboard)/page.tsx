import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, GitBranch, Mail, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [totalContacts, activeCampaigns, emailsSentThisMonth] =
    await Promise.all([
      prisma.contact.count(),
      prisma.campaign.count({ where: { status: "ACTIVE" } }),
      prisma.emailLog.count({
        where: {
          createdAt: {
            gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1
            ),
          },
          status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] },
        },
      }),
    ]);

  return {
    totalContacts,
    activeCampaigns,
    emailsSentThisMonth,
    openRate: 24.8,
  };
}

const statCards = [
  {
    title: "Total Contacts",
    key: "totalContacts" as const,
    icon: Users,
    format: (v: number) => v.toLocaleString(),
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    title: "Active Campaigns",
    key: "activeCampaigns" as const,
    icon: GitBranch,
    format: (v: number) => v.toLocaleString(),
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Emails Sent",
    key: "emailsSentThisMonth" as const,
    icon: Mail,
    format: (v: number) => v.toLocaleString(),
    description: "This month",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Open Rate",
    key: "openRate" as const,
    icon: BarChart3,
    format: (v: number) => `${v}%`,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h2>
        <p className="text-sm text-slate-500">
          Here&apos;s an overview of your marketing performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <Card key={card.key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {card.format(value)}
                </div>
                {card.description && (
                  <CardDescription>{card.description}</CardDescription>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest actions across your campaigns and contacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                action: "New contact added",
                detail: "john@example.com was imported",
                time: "2 minutes ago",
              },
              {
                action: "Campaign started",
                detail: '"Welcome Series" is now active',
                time: "1 hour ago",
              },
              {
                action: "Email delivered",
                detail: "Newsletter #12 sent to 1,240 contacts",
                time: "3 hours ago",
              },
              {
                action: "Form submission",
                detail: "New lead from landing page signup",
                time: "5 hours ago",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {item.action}
                  </p>
                  <p className="text-sm text-slate-500">{item.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
