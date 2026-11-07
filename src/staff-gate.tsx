import {useEffect,useState} from "react";
import {onAuthStateChanged} from "firebase/auth";
import {auth,configured,login,logout,authFetch} from "./firebase";
import StaffApp from "../app/staff/staff-app";
export default function StaffGate(){const [ready,setReady]=useState(false),[busy,setBusy]=useState(configured),[error,setError]=useState("");
 useEffect(()=>{if(!auth)return;return onAuthStateChanged(auth,async user=>{setReady(false);setError("");if(!user){setBusy(false);return;}setBusy(true);try{const r=await authFetch("/api/staff?auth=1"),d:any=await r.json();if(!r.ok)throw Error(d.error);setReady(true);}catch(e:any){setError(e.message||"Staff access could not be checked.");}finally{setBusy(false);}});},[]);
 if(ready)return <StaffApp/>;
 return <main><a href="/">← Candidate registration</a><section className="panel"><h1>Staff sign-in</h1><p>Use your approved Google account to manage placement drives and registrations.</p>{!configured&&<p role="alert">The site owner needs to configure staff sign-in before this workspace can be used.</p>}{error&&<p role="alert">{error}</p>}<button disabled={busy||!configured} onClick={async()=>{setError("");try{await login();}catch(e:any){setError(e.code==="auth/popup-blocked"?"Allow the sign-in popup and try again.":"Sign-in was not completed. Try again with your approved Google account.");}}}>{busy?"Checking access…":"Sign in with Google"}</button>{auth?.currentUser&&<button className="secondary" onClick={logout}>Sign out</button>}</section></main>;
}
