import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

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

test("instala el mismo contenedor de Google Tag Manager en todas las páginas", () => {
  const pages = [
    ["inicio", path.join(root, "index.html")],
    ["gracias", path.join(root, "gracias", "index.html")],
    ["privacidad", path.join(root, "politica-de-privacidad", "index.html")]
  ];

  for (const [name, file] of pages) {
    const html = fs.readFileSync(file, "utf8");

    assert.equal(html.includes("GTM-TRBQQ4W8"), true, `${name}: falta el contenedor GTM`);
    assert.equal((html.match(/googletagmanager\.com\/gtm\.js/g) || []).length, 1, `${name}: el script GTM debe aparecer una vez`);
    assert.equal((html.match(/googletagmanager\.com\/ns\.html/g) || []).length, 1, `${name}: el fallback GTM debe aparecer una vez`);
  }
});
test("envía a GTM un único lead confirmado con valor e ID de transacción", () => {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const thanks = fs.readFileSync(path.join(root, "gracias", "index.html"), "utf8");
  const pushIndex = thanks.indexOf('window.dataLayer.push({');

  assert.equal(thanks.includes('var gtmLeadKey = "gtmLeadConversion:" + leadId'), true);
  assert.equal(thanks.includes('state.submissionConfirmed === true && isValidLead && isRecent'), true);
  assert.equal(pushIndex >= 0, true);
  assert.equal(thanks.indexOf('event: "lead_saved"', pushIndex) > pushIndex, true);
  assert.equal(thanks.indexOf('transaction_id: leadId', pushIndex) > pushIndex, true);
  assert.equal(thanks.indexOf('value: 1', pushIndex) > pushIndex, true);
  assert.equal(thanks.indexOf('currency: "CLP"', pushIndex) > pushIndex, true);
  assert.equal(thanks.includes("AW-18316280296"), false);
  assert.equal(thanks.includes("gBDECM-y6s4cEOiD8Z1E"), false);
  assert.equal(index.includes('event: "lead_saved"'), false);
});
test("deduplica el evento lead_saved al ejecutar dos veces la confirmación", () => {
  const thanks = fs.readFileSync(path.join(root, "gracias", "index.html"), "utf8");
  const conversionScript = [...thanks.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((source) => source.includes('var storageKey = "aucoThankYouState"'));
  const leadId = "AUCO-20260711-ABC123";
  const storage = new Map([
    ["aucoThankYouState", JSON.stringify({
      leadId,
      submittedAt: new Date().toISOString(),
      submissionConfirmed: true
    })]
  ]);
  const metaCalls = [];
  const context = {
    Date,
    JSON,
    Number,
    String,
    console,
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value)
    },
    window: {
      dataLayer: [],
      fbq: (...args) => metaCalls.push(args)
    }
  };

  assert.equal(typeof conversionScript, "string");
  vm.runInNewContext(conversionScript, context);
  vm.runInNewContext(conversionScript, context);

  const leadEvents = context.window.dataLayer.filter((item) => item.event === "lead_saved");
  assert.equal(leadEvents.length, 1);
  assert.equal(leadEvents[0].lead_id, leadId);
  assert.equal(leadEvents[0].transaction_id, leadId);
  assert.equal(leadEvents[0].value, 1);
  assert.equal(leadEvents[0].currency, "CLP");
  assert.equal(metaCalls.filter((args) => args[0] === "track" && args[1] === "Lead").length, 1);
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
test("publica 60 cuotas sin interés sin conservar la promoción anterior", () => {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const config = fs.readFileSync(path.join(root, "site-config.js"), "utf8");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const sources = [index, config, script];

  assert.equal(config.includes("installments: 60"), true);
  assert.equal(config.includes("60 cuotas sin interés"), true);
  assert.equal(index.includes("60 cuotas sin interés"), true);
  assert.equal(script.includes('installments: config.installments + " cuotas sin interés"'), true);
  assert.equal(index.includes("Sujeto a condiciones"), false);

  for (const source of sources) {
    assert.equal(source.includes("72 cuotas"), false);
    assert.equal(source.toLowerCase().includes("hasta 60"), false);
  }
});
test("muestra el hero de inmediato y conserva el movimiento del resto del sitio", () => {
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");

  assert.equal(styles.includes("animation: hero-cinematic"), false);
  assert.equal(styles.includes("animation: hero-reveal"), false);
  assert.equal(styles.includes(".hero-scroll { animation:"), false);
  assert.equal(styles.includes(".reveal-target {"), true);
  assert.equal(script.includes('".full-form"'), true);
});

test("simplifica el hero y mantiene la oferta principal sin mostrar precio", () => {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const config = fs.readFileSync(path.join(root, "site-config.js"), "utf8");

  const heroStart = index.indexOf('<section class="hero"');
  const hero = index.slice(heroStart, index.indexOf("</section>", heroStart));
  assert.equal(hero.includes('data-config-value="price"'), false);
  assert.equal(hero.includes("desde 118 UF"), false);
  assert.equal(hero.includes("Pie disponible"), true);
  assert.equal(hero.includes("60 cuotas sin interés"), true);
  assert.equal(hero.includes("A 40 minutos de Chicureo."), true);
  assert.equal(hero.includes("Condiciones comerciales y convenios"), false);
  assert.equal(config.includes('heroSecondary: "A 40 minutos de Chicureo."'), true);
  assert.equal(index.includes('<span data-button-label>Pedir información</span>'), true);
});

test("rota fondos cálidos del hero comenzando por Jardines de Auco", () => {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");

  assert.equal(index.includes('href="assets/fotos/jardines-de-auco-premium.webp" fetchpriority="high"'), true);
  assert.equal(index.includes('class="hero-image hero-slide is-active"'), true);
  assert.equal(index.match(/data-hero-slide/g)?.length, 3);
  assert.equal(script.includes("function setupHeroCarousel()"), true);
  assert.equal(script.includes("window.setTimeout(showNextSlide, 6500)"), true);
  assert.equal(styles.includes(".hero-slide.is-active"), true);
});

test("el formulario visible solicita solamente nombre y teléfono", () => {
  const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  const form = index.match(/<form[^>]+id="lead-form"[\s\S]*?<\/form>/)?.[0] || "";
  const visibleControls = [...form.matchAll(/<(input|select|textarea)\b([^>]*)>/g)]
    .filter(([, , attributes]) => !/type="hidden"/.test(attributes) && !/name="bot-field"/.test(attributes))
    .map(([, element, attributes]) => ({
      element,
      name: attributes.match(/name="([^"]+)"/)?.[1] || ""
    }));

  assert.deepEqual(visibleControls, [
    { element: "input", name: "nombre" },
    { element: "input", name: "telefono_nacional" }
  ]);
  assert.equal(form.includes('name="objetivo"'), false);
  assert.equal(script.includes("payload.objetivo"), false);
  assert.equal(script.includes('selectFormValue(form, "objetivo"'), false);
});
