import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildNotificationPayload } from "./index.ts";

Deno.test("call payload → high-priority contract (locked screen / silent mode ready)", () => {
  const { json, isCall } = buildNotificationPayload({
    title: "Appel entrant",
    body: "Admin vous appelle",
    action: "call",
    url: "/video",
  });
  assert(isCall, "isCall must be true for action=call");
  const parsed = JSON.parse(json);
  const n = parsed.notification;
  assertEquals(n.action, "call");
  assertEquals(n.requireInteraction, true, "must require interaction so notif stays until answered");
  assertEquals(n.data.action, "call");
  assertEquals(n.data.url, "/video");
  assert(Array.isArray(n.vibrate) && n.vibrate.length >= 5, "aggressive vibrate pattern for calls");
  // sanity: at least one long buzz (>=400ms) so it cuts through silent mode w/ vibration
  assert(n.vibrate.some((v: number) => v >= 400), "must contain a long vibrate pulse");
});

Deno.test("live payload → same call contract", () => {
  const { isCall } = buildNotificationPayload({ title: "Live", body: "x", action: "live" });
  assert(isCall);
});

Deno.test("general payload → normal urgency, no requireInteraction", () => {
  const { json, isCall } = buildNotificationPayload({ title: "Hello", body: "world" });
  assert(!isCall);
  const n = JSON.parse(json).notification;
  assertEquals(n.requireInteraction, false);
  assertEquals(n.action, "general");
  assertEquals(n.data.action, "general");
});

Deno.test("explicit overrides win over defaults", () => {
  const { json } = buildNotificationPayload({
    title: "T", body: "B", action: "call",
    requireInteraction: false,
    vibrate: [100],
    tag: "custom-tag",
    icon: "/x.png",
  });
  const n = JSON.parse(json).notification;
  assertEquals(n.requireInteraction, false);
  assertEquals(n.vibrate, [100]);
  assertEquals(n.tag, "custom-tag");
  assertEquals(n.icon, "/x.png");
});