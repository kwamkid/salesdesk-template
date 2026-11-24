import { createClient } from "@/lib/supabase/server";
import { PhotoThumb } from "./photo-gallery";

/** Thumbnail of a visit photo (private bucket "visit-photos"). Tap to open it full screen.
 *  Inside <PhotoGallery> (the customer timeline) the tap opens every visit photo of the lead as a gallery.
 *  The link is signed for 1 hour and only works for users allowed to see the lead (RLS).
 *  Use in the activity timeline: {a.photo_path && <ActivityPhoto path={a.photo_path} />} */
export async function ActivityPhoto({ path, alt = "รูปตอนพาชม" }: { path: string; alt?: string }) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("visit-photos").createSignedUrl(path, 60 * 60);
  if (!data?.signedUrl) return <span className="text-sm text-ink-soft">เปิดรูปไม่ได้</span>;
  return <PhotoThumb path={path} src={data.signedUrl} alt={alt} />;
}
