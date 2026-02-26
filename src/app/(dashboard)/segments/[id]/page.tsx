import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Filter, Pencil, Trash2, Users } from "lucide-react";
import { DeleteSegmentButton } from "./delete-button";

export const dynamic = "force-dynamic";

type FilterRule = {
  field: string;
  operator: string;
  value: any;
};

const FIELD_LABELS: Record<string, string> = {
  email: "Email",
  firstName: "First Name",
  lastName: "Last Name",
  company: "Company",
  title: "Title",
  score: "Score",
  doNotContact: "Do Not Contact",
  createdAt: "Created At",
};

const OPERATOR_LABELS: Record<string, string> = {
  equals: "=",
  not_equals: "!=",
  contains: "contains",
  greater_than: ">",
  less_than: "<",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

function buildDynamicWhere(filters: FilterRule[]): Prisma.ContactWhereInput {
  const conditions: Prisma.ContactWhereInput[] = [];

  for (const rule of filters) {
    const { field, operator, value } = rule;

    if (field.startsWith("customFields.")) {
      const jsonPath = field.replace("customFields.", "");
      switch (operator) {
        case "equals":
          conditions.push({
            customFields: { path: [jsonPath], equals: value },
          });
          break;
        case "not_equals":
          conditions.push({
            NOT: { customFields: { path: [jsonPath], equals: value } },
          });
          break;
        case "contains":
          conditions.push({
            customFields: { path: [jsonPath], string_contains: value },
          });
          break;
      }
      continue;
    }

    switch (operator) {
      case "equals":
        conditions.push({ [field]: { equals: value } });
        break;
      case "not_equals":
        conditions.push({ NOT: { [field]: { equals: value } } });
        break;
      case "contains":
        conditions.push({
          [field]: { contains: value, mode: "insensitive" },
        });
        break;
      case "greater_than":
        conditions.push({ [field]: { gt: field === "createdAt" ? new Date(value) : value } });
        break;
      case "less_than":
        conditions.push({ [field]: { lt: field === "createdAt" ? new Date(value) : value } });
        break;
      case "is_empty":
        conditions.push({
          OR: [{ [field]: { equals: null } }, { [field]: { equals: "" } }],
        });
        break;
      case "is_not_empty":
        conditions.push({
          NOT: {
            OR: [{ [field]: { equals: null } }, { [field]: { equals: "" } }],
          },
        });
        break;
    }
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

function formatFilterPill(rule: FilterRule): string {
  const fieldLabel = FIELD_LABELS[rule.field] || rule.field;
  const opLabel = OPERATOR_LABELS[rule.operator] || rule.operator;

  if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
    return `${fieldLabel} ${opLabel}`;
  }

  let displayValue = String(rule.value);
  if (rule.field === "doNotContact") {
    displayValue = rule.value === "true" || rule.value === true ? "Yes" : "No";
  }

  return `${fieldLabel} ${opLabel} ${displayValue}`;
}

type Contact = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  score: number;
};

export default async function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const segment = await prisma.segment.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });

  if (!segment) notFound();

  const filters = (segment.filters as FilterRule[]) ?? [];
  let contacts: Contact[];

  if (segment.type === "DYNAMIC" && filters.length > 0) {
    const where = buildDynamicWhere(filters);
    contacts = await prisma.contact.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        score: true,
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  } else {
    const memberships = await prisma.contactSegment.findMany({
      where: { segmentId: id },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            company: true,
            score: true,
          },
        },
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
    contacts = memberships.map((m) => m.contact);
  }

  const memberCount =
    segment.type === "DYNAMIC" && filters.length > 0
      ? contacts.length
      : segment._count.members;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/segments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {segment.name}
            </h2>
            <Badge
              variant={segment.type === "DYNAMIC" ? "default" : "secondary"}
            >
              {segment.type === "DYNAMIC" ? "Dynamic" : "Static"}
            </Badge>
          </div>
          {segment.description && (
            <p className="mt-1 text-sm text-slate-500">
              {segment.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/segments/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <DeleteSegmentButton segmentId={id} segmentName={segment.name} />
        </div>
      </div>

      {segment.type === "DYNAMIC" && filters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Active Filters
            </CardTitle>
            <CardDescription>
              Contacts matching all of these criteria are included.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {filters.map((rule, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="px-3 py-1.5 text-sm font-normal"
                >
                  {formatFilterPill(rule)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Members
              </CardTitle>
              <CardDescription>
                {memberCount.toLocaleString()}{" "}
                {memberCount === 1 ? "contact" : "contacts"} in this segment
                {contacts.length === 100 && " (showing first 100)"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="rounded-full bg-slate-100 p-3">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">
                {segment.type === "DYNAMIC"
                  ? "No contacts match the current filters."
                  : "No contacts have been added to this segment yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {contact.email}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {[contact.firstName, contact.lastName]
                        .filter(Boolean)
                        .join(" ") || (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.company || (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {contact.score}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
