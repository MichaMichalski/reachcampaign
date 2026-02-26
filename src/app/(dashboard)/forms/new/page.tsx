"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  GripVertical,
} from "lucide-react";

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  options: string[];
};

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio" },
];

function generateId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyField(): FormField {
  return {
    id: generateId(),
    label: "",
    type: "text",
    required: false,
    placeholder: "",
    options: [],
  };
}

export default function NewFormPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([createEmptyField()]);
  const [successMessage, setSuccessMessage] = useState(
    "Thank you for your submission!"
  );
  const [redirectUrl, setRedirectUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addField() {
    setFields([...fields, createEmptyField()]);
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  function updateField(index: number, updates: Partial<FormField>) {
    setFields(
      fields.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  }

  function moveField(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const newFields = [...fields];
    [newFields[index], newFields[newIndex]] = [
      newFields[newIndex],
      newFields[index],
    ];
    setFields(newFields);
  }

  function updateOptions(fieldIndex: number, optionsStr: string) {
    const options = optionsStr.split("\n").filter((o) => o.trim());
    updateField(fieldIndex, { options });
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Form name is required.");
      return;
    }

    const invalidField = fields.find((f) => !f.label.trim());
    if (invalidField) {
      setError("All fields must have a label.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        fields: fields.map((f) => ({
          id: f.id,
          label: f.label.trim(),
          type: f.type,
          required: f.required,
          placeholder: f.placeholder.trim() || undefined,
          options:
            ["select", "radio"].includes(f.type) && f.options.length > 0
              ? f.options
              : undefined,
        })),
        successMessage: successMessage.trim(),
        redirectUrl: redirectUrl.trim() || undefined,
      };

      const res = await fetch("/api/v1/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create form");
      }

      router.push("/forms");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/forms">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Form
          </h2>
          <p className="text-sm text-slate-500">
            Build a form to collect submissions from your audience.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
          <CardDescription>
            Give your form a name and optional description.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Form Name</Label>
            <Input
              id="name"
              placeholder="e.g. Contact Us"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this form"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fields</CardTitle>
          <CardDescription>
            Add and configure the fields for your form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-lg border bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <GripVertical className="h-4 w-4 text-slate-400" />
                  Field {index + 1}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveField(index, "up")}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => moveField(index, "down")}
                    disabled={index === fields.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => removeField(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    placeholder="e.g. Full Name"
                    value={field.label}
                    onChange={(e) =>
                      updateField(index, { label: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(value) =>
                      updateField(index, { type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Placeholder (optional)</Label>
                  <Input
                    placeholder="e.g. Enter your name"
                    value={field.placeholder}
                    onChange={(e) =>
                      updateField(index, { placeholder: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end space-x-2 pb-1">
                  <Switch
                    id={`required-${field.id}`}
                    checked={field.required}
                    onCheckedChange={(checked) =>
                      updateField(index, { required: checked })
                    }
                  />
                  <Label htmlFor={`required-${field.id}`}>Required</Label>
                </div>
              </div>

              {["select", "radio"].includes(field.type) && (
                <div className="mt-3 space-y-2">
                  <Label>Options (one per line)</Label>
                  <Textarea
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    value={field.options.join("\n")}
                    onChange={(e) => updateOptions(index, e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          ))}

          <Button variant="outline" onClick={addField} className="w-full">
            <Plus className="h-4 w-4" />
            Add Field
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submission Settings</CardTitle>
          <CardDescription>
            Configure what happens after a form is submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="successMessage">Success Message</Label>
            <Textarea
              id="successMessage"
              placeholder="Thank you for your submission!"
              value={successMessage}
              onChange={(e) => setSuccessMessage(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="redirectUrl">Redirect URL (optional)</Label>
            <Input
              id="redirectUrl"
              placeholder="https://example.com/thank-you"
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/forms">Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Form
        </Button>
      </div>
    </div>
  );
}
