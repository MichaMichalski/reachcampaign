"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagSelector } from "@/components/shared/tag-selector";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface CustomField {
  key: string;
  value: string;
}

export default function EditContactPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [doNotContact, setDoNotContact] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    async function fetchContact() {
      try {
        const res = await fetch(`/api/v1/contacts/${id}`);
        if (!res.ok) {
          router.push("/contacts");
          return;
        }
        const result = await res.json();
        const c = result.data ?? result;
        setFirstName(c.firstName ?? "");
        setLastName(c.lastName ?? "");
        setEmail(c.email ?? "");
        setPhone(c.phone ?? "");
        setCompany(c.company ?? "");
        setTitle(c.title ?? "");
        setDoNotContact(c.doNotContact ?? false);

        if (c.tags) {
          const mappedTags: Tag[] = c.tags.map((ct: any) => {
            const tag = ct.tag ?? ct;
            return { id: tag.id, name: tag.name, color: tag.color };
          });
          setSelectedTags(mappedTags);
        }

        if (c.customFields && typeof c.customFields === "object") {
          const fields: CustomField[] = Object.entries(c.customFields).map(
            ([key, value]) => ({ key, value: String(value) })
          );
          setCustomFields(fields);
        }
      } catch {
        router.push("/contacts");
      } finally {
        setLoading(false);
      }
    }
    fetchContact();
  }, [id, router]);

  function addCustomField() {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  }

  function updateCustomField(index: number, field: Partial<CustomField>) {
    setCustomFields((prev) =>
      prev.map((cf, i) => (i === index ? { ...cf, ...field } : cf))
    );
  }

  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setSaving(true);
    setError("");

    const customFieldsObj: Record<string, string> = {};
    customFields.forEach((cf) => {
      if (cf.key.trim()) customFieldsObj[cf.key.trim()] = cf.value;
    });

    try {
      const res = await fetch(`/api/v1/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          phone: phone.trim() || null,
          company: company.trim() || null,
          title: title.trim() || null,
          doNotContact,
          tagIds: selectedTags.map((t) => t.id),
          customFields: customFieldsObj,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to update contact.");
        return;
      }

      router.push(`/contacts/${id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/contacts/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/contacts");
      }
    } catch {
      setError("Failed to delete contact.");
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[150px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/contacts/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Edit Contact</h1>
            <p className="text-sm text-muted-foreground">
              Update contact information.
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Contact details and identification.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Marketing Manager"
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={doNotContact}
                  onChange={(e) => setDoNotContact(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Do Not Contact</span>
              </label>
              {doNotContact && (
                <span className="text-xs text-amber-600">
                  This contact will not receive automated emails.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Organize contacts with tags.</CardDescription>
          </CardHeader>
          <CardContent>
            <TagSelector selectedTags={selectedTags} onChange={setSelectedTags} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Fields</CardTitle>
            <CardDescription>
              Add custom key-value pairs for additional data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {customFields.map((cf, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder="Field name"
                  value={cf.key}
                  onChange={(e) => updateCustomField(index, { key: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={cf.value}
                  onChange={(e) => updateCustomField(index, { value: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCustomField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Field
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/contacts/${id}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
              All associated notes, tags, and tracking data will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
