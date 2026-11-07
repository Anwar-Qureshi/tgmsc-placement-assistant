"use client";
import { batchModeChange } from "@/lib/education";
import { qualificationNames } from "@/lib/matching";
export default function RoleEducation({
  value,
  onChange,
}: {
  value: any;
  onChange: (value: any) => void;
}) {
  const rules = value.educationRules || {};
  function update(patch: any) {
    onChange({ ...value, educationRules: { ...rules, ...patch } });
  }
  return (
    <>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={value.qualification === -1}
          onChange={(e) =>
            onChange({
              ...value,
              qualification: e.target.checked ? -1 : 0,
              educationRules: {
                ...rules,
                qualifications: e.target.checked ? [0, 1, 2, 3, 4] : [0],
              },
            })
          }
        />
        No formal qualification requirement
      </label>
      {value.qualification !== -1 && (
        <div>
          <p>Accepted completed qualifications</p>
          {qualificationNames.map((name, i) => (
            <label className="checkbox" key={name}>
              <input
                type="checkbox"
                checked={(
                  rules.qualifications || [value.qualification]
                ).includes(i)}
                onChange={(e) => {
                  const current = rules.qualifications || [value.qualification];
                  update({
                    qualifications: e.target.checked
                      ? [...current, i]
                      : current.filter((q: number) => q !== i),
                  });
                }}
              />
              {name}
            </label>
          ))}
        </div>
      )}
      <label>
        Currently pursuing undergraduate students
        <select
          value={rules.pursuing == null ? "" : String(rules.pursuing)}
          onChange={(e) =>
            update({
              pursuing:
                e.target.value === "" ? null : e.target.value === "true",
            })
          }
        >
          <option value="">Not specified — ask organiser</option>
          <option value="true">Accepted for consideration</option>
          <option value="false">Completed qualification required</option>
        </select>
      </label>
      <label>
        Graduation-year restriction
        <select
          value={rules.batchMode || "any"}
          onChange={(e) => onChange({...value,educationRules:batchModeChange(rules,e.target.value as "any" | "years" | "through")})}
        >
          <option value="any">No restriction / not applicable</option>
          <option value="years">Specific graduation years</option>
          <option value="through">This year and earlier</option>
        </select>
      </label>
      {rules.batchMode === "years" && (
        <label>
          Accepted years, separated by commas
          <input
            required
            key={(value.id || "new") + "years"}
            defaultValue={(rules.years || []).join(", ")}
            placeholder="2025, 2026, 2027"
            pattern="[ ]*[0-9]{4}([ ]*,[ ]*[0-9]{4})*[ ]*"
            title="Enter four-digit years separated by commas, for example 2026, 2027."
            onChange={(e) =>
              update({
                years: e.target.value
                  .split(",")
                  .filter((x) => x.trim() !== "")
                  .map((x) => Number(x.trim())),
              })
            }
          />
        </label>
      )}
      {rules.batchMode === "through" && (
        <label>
          Latest accepted graduation year
          <input
            required
            type="number"
            min="1950"
            max="2100"
            step="1"
            value={rules.through ?? ""}
            onChange={(e) =>
              update({
                through: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>
      )}
      <label>
        Degree / specialisation conditions (optional)
        <input
          maxLength={500}
          value={rules.degreeNote || ""}
          placeholder="For example: B.Com preferred; any graduate accepted"
          onChange={(e) => update({ degreeNote: e.target.value })}
        />
      </label>
    </>
  );
}
