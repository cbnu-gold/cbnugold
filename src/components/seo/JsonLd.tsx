import type { SiteSettingsValue } from "@/types";
import { defaultSeoDescription, siteUrl, toAbsoluteSiteUrl } from "@/lib/seo";

export function JsonLd({ settings }: { settings: SiteSettingsValue }) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.site_title,
    alternateName: "CBNU GOLD",
    url: siteUrl,
    logo: toAbsoluteSiteUrl(settings.logo_url),
    image: toAbsoluteSiteUrl(settings.share_image_url),
    foundingDate: settings.founded_label.replace(/[^0-9]/g, "").slice(0, 4) || "2021",
    description: settings.hero_subtitle || defaultSeoDescription,
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "충북대학교",
      alternateName: "CBNU",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.site_title,
    alternateName: "CBNU GOLD",
    url: siteUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
    </>
  );
}
