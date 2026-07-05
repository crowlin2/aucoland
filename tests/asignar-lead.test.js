import test from "node:test";
import assert from "node:assert/strict";
import { createAssignmentHandler } from "../netlify/functions/asignar-lead.js";

function createMemoryStore() {
  const values = new Map();

  return {
    values,
    store: {
      async get(key, options) {
        assert.equal(options.consistency, "strong");
        return values.get(key) ?? null;
      },
      async set(key, value) {
        values.set(key, value);
      }
    }
  };
}

function createPostRequest() {
  return new Request("https://aucofamilia.com/.netlify/functions/asignar-lead", {
    method: "POST",
    headers: {
      origin: "https://aucofamilia.com",
      host: "aucofamilia.com"
    }
  });
}

test("alterna Álvaro, Ana, Álvaro y Ana usando estado persistente", async () => {
  const memory = createMemoryStore();
  let randomIndex = 0;
  const randomCodes = ["AB12CD", "EF34AB", "CD56EF", "789ABC"];
  const handler = createAssignmentHandler({
    getStoreImpl(options) {
      assert.equal(options.name, "whatsapp-routing");
      assert.equal(options.consistency, "strong");
      return memory.store;
    },
    environment: {
      WHATSAPP_ALVARO: "56900000001",
      WHATSAPP_ANA: "56900000002"
    },
    randomBytesImpl() {
      const code = randomCodes[randomIndex++];
      return Buffer.from(code, "hex");
    },
    now: () => new Date("2026-07-05T12:00:00.000Z")
  });

  const assignments = [];
  for (let index = 0; index < 4; index += 1) {
    const response = await handler(createPostRequest());
    assert.equal(response.status, 200);
    assignments.push(await response.json());
  }

  assert.deepEqual(
    assignments.map((assignment) => assignment.agentId),
    ["alvaro", "ana", "alvaro", "ana"]
  );
  assert.deepEqual(
    assignments.map((assignment) => assignment.agentName),
    ["Álvaro Figueroa", "Ana Ponce", "Álvaro Figueroa", "Ana Ponce"]
  );
  assert.match(assignments[0].leadId, /^AUCO-20260705-[A-F0-9]{6}$/);
  assert.equal(memory.values.get("last-assigned"), "ana");
});

test("rechaza métodos distintos de POST sin consumir una asignación", async () => {
  let storeRequested = false;
  const handler = createAssignmentHandler({
    getStoreImpl() {
      storeRequested = true;
      throw new Error("No debería abrir el store");
    },
    environment: {
      WHATSAPP_ALVARO: "56900000001",
      WHATSAPP_ANA: "56900000002"
    }
  });

  const response = await handler(new Request("https://aucofamilia.com", {
    method: "GET"
  }));

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
  assert.equal(storeRequested, false);
});

test("usa el respaldo del servidor si falta una variable de entorno", async () => {
  const memory = createMemoryStore();
  const handler = createAssignmentHandler({
    getStoreImpl: () => memory.store,
    environment: {
      WHATSAPP_ALVARO: "56900000001"
    },
    randomBytesImpl: () => Buffer.from("AB12CD", "hex"),
    now: () => new Date("2026-07-05T12:00:00.000Z")
  });

  const response = await handler(createPostRequest());
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.agentId, "alvaro");
  assert.equal(payload.whatsappNumber, "56900000001");

  const secondResponse = await handler(createPostRequest());
  const secondPayload = await secondResponse.json();

  assert.equal(secondPayload.agentId, "ana");
  assert.equal(secondPayload.whatsappNumber, "56961162680");
});

test("no permite seleccionar un asesor desde el cuerpo de la solicitud", async () => {
  const memory = createMemoryStore();
  const handler = createAssignmentHandler({
    getStoreImpl: () => memory.store,
    environment: {
      WHATSAPP_ALVARO: "56900000001",
      WHATSAPP_ANA: "56900000002"
    },
    randomBytesImpl: () => Buffer.from("AB12CD", "hex"),
    now: () => new Date("2026-07-05T12:00:00.000Z")
  });

  const request = new Request("https://aucofamilia.com/.netlify/functions/asignar-lead", {
    method: "POST",
    headers: {
      origin: "https://aucofamilia.com",
      host: "aucofamilia.com",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      agentId: "ana",
      whatsappNumber: "56999999999"
    })
  });

  const response = await handler(request);
  const payload = await response.json();

  assert.equal(payload.agentId, "alvaro");
  assert.equal(payload.whatsappNumber, "56900000001");
});
