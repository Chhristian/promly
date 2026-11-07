"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { channelLabel } from "@/lib/agreement-template";
import { VARIANT_COUNT, allowedPromoTypes, buildPromoText, type PromoType } from "@/lib/promo-templates";
import { cn } from "@/lib/utils";
import { ImageIcon, Type } from "lucide-react";
import { PromoImageMaker } from "@/components/promo-image-maker";

export type StudioCampaign = {
  id: string;
  serviceName: string;
  businessName: string;
  city: string;
  price: string;
  description: string;
  link: string;
  allowedChannels: string[];
  brandRules: string;
  category: string;
  photos: string[];
  mustMentions: { phrase: string; sentence: string | null }[];
};

export function Studio({ campaigns, initialCampaignId }: { campaigns: StudioCampaign[]; initialCampaignId: string }) {
  const [tab, setTab] = useState<"texts" | "image">("texts");
  const [campaignId, setCampaignId] = useState(initialCampaignId);
  const campaign = campaigns.find((c) => c.id === campaignId) ?? campaigns[0];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-border bg-card/60 p-1" role="tablist">
          {([["texts", "Texts", Type], ["image", "Promo image", ImageIcon]] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors", tab === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <select
          aria-label="Campaign"
          value={campaign.id}
          onChange={(e) => setCampaignId(e.target.value)}
          className="h-10 rounded-full border border-input bg-background px-4 text-sm"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.serviceName} — {c.businessName}
            </option>
          ))}
        </select>
      </div>
      {tab === "texts" ? (
        <TextStudio key={campaign.id} campaign={campaign} />
      ) : (
        <PromoImageMaker
          campaign={{
            id: campaign.id,
            serviceName: campaign.serviceName,
            businessName: campaign.businessName,
            city: campaign.city,
            price: campaign.price,
            link: campaign.link,
            category: campaign.category,
            photos: campaign.photos,
            mustMentions: campaign.mustMentions,
          }}
        />
      )}
    </div>
  );
}

function TextStudio({ campaign }: { campaign: StudioCampaign }) {
  const types = useMemo(() => allowedPromoTypes(campaign.allowedChannels), [campaign]);
  const [type, setType] = useState<PromoType | null>(types[0]?.type ?? null);
  const [variant, setVariant] = useState(0);
  const activeType = types.some((t) => t.type === type) ? type : types[0]?.type ?? null;

  const generated = activeType
    ? buildPromoText(activeType, { ...campaign }, variant)
    : "";
  const [edited, setEdited] = useState<string | null>(null);
  const text = edited ?? generated;
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEdited(null);
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-sm font-medium">1. Type</div>
          {types.length === 0 ? (
            <p className="text-sm text-muted-foreground">This agreement doesn&apos;t allow any of the text channels.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {types.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    setType(t.type);
                    setVariant(0);
                    reset();
                  }}
                  aria-pressed={activeType === t.type}
                  className={cn(
                    "rounded-lg border p-3 text-left",
                    activeType === t.type ? "border-primary bg-primary/15" : "border-border hover:bg-secondary",
                  )}
                >
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Allowed by your agreement: {campaign.allowedChannels.map(channelLabel).join(", ")}
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <div className="font-semibold text-amber-200">Brand rules from {campaign.businessName}</div>
          <p className="text-muted-foreground">{campaign.brandRules || "No extra brand rules."}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Only say what&apos;s true and in the campaign. Don&apos;t add discounts, reviews or guarantees, and keep the &quot;ad&quot; /
            commission note.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="studio-text" className="text-sm font-medium">2. Your text (editable)</label>
          <span className="text-xs text-muted-foreground">{text.length} characters</span>
        </div>
        <textarea
          id="studio-text"
          value={text}
          onChange={(e) => setEdited(e.target.value)}
          className="min-h-72 w-full rounded-xl border border-input bg-background p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={copy} className="bg-brand text-white" disabled={!text}>
            {copied ? "Copied!" : "Copy text"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setVariant((v) => (v + 1) % VARIANT_COUNT);
              reset();
            }}
            disabled={!activeType}
          >
            Another version
          </Button>
          {edited !== null && (
            <Button type="button" variant="ghost" onClick={reset}>
              Undo my edits
            </Button>
          )}
          {activeType === "whatsapp" && (
            <Button asChild variant="secondary">
              <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
                💬 Open in WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
