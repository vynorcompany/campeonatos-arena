import { spawn } from 'node:child_process';
import { runtimeEnvironment } from './runtime-server.mjs';

const source=process.env.DATABASE_URL||'';
const url=new URL(source);
if((process.env.GITHUB_ACTIONS!=='true'&&process.env.ARENA_VISUAL_LOCAL!=='true')||url.hostname!=='127.0.0.1'||url.port!=='55433'||url.pathname!=='/arena_goal'||url.username!=='postgres')throw new Error('Disposable local CI database required.');
url.username='arena_runtime';url.password='fixture';url.searchParams.set('connection_limit','8');
const environment=runtimeEnvironment({...process.env,APP_DATABASE_URL:url.toString(),PORT:process.env.PORT||'3011',HOSTNAME:'127.0.0.1'});
environment.HOSTNAME='127.0.0.1';
environment.NODE_ENV='production';
for(const key of ['ARENA_GOAL_TEST_DATABASE_URL','ARENA_GOAL_TEST_SESSION_TOKEN'])delete environment[key];
const child=spawn(process.execPath,['.next/standalone/server.js'],{env:environment,stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',(code,signal)=>{process.exitCode=code??(signal?1:0)});
