import {initializeApp} from "firebase/app";
import {getAuth,setPersistence,browserSessionPersistence,GoogleAuthProvider,signInWithPopup,signOut} from "firebase/auth";
const e=import.meta.env;
export const configured=!!(e.VITE_FIREBASE_API_KEY&&e.VITE_FIREBASE_PROJECT_ID&&e.VITE_FIREBASE_AUTH_DOMAIN&&e.VITE_FIREBASE_APP_ID);
export const auth=configured?getAuth(initializeApp({apiKey:e.VITE_FIREBASE_API_KEY,projectId:e.VITE_FIREBASE_PROJECT_ID,authDomain:e.VITE_FIREBASE_AUTH_DOMAIN,appId:e.VITE_FIREBASE_APP_ID})):null;
export async function login(){if(!auth)throw Error("Firebase sign-in needs configuration by the site owner.");await setPersistence(auth,browserSessionPersistence);const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:"select_account"});await signInWithPopup(auth,provider);}
export async function logout(){if(auth)await signOut(auth);location.assign("/");}
export async function authFetch(input:string,options:RequestInit={}){if(!auth?.currentUser)throw Error("Please sign in again.");const headers=new Headers(options.headers);headers.set("Authorization","Bearer "+await auth.currentUser.getIdToken());return fetch(input,{...options,headers,cache:"no-store"});}
export async function exportCSV(url:string){const r=await authFetch(url);if(!r.ok){const v:any=await r.json();throw Error(v.error||"Export failed");}const u=URL.createObjectURL(await r.blob()),a=document.createElement("a");a.href=u;a.download="placement-registrations.csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
