"use client";
import { useEffect, useState, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BriefcaseBusiness,
  MapPin,
  Check,
  FileText,
  Search,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import {
  qualificationNames,
  normalizeSkills,
  extractDraft,
  rankJobs,
  type Profile,
  type Job,
} from "@/lib/matching";
import EducationFields from "@/components/placement/education-fields";
import DriveOverview from "@/components/placement/drive-overview";
const empty: Profile = {
  name: "",
  email: "",
  phone: "",
  qualification: null,
  experience: null,
  skills: [],
  summary: "",
};
export default function CandidateApp({initialCatalog=null}:{initialCatalog?:any}) {
  const [catalog, setCatalog] = useState<any>(initialCatalog),
    [drive, setDrive] = useState(""),
    [stage, setStage] = useState(0),
    [profile, setProfile] = useState<Profile>({ ...empty }),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [scores, setScores] = useState<Record<string, number>>(),
    [engine, setEngine] = useState("Keyword baseline"),
    [choices, setChoices] = useState<string[]>([]),
    [verified, setVerified] = useState(false),
    [consent, setConsent] = useState(false),
    [receipt, setReceipt] = useState(""),
    [search, setSearch] = useState("");
  const matchRun = useRef(0),
    nonce = useRef("");
  function requestToken() {
    if (!nonce.current) {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      nonce.current = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
    }
    return nonce.current;
  }
  const dirty =
    (stage === 1 || stage === 2) &&
    !!(
      profile.name ||
      profile.phone ||
      profile.email ||
      profile.summary ||
      profile.skills.length ||
      profile.qualification != null ||
      profile.experience != null ||
      Object.keys(profile.education || {}).length
    );
  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  function changeEducation(patch: Partial<Profile>) {
    setProfile((p) => ({ ...p, ...patch }));
    setVerified(false);
    setConsent(false);
    setScores(undefined);
    setEngine("Keyword baseline");
    nonce.current = "";
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [stage]);
  useEffect(() => {
    if (error)
      document.getElementById("app-error")?.scrollIntoView({ block: "start" });
  }, [error]);
  async function load() {
    setError("");
    try {
      const r = await fetch("/api/catalog");
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setCatalog(d);
    } catch (e: any) {
      setError(e.message || "Unable to load drives.");
    }
  }
  useEffect(() => {
    if (!initialCatalog) load();
  }, []);
  const selectedDrive = catalog?.drives.find((d: any) => d.id === drive);
  const jobs: Job[] = (catalog?.jobs || []).filter(
    (j: Job) => j.driveId === drive,
  );
  const ranked = rankJobs(profile, jobs, scores);
  const shown = ranked.filter((r) =>
    `${r.job.title} ${r.job.company} ${r.job.skills.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const hasClose = ranked.some(
    (r) => r.relevance >= (engine === "AI semantic matching" ? 0.35 : 0.18),
  );
  function update(k: keyof Profile, v: any) {
    nonce.current = "";
    setProfile((p) => ({ ...p, [k]: v }));
    setVerified(false);
    setConsent(false);
    setScores(undefined);
    setEngine("Keyword baseline");
  }
  async function upload(file?: File) {
    if (!file) return;
    setVerified(false);
    setConsent(false);
    setError("");
    setBusy(true);
    setMessage("Reading your resume on this device…");
    try {
      const { resumeText } = await import("@/lib/resume");
      const text = await resumeText(file);
      const draft = extractDraft(text);
      draft.summary = text
        .split(/\r?\n/)
        .filter(
          (line) =>
            (!draft.email || !line.includes(draft.email)) &&
            (!draft.phone || !line.includes(draft.phone)) &&
            (!draft.name || line.trim() !== draft.name),
        )
        .join("\n")
        .slice(0, 4000);
      setProfile({ ...empty, ...draft, education: {} });
      nonce.current = "";
      setScores(undefined);
      setEngine("Keyword baseline");
      setVerified(false);
      setMessage(
        "Text extracted. Check every field; qualification and experience need your confirmation.",
      );
    } catch (e: any) {
      setError(
        e.message ||
          "Could not read this resume. You can enter your details manually.",
      );
      setMessage("");
    } finally {
      setBusy(false);
    }
  }
  function baseline() {
    matchRun.current++;
    setBusy(false);
    setScores(undefined);
    setEngine("Keyword baseline");
    setMessage(
      "Showing basic text matching and all open roles. You can still register.",
    );
  }
  async function recommend() {
    if (!verified) {
      setError("Please check and confirm your profile first.");
      return;
    }
    const run = ++matchRun.current;
    setStage(2);
    setError("");
    setBusy(true);
    setScores(undefined);
    setEngine("Keyword baseline");
    setMessage(
      "Loading AI matching. The first model download may take a moment.",
    );
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const work = (async () => {
        const { semanticScores } = await import("@/lib/semantic");
        return semanticScores(profile, jobs, (s) => {
          if (matchRun.current === run) setMessage(s);
        });
      })();
      const result = await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(Error("Model loading timed out")),
            90000,
          );
        }),
      ]);
      if (matchRun.current === run) {
        setScores(result);
        setEngine("AI semantic matching");
        setMessage("AI matching ready. All open roles remain available below.");
      }
    } catch (e) {
      console.warn(
        "AI_MATCHING",
        e instanceof Error ? e.message : "Unavailable",
      );
      if (matchRun.current === run) {
        setScores(undefined);
        setEngine("Keyword baseline");
        setMessage(
          "AI matching is unavailable. Showing basic text matching and all open roles. You can still register.",
        );
      }
    } finally {
      if (timeout) clearTimeout(timeout);
      if (matchRun.current === run) setBusy(false);
    }
  }
  async function submit() {
    setError("");
    setSaving(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          driveId: drive,
          consent,
          jobIds: choices,
          requestId: requestToken(),
        }),
      });
      const data: any = await r.json();
      if (!r.ok) {
        if (data.refreshRoles) {
          const fresh = await fetch("/api/catalog");
          if (fresh.ok) {
            const updated: any = await fresh.json();
            setCatalog(updated);
            const valid = new Set(
              updated.jobs
                .filter((j: Job) => j.driveId === drive)
                .map((j: Job) => j.id),
            );
            setChoices((c) => c.filter((j) => valid.has(j)));
            setScores(undefined);
            setEngine("Keyword baseline");
            nonce.current = "";
          }
        }
        throw Error(data.error);
      }
      setReceipt(data.reference);
      setMessage("");
      setStage(3);
    } catch (e: any) {
      setError(e.message || "Registration failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brandmark">T</span>
          <span>
            TGMSC <small>Placement Assistant</small>
          </span>
        </a>
        <a className="staff-link" href="/staff">
          Staff sign-in <ArrowRight size={15} />
        </a>
      </header>
      <main>
        <div className="eyebrow">FIND YOUR NEXT OPPORTUNITY</div>
        <div className="intro">
          <div>
            <h1>
              A clearer path to
              <br />
              <em>your next role.</em>
            </h1>
            <p>
              Register for a drive, tell us about your skills and explore the
              roles available to you.
            </p>
          </div>
          <div className="intro-note">
            <ShieldCheck size={22} />
            <span>
              Recommendations guide your choices.
              <br />
              You decide which roles to explore.
            </span>
          </div>
        </div>
        <div className="stepbar">
          {[
            "Choose a drive",
            "Your details",
            "Explore roles",
            "Registered",
          ].map((s, i) => (
            <div
              key={s}
              className={
                (stage === 4 ? 0 : stage) === i
                  ? "active"
                  : (stage === 4 ? 0 : stage) > i
                    ? "done"
                    : ""
              }
            >
              <span>
                {(stage === 4 ? 0 : stage) > i ? <Check size={14} /> : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>
        {error && (
          <div id="app-error" role="alert" className="alert error">
            {error} {!catalog && <button onClick={load}>Try again</button>}
          </div>
        )}
        {stage === 0 && (
          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="kicker">01 / GET STARTED</span>
                <h2>Choose a placement drive</h2>
                <p>See available roles before submitting your registration.</p>
              </div>
              <BriefcaseBusiness size={30} />
            </div>
            {!catalog ? (
              <p className="muted">Loading available drives…</p>
            ) : catalog.drives.length === 0 ? (
              <div className="empty">
                <h3>No open drives yet</h3>
                <p>
                  Placement staff will publish upcoming drives here. Please
                  check back later.
                </p>
              </div>
            ) : (
              <div className="drive-grid">
                {catalog.drives.map((d: any) => (
                  <button
                    key={d.id}
                    className={
                      "drive-card " + (drive === d.id ? "selected" : "")
                    }
                    onClick={() => {
                      setDrive(d.id);
                      setChoices([]);
                      setScores(undefined);
                    }}
                  >
                    <span className="badge">
                      {d.demo ? "DEMONSTRATION" : "REGISTRATION OPEN"}
                    </span>
                    <h3>{d.name}</h3>
                    <p>
                      {d.date} ·{" "}
                      {d.reporting_time || "Reporting time: ask organiser"}
                    </p>
                    <p>
                      <MapPin size={14} />
                      {d.venue}
                    </p>
                    <strong>
                      {
                        catalog.jobs.filter((j: Job) => j.driveId === d.id)
                          .length
                      }{" "}
                      open roles <ArrowRight size={16} />
                    </strong>
                  </button>
                ))}
              </div>
            )}
            <div className="actions">
              <span className="muted">
                No registration fee is collected by this app.
              </span>
              <button
                disabled={!drive || !jobs.length}
                onClick={() => {
                  setStage(4);
                  setError("");
                }}
              >
                View available roles <ArrowRight size={17} />
              </button>
            </div>
          </section>
        )}
        {stage === 4 && (
          <DriveOverview
            drive={selectedDrive}
            jobs={jobs}
            onBack={() => setStage(0)}
            onRegister={() => setStage(1)}
          />
        )}
        {stage === 1 && (
          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="kicker">02 / YOUR PROFILE</span>
                <h2>Tell us about yourself</h2>
                <p>
                  {selectedDrive?.name} · {selectedDrive?.date}
                </p>
              </div>
              <FileText size={30} />
            </div>
            <div className="upload">
              <FileText size={25} />
              <div>
                <h3>Start with your resume, or fill the form below</h3>
                <p>
                  Text PDF, DOCX or TXT · up to 5 MB. Scanned images need manual
                  entry. Your file stays on this device; only your confirmed
                  profile is submitted.
                </p>
                <label className="upload-button">
                  Choose resume
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    disabled={busy}
                    onChange={(e) => {
                      upload(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                recommend();
              }}
            >
              <fieldset disabled={busy}>
                <div className="form-grid">
                  <label>
                    Full name
                    <input
                      required
                      maxLength={100}
                      autoComplete="name"
                      value={profile.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </label>
                  <label>
                    Email (optional)
                    <input
                      type="email"
                      maxLength={150}
                      autoComplete="email"
                      value={profile.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      required
                      type="tel"
                      pattern="[+0-9 ()-]{8,20}"
                      maxLength={20}
                      value={profile.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </label>
                  <EducationFields
                    profile={profile}
                    onChange={changeEducation}
                  />
                  <label>
                    Experience in years
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="1"
                      placeholder="0 for fresher"
                      value={profile.experience ?? ""}
                      onChange={(e) =>
                        update(
                          "experience",
                          e.target.value === "" ? null : Number(e.target.value),
                        )
                      }
                    />
                  </label>
                  <label>
                    Skills, separated by commas
                    <input
                      maxLength={1500}
                      key={profile.skills.join("|")}
                      defaultValue={profile.skills.join(", ")}
                      onBlur={(e) =>
                        update("skills", normalizeSkills(e.target.value))
                      }
                    />
                  </label>
                </div>
                <label>
                  About your skills and experience
                  <textarea
                    maxLength={5000}
                    rows={5}
                    value={profile.summary}
                    onChange={(e) => update("summary", e.target.value)}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                  />
                  I checked my details and corrected anything missing or
                  incorrect.
                </label>
                <div className="actions">
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => setStage(4)}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  <button disabled={!verified || busy}>
                    Explore roles <ArrowRight size={17} />
                  </button>
                </div>
              </fieldset>
            </form>
          </section>
        )}
        {stage === 2 && (
          <section>
            <div className="panel compact">
              <div className="section-heading">
                <div>
                  <span className="kicker">03 / EXPLORE ROLES</span>
                  <h2>
                    {hasClose
                      ? "Roles worth a closer look"
                      : "Your next role could be something new"}
                  </h2>
                  <p>
                    {hasClose
                      ? "Start with these suggestions, and explore every open role below."
                      : "Few close matches? You can still explore all open roles, including opportunities outside your study background."}
                  </p>
                </div>
                <GraduationCap size={30} />
              </div>
              <div className="engine">
                <span className="badge">
                  {engine === "AI semantic matching"
                    ? "AI-assisted suggestions"
                    : "Basic text matching"}
                </span>
                <span>
                  {jobs.length} open roles · {choices.length} interests selected
                </span>
              </div>
              <p className="muted">
                {busy
                  ? message
                  : message ||
                    "All open roles are shown. Requirements and similarity are separate checks."}
              </p>
              <div role="status" aria-live="polite" className="sr-only">
                {message}
              </div>
              {(busy || engine === "AI semantic matching") && (
                <button className="secondary" onClick={baseline}>
                  {busy
                    ? "Continue with basic matching"
                    : "Use basic matching instead"}
                </button>
              )}
              <p className="fine">
                Explore roles that interest you and read their requirements.
                These suggestions help you prepare; employers confirm
                eligibility and interview decisions.
              </p>
              <div className="search">
                <Search size={18} />
                <input
                  aria-label="Search roles"
                  placeholder="Search roles, companies or skills"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="roles">
              {shown.map((r) => (
                <article className="role-card" key={r.job.id}>
                  <div className="role-top">
                    <span className="company">{r.job.company}</span>
                    <span
                      className={
                        "badge " +
                        (r.status === "Entered requirements met"
                          ? "positive"
                          : "neutral")
                      }
                    >
                      {r.status === "Entered requirements met"
                        ? "Minimum checks met"
                        : r.status}
                    </span>
                  </div>
                  <h3>{r.job.title}</h3>
                  <div className="role-meta">
                    <MapPin size={14} />
                    {r.job.location || "Location not specified"} ·{" "}
                    {r.job.salary || "Pay not specified"}
                  </div>
                  <p>{r.job.description}</p>
                  {r.job.educationRules?.degreeNote && (
                    <p>
                      Education conditions: {r.job.educationRules.degreeNote}
                    </p>
                  )}
                  <div className="tags">
                    {r.job.skills.map((s) => (
                      <span
                        key={s}
                        className={r.matched.includes(s) ? "matched" : ""}
                      >
                        {r.matched.includes(s) && <Check size={12} />} {s}
                      </span>
                    ))}
                  </div>
                  <details>
                    <summary>Requirements & matching details</summary>
                    {r.checks.map((c) => (
                      <p key={c.name}>
                        {c.name}: {c.detail} —{" "}
                        {c.state === "met"
                          ? "met from your entries"
                          : c.state === "gap"
                            ? "check with staff"
                            : "information needed"}
                      </p>
                    ))}
                    <p>
                      Skills not listed in your profile:{" "}
                      {r.missing.join(", ") || "None from this list"}. These are
                      not automatically disqualifying.
                    </p>
                    <p>
                      Text similarity: {r.relevance.toFixed(2)} ({engine}). This
                      is not a hiring probability. Skills, degree details and summary are
                      compared. Contact fields are not used for matching. Avoid
                      personal or sensitive details in the summary.
                    </p>
                  </details>
                  <label className="interest">
                    <input
                      type="checkbox"
                      disabled={
                        saving ||
                        (!choices.includes(r.job.id) && choices.length >= 20)
                      }
                      checked={choices.includes(r.job.id)}
                      onChange={(e) => {
                        nonce.current = "";
                        setChoices((c) =>
                          e.target.checked
                            ? [...c, r.job.id]
                            : c.filter((x) => x !== r.job.id),
                        );
                      }}
                    />
                    I’m interested in this role
                  </label>
                </article>
              ))}
            </div>
            {!shown.length && (
              <div className="empty">
                No roles match this search. Clear the search to see all open
                roles.
              </div>
            )}
            <div className="panel submit-panel">
              <h3>Ready to register?</h3>
              <p>
                Choose up to 20 interests, or register without choosing a role.
                Your interests help placement staff guide you; they do not
                submit an application to an employer.
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I agree to share my confirmed profile and role interests with
                TGMSC placement staff for this drive.
              </label>
              <div className="actions">
                <button
                  className="secondary"
                  disabled={saving}
                  onClick={() => {
                    matchRun.current++;
                    setBusy(false);
                    setStage(1);
                    setMessage("");
                    setConsent(false);
                  }}
                >
                  <ArrowLeft size={16} />
                  Edit profile
                </button>
                <button disabled={!consent || busy || saving} onClick={submit}>
                  {saving
                    ? "Saving registration…"
                    : busy
                      ? "Please wait…"
                      : "Submit registration"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </section>
        )}
        {stage === 3 && (
          <section className="panel success">
            <span className="success-icon">
              <Check size={35} />
            </span>
            <span className="kicker">REGISTRATION SAVED</span>
            <h2>You’re on the list, {profile.name.split(" ")[0]}.</h2>
            <p>
              Your reference is <strong>{receipt}</strong>. Save this reference
              for placement staff.
            </p>
            <p>
              {selectedDrive?.name} · {selectedDrive?.date}
            </p>
            <p>
              Bring your resume and follow the organiser’s reporting
              instructions. Your interests help placement staff guide you on the
              day.
            </p>
            <p>
              {selectedDrive?.venue} · Reporting:{" "}
              {selectedDrive?.reporting_time || "Ask the organiser"}
            </p>
            <p>
              Help:{" "}
              {selectedDrive?.help_contact || "Contact TGMSC placement staff"}
            </p>
            <p>{selectedDrive?.instructions}</p>
            <p>
              Your interests:{" "}
              {choices
                .map((id) => jobs.find((j) => j.id === id)?.title)
                .filter(Boolean)
                .join(", ") || "Explore available roles with staff on arrival"}
            </p>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(receipt);
                  setMessage("Reference copied.");
                } catch {
                  setMessage(
                    "Select the reference above and copy it, or take a screenshot.",
                  );
                }
              }}
            >
              Copy reference
            </button>
            <p role="status">{message}</p>
            <button
              onClick={() => {
                nonce.current = "";
                setStage(0);
                setProfile({ ...empty });
                setChoices([]);
                setVerified(false);
                setConsent(false);
                setReceipt("");
                setMessage("");
                setScores(undefined);
                setSearch("");
                setDrive("");
                setEngine("Keyword baseline");
              }}
            >
              Return to drives
            </button>
          </section>
        )}
        {stage === 1 && message && (
          <p className="status" role="status">
            {message}
          </p>
        )}
        <footer>
          <span>TGMSC · Opportunities with clarity</span>
          <details>
            <summary>How this works & privacy</summary>
            <p>
              Your resume is read on your device. Check the profile before
              submitting. AI-assisted matching downloads a model and runs in
              your browser; if it fails, basic text matching is labelled. No
              résumé text is sent to a generative AI service. Your confirmed
              details are stored for authorized placement staff. Do not enter
              Aadhaar, religion, health or other sensitive details. Contact
              TGMSC staff to correct or withdraw a registration.
            </p>
            <p>
              Role information is provided by placement organisers. Contact them
              for current drive details.
            </p>
          </details>
        </footer>
      </main>
    </>
  );
}
