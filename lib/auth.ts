import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from "jose";
import type {AppEnv,StaffIdentity} from "./context";
const googleKeys=createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),{timeoutDuration:5000,cooldownDuration:30000});
export async function verifyStaffToken(token:string,env:Pick<AppEnv,"FIREBASE_PROJECT_ID"|"STAFF_EMAILS">,keys:JWTVerifyGetKey=googleKeys):Promise<StaffIdentity>{
 if(!env.FIREBASE_PROJECT_ID||!env.STAFF_EMAILS.trim())throw Error("Staff authentication is not configured");
 const {payload:p}=await jwtVerify(token,keys,{algorithms:["RS256"],issuer:`https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,audience:env.FIREBASE_PROJECT_ID,requiredClaims:["exp","iat","sub","auth_time","email","email_verified"]});
 const now=Math.floor(Date.now()/1000),firebase=p.firebase as {sign_in_provider?:string}|undefined;
 if(!p.sub||p.sub.length>128||typeof p.iat!=="number"||p.iat>now||typeof p.auth_time!=="number"||p.auth_time>now||p.email_verified!==true||typeof p.email!=="string"||firebase?.sign_in_provider!=="google.com")throw Error("Invalid staff identity");
 const email=p.email.toLowerCase();if(!env.STAFF_EMAILS.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean).includes(email))throw Error("Account is not authorised for staff access");
 return {uid:p.sub,email};
}
