import type { HTMLAttributes } from "react";

type Size = "full" | "4xl" | "2xl" | "xl";

const SIZE: Record<Size, string> = {
  full: "max-w-full",
  "4xl": "max-w-4xl",
  "2xl": "max-w-2xl",
  xl: "max-w-xl",
};

/** Page width, like aoocommerce's Container. Pages are full width by default (the app layout);
 *  wrap a page in this only when it reads better narrow, e.g. a short form: <Container size="2xl">. */
export function Container({ size = "full", className = "", ...rest }: HTMLAttributes<HTMLDivElement> & { size?: Size }) {
  return <div className={`flex w-full flex-col gap-6 ${SIZE[size]} ${className}`} {...rest} />;
}
