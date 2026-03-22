import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { jsonResponse, errorResponse } from "@/lib/api-auth";
import { getCampaignQueue } from "@/lib/queue";

type RouteParams = { params: Promise<{ id: string }> };

type FormField = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) return errorResponse("Form not found", 404);

    let data: Record<string, unknown>;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
    } else {
      const formData = await req.formData();
      data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
    }

    const fields = form.fields as FormField[];
    const errors: string[] = [];
    for (const field of fields) {
      if (field.required) {
        const value = data[field.id];
        if (value === undefined || value === null || value === "") {
          errors.push(`${field.label} is required`);
        }
      }
    }
    if (errors.length > 0) {
      return errorResponse(errors.join(", "));
    }

    let contactId: string | null = null;
    const emailField = fields.find((f) => f.type === "email");
    if (emailField) {
      const email = data[emailField.id] as string;
      if (email && typeof email === "string") {
        const hasFirstNameField = fields.some((f) => f.id === "firstName");
        const rawFirstName = hasFirstNameField ? data.firstName : undefined;
        const firstName =
          typeof rawFirstName === "string" && rawFirstName.trim()
            ? rawFirstName.trim()
            : undefined;

        const contact = await prisma.contact.upsert({
          where: { email: email.toLowerCase().trim() },
          update: firstName ? { firstName } : {},
          create: {
            email: email.toLowerCase().trim(),
            ...(firstName ? { firstName } : {}),
          },
        });
        contactId = contact.id;
      }
    }

    if (contactId) {
      const campaigns = await prisma.campaign.findMany({
        where: { status: "ACTIVE" },
        include: {
          nodes: { where: { type: "TRIGGER" } },
        },
      });

      const queue = getCampaignQueue();
      for (const campaign of campaigns) {
        for (const node of campaign.nodes) {
          const config = node.config as Record<string, unknown>;
          if (config.triggerType === "form_submit" && config.formId === id) {
            await queue.add(`campaign-${campaign.id}-${node.id}-${contactId}`, {
              campaignId: campaign.id,
              nodeId: node.id,
              contactId,
            });
          }
        }
      }
    }

    await prisma.formSubmission.create({
      data: {
        formId: id,
        contactId,
        data: data as Prisma.InputJsonValue,
      },
    });

    await prisma.trackingEvent.create({
      data: {
        contactId,
        type: "FORM_SUBMIT",
        data: { formId: id, formName: form.name } as Prisma.InputJsonValue,
        ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        userAgent: req.headers.get("user-agent"),
      },
    });

    if (form.redirectUrl) {
      return NextResponse.redirect(form.redirectUrl, 303);
    }

    return jsonResponse({
      success: true,
      message: form.successMessage,
    });
  } catch {
    return errorResponse("Failed to process submission", 500);
  }
}
