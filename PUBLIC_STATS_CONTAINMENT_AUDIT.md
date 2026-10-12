# GamingNest public-stats containment audit

Audit scope: read-only inspection of the live site and main branch on 2026-10-12. No rules, deployment, credentials, or data were changed.

## Finding

GamingNest has two public browser write paths.

1. The root site (`https://gamingnest.nl/`) imports Firestore write helpers and writes directly to `gamingnest/stats`: site visits, per-game plays, likes, and a full-document restore using `setDoc`. A read-only Firestore request returned the current document; its `index` was 3,923. Public access history/rules are not exposed, so tampering of this document cannot be proved or excluded.

2. The legacy `/games/` page embeds a JSONBin identifier and access key in delivered JavaScript, then makes whole-record PUT requests. A read-only request returned `index` and `likes` both as `69696969696969`: clear evidence this legacy record was corrupted. Obfuscating a credential shipped to visitors does not protect it.

The live site is served by Netlify. This repository has only `README.md` and `soepgames.zip`; no Netlify configuration, Firebase rules, Firebase project files, function source, or deployment pipeline is versioned here. The deployment connection cannot be verified further without Netlify access.

## Containment plan preserving legitimate Firestore counts

1. Deploy a static hotfix: redirect `/games/` to `/`, or make it display the existing Firestore counters read-only. Remove every JSONBin URL, key, and PUT call. Verify the deployed page makes no `api.jsonbin.io` request and game links still work.
2. After that deployment is verified, revoke/rotate the JSONBin key and retire the old bin. It must be treated as exposed because it has been public.
3. Export the current `gamingnest/stats` document as a rollback snapshot; do not merge the corrupted JSONBin numbers.
4. Remove all browser `updateDoc`, `increment`, and `setDoc` calls to `gamingnest/stats`, retaining only the read display. In Firestore rules, deny browser writes to that document while preserving intended public reads.
5. Replace counting with a narrowly validated server endpoint (for example a Netlify Function): allow-list event type and game id, rate-limit/bot-protect it, and increment the existing Firestore counters only with server-held Admin credentials. Never accept a client-supplied field name or count.

## Required approval

Approve the static hotfix and read-only Firestore freeze before deployment/rule changes. Approve key rotation only after the hotfix is confirmed live.

## Verification checklist

- `/games/` contains no JSONBin key or PUT request.
- Public browsers cannot update or restore `gamingnest/stats`.
- Current Firestore numbers are snapshotted and preserved.
- Only the server endpoint can increment counters.
