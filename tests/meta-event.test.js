import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildMetaEvent,
  createMetaEventHandler,
  isAllowedSourceUrl,
  normalizeChileanPhone,
  sanitizeMetaIdentifier
} from "../netlify/functions/meta-event.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("normaliza teléfonos móviles chilenos", () => {
  assert.equal(normalizeChileanPhone("+56 9 8826 3485"), "56988263485");
  assert.equal(normalizeChileanPhone("988263485"), "56988263485");
  assert.equal(normalizeChileanPhone("228826348"), "");
});

test("acepta identificadores Meta válidos y descarta valores arbitrarios", () => {
  assert.equal(sanitizeMetaIdentifier("fb.1.1712345678901.ABC123"), "fb.1.1712345678901.ABC123");
  assert.equal(sanitizeMetaIdentifier("not-a-meta-id"), "");
});

test("restringe event_source_url al host del despliegue", () => {
  const headers = new Headers({ host: "aucofamilia.com" });
  assert.equal(isAllowedSourceUrl("https://aucofamilia.com/?utm_source=meta", headers), true);
  assert.equal(isAllowedSourceUrl("https://example.com/", headers), false);
});

test("construye Lead sin información sensible y con matching hasheado", () => {
  const payload = {
    eventId: "AUCO-20260709-ABC123",
    eventSourceUrl: "https://aucofamilia.com/",
    phone: "+56988263485",
    fbp: "fb.1.1712345678901.123456789",
    fbc: "fb.1.1712345678901.TESTCLICK"
  };
  const metaEvent = buildMetaEvent(payload, new Headers({
    "user-agent": "Test Browser",
    "x-nf-client-connection-ip": "203.0.113.10"
  }));
  const expectedPhoneHash = crypto.createHash("sha256").update("56988263485").digest("hex");

  assert.equal(metaEvent.event_name, "Lead");
  assert.equal(metaEvent.event_id, payload.eventId);
  assert.equal(metaEvent.action_source, "website");
  assert.deepEqual(metaEvent.user_data.ph, [expectedPhoneHash]);
  assert.equal(metaEvent.user_data.fbp, payload.fbp);
  assert.equal(metaEvent.user_data.fbc, payload.fbc);
  assert.equal(metaEvent.user_data.client_user_agent, "Test Browser");
  assert.equal(metaEvent.user_data.client_ip_address, "203.0.113.10");
  assert.deepEqual(Object.keys(metaEvent.custom_data).sort(), ["content_name", "status"]);
  assert.equal(JSON.stringify(metaEvent).includes("Necesidad inmediata"), false);
});

test("no intenta CAPI cuando faltan variables de entorno", async () => {
  const handler = createMetaEventHandler({ environment: {} });
  const response = await handler(new Request("https://aucofamilia.com/.netlify/functions/meta-event", {
    method: "POST",
    headers: { host: "aucofamilia.com", "Content-Type": "application/json" },
    body: "{}"
  }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "meta_capi_not_configured");
});

test("envía a Meta el evento deduplicable con test_event_code", async () => {
  const environment = {
    META_PIXEL_ID: "1004828548959223",
    META_CAPI_ACCESS_TOKEN: "secret-test-token",
    META_GRAPH_API_VERSION: "v23.0",
    META_CAPI_TEST_EVENT_CODE: "TEST123"
  };
  let requestedUrl;
  let requestedBody;
  const handler = createMetaEventHandler({
    environment,
    fetchImpl: async (url, options) => {
      requestedUrl = String(url);
      requestedBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ events_received: 1, fbtrace_id: "trace-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });

  const response = await handler(new Request("https://aucofamilia.com/.netlify/functions/meta-event", {
    method: "POST",
    headers: {
      host: "aucofamilia.com",
      origin: "https://aucofamilia.com",
      "Content-Type": "application/json",
      "user-agent": "Test Browser",
      "x-nf-client-connection-ip": "203.0.113.10"
    },
    body: JSON.stringify({
      eventName: "Lead",
      eventId: "AUCO-20260709-ABC123",
      eventSourceUrl: "https://aucofamilia.com/",
      phone: "+56988263485",
      fbp: "fb.1.1712345678901.123456789",
      fbc: "fb.1.1712345678901.TESTCLICK"
    })
  }));

  assert.equal(response.status, 200);
  assert.equal(requestedUrl.includes("/v23.0/1004828548959223/events"), true);
  assert.equal(requestedUrl.includes("secret-test-token"), true);
  assert.equal(requestedBody.test_event_code, "TEST123");
  assert.equal(requestedBody.data[0].event_name, "Lead");
  assert.equal(requestedBody.data[0].event_id, "AUCO-20260709-ABC123");
  assert.equal(requestedBody.data[0].user_data.ph[0].length, 64);
});

test("la versión estática tiene un único propietario del Pixel", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const thanks = fs.readFileSync(path.join(root, "gracias", "index.html"), "utf8");

  assert.equal(script.includes("analyticsConfig.metaPixelId"), false);
  assert.equal(script.includes('objective: getSelectedFormValue(form, "objetivo")'), false);
  assert.equal(script.includes("objective: payload.objetivo"), false);
  assert.equal(script.includes('const META_EVENT_ENDPOINT = "/.netlify/functions/meta-event"'), true);
  assert.equal(index.includes('name="fbp"'), true);
  assert.equal(index.includes('name="fbc"'), true);
  assert.equal(thanks.includes("eventID: leadId"), true);
});

test("desactiva eventos automáticos antes de inicializar Meta en todas las páginas", () => {
  const pages = [
    ["inicio", path.join(root, "index.html")],
    ["gracias", path.join(root, "gracias", "index.html")],
    ["privacidad", path.join(root, "politica-de-privacidad", "index.html")]
  ];

  for (const [name, file] of pages) {
    const html = fs.readFileSync(file, "utf8");
    const autoConfigIndex = html.indexOf("fbq('set', 'autoConfig', false, '1004828548959223')");
    const initIndex = html.indexOf("fbq('init', '1004828548959223')");

    assert.equal(autoConfigIndex >= 0, true, `${name}: falta desactivar autoConfig`);
    assert.equal(initIndex >= 0, true, `${name}: falta inicializar el Pixel`);
    assert.equal(autoConfigIndex < initIndex, true, `${name}: autoConfig debe desactivarse antes de init`);
  }
});

test("las interacciones de ubicación y galería no se convierten en Lead", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const trackEventSource = script.slice(
    script.indexOf("function trackEvent"),
    script.indexOf("function trackMetaStandardEvent")
  );

  assert.equal(index.includes('data-event="directions_click"'), true);
  assert.equal(index.includes('data-event="Lead"'), false);
  assert.equal(script.includes('trackEvent("directions_click"'), true);
  assert.equal(trackEventSource.includes('name === "directions_click"'), false);
  assert.equal(script.includes("setInterval"), false);
});
