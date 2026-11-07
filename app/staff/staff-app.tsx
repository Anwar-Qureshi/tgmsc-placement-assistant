"use client";
import {authFetch,logout,exportCSV} from "@/src/firebase";
import { useEffect, useState, useRef } from "react";
import { qualificationNames } from "@/lib/matching";
import EducationFields from "@/components/placement/education-fields";
import RoleEducation from "@/components/placement/role-education";
import { educationLabel } from "@/lib/education";
const fresh: any = {
  drive: { name: "", date: "", venue: "", status: "draft", demo: 0 },
  company: { name: "", description: "", demo: 0 },
  job: {
    driveId: "",
    companyId: "",
    title: "",
    description: "",
    skills: [],
    qualification: -1,
    educationRules: {
      qualifications: [0, 1, 2, 3, 4],
      batchMode: "any",
      pursuing: null,
      degreeNote: "",
    },
    experience: 0,
    location: "",
    salary: "",
    status: "draft",
  },
};
export default function StaffApp() {
  const [data, setData] = useState<any>(null),
    [tab, setTab] = useState("records"),
    [kind, setKind] = useState("drive"),
    [value, setValue] = useState<any>({ ...fresh.drive }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState(""),
    [driveFilter, setDriveFilter] = useState(""),
    [editing, setEditing] = useState<any>(null),
    [statusFilter, setStatusFilter] = useState(""),
    [jobFilter, setJobFilter] = useState(""),
    [companyFilter, setCompanyFilter] = useState(""),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(false),
    [removing, setRemoving] = useState<any>(null),
    [confirmation, setConfirmation] = useState("");
  const requestSequence = useRef(0);
  const query = new URLSearchParams({
    q: filter,
    drive: driveFilter,
    status: statusFilter,
    job: jobFilter,
    company: companyFilter,
    page: String(page),
  }).toString();
  async function load() {
    const run = ++requestSequence.current;
    setLoading(true);
    try {
      const r = await authFetch("/api/staff?" + query);
      const result: any = await r.json();
      if (!r.ok) throw Error(result.error);
      if (run === requestSequence.current) {
        setData(result);
        setError("");
      }
      return true;
    } catch (e: any) {
      if (run === requestSequence.current)
        setError(e.message || "Records could not be loaded.");
      return false;
    } finally {
      if (run === requestSequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (editing)
      document
        .getElementById("profile-correction")
        ?.scrollIntoView({ block: "start" });
  }, [editing?.id]);
  async function save(type: string, v: any) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (["drive", "company", "job"].includes(type) && !v.id) {
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        v = {
          ...v,
          id: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
            "",
          ),
        };
        setValue(v);
      }
      const r = await authFetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value: v }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setNotice("Saved successfully.");
      if (type === "profile") setEditing(null);
      if (!(await load()))
        setNotice(
          "Saved successfully, but the list could not refresh. Use Retry to reload it.",
        );
      if (["drive", "company", "job"].includes(type))
        setValue({ ...fresh[type] });
    } catch (e: any) {
      setError(e.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  const records = data?.records || [];
  const savedCatalogRecord = !!data?.[kind === "drive" ? "drives" : kind === "company" ? "companies" : "jobs"]?.some((r:any)=>r.id === value.id);
  const field = (key: string, label: string, type = "text") => (
    <label key={key}>
      {label}
      <input
        type={type}
        required={
          !["salary", "location", "reporting_time", "help_contact"].includes(
            key,
          ) ||
          (value.status === "open" &&
            ["reporting_time", "help_contact"].includes(key))
        }
        maxLength={key === "description" ? 1000 : key === "name" ? 150 : 250}
        value={value[key] ?? ""}
        onChange={(e) => setValue({ ...value, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          TGMSC <small>Placement staff</small>
        </a>
        <div className="staff-account">
          <span>{data?.user || "Authorised staff"}</span>
          <button className="secondary" onClick={logout}>Sign out</button>
          <a href="/">Candidate view →</a>
        </div>
      </header>
      <main>
        <fieldset disabled={busy}>
          <div className="eyebrow">PLACEMENT OPERATIONS</div>
          <div className="intro">
            <div>
              <h1>
                A drive, thoughtfully
                <br />
                <em>organised.</em>
              </h1>
              <p>
                Manage opportunities and follow up with registered candidates.
              </p>
            </div>
            <div className="intro-note">
              {data?.total ?? "—"} matching registrations
              <br />
              {data?.jobs.filter((j: any) => j.status === "open").length ??
                "—"}{" "}
              open roles
            </div>
          </div>
          <nav className="tabs">
            {[
              ["records", "Registrations"],
              ["drive", "Drives"],
              ["company", "Companies"],
              ["job", "Job roles"],
              ["activity", "Recent changes"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={
                  (
                    key === "records"
                      ? tab === "records"
                      : key === "activity"
                        ? tab === "activity"
                        : tab === "manage" && kind === key
                  )
                    ? ""
                    : "secondary"
                }
                onClick={() => {
                  setEditing(null);
                  if (key === "records" || key === "activity") setTab(key);
                  else {
                    setTab("manage");
                    setKind(key);
                    setValue(structuredClone(fresh[key]));
                  }
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          {error && (
            <div role="alert" className="alert error">
              {error}
              <button onClick={load}>Retry</button>
            </div>
          )}
          {notice && (
            <p role="status" className="alert">
              {notice}
            </p>
          )}
          {!data ? (
            <p>Loading staff records…</p>
          ) : tab === "records" ? (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Registrations & follow-up</h2>
                  <p>
                    {data.total} matching registrations · Page {data.page}{" "}
                    {loading ? " · Updating…" : ""}
                  </p>
                </div>
                <div className="export-actions">
                  <a
                    className="button"
                    href="/api/staff" onClick={e=>{e.preventDefault();exportCSV("/api/staff?"+query+"&export=csv").catch(e=>setError(e.message));}}
                  >
                    Export matching records
                  </a>
                  <a className="button secondary" href="/api/staff" onClick={e=>{e.preventDefault();exportCSV("/api/staff?export=csv").catch(e=>setError(e.message));}}>
                    Export all
                  </a>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  Find a candidate
                  <input
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Name, email, phone, reference or role"
                  />
                </label>
                <label>
                  Drive
                  <select
                    value={driveFilter}
                    onChange={(e) => {
                      setDriveFilter(e.target.value);
                      setJobFilter("");
                      setPage(1);
                    }}
                  >
                    <option value="">All drives</option>
                    {data.drives.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Follow-up status
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All statuses</option>
                    {[
                      "registered",
                      "attended",
                      "interviewed",
                      "follow-up",
                      "withdrawn",
                    ].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Company
                  <select
                    value={companyFilter}
                    onChange={(e) => {
                      setCompanyFilter(e.target.value);
                      setJobFilter("");
                      setPage(1);
                    }}
                  >
                    <option value="">All companies</option>
                    {data.companies.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Role
                  <select
                    value={jobFilter}
                    onChange={(e) => {
                      setJobFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All roles</option>
                    {data.jobs
                      .filter(
                        (j: any) => !driveFilter || j.driveId === driveFilter,
                      )
                      .map((j: any) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <p className="fine">
                Matching export includes every matching record, across all
                pages. Exports contain personal details; share only with
                authorised people.
              </p>
              {records.length === 0 ? (
                <div className="empty">No registrations found.</div>
              ) : (
                <div className="record-list">
                  {records.map((r: any) => (
                    <article className="record" key={r.id}>
                      <div>
                        <h3>{r.name}</h3>
                        <p>{[r.email, r.phone].filter(Boolean).join(" · ")}</p>
                        <p>
                          {r.drive_name} · Ref {r.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p>Interests: {r.choices || "No roles selected"}</p>
                        {r.shared_contact > 0 && (
                          <p className="fine">
                            Shared or reused phone number in this drive. Confirm
                            identity before making changes; family members may
                            share a contact.
                          </p>
                        )}
                        <details>
                          <summary>Confirmed profile</summary>
                          <p>
                            Qualification:{" "}
                            {qualificationNames[r.qualification] ||
                              "Not provided"}{" "}
                            · {educationLabel(r.education)} · Experience:{" "}
                            {r.experience ?? "Not provided"}
                          </p>
                          <p>
                            Skills:{" "}
                            {JSON.parse(r.skills).join(", ") || "None entered"}
                          </p>
                          <p>{r.summary}</p>
                          <button
                            className="secondary"
                            onClick={() =>
                              setEditing({ ...r, skills: JSON.parse(r.skills) })
                            }
                          >
                            Correct profile or interests
                          </button>
                          <button
                            className="text-button danger"
                            onClick={() => {
                              setRemoving(r);
                              setConfirmation("");
                            }}
                          >
                            Remove registration
                          </button>
                        </details>
                      </div>
                      <label>
                        Follow-up status
                        <select
                          disabled={busy}
                          value={r.status}
                          onChange={(e) =>
                            save("status", { id: r.id, status: e.target.value })
                          }
                        >
                          {[
                            "registered",
                            "attended",
                            "interviewed",
                            "follow-up",
                            "withdrawn",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                </div>
              )}
              <div className="actions">
                <button
                  className="secondary"
                  disabled={data.page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>
                  {data.total
                    ? Math.min((data.page - 1) * 50 + 1, data.total)
                    : 0}
                  –{Math.min(data.page * 50, data.total)} of {data.total}
                </span>
                <button
                  className="secondary"
                  disabled={data.page * 50 >= data.total || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          ) : tab === "activity" ? (
            <section className="panel">
              <h2>Recent record changes</h2>
              <p>
                Who changed a record and when. Profile contents are not copied
                into this history.
              </p>
              {data.changes.length ? (
                data.changes.map((c: any) => (
                  <p key={c.id}>
                    {c.actor} · {c.action} · Ref{" "}
                    {c.record_id.slice(0, 8).toUpperCase()} ·{" "}
                    {new Date(c.created_at).toLocaleString("en-IN")}
                  </p>
                ))
              ) : (
                <p>No changes recorded yet.</p>
              )}
            </section>
          ) : (
            <div className="staff-grid">
              <section className="panel">
                <h2>
                  {savedCatalogRecord ? "Edit" : "Add"} {kind}
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    save(kind, value);
                  }}
                >
                  {kind === "drive" ? (
                    <>
                      {field("name", "Drive name")}
                      {field("date", "Date", "date")}
                      {field("venue", "Venue and address")}
                      {field(
                        "reporting_time",
                        "Reporting time / arrival window",
                      )}
                      {field("help_contact", "Official help contact")}
                      <label>
                        What candidates should bring / next steps
                        <textarea
                          maxLength={2000}
                          value={value.instructions || ""}
                          onChange={(e) =>
                            setValue({ ...value, instructions: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Registration deadline (optional, India time)
                        <input
                          type="datetime-local"
                          value={
                            value.deadline
                              ? new Date(
                                  new Date(value.deadline).getTime() +
                                    330 * 60000,
                                )
                                  .toISOString()
                                  .slice(0, 16)
                              : ""
                          }
                          onChange={(e) =>
                            setValue({
                              ...value,
                              deadline: e.target.value
                                ? new Date(
                                    e.target.value + ":00+05:30",
                                  ).toISOString()
                                : "",
                            })
                          }
                        />
                      </label>
                    </>
                  ) : kind === "company" ? (
                    <>
                      {field("name", "Company name")}
                      {field("description", "Company description")}
                    </>
                  ) : (
                    <>
                      <label>
                        Drive
                        <select
                          required
                          value={value.driveId}
                          onChange={(e) =>
                            setValue({ ...value, driveId: e.target.value })
                          }
                        >
                          <option value="">Choose drive</option>
                          {data.drives.map((d: any) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Company
                        <select
                          required
                          value={value.companyId}
                          onChange={(e) =>
                            setValue({ ...value, companyId: e.target.value })
                          }
                        >
                          <option value="">Choose company</option>
                          {data.companies.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {field("title", "Role title")}
                      <label>
                        Role description
                        <textarea
                          required
                          minLength={15}
                          maxLength={3000}
                          rows={5}
                          value={value.description}
                          onChange={(e) =>
                            setValue({ ...value, description: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Skills, separated by commas
                        <input
                          key={
                            (value.id || "new") + JSON.stringify(value.skills)
                          }
                          defaultValue={value.skills.join(", ")}
                          onBlur={(e) =>
                            setValue({
                              ...value,
                              skills: e.target.value
                                .split(",")
                                .map((s) => s.trim().toLowerCase())
                                .filter(Boolean),
                            })
                          }
                        />
                      </label>
                      <RoleEducation value={value} onChange={setValue} />
                      <label>
                        Minimum whole years of experience
                        <input
                          required
                          type="number"
                          min="0"
                          max="60"
                          step="1"
                          value={value.experience}
                          onChange={(e) =>
                            setValue({
                              ...value,
                              experience: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      {field("location", "Location")}
                      {field("salary", "Pay / benefits (optional)")}
                    </>
                  )}
                  {kind !== "company" && (
                    <label>
                      Status
                      <select
                        value={value.status}
                        onChange={(e) =>
                          setValue({ ...value, status: e.target.value })
                        }
                      >
                        <option value="draft">
                          Draft — not visible to candidates
                        </option>
                        <option value="open">
                          Open — registration available
                        </option>
                        <option value="closed">Closed</option>
                      </select>
                    </label>
                  )}
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setValue({ ...fresh[kind] })}
                    >
                      Clear form
                    </button>
                    <button disabled={busy}>Save {kind}</button>
                  </div>
                </form>
              </section>
              <section className="panel">
                <h2>Existing records</h2>
                <p className="muted">
                  Close a drive or role to remove it from candidate
                  registration.
                </p>
                {data[
                  kind === "drive"
                    ? "drives"
                    : kind === "company"
                      ? "companies"
                      : "jobs"
                ].map((r: any) => (
                  <button
                    className="list-row"
                    key={r.id}
                    onClick={() => setValue({ ...r })}
                  >
                    <span>
                      {r.name || r.title}
                      <small>
                        {r.status || "Company"} {r.demo ? "· Demo" : ""}
                      </small>
                    </span>
                    <span>Edit →</span>
                  </button>
                ))}
              </section>
            </div>
          )}
          {editing && (
            <section
              id="profile-correction"
              className="panel"
              role="dialog"
              aria-label="Correct candidate profile"
              aria-modal="false"
            >
              <h2>Correct profile: {editing.name}</h2>
              <p>
                Change details only after confirming them with the candidate.
                Updating contact details also updates duplicate-registration
                protection.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save("profile", editing);
                }}
              >
                <div className="form-grid">
                  {["name", "email", "phone"].map((k) => (
                    <label key={k}>
                      {k === "name"
                        ? "Full name"
                        : k === "email"
                          ? "Email (optional)"
                          : "Phone"}
                      <input
                        required={k !== "email"}
                        type={
                          k === "email"
                            ? "email"
                            : k === "phone"
                              ? "tel"
                              : "text"
                        }
                        maxLength={
                          k === "phone" ? 20 : k === "email" ? 150 : 100
                        }
                        value={editing[k]}
                        onChange={(e) =>
                          setEditing({ ...editing, [k]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <EducationFields
                    profile={editing}
                    onChange={(patch) => setEditing({ ...editing, ...patch })}
                  />
                  <label>
                    Years of experience
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="1"
                      value={editing.experience ?? ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          experience:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    Skills, separated by commas
                    <input
                      defaultValue={editing.skills.join(", ")}
                      key={editing.id}
                      onBlur={(e) =>
                        setEditing({
                          ...editing,
                          skills: e.target.value
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </label>
                </div>
                <label>
                  Summary
                  <textarea
                    maxLength={5000}
                    value={editing.summary}
                    onChange={(e) =>
                      setEditing({ ...editing, summary: e.target.value })
                    }
                  />
                </label>
                <div>
                  <p>Role interests for this drive</p>
                  {data.jobs
                    .filter((j: any) => j.driveId === editing.drive_id)
                    .map((j: any) => (
                      <label className="checkbox" key={j.id}>
                        <input
                          type="checkbox"
                          checked={(editing.jobIds || []).includes(j.id)}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              jobIds: e.target.checked
                                ? [...(editing.jobIds || []), j.id]
                                : (editing.jobIds || []).filter(
                                    (id: string) => id !== j.id,
                                  ),
                            })
                          }
                        />
                        {j.title}
                        {j.status !== "open" ? " (closed)" : ""}
                      </label>
                    ))}
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </button>
                  <button disabled={busy}>Save confirmed corrections</button>
                </div>
              </form>
            </section>
          )}
          {removing && (
            <section className="panel">
              <h2>Remove {removing.name}’s registration?</h2>
              <p>
                This permanently removes this registration and its unused
                profile. Export a backup first when required by TGMSC’s
                retention process.
              </p>
              <label>
                Type reference {removing.id.slice(0, 8).toUpperCase()} to
                confirm
                <input
                  value={confirmation}
                  onChange={(e) =>
                    setConfirmation(e.target.value.toUpperCase())
                  }
                />
              </label>
              <div className="actions">
                <button className="secondary" onClick={() => setRemoving(null)}>
                  Cancel
                </button>
                <button
                  disabled={
                    confirmation !== removing.id.slice(0, 8).toUpperCase()
                  }
                  onClick={async () => {
                    await save("deleteRegistration", {
                      id: removing.id,
                      confirmation,
                    });
                    setRemoving(null);
                  }}
                >
                  Permanently remove
                </button>
              </div>
            </section>
          )}
          <footer>
            Staff access is checked on the server. No automatic employer
            messages or hiring decisions are made.
          </footer>
        </fieldset>
      </main>
    </>
  );
}
