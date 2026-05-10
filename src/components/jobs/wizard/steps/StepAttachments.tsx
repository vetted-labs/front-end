"use client";

import {
  MAX_EXTERNAL_LINKS,
  MAX_GALLERY_IMAGES,
  type ExternalLink,
  type UploadedImage,
} from "@/types";
import { HeroImageUpload } from "../HeroImageUpload";
import { GalleryGrid } from "../GalleryGrid";
import { ExternalLinksList } from "../ExternalLinksList";
import { EmbedField } from "../EmbedField";
import type { StepProps } from "../wizard-types";

interface SectionProps {
  eyebrow: string;
  title: string;
  meta?: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ eyebrow, title, meta, description, children }: SectionProps) {
  return (
    <section className="space-y-4">
      <div className="relative border-t border-border pt-6">
        <span className="absolute -top-2 left-0 bg-card pr-3 text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">
          {eyebrow}
        </span>
        {meta && (
          <span className="absolute -top-2 right-0 bg-card pl-3 text-[10.5px] tracking-wider text-muted-foreground font-medium tabular-nums">
            {meta}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-[15.5px] font-bold tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      {description && (
        <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-xl">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}

export function StepAttachments({ formData, updateField }: StepProps) {
  const heroImage = formData.heroImage;
  const gallery = formData.gallery ?? [];
  const externalLinks = formData.externalLinks ?? [];
  const embed = formData.embed;

  const handleHero = (img: UploadedImage | undefined) => {
    updateField("heroImage", img);
  };
  const handleGallery = (images: UploadedImage[]) => {
    updateField("gallery", images);
  };
  const handleLinks = (links: ExternalLink[]) => {
    updateField("externalLinks", links);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] tracking-[0.2em] uppercase text-primary font-semibold mb-2">
          Step 06
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Show, don&apos;t just tell
        </h2>
        <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed mt-2 max-w-2xl">
          Add visuals and links that help candidates picture the team. None of this
          is required — but a hero image and a couple of external links lift apply
          rates noticeably.
        </p>
      </div>

      <div className="space-y-10">
        <Section
          eyebrow="Hero image"
          title="Cover photo for the listing"
          meta={heroImage ? "1 / 1" : "0 / 1"}
          description="Sits at the top of the public listing. Use a real photo of the team or workspace — abstract stock images consistently underperform. JPG · PNG · WebP · max 4 MB."
        >
          <HeroImageUpload value={heroImage} onChange={handleHero} />
        </Section>

        <Section
          eyebrow="Gallery"
          title="Up to six supporting images"
          meta={`${gallery.length} / ${MAX_GALLERY_IMAGES}`}
          description="Office, product screenshots, team moments. Drop multiple files at once — they upload in parallel."
        >
          <GalleryGrid value={gallery} onChange={handleGallery} />
        </Section>

        <Section
          eyebrow="External links"
          title="Send candidates to canonical company pages"
          meta={`${externalLinks.length} / ${MAX_EXTERNAL_LINKS}`}
          description="Career pages, blog posts, recent press, the founder's deck. Each row is one labelled outbound link."
        >
          <ExternalLinksList value={externalLinks} onChange={handleLinks} />
        </Section>

        <Section
          eyebrow="Embed"
          title="Embed a short video"
          meta="optional"
          description="One inline player on the listing. Best used for a 60–90s pitch from the hiring manager — paste the share URL, we detect the platform. YouTube or Loom only."
        >
          <EmbedField
            value={embed}
            onChange={(v) => updateField("embed", v)}
          />
        </Section>
      </div>
    </div>
  );
}
