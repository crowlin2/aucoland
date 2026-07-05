(function () {
  "use strict";

  const config = window.AUCO_CONFIG || {
    priceUF: 118,
    downPaymentPercent: 10,
    installments: 72,
    agreementDiscountPercent: 15,
    agreements: []
  };
  const analyticsConfig = window.AUCO_ANALYTICS_CONFIG || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const trackingKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "gclid"
  ];
  const ASSIGNMENT_ENDPOINT = "/.netlify/functions/asignar-lead";
  const ASSIGNMENT_TIMEOUT_MS = 8000;
  let assignmentInFlight = false;
  const completedLeadEvents = new Set();

  const sectorData = {
    roble: {
      tag: "Sector Roble",
      name: "Sombra, amplitud y árboles maduros",
      description: "Alternativas familiares de 4 y 8 capacidades.",
      image: "assets/fotos/sector-roble.webp",
      alt: "Sector Roble con pradera, árboles maduros y una banca"
    },
    maiten: {
      tag: "Sector Maitén",
      name: "Un entorno abierto y luminoso",
      description: "Alternativas familiares de 4 y 6 capacidades.",
      image: "assets/fotos/banca-parque-auco.webp",
      alt: "Sector Maitén con pradera abierta, árboles y cordillera"
    },
    quillay: {
      tag: "Sector Quillay",
      name: "Naturaleza y vistas a la cordillera",
      description: "Alternativas familiares de 2 y 4 capacidades.",
      image: "assets/fotos/panoramica-parque-auco.webp",
      alt: "Áreas verdes del parque con vistas a la cordillera"
    },
    peumo: {
      tag: "Sector Peumo",
      name: "Un paisaje familiar entre árboles",
      description: "Alternativas familiares de 4 capacidades.",
      image: "assets/fotos/pradera-parque-auco.webp",
      alt: "Senderos y vegetación del parque en Sector Peumo"
    }
  };

  const mapData = {
    atencion: {
      tag: "Punto de atención",
      title: "Atención Comercial",
      description: "Punto de orientación y coordinación de visitas.",
      image: "assets/fotos/instalaciones-aereas-auco.webp",
      imageAlt: "Vista aérea de las instalaciones de Parque de Auco"
    },
    capilla: {
      tag: "Punto del parque",
      title: "Capilla",
      description: "Ubicación de la capilla dentro del parque.",
      image: "assets/fotos/capilla-auco-mejorada.webp",
      imageAlt: "Exterior de la Capilla de Parque de Auco"
    },
    santuario: {
      tag: "Referencia cercana",
      title: "Santuario Santa Teresita de Los Andes",
      description: "Punto de referencia cercano al parque.",
      image: "assets/fotos/santuario-santa-teresita.webp",
      imageAlt: "Fachada principal del Santuario Santa Teresita de Los Andes"
    },
    anforas: {
      tag: "Punto del parque",
      title: "Sector Ánforas",
      description: "Área identificada en el plano del parque."
    },
    nichos: {
      tag: "Punto del parque",
      title: "Nichos temporales",
      description: "Sector identificado hacia el costado oriente."
    },
    plaza: {
      tag: "Punto de referencia",
      title: "Plaza de la Cruz",
      description: "Punto central cercano al acceso y Atención Comercial."
    }
  };

  function injectScript(src, id) {
    if (id && document.getElementById(id)) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    if (id) script.id = id;
    document.head.appendChild(script);
  }

  function initializeAnalytics() {
    const gaId = String(analyticsConfig.gaMeasurementId || "").trim();
    const metaId = String(analyticsConfig.metaPixelId || "").trim();

    window.dataLayer = window.dataLayer || [];

    if (gaId) {
      injectScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaId), "auco-ga");
      window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", gaId, { send_page_view: false });
    }

    if (metaId) {
      if (!window.fbq) {
        const fbq = function () {
          fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
        };
        fbq.push = fbq;
        fbq.loaded = true;
        fbq.version = "2.0";
        fbq.queue = [];
        window.fbq = fbq;
        window._fbq = fbq;
      }
      injectScript("https://connect.facebook.net/en_US/fbevents.js", "auco-meta-pixel");
      window.fbq("init", metaId);
    }
  }

  function trackEvent(name, parameters) {
    const safeParameters = parameters || {};
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, safeParameters));

    if (typeof window.gtag === "function") {
      window.gtag("event", name, safeParameters);
    }

    if (typeof window.fbq === "function") {
      if (name === "page_view") {
        window.fbq("track", "PageView");
      } else {
        window.fbq("trackCustom", name, safeParameters);
      }
    }
  }

  function pushLeadFormSuccess(leadId) {
    if (!leadId || completedLeadEvents.has(leadId)) return;

    completedLeadEvents.add(leadId);
    window.dataLayer = window.dataLayer || [];

    if (typeof gtag === "function") {
      gtag("event", "lead_form_success", {
        lead_id: leadId
      });
    } else {
      window.dataLayer.push({
        event: "lead_form_success",
        lead_id: leadId
      });
    }
  }

  function applyCommercialConfig() {
    const labels = {
      price: "Desde " + config.priceUF + " UF",
      "down-payment": "Pie desde " + config.downPaymentPercent + "%",
      installments: "Hasta " + config.installments + " cuotas",
      agreement: "Convenios con " + config.agreementDiscountPercent + "% de descuento"
    };
    const values = {
      price: labels.price,
      "price-plain": config.priceUF + " UF",
      "down-payment": labels["down-payment"],
      "down-payment-plain": config.downPaymentPercent + "% de pie",
      installments: labels.installments,
      "installments-plain": config.installments + " cuotas",
      "finance-combined": labels["down-payment"] + " y " + labels.installments.toLowerCase(),
      "agreement-heading": labels.agreement
    };

    document.querySelectorAll("[data-config-label]").forEach((element) => {
      const value = labels[element.dataset.configLabel];
      if (value) element.textContent = value;
    });
    document.querySelectorAll("[data-config-value]").forEach((element) => {
      const value = values[element.dataset.configValue];
      if (value) element.textContent = value;
    });
    document.querySelectorAll("[data-copy]").forEach((element) => {
      const value = config.copy && config.copy[element.dataset.copy];
      if (value) element.textContent = value;
    });

    const list = document.querySelector("[data-agreement-list]");
    if (list) {
      list.replaceChildren(...config.agreements.map((agreement) => {
        const item = document.createElement("li");
        item.textContent = agreement;
        return item;
      }));
    }

    document.querySelectorAll("[data-agreement-select]").forEach((select) => {
      config.agreements.forEach((agreement) => {
        const option = document.createElement("option");
        option.value = agreement;
        option.textContent = agreement;
        select.appendChild(option);
      });
      const other = document.createElement("option");
      other.value = "Otro convenio / consultar";
      other.textContent = "Otro convenio / consultar";
      select.appendChild(other);
    });

    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content =
        "Sepulturas familiares perpetuas desde " + config.priceUF +
        " UF en Parque de Auco. Alternativas de 2 a 8 capacidades, pie desde " +
        config.downPaymentPercent + "% y hasta " + config.installments +
        " cuotas. Agenda una visita.";
    }
  }

  function setupTicker() {
    const ticker = document.querySelector(".assurance-ticker");
    const toggle = document.querySelector(".assurance-ticker-toggle");
    if (!ticker || !toggle) return;

    toggle.addEventListener("click", () => {
      const paused = ticker.classList.toggle("is-paused");
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.setAttribute("aria-label", paused ? "Reanudar cinta" : "Pausar cinta");
      toggle.title = paused ? "Reanudar movimiento" : "Pausar movimiento";
      toggle.querySelector("span").textContent = paused ? "▶" : "Ⅱ";
    });
  }

  function setControlBusy(control, busy, busyText) {
    if (!control) return;
    const label = control.querySelector("[data-button-label]") || control;

    if (busy) {
      if (!label.dataset.originalLabel) {
        label.dataset.originalLabel = label.textContent.trim();
      }
      label.textContent = busyText;
      control.classList.add("is-loading");
      control.setAttribute("aria-busy", "true");
      control.setAttribute("aria-disabled", "true");
      if ("disabled" in control) control.disabled = true;
      return;
    }

    if (label.dataset.originalLabel) {
      label.textContent = label.dataset.originalLabel;
    }
    control.classList.remove("is-loading");
    control.removeAttribute("aria-busy");
    control.removeAttribute("aria-disabled");
    if ("disabled" in control) control.disabled = false;
  }

  function openPendingWhatsappWindow() {
    const popup = window.open("", "_blank");
    if (!popup) return null;

    popup.opener = null;
    popup.document.title = "Conectando con un asesor";
    popup.document.body.textContent = "Estamos asignando un asesor...";
    return popup;
  }

  function showWhatsappStatus(message) {
    const status = document.querySelector("[data-whatsapp-status]");
    if (status) status.textContent = message;
  }

  function isValidAssignment(payload) {
    if (!payload || typeof payload !== "object") return false;
    if (!["alvaro", "ana"].includes(payload.agentId)) return false;
    if (typeof payload.agentName !== "string" || !payload.agentName) return false;
    if (!/^\d{11,15}$/.test(String(payload.whatsappNumber || ""))) return false;
    if (payload.whatsappUrl !== "https://wa.me/" + payload.whatsappNumber) return false;
    return /^AUCO-\d{8}-[A-F0-9]{6}$/.test(String(payload.leadId || ""));
  }

  async function requestWhatsappAssignment(contactSource, formType) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ASSIGNMENT_TIMEOUT_MS);

    trackEvent("whatsapp_assignment_requested", {
      contact_source: contactSource,
      form_type: formType
    });

    try {
      const response = await fetch(ASSIGNMENT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactSource,
          formType
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Assignment endpoint returned " + response.status);
      }

      const assignment = await response.json();
      if (!isValidAssignment(assignment)) {
        throw new Error("Invalid assignment response");
      }

      trackEvent("whatsapp_assignment_success", {
        agent_id: assignment.agentId,
        agent_name: assignment.agentName,
        lead_id: assignment.leadId,
        contact_source: contactSource,
        form_type: formType
      });

      return assignment;
    } catch (error) {
      trackEvent("whatsapp_assignment_error", {
        contact_source: contactSource,
        form_type: formType,
        error_type: error.name === "AbortError" ? "timeout" : "request_failed"
      });
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function buildGenericWhatsappMessage(assignment) {
    return [
      "Hola, vengo desde aucofamilia.com y quiero recibir información sobre sepulturas en Parque de Auco.",
      "",
      "Código de solicitud: " + assignment.leadId,
      "Asesor asignado: " + assignment.agentName,
      "Origen: aucofamilia.com"
    ].join("\n");
  }

  function buildFormWhatsappMessage(payload, assignment) {
    return [
      "Hola, quiero recibir información sobre sepulturas familiares en Parque de Auco.",
      "",
      "Nombre: " + payload.nombre,
      "Teléfono o WhatsApp: " + payload.telefono,
      "Me gustaría: " + payload.objetivo,
      "Convenio: " + (payload.convenio || "No informado"),
      "",
      "Código de solicitud: " + assignment.leadId,
      "Asesor asignado: " + assignment.agentName,
      "Origen: aucofamilia.com"
    ].join("\n");
  }

  function openAssignedWhatsapp(assignment, message, pendingWindow, contactSource, formType) {
    const whatsappUrl = assignment.whatsappUrl + "?text=" + encodeURIComponent(message);

    trackEvent("whatsapp_opened", {
      agent_id: assignment.agentId,
      agent_name: assignment.agentName,
      lead_id: assignment.leadId,
      contact_source: contactSource,
      form_type: formType
    });

    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.location.replace(whatsappUrl);
    } else {
      window.location.assign(whatsappUrl);
    }
  }

  function setupLeadIntent() {
    const form = document.querySelector("#lead-form");
    const objective = form && form.elements.objetivo;

    document.querySelectorAll("[data-objective]").forEach((control) => {
      control.addEventListener("click", () => {
        if (objective && control.dataset.objective) {
          objective.value = control.dataset.objective;
        }

        if (control.dataset.event === "visit_booking_click") {
          trackEvent("visit_booking_click", {
            placement: control.closest("section")?.id || "header"
          });
        }
      });
    });

    document.querySelectorAll("[data-capacity-option]").forEach((control) => {
      control.addEventListener("click", () => {
        trackEvent("capacity_interest", {
          capacity: Number(control.dataset.capacityOption)
        });
      });
    });
  }

  function setupWhatsappCtas() {
    document.querySelectorAll("[data-whatsapp-cta]").forEach((control) => {
      control.addEventListener("click", async (event) => {
        event.preventDefault();
        if (assignmentInFlight) return;

        assignmentInFlight = true;
        const contactSource = control.dataset.contactSource || "generic_cta";
        const formType = "generic";
        const pendingWindow = openPendingWhatsappWindow();
        setControlBusy(control, true, "Conectando con un asesor…");
        showWhatsappStatus("");

        try {
          const assignment = await requestWhatsappAssignment(contactSource, formType);
          const message = buildGenericWhatsappMessage(assignment);
          openAssignedWhatsapp(assignment, message, pendingWindow, contactSource, formType);
        } catch (error) {
          if (pendingWindow && !pendingWindow.closed) pendingWindow.close();
          showWhatsappStatus("No pudimos asignarte un asesor automáticamente. Intenta nuevamente.");
          console.error("WhatsApp assignment failed.", error);
        } finally {
          assignmentInFlight = false;
          setControlBusy(control, false);
        }
      });
    });
  }

  function populateTrackingFields(form) {
    const params = new URLSearchParams(window.location.search);
    trackingKeys.forEach((key) => {
      const input = form.elements[key];
      if (input) input.value = params.get(key) || "";
    });
    form.elements.page_url.value = window.location.href;
    form.elements.referrer.value = document.referrer || "";
    form.elements.submitted_at.value = new Date().toISOString();
  }

  function encodeFormData(formData) {
    const params = new URLSearchParams();
    formData.forEach((value, key) => {
      params.append(key, String(value));
    });
    return params.toString();
  }

  function setupForm() {
    const form = document.querySelector("#lead-form");
    if (!form) return;

    populateTrackingFields(form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (assignmentInFlight) return;
      assignmentInFlight = true;

      populateTrackingFields(form);
      const button = form.querySelector('button[type="submit"]');
      const status = form.querySelector(".form-status");
      const contactSource = "main_form";
      const formType = "lead_form";
      const pendingWindow = openPendingWhatsappWindow();

      setControlBusy(button, true, "Conectando con un asesor…");
      status.textContent = "";

      trackEvent("form_submit", {
        form_name: "auco-leads",
        objective: form.elements.objetivo.value,
        has_agreement: Boolean(form.elements.convenio.value),
        utm_source: form.elements.utm_source.value || "",
        utm_campaign: form.elements.utm_campaign.value || ""
      });

      try {
        const assignment = await requestWhatsappAssignment(contactSource, formType);

        form.elements.agent_id.value = assignment.agentId;
        form.elements.agent_name.value = assignment.agentName;
        form.elements.lead_id.value = assignment.leadId;

        const payload = Object.fromEntries(new FormData(form).entries());
        const message = buildFormWhatsappMessage(payload, assignment);

        const netlifySubmission = fetch(form.action || "/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: encodeFormData(new FormData(form)),
          keepalive: true
        });

        pushLeadFormSuccess(assignment.leadId);
        openAssignedWhatsapp(
          assignment,
          message,
          pendingWindow,
          contactSource,
          formType
        );
        status.textContent = "Conversación abierta con " + assignment.agentName + ".";

        netlifySubmission
          .then((response) => {
            if (!response.ok) {
              throw new Error("Netlify Forms returned " + response.status);
            }

            trackEvent("form_submit_success", {
              form_name: "auco-leads",
              objective: payload.objetivo,
              has_agreement: Boolean(payload.convenio)
            });
            status.textContent = "Solicitud registrada y conversación abierta con " + assignment.agentName + ".";
          })
          .catch((error) => {
            status.textContent = "La conversación fue abierta. No pudimos confirmar el registro del formulario; puedes reintentar sin perder tus datos.";
            console.error("Netlify form submission failed.", error);
          });
      } catch (error) {
        if (pendingWindow && !pendingWindow.closed) pendingWindow.close();
        status.textContent = "No pudimos asignarte un asesor automáticamente. Intenta nuevamente.";
        console.error("WhatsApp assignment failed.", error);
      } finally {
        assignmentInFlight = false;
        setControlBusy(button, false);
      }
    });
  }

  function setupSectorGallery() {
    const stage = document.querySelector(".sector-stage");
    const image = document.querySelector("#sector-image");
    const tag = document.querySelector("#sector-tag");
    const name = document.querySelector("#sector-name");
    const description = document.querySelector("#sector-description");
    if (!stage || !image) return;

    document.querySelectorAll("[data-sector]").forEach((button) => {
      button.addEventListener("click", () => {
        const sector = sectorData[button.dataset.sector];
        if (!sector) return;

        document.querySelectorAll("[data-sector]").forEach((item) => {
          item.setAttribute("aria-selected", String(item === button));
        });

        stage.classList.add("is-switching");
        window.setTimeout(() => {
          image.src = sector.image;
          image.alt = sector.alt;
          tag.textContent = sector.tag;
          name.textContent = sector.name;
          description.textContent = sector.description;
        }, reduceMotion ? 0 : 180);
        window.setTimeout(() => stage.classList.remove("is-switching"), reduceMotion ? 0 : 420);
      });
    });
  }

  function setupMap() {
    const canvas = document.querySelector("#map-canvas");
    const scroll = document.querySelector("#map-scroll");
    const infoTag = document.querySelector("#map-info-tag");
    const infoTitle = document.querySelector("#map-info-title");
    const infoDescription = document.querySelector("#map-info-description");
    const infoImage = document.querySelector("#map-info-image");
    if (!canvas || !scroll) return;

    const zoomLevels = [1, 1.35, 1.7, 2.1];
    let zoomIndex = 0;
    let drag = null;

    function updateLocation(key) {
      const location = mapData[key];
      if (!location) return;

      infoTag.textContent = location.tag;
      infoTitle.textContent = location.title;
      infoDescription.textContent = location.description;

      if (location.image) {
        infoImage.src = location.image;
        infoImage.alt = location.imageAlt;
        infoImage.hidden = false;
      } else {
        infoImage.hidden = true;
      }

      document.querySelectorAll("[data-map-location]").forEach((control) => {
        const active = control.dataset.mapLocation === key;
        control.classList.toggle("is-active", active);
        if (control.classList.contains("map-hotspot")) {
          control.setAttribute("aria-pressed", String(active));
        }
      });
    }

    document.querySelectorAll("[data-map-location]").forEach((control) => {
      control.addEventListener("click", () => updateLocation(control.dataset.mapLocation));
    });

    const tooltip = document.createElement("div");
    tooltip.className = "map-cursor-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("aria-hidden", "true");
    const tooltipImage = document.createElement("img");
    tooltipImage.decoding = "async";
    tooltipImage.hidden = true;
    const tooltipLabel = document.createElement("span");
    tooltip.append(tooltipImage, tooltipLabel);
    document.body.appendChild(tooltip);

    function positionTooltip(clientX, clientY) {
      const gap = 14;
      const edge = 8;
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      let left = clientX + gap;
      let top = clientY + gap;

      if (left + width > window.innerWidth - edge) {
        left = clientX - width - gap;
        tooltip.style.transformOrigin = "right center";
      } else {
        tooltip.style.transformOrigin = "left center";
      }
      if (top + height > window.innerHeight - edge) {
        top = clientY - height - gap;
      }

      tooltip.style.left = Math.max(edge, left) + "px";
      tooltip.style.top = Math.max(edge, top) + "px";
    }

    function showTooltip(control, clientX, clientY) {
      const location = mapData[control.dataset.mapLocation];
      if (!location) return;
      tooltipLabel.textContent = location.title;

      if (location.image) {
        tooltipImage.src = location.image;
        tooltipImage.alt = location.imageAlt;
        tooltipImage.hidden = false;
      } else {
        tooltipImage.hidden = true;
        tooltipImage.removeAttribute("src");
        tooltipImage.alt = "";
      }

      tooltip.setAttribute("aria-hidden", "false");
      tooltip.classList.add("is-visible");
      positionTooltip(clientX, clientY);
    }

    function hideTooltip() {
      tooltip.classList.remove("is-visible");
      tooltip.setAttribute("aria-hidden", "true");
    }

    document.querySelectorAll(".map-hotspot").forEach((hotspot) => {
      hotspot.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "touch") showTooltip(hotspot, event.clientX, event.clientY);
      });
      hotspot.addEventListener("pointermove", (event) => {
        if (tooltip.classList.contains("is-visible")) positionTooltip(event.clientX, event.clientY);
      });
      hotspot.addEventListener("pointerleave", hideTooltip);
      hotspot.addEventListener("blur", hideTooltip);
      hotspot.addEventListener("focus", () => {
        const rect = hotspot.getBoundingClientRect();
        showTooltip(hotspot, rect.right, rect.top + rect.height / 2);
      });
    });

    function applyZoom(nextIndex) {
      zoomIndex = Math.max(0, Math.min(zoomLevels.length - 1, nextIndex));
      canvas.style.width = (zoomLevels[zoomIndex] * 100) + "%";
      const zoomOut = document.querySelector("[data-map-action='zoom-out']");
      const zoomIn = document.querySelector("[data-map-action='zoom-in']");
      if (zoomOut) zoomOut.disabled = zoomIndex === 0;
      if (zoomIn) zoomIn.disabled = zoomIndex === zoomLevels.length - 1;
      if (zoomIndex === 0) {
        scroll.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }
    }

    document.querySelectorAll("[data-map-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.mapAction === "zoom-in") applyZoom(zoomIndex + 1);
        if (button.dataset.mapAction === "zoom-out") applyZoom(zoomIndex - 1);
        if (button.dataset.mapAction === "reset") applyZoom(0);
      });
    });

    scroll.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button") || zoomIndex === 0) return;
      drag = {
        x: event.clientX,
        y: event.clientY,
        left: scroll.scrollLeft,
        top: scroll.scrollTop
      };
      scroll.setPointerCapture(event.pointerId);
    });
    scroll.addEventListener("pointermove", (event) => {
      if (!drag) return;
      scroll.scrollLeft = drag.left - (event.clientX - drag.x);
      scroll.scrollTop = drag.top - (event.clientY - drag.y);
    });
    scroll.addEventListener("pointerup", () => { drag = null; });
    scroll.addEventListener("pointercancel", () => { drag = null; });
    canvas.addEventListener("dblclick", () => applyZoom(zoomIndex + 1));
    applyZoom(0);
  }

  function setupMotion() {
    const selectors = [
      ".contact-copy > *",
      ".full-form",
      ".trust-intro > *",
      ".trust-grid > div",
      ".agreements-copy > *",
      ".agreements-panel",
      ".capacity-heading > *",
      ".capacity-card",
      ".immediate-steps li",
      ".sector-heading > *",
      ".sector-explorer",
      ".planning-image",
      ".planning-copy > *",
      ".map-heading > *",
      ".map-viewer",
      ".map-information",
      ".faq-list details",
      ".closing-cta > *"
    ];
    const targets = document.querySelectorAll(selectors.join(","));

    targets.forEach((element, index) => {
      element.classList.add("reveal-target");
      element.style.setProperty("--reveal-delay", (index % 4) * 55 + "ms");
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });

    targets.forEach((element) => observer.observe(element));
  }

  function setupScrollEffects() {
    const header = document.querySelector(".site-header");
    const planningImage = document.querySelector(".planning-photo");
    let frame = 0;

    function update() {
      frame = 0;
      header?.classList.toggle("is-scrolled", window.scrollY > 36);

      if (!reduceMotion && planningImage) {
        const rect = planningImage.parentElement.getBoundingClientRect();
        const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const offset = Math.max(-18, Math.min(18, (progress - 0.5) * 36));
        planningImage.style.setProperty("--parallax-y", offset.toFixed(1) + "px");
      }
    }

    window.addEventListener("scroll", () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function setupFaq() {
    document.querySelectorAll(".faq-list details").forEach((details) => {
      const summary = details.querySelector("summary");
      if (!summary || reduceMotion) return;

      summary.addEventListener("click", (event) => {
        event.preventDefault();
        if (details.dataset.animating === "true") return;

        details.dataset.animating = "true";
        const startHeight = details.offsetHeight;

        if (!details.open) {
          details.open = true;
          const endHeight = details.offsetHeight;
          details.animate(
            [{ height: startHeight + "px" }, { height: endHeight + "px" }],
            { duration: 280, easing: "cubic-bezier(0.2, 0.72, 0.2, 1)" }
          ).onfinish = () => {
            details.dataset.animating = "false";
          };
        } else {
          const endHeight = summary.offsetHeight;
          details.animate(
            [{ height: startHeight + "px" }, { height: endHeight + "px" }],
            { duration: 240, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
          ).onfinish = () => {
            details.open = false;
            details.dataset.animating = "false";
          };
        }
      });
    });
  }

  initializeAnalytics();
  applyCommercialConfig();
  setupTicker();
  setupLeadIntent();
  setupWhatsappCtas();
  setupForm();
  setupSectorGallery();
  setupMap();
  setupMotion();
  setupScrollEffects();
  setupFaq();
  trackEvent("page_view", { page_path: window.location.pathname });
})();
