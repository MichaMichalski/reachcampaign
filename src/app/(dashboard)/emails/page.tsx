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
import { Plus, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Email Templates
          </h2>
          <p className="text-sm text-slate-500">
            {templates.length} {templates.length === 1 ? "template" : "templates"}
          </p>
        </div>
        <Button asChild>
          <Link href="/emails/new">
            <Plus className="h-4 w-4" />
            Create Template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-slate-100 p-4">
              <Mail className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No email templates yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first email template to start sending campaigns.
            </p>
            <Button asChild className="mt-4">
              <Link href="/emails/new">
                <Plus className="h-4 w-4" />
                Create Template
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link key={template.id} href={`/emails/${template.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.subject && (
                    <CardDescription className="line-clamp-1">
                      Subject: {template.subject}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex h-32 items-center justify-center rounded-md border bg-slate-50">
                    <Mail className="h-10 w-10 text-slate-300" />
                  </div>
                  <span className="text-xs text-slate-400">
                    Updated{" "}
                    {new Date(template.updatedAt).toLocaleDateString("en-US", {
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
