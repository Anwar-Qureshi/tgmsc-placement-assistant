"use client";
import { qualificationNames, type Profile } from "@/lib/matching";
export default function EducationFields({
  profile,
  onChange,
}: {
  profile: Profile;
  onChange: (patch: Partial<Profile>) => void;
}) {
  const e = profile.education || {},
    selected = e.status === "pursuing" ? 3 : profile.qualification;
  function pick(value: string) {
    const q = value === "" ? null : Number(value);
    onChange({
      qualification: q,
      education:
        q === 3
          ? { status: "completed", degree: "", year: null }
          : q === 2
            ? { diploma: "" }
            : {},
    });
  }
  return (
    <>
      <label>
        Education
        <select
          value={selected ?? ""}
          onChange={(event) => pick(event.target.value)}
        >
          <option value="">Not provided</option>
          {qualificationNames.map((q, i) => (
            <option key={q} value={i}>
              {i === 3 ? "Undergraduate degree" : q}
            </option>
          ))}
        </select>
      </label>
      {selected === 2 && (
        <label>
          Diploma course / branch
          <input
            required
            maxLength={150}
            placeholder="Diploma in Civil Engineering"
            value={e.diploma || ""}
            onChange={(event) =>
              onChange({ education: { ...e, diploma: event.target.value } })
            }
          />
        </label>
      )}
      {selected === 3 && (
        <>
          <label>
            Degree and specialisation
            <input
              required
              maxLength={150}
              placeholder="B.E. in AI & Data Science"
              value={e.degree || ""}
              onChange={(event) =>
                onChange({ education: { ...e, degree: event.target.value } })
              }
            />
          </label>
          <label>
            Study status
            <select
              value={e.status || "completed"}
              onChange={(event) => {
                const status = event.target.value as "completed" | "pursuing";
                onChange({
                  qualification: status === "pursuing" ? 1 : 3,
                  education: { ...e, status, year: null },
                });
              }}
            >
              <option value="completed">Completed</option>
              <option value="pursuing">Currently pursuing</option>
            </select>
          </label>
          {e.status === "pursuing" && (
            <label>
              Highest completed qualification
              <select
                value={profile.qualification ?? ""}
                onChange={(event) =>
                  onChange({
                    qualification:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              >
                <option value="">Not provided</option>
                {qualificationNames.slice(0, 3).map((q, i) => (
                  <option value={i} key={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
          )}
          {e.status === "pursuing" && profile.qualification === 2 && (
            <label>
              Completed diploma course / branch
              <input
                required
                maxLength={150}
                placeholder="Diploma in Computer Engineering"
                value={e.diploma || ""}
                onChange={(event) => onChange({education:{...e,diploma:event.target.value}})}
              />
            </label>
          )}
          <label>
            {e.status === "pursuing"
              ? "Expected graduation year"
              : "Graduation year"}
            <input
              required
              type="number"
              min="1950"
              max="2100"
              step="1"
              value={e.year ?? ""}
              onChange={(event) =>
                onChange({
                  education: {
                    ...e,
                    status: e.status || "completed",
                    year: event.target.value
                      ? Number(event.target.value)
                      : null,
                  },
                })
              }
            />
          </label>
        </>
      )}
    </>
  );
}
