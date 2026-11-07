"use client";
import { qualificationNames, type Job } from "@/lib/matching";
export default function DriveOverview({
  drive,
  jobs,
  onBack,
  onRegister,
}: {
  drive: any;
  jobs: Job[];
  onBack: () => void;
  onRegister: () => void;
}) {
  return (
    <section className="panel">
      <h2>{drive?.name}</h2>
      <p>
        {drive?.date} · {drive?.venue}
      </p>
      <p>Reporting time: {drive?.reporting_time || "Ask the organiser"}</p>
      <p>Help: {drive?.help_contact || "Contact TGMSC placement staff"}</p>
      {drive?.deadline && (
        <p>
          Register by{" "}
          {new Date(drive.deadline).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}{" "}
          IST
        </p>
      )}
      <p>{drive?.instructions}</p>
      {jobs.length === 0 && <p>No roles are open for this drive yet. Please check again later or contact the organiser.</p>}
      <div className="roles">
        {jobs.map((j) => (
          <article className="role-card" key={j.id}>
            <span className="company">{j.company}</span>
            <h3>{j.title}</h3>
            <p>
              {j.location || "Ask organiser for location"} ·{" "}
              {j.salary || "Pay details available from organiser"}
            </p>
            <p>{j.description}</p>
            {j.skills.length > 0 && <p>Skills: {j.skills.join(", ")}</p>}
            <p>Experience: {j.experience} whole year(s) minimum</p>
            <p>
              Education:{" "}
              {j.qualification < 0
                ? "No formal qualification requirement"
                : j.educationRules?.qualifications
                    ?.map((q) => qualificationNames[q])
                    .join(", ") || qualificationNames[j.qualification]}
            </p>
            {j.educationRules?.degreeNote && (
              <p>{j.educationRules.degreeNote}</p>
            )}
            <p>
              {j.educationRules?.batchMode === "years"
                ? "Graduation years: " + j.educationRules.years?.join(", ")
                : j.educationRules?.batchMode === "through"
                  ? "Graduation: " + j.educationRules.through + " and earlier"
                  : ""}
            </p>
            {j.educationRules?.pursuing != null && (
              <p>
                {j.educationRules.pursuing
                  ? "Currently pursuing students may express interest."
                  : "Completed qualification required."}
              </p>
            )}
          </article>
        ))}
      </div>
      <div className="actions">
        <button className="secondary" onClick={onBack}>
          Back to drives
        </button>
        <button disabled={!jobs.length} onClick={onRegister}>
          Register for this drive
        </button>
      </div>
    </section>
  );
}
