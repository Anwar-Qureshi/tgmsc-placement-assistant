import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {verifyStaffToken} from '../lib/auth.ts';
import {requestContext} from '../lib/context.ts';
const {privateKey,publicKey}=await generateKeyPair('RS256');
const key=await exportJWK(publicKey);key.kid='test';key.alg='RS256';
const keys=createLocalJWKSet({keys:[key]});
const env={FIREBASE_PROJECT_ID:'test-project',STAFF_EMAILS:'Staff@example.com'};
async function token(patch:Record<string,unknown>={}){return new SignJWT({sub:'user1',email:'staff@example.com',email_verified:true,auth_time:Math.floor(Date.now()/1000),firebase:{sign_in_provider:'google.com'},iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,iss:'https://securetoken.google.com/test-project',aud:'test-project',...patch}).setProtectedHeader({alg:'RS256',kid:'test'}).sign(privateKey);}
test('signed Google identity and explicit approved email accepted',async()=>assert.deepEqual(await verifyStaffToken(await token(),env,keys),{uid:'user1',email:'staff@example.com'}));
test('valid Google account alone does not grant staff access',async()=>{await assert.rejects(verifyStaffToken(await token({email:'outsider@example.com'}),env,keys));});
test('wrong project and issuer rejected',async()=>{for(const patch of [{aud:'other'},{iss:'https://securetoken.google.com/other'}])await assert.rejects(verifyStaffToken(await token(patch),env,keys));});
test('expired, future and unverified identities rejected',async()=>{for(const patch of [{exp:1},{iat:Math.floor(Date.now()/1000)+3600},{auth_time:Math.floor(Date.now()/1000)+3600},{email_verified:false},{firebase:{sign_in_provider:'password'}}])await assert.rejects(verifyStaffToken(await token(patch),env,keys));});
test('unsigned or tampered tokens rejected',async()=>{await assert.rejects(verifyStaffToken('eyJhbGciOiJub25lIn0.e30.',env,keys));const good=await token();await assert.rejects(verifyStaffToken(good.slice(0,-8)+'AAAAAAAA',env,keys));});
test('missing backend configuration fails closed',async()=>{await assert.rejects(verifyStaffToken(await token(),{...env,FIREBASE_PROJECT_ID:''},keys));await assert.rejects(verifyStaffToken(await token(),{...env,STAFF_EMAILS:''},keys));});
test('concurrent request identities remain isolated',async()=>{const values=await Promise.all(['one','two'].map(email=>requestContext.run({env:{} as any,request:new Request('https://example.com'),user:{uid:email,email}},async()=>{await new Promise(r=>setTimeout(r,5));return requestContext.getStore()?.user?.email;})));assert.deepEqual(values,['one','two']);});
