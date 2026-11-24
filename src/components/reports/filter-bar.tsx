import { buttonClass } from "@/components/ui/button";
import { MemberDropdown } from "@/components/ui/member-dropdown";
import { DateRangeFields } from "@/components/ui/date-range-picker";
import { Field, Select } from "@/components/ui/field";
import { StatusTabs } from "@/components/ui/status-tabs";
import { STAGES } from "@/config/stages";
import type { Option } from "./data";
import type { Filters } from "./params";

/** Same filters, another stage tab. */
function stageHref(path: string, v: Filters, stage: string | null) {
  const p = new URLSearchParams();
  if (v.project) p.set("project", v.project);
  if (v.owner) p.set("owner", v.owner);
  p.set("from", v.from);
  p.set("to", v.to);
  if (stage) p.set("stage", stage);
  return `${path}?${p.toString()}`;
}

/** One field per item, wrapping: as many on a line as fit. */
const FIELD = "min-w-0 flex-[1_1_11rem] md:max-w-xs";

/** Project + date range filter, kept in the URL (GET form). Optional sales and stage selects.
 *  Give it an `id` so buttons elsewhere on the page can submit it with `form="<id>"`. */
export function FilterBar({
  id = "filters",
  path,
  values,
  projects,
  sales,
  showStage,
  inline = false,
}: {
  id?: string;
  path: string;
  values: Filters;
  /** Leave out to follow the project picked in the left menu (sent as a hidden field). */
  projects?: Option[];
  sales?: (Option & { url?: string })[];
  showStage?: boolean;
  /** Date range only, no card or label: sits in the page title row (PageTitle action). */
  inline?: boolean;
}) {
  if (inline)
    return (
      <form
        id={id}
        method="get"
        action={path}
        className="w-full sm:w-80"
        aria-label="ช่วงวันที่"
      >
        {values.project && (
          <input type="hidden" name="project" value={values.project} />
        )}
        {values.owner && (
          <input type="hidden" name="owner" value={values.owner} />
        )}
        <DateRangeFields
          key={`${values.from}_${values.to}`}
          defaultFrom={values.from}
          defaultTo={values.to}
          clearable={false}
          submitOnApply
        />
      </form>
    );
  return (
    <form
      id={id}
      method="get"
      action={path}
      className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface p-3"
    >
      {!projects && values.project && (
        <input type="hidden" name="project" value={values.project} />
      )}
      {projects && (
        <div className={FIELD}>
          <Field label="โครงการ">
            <Select name="project" defaultValue={values.project ?? ""}>
              <option value="">ทุกโครงการ</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {sales && (
        <div className={FIELD}>
          <Field label="พนักงาน">
            {/* Applies at once; the hidden field rides along with the download buttons (form=…). */}
            {values.owner && (
              <input type="hidden" name="owner" value={values.owner} />
            )}
            <MemberDropdown value={values.owner ?? ""} people={sales} />
          </Field>
        </div>
      )}
      {showStage && (
        <div className="w-full">
          <p className="mb-1.5 text-sm font-medium">ขั้น (ใช้กับไฟล์ลูกค้าทั้งหมด)</p>
          {values.stage && (
            <input type="hidden" name="stage" value={values.stage} />
          )}
          <StatusTabs
            activeKey={values.stage ?? "all"}
            tabs={[
              {
                key: "all",
                label: "ทุกขั้น",
                href: stageHref(path, values, null),
              },
              ...STAGES.map((s) => ({
                key: s.key,
                label: s.label,
                href: stageHref(path, values, s.key),
              })),
            ]}
          />
        </div>
      )}
      <div className="min-w-0 flex-[2_1_18rem] md:max-w-md">
        <Field label="ช่วงวันที่">
          {/* Writes hidden `from` / `to`, the same URL params as before. A shortcut or ตกลง submits the form. */}
          <DateRangeFields
            key={`${values.from}_${values.to}`}
            defaultFrom={values.from}
            defaultTo={values.to}
            clearable={false}
            submitOnApply
          />
        </Field>
      </div>
      {/* The date range submits by itself; the button is only needed for the other selects. */}
      {projects && (
        <button type="submit" className={`${buttonClass("primary")} shrink-0`}>
          ใช้ตัวกรอง
        </button>
      )}
    </form>
  );
}
