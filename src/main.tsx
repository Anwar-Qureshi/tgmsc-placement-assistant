import React,{Suspense,lazy} from "react";
import {createRoot} from "react-dom/client";
import CandidateApp from "../app/candidate-app";
import "../app/globals.css";
const StaffGate=lazy(()=>import("./staff-gate"));
createRoot(document.getElementById("root")!).render(location.pathname.startsWith("/staff")?<Suspense fallback={<main>Loading staff sign-in…</main>}><StaffGate/></Suspense>:<CandidateApp/>);
