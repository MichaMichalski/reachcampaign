"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
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

export default function NewContactPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

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
      const res = await fetch("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          title: title.trim() || undefined,
          tagIds: selectedTags.map((t) => t.id),
          customFields: customFieldsObj,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Failed to create contact.");
        return;
      }

      router.push("/contacts");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Add Contact</h1>
          <p className="text-sm text-muted-foreground">
            Create a new contact in your database.
          </p>
        </div>
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
            <Link href="/contacts">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create Contact"}
          </Button>
        </div>
      </form>
    </div>
  );
}
