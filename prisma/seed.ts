import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@reachcampaign.local" },
    update: {},
    create: {
      email: "admin@reachcampaign.local",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Created admin user:", admin.email);

  const tags = ["Newsletter", "Customer", "Lead", "VIP", "Prospect"];
  for (const name of tags) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, color: "#6366f1" },
    });
  }
  console.log("Created default tags");

  const scoringRules = [
    { name: "Email Opened", eventType: "EMAIL_OPEN" as const, points: 5 },
    { name: "Email Clicked", eventType: "EMAIL_CLICK" as const, points: 10 },
    { name: "Page Viewed", eventType: "PAGE_VIEW" as const, points: 3 },
    { name: "Form Submitted", eventType: "FORM_SUBMIT" as const, points: 15 },
  ];
  for (const rule of scoringRules) {
    await prisma.scoringRule.create({ data: rule });
  }
  console.log("Created scoring rules");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
