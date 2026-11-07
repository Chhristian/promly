"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { setCampaignPhotos } from "../../actions";

const BUCKET = "campaign-photos";
const MAX_PHOTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1600;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Resize in the browser to max 1600 px on the longest side. WebP where supported, else JPEG. */
async function resize(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const toBlob = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpg = await toBlob("image/jpeg");
  if (!jpg) throw new Error("Could not process this image.");
  return { blob: jpg, ext: "jpg" };
}

export function PhotoManager({ campaignId, photos }: { campaignId: string; photos: { path: string; url: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error?: string; ok?: string } | null>(null);
  const [, startTransition] = useTransition();
  const paths = photos.map((p) => p.path);

  const save = async (next: string[], ok: string) => {
    const res = await setCampaignPhotos(campaignId, next);
    setMessage(res?.error ? { error: res.error } : { ok });
    startTransition(() => router.refresh());
    return !res?.error;
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setMessage(null);
    const room = MAX_PHOTOS - paths.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setMessage({ error: `Up to ${MAX_PHOTOS} photos per campaign.` });
    const supabase = createClient();
    const added: string[] = [];
    try {
      for (const f of list) {
        if (!TYPES.includes(f.type)) throw new Error(`${f.name}: use JPG, PNG or WebP.`);
        if (f.size > MAX_BYTES) throw new Error(`${f.name} is larger than 5 MB.`);
        setBusy(`Preparing ${f.name}…`);
        const { blob, ext } = await resize(f);
        const path = `${campaignId}/${crypto.randomUUID()}.${ext}`;
        setBusy(`Uploading ${f.name}…`);
        const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
        if (error) throw new Error(error.message.includes("row-level security") ? "You can only upload to your own campaigns." : "Upload failed. Please try again.");
        added.push(path);
      }
      if (added.length) await save([...paths, ...added], added.length === 1 ? "Photo added." : `${added.length} photos added.`);
    } catch (e) {
      // Remove anything uploaded in this batch that wasn't saved.
      if (added.length) await supabase.storage.from(BUCKET).remove(added);
      setMessage({ error: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (path: string) => {
    setBusy("Removing…");
    setMessage(null);
    if (await save(paths.filter((p) => p !== path), "Photo removed.")) {
      await createClient().storage.from(BUCKET).remove([path]);
    }
    setBusy(null);
  };

  const makeCover = async (path: string) => {
    setBusy("Saving…");
    await save([path, ...paths.filter((p) => p !== path)], "Cover photo updated.");
    setBusy(null);
  };

  return (
    <section className="card space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Photos</h2>
          <p className="text-sm text-muted-foreground">Up to 3 photos (JPG, PNG or WebP, max 5 MB). The first one is the cover everywhere.</p>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
          data-testid="photo-input"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!!busy || paths.length >= MAX_PHOTOS}
          onClick={() => input.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ?? (paths.length >= MAX_PHOTOS ? "3 of 3 photos" : "Add photos")}
        </Button>
      </div>

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border py-8 text-sm text-muted-foreground hover:bg-secondary/40"
        >
          <ImagePlus className="h-6 w-6" />
          Add a photo of the place, the team or the result. Until then, the category artwork is shown.
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((p, i) => (
            <div key={p.path} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border" data-testid="campaign-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Campaign photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                  <Star className="h-3 w-3" /> Cover
                </span>
              )}
              <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1">
                {i > 0 && (
                  <button type="button" onClick={() => makeCover(p.path)} disabled={!!busy} className="rounded-full bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80">
                    Make cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(p.path)}
                  disabled={!!busy}
                  className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-red-600"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {message?.error && <p className="text-sm text-red-400" role="alert">{message.error}</p>}
      {message?.ok && <p className="text-sm text-emerald-400">{message.ok}</p>}
    </section>
  );
}
