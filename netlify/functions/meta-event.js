import crypto from "node:crypto";

const LEAD_ID_PATTERN = /^AUCO-\d{8}-[A-F0-9]{6}$/;
const META_IDENTIFIER_PATTERN = /^fb\.\d+\.\d+\..{1,500}$/;
const DEFAULT_GRAPH_API_VERSION = "v23.0";

function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

function readEnvironmentValue(key, environment) {
  if (environment) return environment[key];
  const netlifyValue =
    typeof Netlify !== "undefined" ? Netlify.env?.get?.(key) : undefined;
  return netlifyValue ?? process.env[key];
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

export function normalizeChileanPhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (/^9\d{8}$/.test(digits)) digits = "56" + digits;
  return /^569\d{8}$/.test(digits) ? digits : "";
}

export function sanitizeMetaIdentifier(value) {
  const candidate = String(value || "").trim();
  return META_IDENTIFIER_PATTERN.test(candidate) ? candidate : "";
}

function firstHeader(headers, names) {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return String(value).split(",")[0].trim();
  }
  return "";
}

function getAllowedHosts(headers, environment) {
  const hosts = new Set();
  const requestHost = firstHeader(headers, ["x-forwarded-host", "host"]);
  if (requestHost) hosts.add(requestHost.toLowerCase());

  for (const key of ["URL", "DEPLOY_PRIME_URL", "META_ALLOWED_SITE_URL"]) {
    const candidate = readEnvironmentValue(key, environment);
    if (!candidate) continue;
    try {
      hosts.add(new URL(candidate).host.toLowerCase());
    } catch {
      // Ignore malformed optional environment values.
    }
  }

  return hosts;
}

export function isAllowedSourceUrl(value, headers, environment) {
  try {
    const source = new URL(String(value));
    if (source.protocol !== "https:" && source.hostname !== "localhost") return false;
    const allowedHosts = getAllowedHosts(headers, environment);
    return allowedHosts.size === 0 || allowedHosts.has(source.host.toLowerCase());
  } catch {
    return false;
  }
}

function requestComesFromSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = firstHeader(request.headers, ["x-forwarded-host", "host"]);
  if (!host) return false;

  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function buildMetaEvent(payload, headers) {
  const phone = normalizeChileanPhone(payload.phone);
  const userData = {
    external_id: [sha256(payload.eventId)]
  };

  if (phone) userData.ph = [sha256(phone)];

  const fbp = sanitizeMetaIdentifier(payload.fbp);
  const fbc = sanitizeMetaIdentifier(payload.fbc);
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const clientIp = firstHeader(headers, [
    "x-nf-client-connection-ip",
    "x-forwarded-for",
    "client-ip"
  ]);
  const userAgent = firstHeader(headers, ["user-agent"]);
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;

  return {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: payload.eventId,
    action_source: "website",
    event_source_url: payload.eventSourceUrl,
    user_data: userData,
    custom_data: {
      content_name: "leads-parque-auco",
      status: "submitted"
    }
  };
}

export function createMetaEventHandler({ environment, fetchImpl = fetch } = {}) {
  return async function metaEvent(request) {
    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "method_not_allowed" }, { Allow: "POST" });
    }

    if (!requestComesFromSameOrigin(request)) {
      return jsonResponse(403, { ok: false, error: "origin_not_allowed" });
    }

    const pixelId = String(readEnvironmentValue("META_PIXEL_ID", environment) || "").trim();
    const accessToken = String(readEnvironmentValue("META_CAPI_ACCESS_TOKEN", environment) || "").trim();
    if (!pixelId || !accessToken) {
      return jsonResponse(503, { ok: false, error: "meta_capi_not_configured" });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(400, { ok: false, error: "invalid_event_payload" });
    }

    if (
      payload.eventName !== "Lead" ||
      !LEAD_ID_PATTERN.test(String(payload.eventId || "")) ||
      !isAllowedSourceUrl(payload.eventSourceUrl, request.headers, environment)
    ) {
      return jsonResponse(400, { ok: false, error: "invalid_event_payload" });
    }

    const graphVersion = String(
      readEnvironmentValue("META_GRAPH_API_VERSION", environment) || DEFAULT_GRAPH_API_VERSION
    ).trim();
    if (!/^v\d+\.\d+$/.test(graphVersion)) {
      return jsonResponse(503, { ok: false, error: "invalid_graph_api_version" });
    }

    const metaPayload = {
      data: [buildMetaEvent(payload, request.headers)]
    };
    const testEventCode = String(
      readEnvironmentValue("META_CAPI_TEST_EVENT_CODE", environment) || ""
    ).trim();
    if (testEventCode) metaPayload.test_event_code = testEventCode;

    const endpoint = new URL(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pixelId)}/events`
    );
    endpoint.searchParams.set("access_token", accessToken);

    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metaPayload)
      });
    } catch (error) {
      console.error("Meta CAPI network error", { name: error && error.name });
      return jsonResponse(502, { ok: false, error: "meta_capi_unreachable" });
    }

    let result = {};
    try {
      result = await response.json();
    } catch {
      // A non-JSON Meta response is handled as an upstream failure below.
    }

    if (!response.ok) {
      console.error("Meta CAPI rejected event", {
        status: response.status,
        code: result && result.error && result.error.code,
        type: result && result.error && result.error.type
      });
      return jsonResponse(502, {
        ok: false,
        error: "meta_capi_rejected",
        upstreamStatus: response.status,
        upstreamCode: result && result.error && result.error.code
      });
    }

    return jsonResponse(200, {
      ok: true,
      eventsReceived: result.events_received,
      fbtraceId: result.fbtrace_id
    });
  };
}

export default createMetaEventHandler();
