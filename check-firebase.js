// Tests a temporary, isolated path; never sends a command to the ESP32.
import "dotenv/config";
import { applicationDefault, cert, initializeApp, deleteApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { nextCommand, waitForStatus } from "./commands.js";
import assert from "node:assert/strict";

if (!process.env.FIREBASE_DATABASE_URL) throw new Error("Missing FIREBASE_DATABASE_URL");
if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS");
}
const credential = process.env.FIREBASE_SERVICE_ACCOUNT
  ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  : applicationDefault();
const app = initializeApp({ credential, databaseURL: process.env.FIREBASE_DATABASE_URL });
const db = getDatabase(app);
const ref = db.ref("_integrationChecks").push();
const deadline = setTimeout(() => {
  console.error("Firebase check timed out. Check credentials and network access.");
  process.exit(1);
}, 20000);
try {
  const command = { type: "add", item: "integration-test", list: "shopping" };
  const first = await ref.child("command").transaction((current) => nextCommand(current, command));
  const second = await ref.child("command").transaction((current) => nextCommand(current, command));
  assert.equal(first.snapshot.val().runningCount, 1);
  assert.equal(second.snapshot.val().runningCount, 2);
  const status = ref.child("status");
  await status.set({ runningCount: 1, success: true });
  assert.equal(await waitForStatus(status, 2, { timeoutMs: 100 }), null);
  const pending = waitForStatus(status, 2, { timeoutMs: 5000 });
  await status.set({ runningCount: 2, success: true, text: "Simulated confirmation" });
  assert.equal((await pending).success, true);
  console.log("Firebase authentication, writes, counter increments and matching confirmations passed.");
} catch (error) {
  console.error("Firebase check failed:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  try { await ref.remove(); } finally { await deleteApp(app); clearTimeout(deadline); }
}
