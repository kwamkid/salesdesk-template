import { buttonClass } from "@/components/ui/button";
import { DateRangeFields } from "@/components/ui/date-range-picker";
import { Field, Select } from "@/components/ui/field";
import { STAGES } from "@/config/stages";
import type { Option } from "./data";
import type { Filters } from "./params";

/** Project + date range filter, kept in the URL (GET form). Optional sales and stage selects.
 *  Give it an `id` so buttons elsewhere on the page can submit it with `form="<id>"`. */
export function FilterBar({
  id = "filters",
  path,
  values,
  projects,
  sales,
  showStage,
}: {
  id?: string;
  path: string;
  values: Filters;
  projects: Option[];
  sales?: Option[];
  showStage?: boolean;
}) {
  return (
    <form id={id} method="get" action={path} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="grid gap-3 md:grid-cols-2">
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
        {sales && (
          <Field label="เซลส์">
            <Select name="owner" defaultValue={values.owner ?? ""}>
              <option value="">ทุกคน</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {showStage && (
          <Field label="ขั้น" hint="ใช้กับไฟล์ลูกค้าทั้งหมด">
            <Select name="stage" defaultValue={values.stage ?? ""}>
              <option value="">ทุกขั้น</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="ช่วงวันที่" hint="เลือกช่วงด่วนในปฏิทินแล้วกรองให้ทันที">
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

      <div className="flex justify-end">
        <button type="submit" className={buttonClass("primary")}>
          ใช้ตัวกรอง
        </button>
      </div>
    </form>
  );
}
