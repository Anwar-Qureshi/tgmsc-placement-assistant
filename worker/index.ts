import {requestContext,type AppEnv} from "../lib/context";
import {verifyStaffToken} from "../lib/auth";
import {json} from "../lib/server";
import * as catalog from "../app/api/catalog/route";
import * as register from "../app/api/register/route";
import * as staff from "../app/api/staff/route";
export default {async fetch(request:Request,env:AppEnv):Promise<Response>{
 const url=new URL(request.url);if(!url.pathname.startsWith("/api/"))return env.ASSETS.fetch(request);
 let user=null;
 if(url.pathname==="/api/staff"){
  if(!env.FIREBASE_PROJECT_ID||!env.STAFF_EMAILS?.trim())return json({error:"Staff sign-in is not configured. Contact the site owner."},503);
  try{const token=request.headers.get("authorization")?.match(/^Bearer (\S+)$/)?.[1];if(!token)throw Error();user=await verifyStaffToken(token,env);}catch{return json({error:"Sign in with an authorised staff Google account."},403);}
 }
 return requestContext.run({env,request,user},async()=>{try{
  if(url.pathname==="/api/staff"&&request.method==="GET"&&url.searchParams.get("auth")==="1")return json({user});
  if(url.pathname==="/api/catalog"&&request.method==="GET")return await catalog.GET();
  if(url.pathname==="/api/register"&&request.method==="POST")return await register.POST(request);
  if(url.pathname==="/api/staff"&&request.method==="GET")return await staff.GET(request);
  if(url.pathname==="/api/staff"&&request.method==="POST")return await staff.POST(request);
  return json({error:"Endpoint or method not available."},404);
 }catch{return json({error:"The service is temporarily unavailable. Please retry."},503);}});
}};
