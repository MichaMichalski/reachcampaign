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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil, Code } from "lucide-react";
import { DeleteFormButton } from "./delete-button";

export const dynamic = "force-dynamic";

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      landingPage: { select: { id: true, name: true } },
      submissions: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          contact: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
      _count: { select: { submissions: true } },
    },
  });

  if (!form) notFound();

  const fields = form.fields as FormField[];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const embedHtml = generateEmbedCode(id, fields, baseUrl);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/forms">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {form.name}
          </h2>
          {form.description && (
            <p className="mt-1 text-sm text-slate-500">{form.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/forms/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteFormButton formId={id} formName={form.name} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-slate-900">{fields.length}</p>
            <p className="text-xs text-slate-500">
              {fields.length === 1 ? "Field" : "Fields"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-slate-900">
              {form._count.submissions}
            </p>
            <p className="text-xs text-slate-500">
              {form._count.submissions === 1 ? "Submission" : "Submissions"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {form.landingPage ? (
              <Link
                href={`/pages/${form.landingPage.id}`}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                {form.landingPage.name}
              </Link>
            ) : (
              <p className="text-sm text-slate-400">No linked page</p>
            )}
            <p className="text-xs text-slate-500">Linked Page</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="submissions">
            Submissions ({form._count.submissions})
          </TabsTrigger>
          <TabsTrigger value="embed">
            <Code className="mr-1 h-3 w-3" />
            Embed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Form Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-400">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {field.label}
                        </p>
                        <p className="text-xs text-slate-400">
                          {field.type}
                          {field.placeholder && ` · "${field.placeholder}"`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {field.required && (
                        <Badge variant="secondary" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {field.options && field.options.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {field.options.length} options
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submission Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-xs font-medium text-slate-400">
                  Success Message
                </span>
                <p className="text-sm text-slate-700">{form.successMessage}</p>
              </div>
              {form.redirectUrl && (
                <div>
                  <span className="text-xs font-medium text-slate-400">
                    Redirect URL
                  </span>
                  <p className="text-sm text-slate-700">{form.redirectUrl}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submissions</CardTitle>
              <CardDescription>
                Showing the latest {form.submissions.length} of{" "}
                {form._count.submissions} total submissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {form.submissions.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No submissions yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {fields.map((field) => (
                          <TableHead key={field.id}>{field.label}</TableHead>
                        ))}
                        <TableHead>Contact</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.submissions.map((sub) => {
                        const data = sub.data as Record<string, unknown>;
                        return (
                          <TableRow key={sub.id}>
                            {fields.map((field) => (
                              <TableCell key={field.id}>
                                <span className="max-w-[200px] truncate text-sm">
                                  {String(data[field.id] ?? "")}
                                </span>
                              </TableCell>
                            ))}
                            <TableCell>
                              {sub.contact ? (
                                <Link
                                  href={`/contacts/${sub.contact.id}`}
                                  className="text-sm text-indigo-600 hover:underline"
                                >
                                  {sub.contact.email}
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {new Date(sub.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Embed Code</CardTitle>
              <CardDescription>
                Copy and paste this HTML to embed the form on any website.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md bg-slate-900 p-4 text-sm text-slate-100">
                <code>{embedHtml}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function generateEmbedCode(
  formId: string,
  fields: FormField[],
  baseUrl: string
): string {
  const fieldHtml = fields
    .map((f) => {
      const required = f.required ? " required" : "";
      const placeholder = f.placeholder ? ` placeholder="${f.placeholder}"` : "";

      switch (f.type) {
        case "textarea":
          return `  <div style="margin-bottom:16px;">
    <label for="${f.id}" style="display:block;margin-bottom:4px;font-weight:500;">${f.label}</label>
    <textarea id="${f.id}" name="${f.id}"${placeholder}${required} style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:4px;min-height:80px;"></textarea>
  </div>`;
        case "select":
          const opts = (f.options || [])
            .map((o) => `      <option value="${o}">${o}</option>`)
            .join("\n");
          return `  <div style="margin-bottom:16px;">
    <label for="${f.id}" style="display:block;margin-bottom:4px;font-weight:500;">${f.label}</label>
    <select id="${f.id}" name="${f.id}"${required} style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:4px;">
      <option value="">Select...</option>
${opts}
    </select>
  </div>`;
        case "checkbox":
          return `  <div style="margin-bottom:16px;">
    <label style="display:flex;align-items:center;gap:8px;">
      <input type="checkbox" name="${f.id}" value="true"${required} />
      <span>${f.label}</span>
    </label>
  </div>`;
        case "radio":
          const radios = (f.options || [])
            .map(
              (o) =>
                `    <label style="display:flex;align-items:center;gap:8px;">
      <input type="radio" name="${f.id}" value="${o}"${required} />
      <span>${o}</span>
    </label>`
            )
            .join("\n");
          return `  <div style="margin-bottom:16px;">
    <p style="margin-bottom:4px;font-weight:500;">${f.label}</p>
${radios}
  </div>`;
        default:
          return `  <div style="margin-bottom:16px;">
    <label for="${f.id}" style="display:block;margin-bottom:4px;font-weight:500;">${f.label}</label>
    <input type="${f.type}" id="${f.id}" name="${f.id}"${placeholder}${required} style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:4px;" />
  </div>`;
      }
    })
    .join("\n");

  return `<form action="${baseUrl}/api/v1/forms/${formId}/submit" method="POST">
${fieldHtml}
  <button type="submit" style="padding:10px 20px;background:#4f46e5;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;">Submit</button>
</form>`;
}
