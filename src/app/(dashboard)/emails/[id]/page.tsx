import Link from "next/link";
import { notFound } from "next/navigation";
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
import { ArrowLeft, Pencil, Send, Trash2 } from "lucide-react";
import { DeleteTemplateButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function EmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
    include: {
      emailCampaigns: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!template) notFound();

  const campaignStats = template.emailCampaigns.reduce(
    (acc, c) => ({
      total: acc.total + 1,
      sent: acc.sent + c.totalSent,
      opened: acc.opened + c.totalOpened,
      clicked: acc.clicked + c.totalClicked,
    }),
    { total: 0, sent: 0, opened: 0, clicked: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/emails">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {template.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Subject: {template.subject}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/emails/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/emails/${id}/send`}>
              <Send className="h-4 w-4" />
              Send Campaign
            </Link>
          </Button>
          <DeleteTemplateButton templateId={id} templateName={template.name} />
        </div>
      </div>

      {template.previewText && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">
              Preview Text
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{template.previewText}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Preview</CardTitle>
          <CardDescription>
            How the email will appear to recipients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <iframe
              src={`/api/v1/emails/${id}/preview`}
              sandbox="allow-same-origin"
              className="h-[600px] w-full"
              title="Email preview"
            />
          </div>
        </CardContent>
      </Card>

      {campaignStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Stats</CardTitle>
            <CardDescription>
              Aggregated stats from {campaignStats.total}{" "}
              {campaignStats.total === 1 ? "campaign" : "campaigns"} using this
              template.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-md border p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {campaignStats.sent.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Sent</p>
              </div>
              <div className="rounded-md border p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {campaignStats.opened.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Opened</p>
              </div>
              <div className="rounded-md border p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {campaignStats.clicked.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">Clicked</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-slate-700">
                Recent Campaigns
              </h4>
              {template.emailCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {campaign.name}
                  </span>
                  <Badge
                    variant={
                      campaign.status === "SENT"
                        ? "default"
                        : campaign.status === "SENDING"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {campaign.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
