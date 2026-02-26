import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, GitBranch, Users, Hash } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { nodes: true, logs: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Campaigns
          </h2>
          <p className="text-sm text-slate-500">
            {campaigns.length}{" "}
            {campaigns.length === 1 ? "campaign" : "campaigns"}
          </p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-slate-100 p-4">
              <GitBranch className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No campaigns yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first automation campaign to engage contacts.
            </p>
            <Button asChild className="mt-4">
              <Link href="/campaigns/new">
                <Plus className="h-4 w-4" />
                Create Campaign
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{campaign.name}</CardTitle>
                    <Badge
                      className={statusColors[campaign.status] || ""}
                      variant="secondary"
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  {campaign.description && (
                    <CardDescription className="line-clamp-2">
                      {campaign.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {campaign._count.nodes} nodes
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {campaign._count.logs} contacts
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Created {formatDate(campaign.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
