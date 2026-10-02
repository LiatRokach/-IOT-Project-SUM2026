# Smart Display

Run `npm install`, configure `.env`, then run `npm start` and open http://127.0.0.1:3000.

Required environment variables: `GEMINI_API_KEY`, `FIREBASE_DATABASE_URL`, and
`GOOGLE_APPLICATION_CREDENTIALS` (absolute path to the service account JSON file,
stored outside this directory). Firebase can stay in locked mode: only the backend
uses the Admin SDK. The server binds to the local computer; remote hosting needs
authentication before exposing these API endpoints.

Hold the button to record, then release. Gemini's validated result is written to
`/command` as `{ "type": "add", "item": "tomato", "list": "shopping", "runningCount": 1 }`.
The counter increments atomically for every write, including repeated commands.

The app waits up to 60 seconds for `/status` containing the same numeric
`runningCount`, a boolean `success`, and a message in `text`. Old confirmations
are ignored. This correlation field is an extension to the original brief and
must also be written by the final ESP32 firmware.

## Test without the ESP32

Speak a command and check `/command` in the Firebase console. While the app is
waiting, add or edit `/status` to contain:

```json
{
  "runningCount": 1,
  "success": true,
  "text": "Simulated confirmation: tomato added"
}
```

Use the actual number from `/command`, and save within the 60-second waiting
window. This simulates an acknowledgement; it does not update a physical device.
The app should show `Confirmed`. Setting `success` to false tests a device error.
Without a response it reports a timeout, leaving the command in Firebase.

This prototype has one shared command slot, matching the brief. Use one client
at a time; sending another command overwrites the previous slot. Before connecting
the team's device, agree on its exact fields and access rules. Change the database
URL and credentials in `.env` and restart when moving to the team's project.

Run `npm test` for local protocol tests. `node check-firebase.js` tests real Firebase
access using a temporary `_integrationChecks` child, then removes that child.
It does not write to the real `/command` or `/status` paths.

## Install on a phone (PWA)

Deploy the entire Node application behind HTTPS. A static-only host cannot run
Gemini requests or Firebase Admin. Install dependencies with `npm ci` and start
with `npm start`. Set `NODE_ENV=production`; the server uses the host's `PORT` and
binds to `0.0.0.0`. No frontend build step is needed.

Set `GEMINI_API_KEY` and `FIREBASE_DATABASE_URL` in your host's secret environment
settings. Upload the Firebase service-account JSON using its private secret-file
facility, and set `GOOGLE_APPLICATION_CREDENTIALS` to that file's absolute path on
**the production server**, not your Mac's path. Never commit this file or `.env`.
See `.env.example` for variable names.

Before making a deployment public, protect `/api/*` with authentication or your
host's access controls. These endpoints currently have no user authentication;
anyone who can reach them can submit Gemini requests and Firebase commands.
The PWA conversion does not add account management.

After deployment, open the HTTPS URL on your phone:

- iPhone/iPad: Safari → Share → Add to Home Screen → Add. If offered, enable
  “Open as Web App”. The app also provides an install-help button on iOS.
- Android: Chrome → Install app (the in-app button appears when Chrome offers
  installation), or use Chrome's menu → Add to Home screen / Install app.

Open the installed app and allow microphone access. The interface is cached after
its first successful online visit and can open offline, but recording commands
requires internet access to Gemini, Firebase, and the backend. Audio and API
responses are never cached or queued; reconnecting does not replay commands.

The service worker uses network-first retrieval for public assets. Updates activate
once older app windows close; reopen the installed app to pick up an updated worker.
Increment the cache version in `sw.js` when changing the app shell's offline assets.