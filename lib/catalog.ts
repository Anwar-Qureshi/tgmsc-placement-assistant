import { db } from "./server";
/** One database round trip; only public, open and upcoming event information. */
export async function catalogData() {
  const d=db(), today=new Date(Date.now()+330*60000).toISOString().slice(0,10), now=new Date().toISOString();
  const [drives,jobs]=await d.batch([
    d.prepare("SELECT * FROM drives WHERE status='open' AND demo=0 AND reporting_time<>'' AND help_contact<>'' AND date>=? AND (deadline='' OR deadline>?) ORDER BY date").bind(today,now),
    d.prepare("SELECT j.*,c.name AS company FROM jobs j JOIN companies c ON c.id=j.company_id JOIN drives d ON d.id=j.drive_id WHERE j.status='open' AND d.status='open' AND d.demo=0 AND c.demo=0 AND d.reporting_time<>'' AND d.help_contact<>'' AND d.date>=? AND (d.deadline='' OR d.deadline>?)").bind(today,now)
  ]);
  return {drives:drives.results,jobs:jobs.results.map((j:any)=>({...j,driveId:j.drive_id,companyId:j.company_id,educationRules:JSON.parse(j.education_rules||"{}"),skills:JSON.parse(j.skills)}))};
}
