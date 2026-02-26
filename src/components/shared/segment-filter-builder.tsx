"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export type FilterRule = {
  field: string;
  operator: string;
  value: any;
};

type FieldDef = {
  value: string;
  label: string;
  type: "string" | "number" | "boolean" | "date";
};

const FIELDS: FieldDef[] = [
  { value: "email", label: "Email", type: "string" },
  { value: "firstName", label: "First Name", type: "string" },
  { value: "lastName", label: "Last Name", type: "string" },
  { value: "company", label: "Company", type: "string" },
  { value: "title", label: "Title", type: "string" },
  { value: "score", label: "Score", type: "number" },
  { value: "doNotContact", label: "Do Not Contact", type: "boolean" },
  { value: "createdAt", label: "Created At", type: "date" },
];

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  string: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "contains", label: "contains" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  number: [
    { value: "equals", label: "equals" },
    { value: "greater_than", label: "greater than" },
    { value: "less_than", label: "less than" },
  ],
  boolean: [{ value: "equals", label: "equals" }],
  date: [
    { value: "greater_than", label: "after" },
    { value: "less_than", label: "before" },
  ],
};

const VALUE_HIDDEN_OPERATORS = new Set(["is_empty", "is_not_empty"]);

function getFieldDef(field: string): FieldDef | undefined {
  return FIELDS.find((f) => f.value === field);
}

function getOperators(field: string) {
  const def = getFieldDef(field);
  return OPERATORS_BY_TYPE[def?.type ?? "string"];
}

interface SegmentFilterBuilderProps {
  filters: FilterRule[];
  onChange: (filters: FilterRule[]) => void;
}

export function SegmentFilterBuilder({
  filters,
  onChange,
}: SegmentFilterBuilderProps) {
  function updateFilter(index: number, patch: Partial<FilterRule>) {
    const updated = filters.map((f, i) =>
      i === index ? { ...f, ...patch } : f
    );
    onChange(updated);
  }

  function addFilter() {
    onChange([...filters, { field: "email", operator: "contains", value: "" }]);
  }

  function removeFilter(index: number) {
    onChange(filters.filter((_, i) => i !== index));
  }

  function handleFieldChange(index: number, field: string) {
    const def = getFieldDef(field);
    const operators = OPERATORS_BY_TYPE[def?.type ?? "string"];
    const defaultOp = operators[0].value;
    const defaultValue =
      def?.type === "boolean" ? "true" : def?.type === "number" ? 0 : "";
    updateFilter(index, {
      field,
      operator: defaultOp,
      value: defaultValue,
    });
  }

  function handleOperatorChange(index: number, operator: string) {
    const patch: Partial<FilterRule> = { operator };
    if (VALUE_HIDDEN_OPERATORS.has(operator)) {
      patch.value = "";
    }
    updateFilter(index, patch);
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-700">Filter Rules</div>

      {filters.length === 0 && (
        <p className="text-sm text-slate-400">
          No filters added yet. Add a filter to define which contacts match this
          segment.
        </p>
      )}

      {filters.map((filter, index) => {
        const fieldDef = getFieldDef(filter.field);
        const operators = getOperators(filter.field);
        const hideValue = VALUE_HIDDEN_OPERATORS.has(filter.operator);

        return (
          <div
            key={index}
            className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <div className="grid flex-1 gap-2 sm:grid-cols-3">
              <Select
                value={filter.field}
                onValueChange={(v) => handleFieldChange(index, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  {FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.operator}
                onValueChange={(v) => handleOperatorChange(index, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!hideValue && (
                <>
                  {fieldDef?.type === "boolean" ? (
                    <Select
                      value={String(filter.value)}
                      onValueChange={(v) =>
                        updateFilter(index, { value: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">True</SelectItem>
                        <SelectItem value="false">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : fieldDef?.type === "number" ? (
                    <Input
                      type="number"
                      value={filter.value ?? ""}
                      onChange={(e) =>
                        updateFilter(index, {
                          value: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="Value"
                    />
                  ) : fieldDef?.type === "date" ? (
                    <Input
                      type="date"
                      value={filter.value ?? ""}
                      onChange={(e) =>
                        updateFilter(index, { value: e.target.value })
                      }
                    />
                  ) : (
                    <Input
                      type="text"
                      value={filter.value ?? ""}
                      onChange={(e) =>
                        updateFilter(index, { value: e.target.value })
                      }
                      placeholder="Value"
                    />
                  )}
                </>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-0.5 shrink-0 text-slate-400 hover:text-red-500"
              onClick={() => removeFilter(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" onClick={addFilter}>
        <Plus className="h-4 w-4" />
        Add Filter
      </Button>
    </div>
  );
}
