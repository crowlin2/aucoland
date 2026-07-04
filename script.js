(function () {
  const WHATSAPP_NUMBER = "56950103278";
  const whatsappMessage = "Hola, quiero recibir orientación para cotizar en Parque de Auco.";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const trackingKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "fbclid"
  ];

  const sectorData = {
    roble: {
      tag: "Sector Roble",
      name: "Sombra, amplitud y árboles maduros",
      description: "Sepulturas familiares perpetuas de 4 y 8 capacidades.",
      image: "assets/fotos/sector-roble.webp",
      alt: "Sector Roble con pradera, árboles maduros y una banca"
    },
    maiten: {
      tag: "Sector Maitén",
      name: "Un entorno abierto y luminoso",
      description: "Alternativas familiares perpetuas de 4 y 6 capacidades.",
      image: "assets/fotos/banca-parque-auco.webp",
      alt: "Sector Maitén con pradera abierta, árboles y cordillera"
    },
    quillay: {
      tag: "Sector Quillay",
      name: "Naturaleza y vistas a la cordillera",
      description: "Alternativas familiares perpetuas de 2 y 4 capacidades.",
      image: "assets/fotos/panoramica-parque-auco.webp",
      alt: "Áreas verdes del parque con vistas a la cordillera"
    },
    peumo: {
      tag: "Sector Peumo",
      name: "Un paisaje familiar entre árboles",
      description: "Sepulturas familiares perpetuas de 4 capacidades.",
      image: "assets/fotos/pradera-parque-auco.webp",
      alt: "Senderos y vegetación del parque en Sector Peumo"
    }
  };

  const legacyData = {
    jardines: {
      tag: "Jardines Familiares",
      heading: "Privacidad para el grupo familiar",
      description: "Jardines privados de 4 o 6 capacidades con acceso delimitado y equipamiento familiar.",
      image: "assets/fotos/jardin-familiar-auco-frondoso.webp",
      features: [
        "Formatos de 4 y 6 capacidades",
        "Lápida de mármol travertino",
        "Reja de ingreso, banca de hormigón y plantas perimetrales",
        "Placa de homenaje Auco Legado",
        "Dos derechos de sepultación incluidos",
        "Un año de mantención incluido",
        "Traslados internos de sepultados sin costo"
      ],
      alt: "Jardín familiar privado con cerco vegetal, portón, pasto y banca"
    },
    fuente: {
      tag: "Fuente de Auco",
      heading: "Dos configuraciones de 4 capacidades",
      description: "Una propuesta abierta con recorridos de piedra, áreas verdes y vegetación de bajo perfil.",
      image: "assets/fotos/auco-legado-fuente.webp",
      features: [
        "Familiar: 3 cuerpos enteros y 6 reducciones",
        "Superior: 3 cuerpos enteros y 8 reducciones",
        "Lápida de mármol travertino",
        "Seis meses de carencia",
        "Traslados internos de sepultados sin costo",
        "La configuración Superior incluye dos derechos de sepultación",
        "La configuración Superior incluye un año de mantención y placa Auco Legado"
      ],
      alt: "Fuente de Auco con áreas verdes, lavandas, senderos y acceso del parque"
    }
  };


  const mapData = {
    atencion: {
      tag: "Punto de atención",
      title: "Atención Comercial",
      description: "Punto de orientación para cotizaciones, visitas y consultas sobre disponibilidad.",
      image: "assets/fotos/instalaciones-aereas-auco.webp",
      imageAlt: "Vista aérea de las instalaciones y atención de Parque de Auco"
    },
    capilla: {
      tag: "Servicio del parque",
      title: "Capilla",
      description: "Ubicación de la capilla dentro del parque y acceso desde el camino principal.",
      image: "assets/fotos/capilla-auco-mejorada.webp",
      imageAlt: "Exterior de la Capilla de Parque de Auco"
    },
    santuario: {
      tag: "Referencia cercana",
      title: "Santuario Santa Teresita de Los Andes",
      description: "Punto de referencia ubicado junto al límite poniente del parque.",
      image: "assets/fotos/santuario-santa-teresita.webp",
      imageAlt: "Fachada principal del Santuario Santa Teresita de Los Andes"
    },
    anforas: {
      tag: "Sector del parque",
      title: "Sector Ánforas",
      description: "Área identificada en el plano para alternativas de ánforas."
    },
    nichos: {
      tag: "Servicio del parque",
      title: "Nichos temporales",
      description: "Sector ubicado hacia el costado oriente del parque."
    },
    plaza: {
      tag: "Punto de referencia",
      title: "Plaza de la Cruz",
      description: "Punto central de referencia cercano al acceso y a Atención Comercial."
    }
  };

  const params = new URLSearchParams(window.location.search);
  const trackingValues = trackingKeys.reduce((values, key) => {
    values[key] = params.get(key) || "";
    return values;
  }, {});

  function pushDataLayer(payload) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }

  document.querySelectorAll("[data-tracking-fields]").forEach((container) => {
    trackingKeys.forEach((key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = trackingValues[key];
      container.appendChild(input);
    });
  });

  const encodedMessage = encodeURIComponent(whatsappMessage);
  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    link.href = WHATSAPP_NUMBER
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    link.addEventListener("click", () => {
      pushDataLayer({
        event: "whatsapp_click",
        source: link.classList.contains("sticky-whatsapp") ? "sticky_mobile" : "page_cta"
      });
    });
  });

  const ticker = document.querySelector(".assurance-ticker");
  const tickerToggle = document.querySelector(".assurance-ticker-toggle");
  tickerToggle?.addEventListener("click", () => {
    const paused = ticker.classList.toggle("is-paused");
    tickerToggle.setAttribute("aria-pressed", String(paused));
    tickerToggle.setAttribute("aria-label", paused ? "Reanudar cinta" : "Pausar cinta");
    tickerToggle.title = paused ? "Reanudar movimiento" : "Pausar movimiento";
    tickerToggle.querySelector("span").textContent = paused ? "\u25B6" : "\u2161";
    pushDataLayer({ event: "ticker_motion_toggle", paused });
  });

  function selectMatchingOption(select, value) {
    if (!select) return;
    const option = Array.from(select.options).find((item) => item.value === value || item.text === value);
    if (option) select.value = option.value;
  }

  function prefillForms(need, priority, message) {
    document.querySelectorAll(".lead-form").forEach((form) => {
      selectMatchingOption(form.querySelector("[name='necesidad']"), need);
      selectMatchingOption(form.querySelector("[name='plazo_contacto']"), priority);

      const messageField = form.querySelector("[name='mensaje']");
      if (messageField && message) messageField.value = message;
    });
  }

  document.querySelectorAll("[data-prefill]").forEach((link) => {
    link.addEventListener("click", () => {
      prefillForms(link.dataset.prefill, link.dataset.priority || "", "");
      pushDataLayer({
        event: "lead_intent_select",
        lead_need: link.dataset.prefill,
        source: link.closest("section")?.id || link.closest("section")?.className || "page"
      });
    });
  });

  const sectorStage = document.querySelector(".sector-stage");
  const sectorVisual = document.querySelector("#sector-image");
  const sectorTag = document.querySelector("#sector-tag");
  const sectorName = document.querySelector("#sector-name");
  const sectorDescription = document.querySelector("#sector-description");


  document.querySelectorAll("[data-sector]").forEach((button) => {
    button.addEventListener("click", () => {
      const sector = sectorData[button.dataset.sector];
      if (!sector) return;

      document.querySelectorAll("[data-sector]").forEach((item) => {
        item.setAttribute("aria-selected", String(item === button));
      });

      sectorStage.classList.add("is-switching");
      window.setTimeout(() => {
        sectorVisual.src = sector.image;
        sectorVisual.alt = sector.alt;
        sectorTag.textContent = sector.tag;
        sectorName.textContent = sector.name;
        sectorDescription.textContent = sector.description;
      }, reduceMotion ? 0 : 180);
      window.setTimeout(() => {
        sectorStage.classList.remove("is-switching");
      }, reduceMotion ? 0 : 420);

      pushDataLayer({ event: "sector_view", sector: button.dataset.sector });
    });
  });

  const legacyStage = document.querySelector(".legacy-stage");
  const legacyVisual = document.querySelector("#legacy-image");
  const legacyTag = document.querySelector("#legacy-tag");
  const legacyHeading = document.querySelector("#legacy-heading");
  const legacyDescription = document.querySelector("#legacy-description");
  const legacyFeatures = document.querySelector("#legacy-features");


  document.querySelectorAll("[data-legacy]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = legacyData[button.dataset.legacy];
      if (!item) return;

      document.querySelectorAll("[data-legacy]").forEach((tab) => {
        tab.setAttribute("aria-selected", String(tab === button));
      });

      legacyStage.classList.remove("is-switching");
      void legacyStage.offsetWidth;
      legacyStage.classList.add("is-switching");
      window.setTimeout(() => {
        legacyVisual.style.backgroundImage = item.image ? `url("${item.image}")` : "none";
        legacyVisual.setAttribute("aria-label", item.alt);
        legacyTag.textContent = item.tag;
        legacyHeading.textContent = item.heading;
        legacyDescription.textContent = item.description;
        legacyFeatures.replaceChildren(...item.features.map((feature) => {
          const li = document.createElement("li");
          li.textContent = feature;
          return li;
        }));
      }, reduceMotion ? 0 : 270);
      window.setTimeout(() => {
        legacyStage.classList.remove("is-switching");
      }, reduceMotion ? 0 : 580);

      pushDataLayer({ event: "legacy_view", product: button.dataset.legacy });
    });
  });


  const mapCanvas = document.querySelector("#map-canvas");
  const mapScroll = document.querySelector("#map-scroll");
  const mapInfoTag = document.querySelector("#map-info-tag");
  const mapInfoTitle = document.querySelector("#map-info-title");
  const mapInfoDescription = document.querySelector("#map-info-description");
  const mapInfoImage = document.querySelector("#map-info-image");
  const mapZoomLevels = [1, 1.35, 1.7, 2.1];
  let mapZoomIndex = 0;

  function updateMapLocation(key) {
    const location = mapData[key];
    if (!location) return;

    mapInfoTag.textContent = location.tag;
    mapInfoTitle.textContent = location.title;
    mapInfoDescription.textContent = location.description;

    if (location.image) {
      mapInfoImage.src = location.image;
      mapInfoImage.alt = location.imageAlt;
      mapInfoImage.hidden = false;
    } else {
      mapInfoImage.hidden = true;
    }

    document.querySelectorAll("[data-map-location]").forEach((control) => {
      const active = control.dataset.mapLocation === key;
      control.classList.toggle("is-active", active);
      if (control.classList.contains("map-hotspot")) {
        control.setAttribute("aria-pressed", String(active));
      }
    });

    pushDataLayer({ event: "map_location_select", location: key });
  }

  document.querySelectorAll("[data-map-location]").forEach((control) => {
    control.addEventListener("click", () => updateMapLocation(control.dataset.mapLocation));
  });


  const mapTooltip = document.createElement("div");
  mapTooltip.className = "map-cursor-tooltip";
  mapTooltip.setAttribute("role", "tooltip");
  mapTooltip.setAttribute("aria-hidden", "true");
  const mapTooltipImage = document.createElement("img");
  mapTooltipImage.decoding = "async";
  mapTooltipImage.hidden = true;
  const mapTooltipLabel = document.createElement("span");
  mapTooltip.append(mapTooltipImage, mapTooltipLabel);
  document.body.appendChild(mapTooltip);

  function positionMapTooltip(clientX, clientY) {
    const gap = 14;
    const edge = 8;
    const width = mapTooltip.offsetWidth;
    const height = mapTooltip.offsetHeight;
    let left = clientX + gap;
    let top = clientY + gap;

    if (left + width > window.innerWidth - edge) {
      left = clientX - width - gap;
      mapTooltip.style.transformOrigin = "right center";
    } else {
      mapTooltip.style.transformOrigin = "left center";
    }

    if (top + height > window.innerHeight - edge) {
      top = clientY - height - gap;
    }

    mapTooltip.style.left = Math.max(edge, left) + "px";
    mapTooltip.style.top = Math.max(edge, top) + "px";
  }

  function showMapTooltip(control, clientX, clientY) {
    const location = mapData[control.dataset.mapLocation];
    if (!location) return;
    mapTooltipLabel.textContent = location.title;
    if (location.image) {
      mapTooltipImage.src = location.image;
      mapTooltipImage.alt = location.imageAlt;
      mapTooltipImage.hidden = false;
    } else {
      mapTooltipImage.hidden = true;
      mapTooltipImage.removeAttribute("src");
      mapTooltipImage.alt = "";
    }
    mapTooltip.setAttribute("aria-hidden", "false");
    mapTooltip.classList.add("is-visible");
    positionMapTooltip(clientX, clientY);
  }

  function hideMapTooltip() {
    mapTooltip.classList.remove("is-visible");
    mapTooltip.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll(".map-hotspot").forEach((hotspot) => {
    hotspot.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      showMapTooltip(hotspot, event.clientX, event.clientY);
    });

    hotspot.addEventListener("pointermove", (event) => {
      if (!mapTooltip.classList.contains("is-visible")) return;
      positionMapTooltip(event.clientX, event.clientY);
    });

    hotspot.addEventListener("pointerleave", hideMapTooltip);
    hotspot.addEventListener("blur", hideMapTooltip);
    hotspot.addEventListener("focus", () => {
      const rect = hotspot.getBoundingClientRect();
      showMapTooltip(hotspot, rect.right, rect.top + rect.height / 2);
    });
  });

  function applyMapZoom(nextIndex) {
    mapZoomIndex = Math.max(0, Math.min(mapZoomLevels.length - 1, nextIndex));
    const zoom = mapZoomLevels[mapZoomIndex];
    mapCanvas.style.width = (zoom * 100) + "%";

    document.querySelector("[data-map-action='zoom-out']").disabled = mapZoomIndex === 0;
    document.querySelector("[data-map-action='zoom-in']").disabled = mapZoomIndex === mapZoomLevels.length - 1;

    if (mapZoomIndex === 0) {
      mapScroll.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }

    pushDataLayer({ event: "map_zoom", zoom });
  }

  document.querySelectorAll("[data-map-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.mapAction === "zoom-in") applyMapZoom(mapZoomIndex + 1);
      if (button.dataset.mapAction === "zoom-out") applyMapZoom(mapZoomIndex - 1);
      if (button.dataset.mapAction === "reset") applyMapZoom(0);
    });
  });

  let mapDrag = null;
  mapScroll.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button") || mapZoomIndex === 0) return;
    mapDrag = {
      x: event.clientX,
      y: event.clientY,
      left: mapScroll.scrollLeft,
      top: mapScroll.scrollTop
    };
    mapScroll.setPointerCapture(event.pointerId);
  });

  mapScroll.addEventListener("pointermove", (event) => {
    if (!mapDrag) return;
    mapScroll.scrollLeft = mapDrag.left - (event.clientX - mapDrag.x);
    mapScroll.scrollTop = mapDrag.top - (event.clientY - mapDrag.y);
  });

  mapScroll.addEventListener("pointerup", () => {
    mapDrag = null;
  });

  mapScroll.addEventListener("pointercancel", () => {
    mapDrag = null;
  });

  mapCanvas.addEventListener("dblclick", () => applyMapZoom(mapZoomIndex + 1));
  applyMapZoom(0);

  document.querySelectorAll("[data-capacity-option]").forEach((link) => {
    link.addEventListener("click", () => {
      const value = link.dataset.capacityOption;
      prefillForms(
        "Sepultura familiar",
        "",
        `Me interesa consultar disponibilidad para una alternativa de ${value} capacidades.`
      );
      pushDataLayer({ event: "capacity_interest", capacity: Number(value) });
    });
  });

  function buildLeadWhatsappMessage(payload) {
    return [
      "Hola, quiero solicitar orientación en Parque de Auco.",
      payload.nombre && `Nombre: ${payload.nombre}`,
      payload.whatsapp && `WhatsApp: ${payload.whatsapp}`,
      payload.comuna && `Comuna: ${payload.comuna}`,
      payload.necesidad && `Consulta: ${payload.necesidad}`,
      payload.plazo_contacto && `Contacto: ${payload.plazo_contacto}`,
      payload.mensaje && `Mensaje: ${payload.mensaje}`
    ].filter(Boolean).join("\n");
  }

  document.querySelectorAll(".lead-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const payload = Object.fromEntries(new FormData(form).entries());
      window.parqueAucoLastLead = payload;

      pushDataLayer({
        event: "lead_form_submit",
        form_id: form.id,
        form_name: form.dataset.formName || "lead",
        lead_need: payload.necesidad,
        lead_timing: payload.plazo_contacto,
        comuna: payload.comuna,
        utm_source: payload.utm_source,
        utm_medium: payload.utm_medium,
        utm_campaign: payload.utm_campaign,
        utm_content: payload.utm_content,
        utm_term: payload.utm_term,
        gclid: payload.gclid,
        fbclid: payload.fbclid
      });

      const leadWhatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildLeadWhatsappMessage(payload))}`;
      const handoffLink = document.createElement("a");
      handoffLink.href = leadWhatsappUrl;
      handoffLink.target = "_blank";
      handoffLink.rel = "noopener";
      document.body.appendChild(handoffLink);
      handoffLink.click();
      handoffLink.remove();
      pushDataLayer({ event: "lead_whatsapp_handoff", form_id: form.id });

      const status = form.querySelector(".form-status");
      const button = form.querySelector("button[type='submit']");
      if (button) {
        button.classList.add("is-loading");
        button.setAttribute("aria-busy", "true");
        button.disabled = true;
      }

      window.setTimeout(() => {
        if (status) status.textContent = "WhatsApp abierto. Revisa el mensaje y presiona enviar para completar tu solicitud.";
        if (button) {
          button.classList.remove("is-loading");
          button.removeAttribute("aria-busy");
          button.disabled = false;
          button.textContent = "Abrir WhatsApp nuevamente";
        }
      }, reduceMotion ? 0 : 650);
    });
  });

  function setupScrollMotion() {
    const revealSelectors = [
      ".section-intro",
      ".situation-card",
      ".trust-intro > *",
      ".trust-grid > div",
      ".sector-explorer",
      ".map-heading",
      ".map-viewer",
      ".map-information",
      ".capacity-heading > *",
      ".capacity-card",
      ".legacy-switch",
      ".legacy-stage",
      ".services-image",
      ".services-copy > *",
      ".benefit-band > div",
      ".planning-image",
      ".planning-copy > *",
      ".immediate-steps li",
      ".contact-copy > *",
      ".full-form",
      ".faq-list details",
      ".closing-cta > *"
    ];

    const revealTargets = document.querySelectorAll(revealSelectors.join(","));
    revealTargets.forEach((element, index) => {
      element.classList.add("reveal-target");
      element.style.setProperty("--reveal-delay", (index % 4) * 65 + "ms");
    });

    document.querySelector(".services-image")?.classList.add("reveal-from-left");
    document.querySelectorAll(".services-copy > *").forEach((element) => element.classList.add("reveal-from-right"));
    document.querySelector(".planning-image")?.classList.add("reveal-from-right");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });

    revealTargets.forEach((element) => observer.observe(element));
  }

  const header = document.querySelector(".site-header");
  const planningImage = document.querySelector(".planning-photo");
  let scrollFrame = 0;

  function updateScrollEffects() {
    scrollFrame = 0;
    header?.classList.toggle("is-scrolled", window.scrollY > 36);

    if (!reduceMotion && planningImage) {
      const rect = planningImage.parentElement.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const offset = Math.max(-18, Math.min(18, (progress - 0.5) * 36));
      planningImage.style.setProperty("--parallax-y", offset.toFixed(1) + "px");
    }
  }

  window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollEffects);
  }, { passive: true });

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
          { duration: 300, easing: "cubic-bezier(0.2, 0.72, 0.2, 1)" }
        ).onfinish = () => {
          details.dataset.animating = "false";
        };
      } else {
        const endHeight = summary.offsetHeight;
        details.animate(
          [{ height: startHeight + "px" }, { height: endHeight + "px" }],
          { duration: 260, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
        ).onfinish = () => {
          details.open = false;
          details.dataset.animating = "false";
        };
      }
    });
  });

  setupScrollMotion();
  updateScrollEffects();})();