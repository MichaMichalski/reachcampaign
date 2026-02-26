import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Building2,
  Briefcase,
  AlertTriangle,
  Activity,
  StickyNote,
  User,
} from "lucide-react";
import { ContactNotes } from "@/components/shared/contact-notes";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      trackingEvents: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!contact) notFound();

  const customFields = (contact.customFields ?? {}) as Record<string, string>;
  const hasCustomFields = Object.keys(customFields).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email}
            </h1>
            <p className="text-sm text-muted-foreground">{contact.email}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/contacts/${id}/edit`}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      {contact.doNotContact && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            This contact is marked as <strong>Do Not Contact</strong>. No automated emails will be sent.
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-7 w-7" />
              </div>
              <div className="mt-3">
                <Badge
                  variant={contact.score >= 50 ? "default" : contact.score > 0 ? "secondary" : "outline"}
                  className="text-base tabular-nums"
                >
                  Score: {contact.score}
                </Badge>
              </div>
              <div className="mt-4 w-full space-y-3 text-left text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>{contact.company}</span>
                  </div>
                )}
                {contact.title && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4 shrink-0" />
                    <span>{contact.title}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 w-full border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(contact.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-3">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">
                <User className="mr-1.5 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="activity">
                <Activity className="mr-1.5 h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="notes">
                <StickyNote className="mr-1.5 h-4 w-4" />
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-muted-foreground">First Name</dt>
                      <dd>{contact.firstName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Last Name</dt>
                      <dd>{contact.lastName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Email</dt>
                      <dd>{contact.email}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Phone</dt>
                      <dd>{contact.phone || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Company</dt>
                      <dd>{contact.company || "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-muted-foreground">Title</dt>
                      <dd>{contact.title || "—"}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {hasCustomFields && (
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Fields</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      {Object.entries(customFields).map(([key, value]) => (
                        <div key={key}>
                          <dt className="font-medium text-muted-foreground">{key}</dt>
                          <dd>{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  {contact.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((ct) => (
                        <Badge
                          key={ct.tag.id}
                          style={{ backgroundColor: ct.tag.color, borderColor: ct.tag.color }}
                        >
                          {ct.tag.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags assigned.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Tracking events for this contact.</CardDescription>
                </CardHeader>
                <CardContent>
                  {contact.trackingEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Activity className="mb-2 h-8 w-8" />
                      <p className="text-sm">No activity recorded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contact.trackingEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 rounded-lg border p-3"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Activity className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {event.type.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(event.createdAt)}
                            </p>
                            {event.data && Object.keys(event.data as object).length > 0 && (
                              <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-auto max-h-20">
                                {JSON.stringify(event.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>Add and view notes for this contact.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ContactNotes contactId={id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
