import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { athleteEmailKinds as kinds, issueAthleteEmailToken, confirmAthleteRecoveryEmail, resetAthletePasswordByEmail, athleteEmailTokenHash } from "../src/lib/auth/athlete-email-recovery";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposable = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);

test("verified recovery email: identity binding, replay, concurrent reset, revocation and rate limits", { skip: !disposable }, async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const auth = new PrismaClient({ datasources: { db: { url: url.replace("postgres@", "arena_auth:fixture@") } } });
  const suffix = randomUUID();
  const ids: string[] = [];
  try {
    const identity = await db.athleteIdentity.create({ data: { phone: `55619${randomInt(10000000, 99999999)}`, passwordHash: "old-hash" } }); ids.push(identity.id);
    const other = await db.athleteIdentity.create({ data: { phone: `other-${suffix}`, passwordHash: "other-hash" } }); ids.push(other.id);
    const email = `${suffix}@example.invalid`;
    const verify = (await issueAthleteEmailToken(auth, identity.id, email, kinds.verify))!;
    assert.notEqual((await db.accountActionToken.findUniqueOrThrow({ where: { id: verify.id } })).tokenHash, verify.token);
    assert.equal((await db.athleteIdentity.findUniqueOrThrow({ where: { id: identity.id } })).recoveryEmail, null);
    assert.equal(await confirmAthleteRecoveryEmail(auth, verify.token, other.id), false);
    assert.equal(await resetAthletePasswordByEmail(auth, verify.token, "bad"), false);
    assert.equal(await confirmAthleteRecoveryEmail(auth, verify.token, identity.id), true);
    assert.equal(await confirmAthleteRecoveryEmail(auth, verify.token, identity.id), false);
    const linked: string[] = [];
    for (const slug of ["arena-teste-goal", "arena-beta-goal"]) {
      const arena = await db.arena.findUniqueOrThrow({ where: { slug } });
      const player = await db.player.create({ data: { arenaId: arena.id, name: "Email recovery synthetic", phone: identity.phone } });
      const account = await db.playerAccount.create({ data: { arenaId: arena.id, playerId: player.id, phone: identity.phone, passwordHash: "old-hash", identityId: identity.id } });
      linked.push(account.id);
      await db.playerVerificationCode.create({ data: { arenaId: arena.id, phone: identity.phone.slice(2), purpose: "RESET", codeHash: "synthetic-hash", expiresAt: new Date(Date.now() + 60_000) } });
      await db.playerSession.create({ data: { playerAccountId: account.id, athleteIdentityId: identity.id, token: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
    }
    const reset = (await issueAthleteEmailToken(auth, identity.id, email, kinds.reset))!;
    const results = await Promise.all([resetAthletePasswordByEmail(auth, reset.token, "new-hash"), resetAthletePasswordByEmail(auth, reset.token, "new-hash")]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(await db.playerSession.count({ where: { athleteIdentityId: identity.id } }), 0);
    assert.equal(await db.playerVerificationCode.count({ where: { phone: identity.phone.slice(2), usedAt: null } }), 0);
    assert.equal(await db.playerAccount.count({ where: { id: { in: linked }, passwordHash: "new-hash" } }), 2);
    assert.equal((await db.athleteIdentity.findUniqueOrThrow({ where: { id: other.id } })).passwordHash, "other-hash");
    const expired = (await issueAthleteEmailToken(auth, identity.id, email, kinds.reset))!;
    await db.accountActionToken.update({ where: { id: expired.id }, data: { expiresAt: new Date(0) } });
    assert.equal(await resetAthletePasswordByEmail(auth, expired.token, "bad"), false);
    const stale = (await issueAthleteEmailToken(auth, identity.id, email, kinds.reset))!;
    await db.athleteIdentity.update({ where: { id: identity.id }, data: { recoveryEmail: `changed-${email}` } });
    assert.equal(await resetAthletePasswordByEmail(auth, stale.token, "bad"), false);
    assert.equal(await issueAthleteEmailToken(auth, identity.id, email, kinds.reset), null);
    assert.equal((await db.accountActionToken.findUniqueOrThrow({ where: { id: stale.id } })).tokenHash, athleteEmailTokenHash(stale.token));
  } finally {
    const accounts = await db.playerAccount.findMany({ where: { identityId: { in: ids } }, select: { playerId: true } });
    const identities = await db.athleteIdentity.findMany({ where: { id: { in: ids } }, select: { phone: true } });
    await db.playerVerificationCode.deleteMany({ where: { phone: { in: identities.map(i => i.phone.slice(2)) } } });
    await db.player.deleteMany({ where: { id: { in: accounts.map(a => a.playerId) } } });
    await db.athleteIdentity.deleteMany({ where: { id: { in: ids } } });
    await auth.$disconnect();
    await db.$disconnect();
  }
});

test("arena-scoped role cannot mint global athlete email tokens", { skip: !disposable }, async () => {
 const db=new PrismaClient({datasources:{db:{url}}});
 const runtime=new PrismaClient({datasources:{db:{url:url.replace("postgres@","arena_runtime@")}}});
 const identity=await db.athleteIdentity.create({data:{phone:`rls-email-${randomUUID()}`,passwordHash:"test"}});
 try {
  const arena=await db.arena.findUniqueOrThrow({where:{slug:"arena-teste-goal"}});
  await assert.rejects(runtime.$transaction(async tx=>{
   await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
   await tx.accountActionToken.create({data:{kind:kinds.reset,athleteIdentityId:identity.id,email:"test@example.invalid",tokenHash:randomUUID(),expiresAt:new Date(Date.now()+60_000)}});
  }));
  await assert.rejects(runtime.$transaction(async tx=>{
   await tx.$executeRaw`SELECT set_config('app.arena_id', ${arena.id}, true)`;
   await tx.accountActionToken.create({data:{kind:"RESET",arenaId:arena.id,athleteIdentityId:identity.id,email:"test@example.invalid",tokenHash:randomUUID(),expiresAt:new Date(Date.now()+60_000)}});
  }));
 } finally {await db.athleteIdentity.delete({where:{id:identity.id}});await runtime.$disconnect();await db.$disconnect();}
});
