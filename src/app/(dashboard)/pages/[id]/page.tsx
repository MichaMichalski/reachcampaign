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
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";
import { DeletePageButton } from "./delete-button";
import { PublishButton } from "./publish-button";

export const dynamic = "force-dynamic";

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const page = await prisma.landingPage.findUnique({
    where: { id },
    include: {
      forms: {
        include: { _count: { select: { submissions: true } } },
      },
    },
  });

  if (!page) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {page.name}
            </h2>
            <Badge variant={page.published ? "default" : "secondary"}>
              {page.published ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">/{page.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pages/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <PublishButton pageId={id} published={page.published} />
          {page.published && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/p/${page.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4" />
                View Live
              </Link>
            </Button>
          )}
          <DeletePageButton pageId={id} pageName={page.name} />
        </div>
      </div>

      {(page.metaTitle || page.metaDescription) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">
              SEO Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {page.metaTitle && (
              <div>
                <span className="text-xs font-medium text-slate-400">
                  Title
                </span>
                <p className="text-sm text-slate-700">{page.metaTitle}</p>
              </div>
            )}
            {page.metaDescription && (
              <div>
                <span className="text-xs font-medium text-slate-400">
                  Description
                </span>
                <p className="text-sm text-slate-700">
                  {page.metaDescription}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page Preview</CardTitle>
          <CardDescription>
            How the landing page will appear to visitors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <iframe
              src={`/api/v1/pages/${id}/preview`}
              sandbox="allow-same-origin"
              className="h-[600px] w-full"
              title="Page preview"
            />
          </div>
        </CardContent>
      </Card>

      {page.forms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Forms</CardTitle>
            <CardDescription>
              Forms associated with this landing page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {page.forms.map((form) => (
                <Link
                  key={form.id}
                  href={`/forms/${form.id}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-slate-50"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-700">
                      {form.name}
                    </span>
                    {form.description && (
                      <p className="text-xs text-slate-500">
                        {form.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">
                    {form._count.submissions}{" "}
                    {form._count.submissions === 1
                      ? "submission"
                      : "submissions"}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {page.publishedAt && (
        <p className="text-xs text-slate-400">
          Published on{" "}
          {new Date(page.publishedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}
