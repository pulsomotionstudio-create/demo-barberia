(() => {
  "use strict";

  const WA_NUMBER = "573000000000";
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("menu");
  const year = document.getElementById("anio");
  const form = document.getElementById("form-reserva");
  const fecha = document.getElementById("fecha");
  const hora = document.getElementById("hora");
  const errorBox = document.getElementById("form-error");
  const statusEl = document.querySelector("[data-status]");

  if (year) year.textContent = String(new Date().getFullYear());

  /* Header shadow on scroll */
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile nav */
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Abrir menú" : "Cerrar menú");
      nav.classList.toggle("is-open", !open);
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menú");
        nav.classList.remove("is-open");
      });
    });
  }

  /* Open / closed status in America/Bogota */
  const hours = {
    1: [9, 20],
    2: [9, 20],
    3: [9, 20],
    4: [9, 20],
    5: [9, 20],
    6: [9, 19],
    0: [10, 15],
  };

  function caliNow() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      day: map[get("weekday")] ?? now.getDay(),
      hour: Number(get("hour")),
      minute: Number(get("minute")),
    };
  }

  if (statusEl) {
    const { day, hour, minute } = caliNow();
    const range = hours[day];
    const current = hour + minute / 60;
    const open = range && current >= range[0] && current < range[1];
    statusEl.classList.toggle("is-open", open);
    statusEl.classList.toggle("is-closed", !open);
    const text = statusEl.querySelector(".status-text");
    if (text) {
      text.textContent = open ? "Abierto ahora" : "Cerrado en este momento";
    }
  }

  /* Date min = today in Cali; populate times */
  function ymdInCali(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
    return parts; // YYYY-MM-DD
  }

  function weekdayOfYmd(ymd) {
    // Interpret the calendar date as Cali local, noon to avoid DST edge cases
    const [y, m, d] = ymd.split("-").map(Number);
    const utcGuess = Date.UTC(y, m - 1, d, 17, 0, 0); // 12:00 in UTC-5
    const { day } = (() => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Bogota",
        weekday: "short",
      }).formatToParts(new Date(utcGuess));
      const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: map[parts.find((p) => p.type === "weekday").value] };
    })();
    return day;
  }

  function slotsForDay(day) {
    const range = hours[day];
    if (!range) return [];
    const out = [];
    for (let h = range[0]; h < range[1]; h++) {
      for (const min of [0, 30]) {
        if (h === range[1] - 0 && min === 30 && range[1] - range[0] < 0) continue;
        if (h + min / 60 >= range[1]) continue;
        const suffix = h < 12 ? "a. m." : "p. m.";
        const twelve = h % 12 === 0 ? 12 : h % 12;
        const label = `${twelve}:${min === 0 ? "00" : "30"} ${suffix}`;
        const value = `${String(h).padStart(2, "0")}:${min === 0 ? "00" : "30"}`;
        out.push({ value, label });
      }
    }
    return out;
  }

  function fillHours() {
    if (!hora || !fecha) return;
    const selected = fecha.value;
    const previous = hora.value;
    hora.innerHTML = '<option value="">Elige una hora</option>';
    if (!selected) return;
    const day = weekdayOfYmd(selected);
    const today = ymdInCali();
    const now = caliNow();
    const nowValue = now.hour + now.minute / 60;
    slotsForDay(day).forEach((slot) => {
      if (selected === today) {
        const [hh, mm] = slot.value.split(":").map(Number);
        if (hh + mm / 60 <= nowValue) return;
      }
      const opt = document.createElement("option");
      opt.value = slot.label;
      opt.textContent = slot.label;
      hora.appendChild(opt);
    });
    if ([...hora.options].some((o) => o.value === previous)) {
      hora.value = previous;
    }
  }

  if (fecha) {
    fecha.min = ymdInCali();
    if (!fecha.value) fecha.value = ymdInCali();
    fecha.addEventListener("change", fillHours);
    fillHours();
  }

  /* Booking form → WhatsApp */
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nombre = (document.getElementById("nombre").value || "").trim();
      const servicio = document.getElementById("servicio").value;
      const day = fecha.value;
      const time = hora.value;

      const showError = (msg) => {
        errorBox.textContent = msg;
        errorBox.classList.add("is-visible");
      };

      if (!nombre || !servicio || !day || !time) {
        showError("Completa tu nombre, el servicio, la fecha y la hora.");
        return;
      }

      errorBox.classList.remove("is-visible");
      const [y, m, d] = day.split("-");
      const fechaTexto = `${d}/${m}/${y}`;
      const mensaje = `Hola, soy ${nombre}. Quiero reservar un corte: ${servicio}, el ${fechaTexto} a las ${time}.`;
      const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, "_blank", "noopener");
    });
  }

  /* Lightbox */
  const lightbox = document.getElementById("lightbox");
  if (lightbox) {
    const img = lightbox.querySelector("img");
    const closeBtn = lightbox.querySelector(".lightbox-close");
    const open = (src, alt) => {
      img.src = src;
      img.alt = alt || "";
      lightbox.hidden = false;
      lightbox.classList.add("is-open");
    };
    const close = () => {
      lightbox.classList.remove("is-open");
      lightbox.hidden = true;
      img.src = "";
    };
    document.querySelectorAll("[data-lightbox]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const pic = a.querySelector("img");
        open(a.getAttribute("href"), pic ? pic.alt : "");
      });
    });
    closeBtn.addEventListener("click", close);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.classList.contains("is-open")) close();
    });
  }
})();
