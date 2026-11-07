"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for browsers without clipboard permission
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex w-full items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-2 text-sm">{url}</code>
      <Button type="button" onClick={copy} className="bg-brand shrink-0 text-white">
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}
