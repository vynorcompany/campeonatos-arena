// CI exercises the same restricted database roles as the deployed server.
if (process.env.GITHUB_ACTIONS === 'true') await import('./start-isolated-ci.mjs');
else await import('../.next/standalone/server.js');
