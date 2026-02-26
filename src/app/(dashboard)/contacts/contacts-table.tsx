"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, SortableHeader } from "@/components/shared/data-table";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactRow {
  id: string;
  name: string;
  email: string;
  company: string;
  score: number;
  doNotContact: boolean;
  tags: { id: string; name: string; color: string }[];
  createdAt: string;
}

interface ContactsTableProps {
  data: ContactRow[];
  page: number;
  pageCount: number;
  search: string;
}

export function ContactsTable({ data, page, pageCount, search }: ContactsTableProps) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/contacts/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    params.set("page", String(newPage));
    if (search) params.set("search", search);
    router.push(`/contacts?${params.toString()}`);
  }

  const columns: ColumnDef<ContactRow, unknown>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => {
        const contact = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/contacts/${contact.id}`}
              className="font-medium hover:underline"
            >
              {contact.name}
            </Link>
            {contact.doNotContact && (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => <SortableHeader column={column}>Email</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("email")}</span>
      ),
    },
    {
      accessorKey: "company",
      header: ({ column }) => <SortableHeader column={column}>Company</SortableHeader>,
    },
    {
      accessorKey: "score",
      header: ({ column }) => <SortableHeader column={column}>Score</SortableHeader>,
      cell: ({ row }) => {
        const score = row.getValue("score") as number;
        return (
          <Badge
            variant={score >= 50 ? "default" : score > 0 ? "secondary" : "outline"}
            className="tabular-nums"
          >
            {score}
          </Badge>
        );
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags;
        if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs"
                style={{ borderColor: tag.color, color: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableHeader column={column}>Created</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("createdAt")}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const contact = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/contacts/${contact.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/contacts/${contact.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteId(contact.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        page={page}
        pageCount={pageCount}
        onPageChange={handlePageChange}
        emptyMessage="No contacts found. Add your first contact to get started."
      />

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
              All associated notes, tags, and tracking data will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
