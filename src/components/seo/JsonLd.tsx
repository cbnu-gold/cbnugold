import { absoluteRecruitingShareImage, defaultSeoDescription, siteUrl } from "@/lib/seo";

export function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "금은동",
    alternateName: "CBNU GOLD",
    url: siteUrl,
    logo: `${siteUrl}/images/logo.png`,
    image: absoluteRecruitingShareImage,
    foundingDate: "2021",
    description: defaultSeoDescription,
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "충북대학교",
      alternateName: "CBNU",
    },
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "금은동",
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
