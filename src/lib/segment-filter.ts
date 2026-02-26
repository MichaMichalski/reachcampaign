import { Prisma } from "@prisma/client";

export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

export type FilterRule = {
  field: string;
  operator: FilterOperator;
  value?: unknown;
};

const STANDARD_FIELDS = new Set([
  "email",
  "firstName",
  "lastName",
  "phone",
  "company",
  "title",
  "score",
  "doNotContact",
  "createdAt",
]);

function buildStandardCondition(
  field: string,
  operator: FilterOperator,
  value: unknown
): Prisma.ContactWhereInput {
  switch (operator) {
    case "equals":
      return { [field]: value };
    case "not_equals":
      return { [field]: { not: value } };
    case "contains":
      return { [field]: { contains: String(value), mode: "insensitive" } };
    case "greater_than":
      return { [field]: { gt: value } };
    case "less_than":
      return { [field]: { lt: value } };
    case "is_empty":
      return { OR: [{ [field]: null }, { [field]: "" }] };
    case "is_not_empty":
      return {
        AND: [{ [field]: { not: null } }, { NOT: { [field]: "" } }],
      };
    default:
      return {};
  }
}

function buildCustomFieldCondition(
  field: string,
  operator: FilterOperator,
  value: unknown
): Prisma.ContactWhereInput {
  switch (operator) {
    case "equals":
      return { customFields: { path: [field], equals: value as Prisma.InputJsonValue } };
    case "not_equals":
      return {
        NOT: { customFields: { path: [field], equals: value as Prisma.InputJsonValue } },
      };
    case "contains":
      return {
        customFields: { path: [field], string_contains: String(value) },
      };
    case "is_empty":
      return {
        OR: [
          { customFields: { path: [field], equals: Prisma.DbNull } },
          { customFields: { path: [field], equals: "" } },
        ],
      };
    case "is_not_empty":
      return {
        AND: [
          {
            NOT: {
              customFields: { path: [field], equals: Prisma.DbNull },
            },
          },
          { NOT: { customFields: { path: [field], equals: "" } } },
        ],
      };
    case "greater_than":
    case "less_than":
      // gt/lt on JSON paths requires raw SQL; skipped for custom fields
      return {};
    default:
      return {};
  }
}

export function buildSegmentQuery(
  filters: FilterRule[]
): Prisma.ContactWhereInput {
  if (!filters.length) return {};

  const conditions = filters.map((rule) => {
    if (STANDARD_FIELDS.has(rule.field)) {
      return buildStandardCondition(rule.field, rule.operator, rule.value);
    }
    return buildCustomFieldCondition(rule.field, rule.operator, rule.value);
  });

  return { AND: conditions };
}
