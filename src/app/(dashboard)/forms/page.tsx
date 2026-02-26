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
import { Plus, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
};

export default async function FormsListPage() {
  const forms = await prisma.form.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { submissions: true } },
      landingPage: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Forms
          </h2>
          <p className="text-sm text-slate-500">
            {forms.length} {forms.length === 1 ? "form" : "forms"}
          </p>
        </div>
        <Button asChild>
          <Link href="/forms/new">
            <Plus className="h-4 w-4" />
            Create Form
          </Link>
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-slate-100 p-4">
              <ClipboardList className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No forms yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first form to start collecting submissions.
            </p>
            <Button asChild className="mt-4">
              <Link href="/forms/new">
                <Plus className="h-4 w-4" />
                Create Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => {
            const fields = form.fields as FormField[];
            return (
              <Link key={form.id} href={`/forms/${form.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{form.name}</CardTitle>
                    {form.description && (
                      <CardDescription className="line-clamp-2">
                        {form.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {fields.length}{" "}
                        {fields.length === 1 ? "field" : "fields"}
                      </Badge>
                      <Badge variant="secondary">
                        {form._count.submissions}{" "}
                        {form._count.submissions === 1
                          ? "submission"
                          : "submissions"}
                      </Badge>
                      {form.landingPage && (
                        <Badge variant="outline">
                          {form.landingPage.name}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      Updated{" "}
                      {new Date(form.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
