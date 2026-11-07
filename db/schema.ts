import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const drives = sqliteTable("drives", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  venue: text("venue").notNull(),
  status: text("status").notNull(),
  demo: integer("demo").notNull().default(0),
  reportingTime: text("reporting_time").notNull().default(""),
  deadline: text("deadline").notNull().default(""),
  helpContact: text("help_contact").notNull().default(""),
  instructions: text("instructions").notNull().default(""),
});
export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  demo: integer("demo").notNull().default(0),
});
export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  driveId: text("drive_id")
    .notNull()
    .references(() => drives.id),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  skills: text("skills").notNull(),
  qualification: integer("qualification").notNull(),
  experience: integer("experience").notNull(),
  location: text("location").notNull(),
  salary: text("salary").notNull(),
  educationRules: text("education_rules").notNull().default("{}"),
  status: text("status").notNull(),
});
export const candidates = sqliteTable(
  "candidates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    phoneKey: text("phone_key").notNull().default(""),
    qualification: integer("qualification"),
    experience: integer("experience"),
    skills: text("skills").notNull(),
    summary: text("summary").notNull(),
    education: text("education").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("candidates_phone_key_idx").on(t.phoneKey)],
);
export const registrations = sqliteTable(
  "registrations",
  {
    id: text("id").primaryKey(),
    driveId: text("drive_id")
      .notNull()
      .references(() => drives.id),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id),
    receiptHash: text("receipt_hash").notNull(),
    requestId: text("request_id").unique(),
    dedupe: text("dedupe").notNull().unique(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("registrations_candidate_idx").on(t.candidateId),
    index("registrations_drive_status_time_idx").on(
      t.driveId,
      t.status,
      t.createdAt,
    ),
  ],
);
export const interests = sqliteTable("interests", {
  id: text("id").primaryKey(),
  registrationId: text("registration_id")
    .notNull()
    .references(() => registrations.id),
  jobId: text("job_id")
    .notNull()
    .references(() => jobs.id),
}, t=>[index('interests_registration_idx').on(t.registrationId),index('interests_job_idx').on(t.jobId)]);

export const changes = sqliteTable("changes", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  recordId: text("record_id").notNull(),
  createdAt: text("created_at").notNull(),
});
export const submissionLimits = sqliteTable("submission_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
});
