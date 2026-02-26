import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CampaignDetail } from "./campaign-detail";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      nodes: { orderBy: { createdAt: "asc" } },
      edges: true,
      logs: {
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          contact: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          node: { select: { id: true, label: true, type: true } },
        },
      },
    },
  });

  if (!campaign) notFound();

  const stats = {
    total: await prisma.campaignLog.count({ where: { campaignId: id } }),
    completed: await prisma.campaignLog.count({
      where: { campaignId: id, status: "COMPLETED" },
    }),
    failed: await prisma.campaignLog.count({
      where: { campaignId: id, status: "FAILED" },
    }),
    pending: await prisma.campaignLog.count({
      where: {
        campaignId: id,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    }),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {campaign.name}
          </h2>
          {campaign.description && (
            <p className="mt-1 text-sm text-slate-500">
              {campaign.description}
            </p>
          )}
        </div>
      </div>

      <CampaignDetail
        campaign={JSON.parse(JSON.stringify(campaign))}
        stats={stats}
      />
    </div>
  );
}
