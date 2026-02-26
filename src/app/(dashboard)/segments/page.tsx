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
import { Plus, Users, Filter, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const segments = await prisma.segment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Segments
          </h2>
          <p className="text-sm text-slate-500">
            Group your contacts into targeted segments for campaigns.
          </p>
        </div>
        <Button asChild>
          <Link href="/segments/new">
            <Plus className="h-4 w-4" />
            Create Segment
          </Link>
        </Button>
      </div>

      {segments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-slate-100 p-4">
              <Layers className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No segments yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Create your first segment to start targeting contacts.
            </p>
            <Button asChild className="mt-4">
              <Link href="/segments/new">
                <Plus className="h-4 w-4" />
                Create Segment
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment) => {
            const filters = (segment.filters as any[]) ?? [];

            return (
              <Link key={segment.id} href={`/segments/${segment.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {segment.name}
                      </CardTitle>
                      <Badge
                        variant={
                          segment.type === "DYNAMIC" ? "default" : "secondary"
                        }
                      >
                        {segment.type === "DYNAMIC" ? (
                          <Filter className="mr-1 h-3 w-3" />
                        ) : (
                          <Users className="mr-1 h-3 w-3" />
                        )}
                        {segment.type === "DYNAMIC" ? "Dynamic" : "Static"}
                      </Badge>
                    </div>
                    {segment.description && (
                      <CardDescription className="line-clamp-2">
                        {segment.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Users className="h-3.5 w-3.5" />
                        {segment._count.members.toLocaleString()}{" "}
                        {segment._count.members === 1 ? "member" : "members"}
                      </span>
                      <span className="text-slate-400">
                        {new Date(segment.createdAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )}
                      </span>
                    </div>
                    {segment.type === "DYNAMIC" && filters.length > 0 && (
                      <p className="mt-2 text-xs text-slate-400">
                        {filters.length}{" "}
                        {filters.length === 1 ? "filter" : "filters"} applied
                      </p>
                    )}
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
