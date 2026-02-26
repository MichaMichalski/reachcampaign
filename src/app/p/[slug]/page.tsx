import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.landingPage.findUnique({ where: { slug } });

  if (!page || !page.published) return {};

  return {
    title: page.metaTitle || page.name,
    description: page.metaDescription || undefined,
    openGraph: {
      title: page.metaTitle || page.name,
      description: page.metaDescription || undefined,
      images: page.ogImage ? [{ url: page.ogImage }] : undefined,
    },
  };
}

export default async function PublicLandingPage({ params }: Props) {
  const { slug } = await params;

  const page = await prisma.landingPage.findUnique({
    where: { slug },
  });

  if (!page || !page.published) notFound();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div dangerouslySetInnerHTML={{ __html: page.htmlContent }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var data = {
                  type: 'PAGE_VIEW',
                  url: window.location.href,
                  slug: '${slug}',
                  referrer: document.referrer,
                  timestamp: new Date().toISOString()
                };
                fetch('/api/v1/tracking/pageview', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(data)
                }).catch(function() {});
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
