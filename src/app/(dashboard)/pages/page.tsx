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
import { Plus, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PagesListPage() {
  const pages = await prisma.landingPage.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Landing Pages
          </h2>
          <p className="text-sm text-slate-500">
            {pages.length} {pages.length === 1 ? "page" : "pages"}
          </p>
        </div>
        <Button asChild>
          <Link href="/pages/new">
            <Plus className="h-4 w-4" />
            Create Page
          </Link>
        </Button>
      </div>

      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-slate-100 p-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No landing pages yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first landing page to capture leads.
            </p>
            <Button asChild className="mt-4">
              <Link href="/pages/new">
                <Plus className="h-4 w-4" />
                Create Page
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Link key={page.id} href={`/pages/${page.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{page.name}</CardTitle>
                    <Badge variant={page.published ? "default" : "secondary"}>
                      {page.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-1">
                    /{page.slug}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex h-32 items-center justify-center rounded-md border bg-slate-50">
                    <FileText className="h-10 w-10 text-slate-300" />
                  </div>
                  <span className="text-xs text-slate-400">
                    Updated{" "}
                    {new Date(page.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
