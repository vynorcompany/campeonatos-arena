# Independent recovery copy

`recovery.mjs` copies configured logical backups and the complete physical backup/WAL repository to an independent filesystem. Objects are identified by bucket, key and ETag, so unchanged objects are not downloaded again. Live file, PostgreSQL and Redis snapshots and service environment configuration are encrypted separately.

The configuration file and a random 32-byte encryption key must be outside Git and readable only by the recovery operator. Archives use AES-256-GCM with a fresh nonce and authenticated integrity. When `immutable` is enabled, the filesystem must support `chattr +i`; failure to enable immutability fails the run. This program never deletes retained snapshots or source objects.

Install from a verified remote commit into `/opt/arena-recovery`, install the locked dependencies in this directory with `npm ci --omit=dev --ignore-scripts`, and record the commit in the private configuration's `revision` field. The supplied systemd service/timer run hourly. Keep the private SSH identity and host key file outside the checkout. The SSH key is dedicated to recovery; no application receives it.

Required private configuration fields: `directory`, `keyFile`, `revision`, `projectId`, `environmentId`, `operator`, `railwayExecutable`, `identityFile`, `knownHosts`, `immutable`, `sources`, `snapshots`, and `configurationServices`. Each S3 source maps environment variable **names**, not secret values: `endpoint`, `region`, `key`, `secret`, `bucket`, `prefix`. Supported live snapshots are `postgres`, `redis`, and `files` (with an absolute directory).

`status.json` is written only after every source and snapshot succeeds. `failure.json` records a generic failure without credentials. Preserve an offline copy of the encryption key under the owner's custody; the encrypted files alone are insufficient for recovery. Validate the complete service, role permissions and retained records before reopening a restored system or enabling message/payment workers.
