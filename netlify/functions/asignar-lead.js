import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";

const STORE_NAME = "whatsapp-routing";
const ASSIGNMENT_KEY = "last-assigned";

const AGENTS = Object.freeze({
  alvaro: Object.freeze({
    agentId: "alvaro",
    agentName: "Álvaro Figueroa",
    environmentKey: "WHATSAPP_ALVARO"
  }),
  ana: Object.freeze({
    agentId: "ana",
    agentName: "Ana Ponce",
    environmentKey: "WHATSAPP_ANA"
  })
});

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

function readInternationalNumber(value) {
  const raw = String(value || "").trim();
  if (!/^\d{11,15}$/.test(raw)) return null;
  return raw;
}

function readEnvironmentValue(key, environment) {
  if (environment) return environment[key];

  const netlifyValue =
    typeof Netlify !== "undefined" ? Netlify.env?.get?.(key) : undefined;
  return netlifyValue ?? process.env[key];
}

function requestComesFromSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host");

  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function createLeadId(now, randomBytesImpl) {
  const date = now().toISOString().slice(0, 10).replaceAll("-", "");
  const code = randomBytesImpl(3).toString("hex").toUpperCase();
  return `AUCO-${date}-${code}`;
}

export function createAssignmentHandler({
  getStoreImpl = getStore,
  environment,
  randomBytesImpl = randomBytes,
  now = () => new Date()
} = {}) {
  return async function asignarLead(request) {
    if (request.method !== "POST") {
      return jsonResponse(
        405,
        { error: "Método no permitido." },
        { Allow: "POST" }
      );
    }

    if (!requestComesFromSameOrigin(request)) {
      return jsonResponse(403, { error: "Solicitud no permitida." });
    }

    const numbers = {
      alvaro: readInternationalNumber(
        readEnvironmentValue("WHATSAPP_ALVARO", environment)
      ),
      ana: readInternationalNumber(
        readEnvironmentValue("WHATSAPP_ANA", environment)
      )
    };

    if (!numbers.alvaro || !numbers.ana) {
      console.error("WhatsApp routing environment is incomplete.");
      return jsonResponse(500, {
        error: "No pudimos asignar un asesor automáticamente.",
        errorCode: !numbers.alvaro
          ? "configuration_alvaro_invalid"
          : "configuration_ana_invalid"
      });
    }

    try {
      const store = getStoreImpl({
        name: STORE_NAME,
        consistency: "strong"
      });

      const lastAssigned = await store.get(ASSIGNMENT_KEY, {
        consistency: "strong"
      });
      const nextAgentId = lastAssigned === "alvaro" ? "ana" : "alvaro";
      const agent = AGENTS[nextAgentId];
      const whatsappNumber = numbers[nextAgentId];
      const leadId = createLeadId(now, randomBytesImpl);

      await store.set(ASSIGNMENT_KEY, nextAgentId);

      return jsonResponse(200, {
        agentId: agent.agentId,
        agentName: agent.agentName,
        whatsappNumber,
        whatsappUrl: `https://wa.me/${whatsappNumber}`,
        leadId
      });
    } catch (error) {
      console.error("WhatsApp routing failed.", error);
      return jsonResponse(500, {
        error: "No pudimos asignar un asesor automáticamente.",
        errorCode: "routing_unavailable"
      });
    }
  };
}

export default createAssignmentHandler();
