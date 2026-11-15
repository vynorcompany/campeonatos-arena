# Independent recovery copy

`recovery.mjs` copies configured logical backups and the complete physical backup/WAL repository to an independent filesystem. Objects are identified by bucket, key and ETag, so unchanged objects are not downloaded again. Live file, PostgreSQL and Redis snapshots and service environment configuration are encrypted separately.

The configuration file and a random 32-byte encryption key must be outside Git and readable only by the recovery operator. Archives use AES-256-GCM with a fresh nonce and authenticated integrity. When `immutable` is enabled, the filesystem must support `chattr +i`; failure to enable immutability fails the run. This program never deletes retained snapshots or source objects.

Install from a verified remote commit into `/opt/arena-recovery`, install the locked dependencies in this directory with `npm ci --omit=dev --ignore-scripts`, and record the commit in the private configuration's `revision` field. The supplied systemd service/timer run hourly. Keep the private SSH identity and host key file outside the checkout. The SSH key is dedicated to recovery; no application receives it.

Required private configuration fields: `directory`, `keyFile`, `revision`, `projectId`, `environmentId`, `operator`, `railwayExecutable`, `identityFile`, `knownHosts`, `immutable`, `sources`, `snapshots`, and `configurationServices`. Each S3 source maps environment variable **names**, not secret values: `endpoint`, `region`, `key`, `secret`, `bucket`, `prefix`. Supported live snapshots are `postgres`, `redis`, and `files` (with an absolute directory).

`status.json` is written only after every source and snapshot succeeds. `failure.json` records a generic failure without credentials. Preserve an offline copy of the encryption key under the owner's custody; the encrypted files alone are insufficient for recovery. Validate the complete service, role permissions and retained records before reopening a restored system or enabling message/payment workers.

## Deployed application and complete isolated drill

An `application` snapshot stores the deployed build, locked dependencies and runtime scripts. It is cached once per revision/build identity. Uploaded files remain separate encrypted snapshots. Include a `postgres` snapshot named `application-database` for the primary application database, a `files` snapshot named `uploads`, Redis and the service configuration snapshots.

Run `node services/recovery/full-drill.mjs /absolute/private/config.json` as the recovery operator. The drill authenticates and checks each snapshot, extracts archives with traversal/link protection, restores all logical databases, uploads and Redis, and starts the archived application in an internal Docker network. It uses newly generated database credentials, keeps HTTP on container loopback, and does not import provider secrets or enable outbound workers. It verifies authenticated pages and a synthetic client registration through the compiled Server Action in the restored database. Temporary containers, network and decrypted files are removed afterward; retained encrypted backups are untouched.

`full-drill-status.json` records the source version, elapsed time, component timings and aggregate checks. A failure leaves a generic receipt plus a private operator error log. The measured interval excludes provisioning a replacement host and external provider operations; those require separate controlled validation. The pinned PostgreSQL 18, Redis 8 and Node 22 Bookworm container images must be available to the operator before an offline recovery.

### Owner custody of the recovery key

The encryption key must also exist outside the server and its backup filesystem. The owner should transfer it through an authenticated private channel to encrypted offline storage, verify that the copy has the same checksum without sharing its contents, and keep recovery instructions with access restricted to authorized custodians. Never paste the key into chat, tickets, Git, publication metadata or screenshots. Until this custody is verified, recovery from total loss of the server and its local key remains unproven.
