import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AGREEMENT_PDF_BUCKET } from "@/lib/agreement-pdf";

/** Signed URLs live just long enough for the browser to follow the redirect. */
const SIGNED_URL_TTL_S = 60;

/**
 * GET /agreement-pdf/<document id>[?download=1]
 * Redirects to a short-lived signed URL for an agreement PDF. Uses the
 * viewer's own session, so RLS decides: the owning business, admins, and
 * promoters who can see or have joined the campaign. Everyone else gets 404.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const notFound = () => new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return notFound();

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("agreement_documents")
    .select("storage_path, version, file_name")
    .eq("id", id.data)
    .maybeSingle();
  if (!doc) return notFound();

  const download = request.nextUrl.searchParams.get("download") === "1";
  const name = `agreement-v${doc.version}-${(doc.file_name || "agreement.pdf").replace(/[^\w.\- ]+/g, "_")}`;
  const { data, error } = await supabase.storage
    .from(AGREEMENT_PDF_BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_S, download ? { download: name.endsWith(".pdf") ? name : `${name}.pdf` } : undefined);
  if (error || !data?.signedUrl) return notFound();

  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
