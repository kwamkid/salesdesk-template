/**
 * <Checkbox> and <Radio> — the app's tick box and round choice (aoocommerce Checkbox.tsx / Radio.tsx),
 * with the label as the 44px tap area. Native inputs underneath, so `name` / `value` /
 * `defaultChecked` work in plain forms and server actions exactly like before.
 *
 * <Checkbox name="project_ids" value={p.id} defaultChecked={on}>บ้านสวนริมธาร</Checkbox>
 * <Radio name="mode" value="all" defaultChecked>ทุกโครงการ</Radio>
 */
import type { ComponentProps, ReactNode } from "react";

type Props = Omit<ComponentProps<"input">, "type" | "children"> & {
  children?: ReactNode;
  /** Second line under the label */
  hint?: ReactNode;
};

function Choice({ type, children, hint, className = "", disabled, ...rest }: Props & { type: "checkbox" | "radio" }) {
  return (
    <label
      className={`flex min-h-11 items-start gap-3 py-2.5 ${disabled ? "cursor-not-allowed text-ink-soft" : "cursor-pointer"} ${className}`}
    >
      <input type={type} disabled={disabled} className="mt-0.5 h-5 w-5 shrink-0 accent-brand" {...rest} />
      {(children || hint) && (
        <span className="min-w-0">
          {children && <span className="block">{children}</span>}
          {hint && <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span>}
        </span>
      )}
    </label>
  );
}

export function Checkbox(props: Props) {
  return <Choice type="checkbox" {...props} />;
}

export function Radio(props: Props) {
  return <Choice type="radio" {...props} />;
}
