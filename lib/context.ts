import {AsyncLocalStorage} from "node:async_hooks";
export type StaffIdentity={uid:string;email:string};
export type AppEnv={DB:D1Database;ASSETS:Fetcher;FIREBASE_PROJECT_ID:string;STAFF_EMAILS:string};
export const requestContext=new AsyncLocalStorage<{env:AppEnv;request:Request;user:StaffIdentity|null}>();
export function context(){const value=requestContext.getStore();if(!value)throw Error("Request context unavailable");return value;}
