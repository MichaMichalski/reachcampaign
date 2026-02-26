import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe, Mail, Key, Settings } from "lucide-react";

const sections = [
  {
    title: "Domains & Deliverability",
    description:
      "Manage sending domains, DNS verification, warmup schedules, and monitor bounce rates.",
    href: "/settings/domains",
    icon: Globe,
  },
  {
    title: "Email Providers",
    description:
      "Configure SMTP, SendGrid, AWS SES, and other providers with routing strategies.",
    href: "/settings/providers",
    icon: Mail,
  },
  {
    title: "API Keys",
    description:
      "Create and manage API keys for programmatic access to the platform.",
    href: "/settings/api-keys",
    icon: Key,
  },
  {
    title: "General Settings",
    description:
      "Account preferences, notification settings, and platform configuration.",
    href: "/settings",
    icon: Settings,
    disabled: true,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your platform, manage domains, providers, and API access.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const content = (
            <Card
              key={section.title}
              className={
                section.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "transition-shadow hover:shadow-md"
              }
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {section.disabled && (
                <CardContent className="pt-0">
                  <span className="text-xs text-muted-foreground">
                    Coming soon
                  </span>
                </CardContent>
              )}
            </Card>
          );

          if (section.disabled) return content;

          return (
            <Link key={section.title} href={section.href} className="block">
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
