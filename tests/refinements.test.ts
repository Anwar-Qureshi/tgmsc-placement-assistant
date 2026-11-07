import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync,readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {contactKey,phoneKey} from "../lib/contact.ts";
import { activeEducationRules,batchModeChange } from "../lib/education.ts";
import { educationChecks } from "../lib/education.ts";
import { profileSchema, profileIssue, rulesSchema } from "../lib/validation.ts";
import { recordQuery,exportPageQuery } from "../lib/records.ts";
import { requirements, normalizeSkills, rankJobs } from "../lib/matching.ts";
import { demoProfile, demoJobs } from "./fixtures/catalog.ts";
const pursuing = {
  degree: "B.E. AI & Data Science",
  status: "pursuing" as const,
  year: 2027,
};
test("pursuing degree cannot silently satisfy completed graduate requirement", () => {
  const c = educationChecks(1, pursuing, 3, {
    qualifications: [3, 4],
    pursuing: false,
  });
  assert.equal(c[0].state, "gap");
  assert.equal(c.find((x) => x.name === "Study status")?.state, "gap");
});
test("2027 pursuing candidate meets explicitly accepted status and batch", () => {
  const c = educationChecks(1, pursuing, 3, {
    qualifications: [3, 4],
    pursuing: true,
    batchMode: "years",
    years: [2026, 2027],
  });
  assert.ok(c.every((x) => x.state === "met"));
});
test("a matching graduation year alone does not approve pursuing students", () => {
  const c = educationChecks(1, pursuing, 3, {
    qualifications: [3],
    batchMode: "years",
    years: [2027],
  });
  assert.equal(c[0].state, "gap");
  assert.equal(c.find((x) => x.name === "Study status")?.state, "unknown");
});
test("batch year missing remains unknown; through-year is inclusive", () => {
  assert.equal(
    educationChecks(3, {}, 3, { batchMode: "years", years: [2026] }).at(-1)
      ?.state,
    "unknown",
  );
  assert.equal(
    educationChecks(3, { status: "completed", year: 2026 }, 3, {
      batchMode: "through",
      through: 2026,
    }).at(-1)?.state,
    "met",
  );
  assert.equal(
    educationChecks(3, { status: "completed", year: 2027 }, 3, {
      batchMode: "through",
      through: 2026,
    }).at(-1)?.state,
    "gap",
  );
});
test("diploma is an explicit accepted alternative, not an assumed equivalent", () => {
  assert.equal(educationChecks(3, {}, 2)[0].state, "gap");
  assert.equal(
    educationChecks(2, {}, 3, { qualifications: [2, 3] })[0].state,
    "met",
  );
});
test("no formal qualification restriction can include an unprovided qualification", () => {
  assert.equal(educationChecks(null, {}, -1)[0].state, "met");
});
test("0, 1 and 2 years accepted; fractional and negative experience rejected", () => {
  for (const value of [0, 1, 2, 60])
    assert.ok(
      profileSchema.safeParse({ ...demoProfile, experience: value }).success,
    );
  for (const value of [-1, 0.5, 2.25, 61])
    assert.equal(
      profileSchema.safeParse({ ...demoProfile, experience: value }).success,
      false,
    );
});
test("education details and years need confirmation", () => {
  assert.ok(profileIssue({ ...demoProfile, education: {} }));
  assert.equal(
    profileIssue({
      ...demoProfile,
      education: {
        degree: "B.Sc. Computer Science",
        status: "completed",
        year: 2025,
      },
    }),
    "",
  );
  assert.ok(
    profileIssue({
      ...demoProfile,
      qualification: 1,
      education: { degree: "B.E.", status: "pursuing", year: 2020 },
    }),
  );
  assert.ok(
    profileIssue({
      ...demoProfile,
      education: { degree: "B.Sc.", status: "completed", year: 2099 },
    }),
  );
});
test("batch restrictions require actual accepted years and qualifications", () => {
  assert.equal(
    rulesSchema.safeParse({ batchMode: "years", years: [] }).success,
    false,
  );
  assert.equal(
    rulesSchema.safeParse({ batchMode: "through", through: null }).success,
    false,
  );
  assert.equal(rulesSchema.safeParse({ qualifications: [] }).success, false);
});
test("reviewed skill aliases normalise consistently without inventing skills", () => {
  assert.deepEqual(
    normalizeSkills("MS Excel, Microsoft Excel, JS, customer support"),
    ["excel", "javascript", "customer service"],
  );
});
test("unmet requirements never hide other roles", () => {
  const jobs = demoJobs.map((j) => ({
    ...j,
    educationRules: {
      qualifications: [3],
      pursuing: false,
      batchMode: "years" as const,
      years: [2020],
    },
  }));
  assert.equal(
    rankJobs({ ...demoProfile, qualification: 1, education: pursuing }, jobs)
      .length,
    4,
  );
  assert.equal(
    requirements(
      { ...demoProfile, qualification: 1, education: pursuing },
      jobs[0],
    ).status,
    "Check requirements",
  );
});
test("legacy database migrates without losing data; paging and export reach beyond 2000 and filters bind safely", () => {
  const q = recordQuery(new URLSearchParams("page=51")),
    lookup = recordQuery(new URLSearchParams("q=00000001")),
    literal = recordQuery(new URLSearchParams("q=100%25_")),
    malicious = recordQuery(new URLSearchParams("q=' OR 1=1 --"));
  const migrations = readdirSync(new URL("../drizzle",import.meta.url)).filter(p=>p.endsWith(".sql")).sort().map(p=>"drizzle/"+p).map((p) =>
    readFileSync(new URL("../" + p, import.meta.url), "utf8").replaceAll(
      "--> statement-breakpoint",
      "",
    ),
  );
  const result = JSON.parse(
    execFileSync(
      "python",
      [
        "-c",
        `import sqlite3,json,sys
x=json.load(sys.stdin);c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON');c.executescript(x['migrations'][0]);c.execute("INSERT INTO drives VALUES ('d','Fictional drive','2026-12-01','Example venue','open',0)")
for i in range(2505):
 ident=f'{i:08x}-test';name='100%_ Example' if i==1 else 'Example '+str(i)
 c.execute('INSERT INTO candidates VALUES (?,?,?,?,?,?,?,?,?)',(ident,name,str(i)+'@example.com','99999'+str(i).zfill(5),1,0,'[]','Fictional','2026-11-01T00:00:00Z'))
 c.execute('INSERT INTO registrations VALUES (?,?,?,?,?,?,?)',(ident,'d',ident,'hash',ident,'registered','2026-11-01T00:00:00Z'))

for migration in x['migrations'][1:]:c.executescript(migration)
c.execute("INSERT INTO companies VALUES ('co','Example','Example',0)");c.execute("INSERT INTO jobs (id,drive_id,company_id,title,description,skills,qualification,experience,location,salary,status) VALUES ('j','d','co','Example role','Example role description','[]',1,0,'Example','','open')")
join=' FROM registrations r JOIN candidates c ON r.candidate_id=c.id JOIN drives d ON r.drive_id=d.id'
out={}
for name,q in x['queries'].items():
 sql='SELECT r.id'+join+q['where']+' ORDER BY r.created_at DESC,r.id DESC LIMIT ? OFFSET ?'
 out[name]=[r[0] for r in c.execute(sql,[*q['values'],q['limit'],q['offset']])]
out['count']=c.execute('SELECT count(*) FROM registrations').fetchone()[0];out['education']=c.execute('SELECT education FROM candidates LIMIT 1').fetchone()[0]
print(json.dumps(out))`,
      ],
      {
        input: JSON.stringify({
          migrations,
          queries: { page: q, lookup, literal, malicious,export1:exportPageQuery(new URLSearchParams(),"2026-11-07T00:00:00Z"),export2:exportPageQuery(new URLSearchParams(),"2026-11-07T00:00:00Z",{time:"2026-11-01T00:00:00Z",id:(1505).toString(16).padStart(8,"0")+"-test"}),export3:exportPageQuery(new URLSearchParams(),"2026-11-07T00:00:00Z",{time:"2026-11-01T00:00:00Z",id:(505).toString(16).padStart(8,"0")+"-test"}) },
        }),
        encoding: "utf8",
      },
    ),
  );
  assert.equal([...result.export1,...result.export2,...result.export3].length,2505);assert.equal(new Set([...result.export1,...result.export2,...result.export3]).size,2505);
  assert.equal(result.count, 2505);
  assert.equal(result.education, "{}");
  assert.equal(result.page.length, 5);
  assert.ok(result.lookup.includes("00000001-test"));
  assert.equal(result.literal.length, 1);
  assert.equal(result.malicious.length, 0);
});

test("shared family phone preserves distinct candidates while normalising repeat details",()=>{
 assert.equal(phoneKey("+91 90000-00026"),"9000000026");
 assert.equal(contactKey("d"," QA   Name ","","+919000000026"),contactKey("d","qa name","","9000000026"));
 assert.notEqual(contactKey("d","First Person","","9000000026"),contactKey("d","Second Person","","9000000026"));
 assert.equal(contactKey("d","Name","EXAMPLE@EXAMPLE.COM","9000000026"),contactKey("d","Changed Name","example@example.com","9000000027"));
});

test("pursuing undergraduate with completed diploma needs its branch and then validates",()=>{
 const p={...demoProfile,qualification:2,education:{...pursuing}};
 assert.ok(profileIssue(p));
 assert.equal(profileIssue({...p,education:{...p.education,diploma:"Computer Engineering"}}),"");
});

test("inactive invalid years cannot block a valid through-year role",()=>{
 const rules={qualifications:[3,4],pursuing:null,batchMode:"through",through:2026,years:[null]};
 const parsed=rulesSchema.safeParse(rules);assert.ok(parsed.success);
 if(parsed.success){assert.equal(parsed.data.through,2026);assert.equal(parsed.data.years,undefined);}
});
test("batch switching clears only inactive rules and keeps active restrictions",()=>{
 const draft={qualifications:[3,4],pursuing:false,batchMode:"years" as const,years:[Number.NaN],through:2026,degreeNote:"B.Com preferred"};
 const through=batchModeChange(draft,"through");
 assert.equal(through.years,undefined);assert.equal(through.through,2026);assert.equal(through.pursuing,false);assert.equal(through.degreeNote,"B.Com preferred");
 const any=batchModeChange(draft,"any");assert.equal(any.years,undefined);assert.equal(any.through,undefined);
});
test("malformed active years still fail instead of silently removing a restriction",()=>{
 for(const years of [[null],[2026,null],[2026.5],[0],[2101],[]])assert.equal(rulesSchema.safeParse({batchMode:"years",years}).success,false);
 for(const through of [null,Number.NaN,0,2026.5,2101])assert.equal(rulesSchema.safeParse({batchMode:"through",through}).success,false);
 assert.equal(rulesSchema.safeParse({batchMode:"years",years:[2026,2027],through:null}).success,true);
});
test("serialized browser NaN in an inactive field is ignored; active year remains mandatory",()=>{
 const roundtrip=JSON.parse(JSON.stringify({batchMode:"through",through:2026,years:[Number.NaN]}));
 assert.ok(rulesSchema.safeParse(roundtrip).success);
 assert.equal(rulesSchema.safeParse({...roundtrip,through:null}).success,false);
});
