import { PageSkeleton } from "@/components/ui/skeleton";

/** Shown while the project list or one project page loads. */
export default function Loading() {
  return <PageSkeleton stats rows={4} />;
}
