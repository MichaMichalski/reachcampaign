import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Search } from "lucide-react";
import { ContactsTable } from "./contacts-table";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search?.trim() ?? "";

  const where = search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        tags: {
          include: { tag: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.contact.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const tableData = contacts.map((c) => ({
    id: c.id,
    name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "—",
    email: c.email,
    company: c.company ?? "—",
    score: c.score,
    doNotContact: c.doNotContact,
    tags: c.tags.map((ct) => ({ id: ct.tag.id, name: ct.tag.name, color: ct.tag.color })),
    createdAt: formatDate(c.createdAt),
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-2xl">Contacts</CardTitle>
            <CardDescription>
              Manage your contacts and their information. {total} total contact
              {total !== 1 ? "s" : ""}.
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/contacts/import">
                  <Upload className="mr-1.5 h-4 w-4" />
                  Import CSV
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/contacts/new">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Contact
                </Link>
              </Button>
            </div>
          </CardAction>
        </CardHeader>

        <CardContent>
          <form method="GET" className="mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="search"
                type="text"
                placeholder="Search by name, email, or company..."
                defaultValue={search}
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </form>

          <ContactsTable
            data={tableData}
            page={page}
            pageCount={totalPages}
            search={search}
          />
        </CardContent>
      </Card>
    </div>
  );
}
