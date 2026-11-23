import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

void test('S11 compiled production modules boot health and expose both safe routes with missing config', () => {
  const script = `require('reflect-metadata'); const {NestFactory}=require('@nestjs/core');const {AppModule}=require('./dist/app.module.js');const {configureNotificationHttp}=require('./dist/modules/notifications/presentation/notification-http.js');(async()=>{const app=await NestFactory.create(AppModule,{logger:false,bodyParser:false});try{app.setGlobalPrefix('api');configureNotificationHttp(app);await app.listen(0,'127.0.0.1');const url=await app.getUrl();const results=[];for(const route of ['health','notifications/identity-grant','notifications/readiness']){const response=await fetch(url+'/api/'+route,route==='health'?{}:{method:'POST',headers:{authorization:'Bearer synthetic','content-type':'application/json'},body:'{}'});results.push({status:response.status,body:await response.json()});}console.log(JSON.stringify(results));}finally{await app.close();}})().catch(e=>{console.error(e);process.exitCode=1;});`;
  const results: unknown = JSON.parse(
    execFileSync(process.execPath, ['-e', script], {
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://weave@127.0.0.1:1/unavailable',
        CLERK_SECRET_KEY: '',
        CLERK_PUBLISHABLE_KEY: '',
        CLERK_EXPECTED_ISSUER: '',
        ONESIGNAL_APP_ID: '',
        ONESIGNAL_IDENTITY_PRIVATE_KEY: '',
        NOTIFICATION_BUDGET_HMAC_KEY: '',
      },
      encoding: 'utf8',
    }),
  );

  assert.deepEqual(results, [
    {status: 200, body: {status: 'ok', service: 'weave-api'}},
    {status: 503, body: {code: 'notifications_unavailable'}},
    {status: 503, body: {code: 'notifications_unavailable'}},
  ]);
});

void test('S11 compiled CommonJS signer loads jose ESM and produces verified ES256 grant', () => {
  const script = `const {JoseIdentityGrantSigner}=require('./dist/modules/notifications/infrastructure/jose-identity-grant-signer.js');(async()=>{const {generateKeyPair,exportPKCS8,jwtVerify}=await import('jose');const pair=await generateKeyPair('ES256',{extractable:true});const now=Date.now();const signer=new JoseIdentityGrantSigner({appId:'synthetic-app',privateKey:await exportPKCS8(pair.privateKey)},{now:()=>now});const grant=await signer.sign({accountId:'synthetic-account',sessionId:'synthetic-session',tokenExpiresAtSeconds:Math.floor(now/1000)+60});const verified=await jwtVerify(grant.token,pair.publicKey,{algorithms:['ES256'],issuer:'synthetic-app'});console.log(JSON.stringify(verified.payload.identity));})().catch(e=>{console.error(e);process.exitCode=1;});`;
  const result: unknown = JSON.parse(
    execFileSync(process.execPath, ['-e', script], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    }),
  );

  assert.deepEqual(result, {external_id: 'synthetic-account'});
});
