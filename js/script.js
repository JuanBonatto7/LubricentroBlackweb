/* ==========================================================
   BLACK Lubricentro – comportamiento del sitio
   ➜ Cambiar SOLO este número por el WhatsApp real del negocio
     (formato internacional, sin + ni espacios).
   ========================================================== */
const WHATSAPP_NUMBER = '5493581234567';

/* Horarios de atención: [primer turno, hora de cierre]. 0 = domingo */
const SCHEDULE = {
  1: [8, 20], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20],
  6: [8, 14],
};
const MIN_ADVANCE_HOURS = 1; // anticipación mínima para turnos del mismo día

const waLink = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}` + (text ? `?text=${encodeURIComponent(text)}` : '');

/* ---------- Enlaces de WhatsApp ---------- */
document.querySelectorAll('[data-wa]').forEach((a) => {
  a.href = waLink(a.dataset.wa || 'Hola BLACK, quiero hacer una consulta.');
});

/* ---------- Menú móvil ---------- */
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');

if (menuToggle && siteNav) {
  const setMenu = (open) => {
    siteNav.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.querySelector('.sr-only').textContent = open ? 'Cerrar menú' : 'Abrir menú';
  };
  menuToggle.addEventListener('click', () => setMenu(!siteNav.classList.contains('is-open')));
  siteNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
}

/* ---------- Filtros de productos ---------- */
const filters = document.querySelectorAll('.filter');
const productCards = document.querySelectorAll('.product-card');

filters.forEach((btn) => {
  btn.addEventListener('click', () => {
    filters.forEach((b) => {
      const active = b === btn;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    const wanted = btn.dataset.filter;
    productCards.forEach((card) => {
      card.hidden = wanted !== 'all' && card.dataset.category !== wanted;
    });
  });
});

/* ==========================================================
   SOLICITAR TURNO (asistente de 4 pasos)
   ========================================================== */
const form = document.querySelector('#booking-form');

if (form) {
  const panels = [...form.querySelectorAll('.panel')];
  const stepperItems = [...document.querySelectorAll('#stepper li')];
  const dateInput = form.querySelector('#date');
  const dateHint = form.querySelector('#date-hint');
  const slotsBox = form.querySelector('#slots');
  const summary = form.querySelector('#summary');
  const sendLink = form.querySelector('#send-wa');
  const sentBox = form.querySelector('#sent');
  const btnReset = form.querySelector('#btn-reset');
  const btnEdit = form.querySelector('#btn-edit');

  const state = { step: 1, service: '', date: '', time: '' };
  const DEFAULT_HINT = dateHint.textContent;

  /* --- Utilidades de fecha --- */
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const prettyDate = (iso) =>
    cap(fromISO(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }));

  const today = new Date();
  dateInput.min = toISO(today);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 90);
  dateInput.max = toISO(maxDate);

  /* --- Navegación entre pasos --- */
  function showStep(n, { focus = true } = {}) {
    state.step = n;
    panels.forEach((p) => { p.hidden = Number(p.dataset.panel) !== n; });
    stepperItems.forEach((li) => {
      const s = Number(li.dataset.step);
      li.classList.toggle('is-active', s === n);
      li.classList.toggle('is-done', s < n);
      const btn = li.querySelector('.step-btn');
      btn.disabled = !(s < n);
      if (s === n) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
    });
    if (n === 4) renderSummary();
    if (focus) {
      const legend = panels[n - 1].querySelector('legend');
      legend.focus({ preventScroll: true });
      const top = document.querySelector('#stepper').getBoundingClientRect().top;
      if (top < 90 || top > window.innerHeight * 0.6) {
        window.scrollTo({ top: window.scrollY + top - 110, behavior: 'smooth' });
      }
    }
  }

  stepperItems.forEach((li) => {
    li.querySelector('.step-btn').addEventListener('click', () => {
      const s = Number(li.dataset.step);
      if (s < state.step) showStep(s);
    });
  });

  /* --- Errores --- */
  const errorBox = (n) => panels[n - 1].querySelector('.form-error');
  const setError = (n, msg) => { errorBox(n).textContent = msg; };
  const clearErrors = () => form.querySelectorAll('.form-error').forEach((e) => { e.textContent = ''; });

  /* --- Paso 1: servicio --- */
  form.querySelectorAll('input[name="service"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      state.service = radio.value;
      setError(1, '');
    });
  });

  function selectService(value) {
    const radio = [...form.querySelectorAll('input[name="service"]')].find((r) => r.value === value);
    if (radio) { radio.checked = true; state.service = value; setError(1, ''); }
  }

  // Tocar un servicio de la sección "Servicios" lo deja preseleccionado
  document.querySelectorAll('[data-service]').forEach((card) => {
    card.addEventListener('click', () => {
      selectService(card.dataset.service);
      if (state.step !== 1) showStep(1, { focus: false });
    });
  });

  /* --- Paso 2: fecha y horarios --- */
  function availableHours(iso) {
    const date = fromISO(iso);
    const range = SCHEDULE[date.getDay()];
    if (!range) return null; // cerrado
    const hours = [];
    for (let h = range[0]; h < range[1]; h += 1) hours.push(h);
    return hours;
  }

  function isPast(iso, hour) {
    const slot = fromISO(iso);
    slot.setHours(hour, 0, 0, 0);
    return slot.getTime() < Date.now() + MIN_ADVANCE_HOURS * 3600 * 1000;
  }

  function setHint(msg, isError = false) {
    dateHint.textContent = msg;
    dateHint.classList.toggle('is-error', isError);
  }

  function renderSlots() {
    const iso = dateInput.value;
    slotsBox.innerHTML = '';
    state.time = '';

    const empty = (msg) => {
      const p = document.createElement('p');
      p.className = 'slots-empty';
      p.textContent = msg;
      slotsBox.appendChild(p);
    };

    if (!iso) { setHint(DEFAULT_HINT); empty('Primero elegí una fecha para ver los horarios.'); return; }

    if (iso < dateInput.min || iso > dateInput.max) {
      setHint('Elegí una fecha dentro de los próximos 90 días.', true);
      empty('No hay horarios para esa fecha.');
      return;
    }

    const hours = availableHours(iso);
    if (!hours) {
      setHint('Los domingos estamos cerrados. Elegí otra fecha.', true);
      empty('No hay horarios para esa fecha.');
      return;
    }

    setHint(prettyDate(iso));
    let anyFree = false;
    let lastGroup = '';

    hours.forEach((h) => {
      const group = h < 13 ? 'Mañana' : 'Tarde';
      if (group !== lastGroup) {
        const label = document.createElement('p');
        label.className = 'slots-group';
        label.textContent = group;
        slotsBox.appendChild(label);
        lastGroup = group;
      }
      const label = `${pad(h)}:00`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.textContent = label;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      if (isPast(iso, h)) {
        btn.disabled = true;
      } else {
        anyFree = true;
        btn.addEventListener('click', () => {
          slotsBox.querySelectorAll('.slot').forEach((s) => s.setAttribute('aria-checked', 'false'));
          btn.setAttribute('aria-checked', 'true');
          state.time = label;
          setError(2, '');
        });
      }
      slotsBox.appendChild(btn);
    });

    if (!anyFree) setHint('Ya no quedan horarios para ese día. Elegí otra fecha.', true);
  }

  dateInput.addEventListener('change', () => { state.date = dateInput.value; setError(2, ''); renderSlots(); });
  dateInput.addEventListener('input', () => { state.date = dateInput.value; });

  /* --- Paso 3: datos --- */
  const nameInput = form.querySelector('#name');
  const phoneInput = form.querySelector('#phone');
  const vehicleInput = form.querySelector('#vehicle');
  const notesInput = form.querySelector('#notes');

  [nameInput, phoneInput].forEach((input) =>
    input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); setError(3, ''); }));

  /* --- Validación por paso --- */
  function validate(step) {
    if (step === 1) {
      if (!state.service) { setError(1, 'Elegí un servicio para continuar.'); return false; }
    }
    if (step === 2) {
      if (!dateInput.value) { setError(2, 'Elegí una fecha.'); dateInput.focus(); return false; }
      if (dateInput.value < dateInput.min || dateInput.value > dateInput.max || !availableHours(dateInput.value)) {
        setError(2, 'Elegí un día en el que atendemos (lunes a sábado).'); dateInput.focus(); return false;
      }
      if (!state.time) { setError(2, 'Elegí un horario disponible.'); return false; }
    }
    if (step === 3) {
      const name = nameInput.value.trim();
      const digits = phoneInput.value.replace(/\D/g, '');
      if (name.length < 2) {
        nameInput.setAttribute('aria-invalid', 'true');
        setError(3, 'Escribí tu nombre y apellido.'); nameInput.focus(); return false;
      }
      if (digits.length < 8 || digits.length > 15) {
        phoneInput.setAttribute('aria-invalid', 'true');
        setError(3, 'Ingresá un número de WhatsApp válido, con código de área.'); phoneInput.focus(); return false;
      }
    }
    return true;
  }

  form.querySelectorAll('[data-next]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (validate(state.step)) showStep(state.step + 1);
    }));

  form.querySelectorAll('[data-prev]').forEach((btn) =>
    btn.addEventListener('click', () => { if (state.step > 1) showStep(state.step - 1); }));

  // Enter dentro de los campos avanza en vez de enviar el formulario
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.step < 4 && validate(state.step)) showStep(state.step + 1);
  });

  /* --- Paso 4: resumen y envío --- */
  function buildMessage() {
    const lines = [
      'Hola BLACK, quiero solicitar un turno.',
      '',
      `Servicio: ${state.service}`,
      `Fecha: ${prettyDate(state.date)}`,
      `Horario: ${state.time} hs`,
      `Nombre: ${nameInput.value.trim()}`,
      `WhatsApp: ${phoneInput.value.trim()}`,
    ];
    if (vehicleInput.value.trim()) lines.push(`Vehículo: ${vehicleInput.value.trim()}`);
    if (notesInput.value.trim()) lines.push(`Comentarios: ${notesInput.value.trim()}`);
    return lines.join('\n');
  }

  function renderSummary() {
    const rows = [
      ['Servicio', state.service],
      ['Fecha', prettyDate(state.date)],
      ['Horario', `${state.time} hs`],
      ['Nombre', nameInput.value.trim()],
      ['WhatsApp', phoneInput.value.trim()],
    ];
    if (vehicleInput.value.trim()) rows.push(['Vehículo', vehicleInput.value.trim()]);
    if (notesInput.value.trim()) rows.push(['Comentarios', notesInput.value.trim()]);

    summary.innerHTML = '';
    rows.forEach(([k, v]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = k;
      dd.textContent = v;
      row.append(dt, dd);
      summary.appendChild(row);
    });

    sendLink.href = waLink(buildMessage());
    sentBox.hidden = true;
    btnReset.hidden = true;
    btnEdit.hidden = false;
  }

  sendLink.addEventListener('click', () => {
    sentBox.hidden = false;
    btnReset.hidden = false;
    btnEdit.hidden = true;
  });

  btnReset.addEventListener('click', () => {
    form.reset();
    state.service = ''; state.date = ''; state.time = '';
    slotsBox.innerHTML = '<p class="slots-empty">Primero elegí una fecha para ver los horarios.</p>';
    setHint(DEFAULT_HINT);
    clearErrors();
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    showStep(1);
  });

  showStep(1, { focus: false });
}
