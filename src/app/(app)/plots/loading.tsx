import { PageSkeleton } from "@/components/ui/skeleton";

/** Shown while the plot page loads its project, plans and plots. */
export default function Loading() {
  return <PageSkeleton tabs rows={6} />;
}
