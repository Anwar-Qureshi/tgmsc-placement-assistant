import { staff } from "@/lib/server";
import { chatGPTSignInPath } from "@/app/chatgpt-auth";
import StaffApp from "./staff-app";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await staff()))
    return (
      <main>
        <a href="/">← Candidate registration</a>
        <section className="panel">
          <h1>Staff workspace</h1>
          <p>
            Only authorized placement staff can view candidate records or change
            drives.
          </p>
          <a
            className="button"
            href={chatGPTSignInPath("/staff")}
            target="_top"
          >
            Sign in for staff access
          </a>
          <p>
            If you are signed in but still see this screen, ask the site owner
            to authorize your email.
          </p>
        </section>
      </main>
    );
  return <StaffApp />;
}
