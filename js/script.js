const CONFIG = {
  eventTitle: 'Pernikahan Imanuella & Samuel',
  eventLocation: 'Gedung Serbaguna Melati, Surabaya',
  eventDescription: 'Kami mengundang Anda untuk hadir di hari bahagia kami.',
  durationHours: 6,
  musicVolume: 0.6,

};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const DB = {
  url: 'https://ufmxxsljrzgqgjiiqwyt.supabase.co/rest/v1',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbXh4c2xqcnpncWdqaWlxd3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NTY2MDgsImV4cCI6MjEwODQzMjYwOH0.u54TtJKS9xJYuawD9wLXoEZPgeNx55yinlfrIBTCipo',
};

async function db(table, method = 'GET', body = null, query = '') {
  const res = await fetch(`${DB.url}/${table}${query}`, {
    method,
    headers: {
      apikey: DB.key,
      Authorization: `Bearer ${DB.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.status);
  return method === 'GET' ? res.json() : null;
}

let toastTimer;
function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// nama tamu dari URL, contoh: ?to=Budi+Santoso
const guest = new URLSearchParams(location.search).get('to');
if (guest) {
  $$('[data-guest]').forEach((el) => (el.textContent = guest));
  $('#wishName').value = $('#rsvpName').value = guest;
}

// buka undangan
history.scrollRestoration = 'manual';
scrollTo(0, 0);

$('#btnOpen').addEventListener('click', () => {
  $('#cover').classList.add('is-hidden');
  document.body.classList.remove('is-locked');
  scrollTo(0, 0);
  $('.invitation').scrollTop = 0;
  playMusic();
});

// musik latar
const bgm = $('#bgm');
const btnMusic = $('#btnMusic');
let wantMusic = false;
bgm.volume = CONFIG.musicVolume;

function updateMusicBtn(playing) {
  btnMusic.classList.toggle('playing', playing);
  btnMusic.innerHTML = `<i class="bi bi-${playing ? 'pause' : 'play'}-fill"></i>`;
}

async function playMusic() {
  try {
    await bgm.play();
    wantMusic = true;
  } catch {
    wantMusic = false;
  }
  updateMusicBtn(wantMusic);
}

function pauseMusic() {
  bgm.pause();
  wantMusic = false;
  updateMusicBtn(false);
}

btnMusic.addEventListener('click', () => (bgm.paused ? playMusic() : pauseMusic()));

// musik berhenti saat tab ditinggal, lanjut saat balik
document.addEventListener('visibilitychange', () => {
  if (document.hidden) bgm.pause();
  else if (wantMusic) bgm.play().catch(() => {});
});

// countdown
const target = new Date($('#save-date').dataset.date);

function updateCountdown() {
  const diff = Math.max(0, target - Date.now());
  const parts = {
    cdDays: diff / 86400000,
    cdHours: (diff % 86400000) / 3600000,
    cdMinutes: (diff % 3600000) / 60000,
    cdSeconds: (diff % 60000) / 1000,
  };
  for (const [id, value] of Object.entries(parts)) {
    $(`#${id}`).textContent = String(Math.floor(value)).padStart(2, '0');
  }
}
updateCountdown();
setInterval(updateCountdown, 1000);

// add to calendar (Google Calendar)
const calendarDate = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
const eventEnd = new Date(target.getTime() + CONFIG.durationHours * 3600000);

$('#btnCalendar').addEventListener('click', () => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: CONFIG.eventTitle,
    dates: `${calendarDate(target)}/${calendarDate(eventEnd)}`,
    details: CONFIG.eventDescription,
    location: CONFIG.eventLocation,
  });
  window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank', 'noopener');
});

// animasi muncul saat di-scroll
const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    obs.unobserve(entry.target);
  });
}, { threshold: 0.15 });
$$('.reveal').forEach((el) => revealObserver.observe(el));

// ikon navigasi aktif sesuai section yang tampil
const navLinks = $$('#bottomNav a');
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
  });
}, { rootMargin: '-45% 0px -45% 0px' });
navLinks.forEach((link) => navObserver.observe($(link.hash)));

// rsvp
const rsvpForm = $('#rsvpForm');

rsvpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  rsvpForm.classList.add('was-validated');
  if (!rsvpForm.checkValidity()) return;

  const data = {
    nama: $('#rsvpName').value.trim(),
    jumlah: Number($('#rsvpGuests').value),
    kehadiran: $('input[name="attend"]:checked').value,
  };

  try {
    await db('rsvp', 'POST', data);
  } catch {
    return showToast('Gagal mengirim, coba lagi ya');
  }

  const alertBox = $('#rsvpAlert');
  alertBox.textContent = data.kehadiran === 'Hadir'
    ? `Terima kasih, ${data.nama}! Kehadiran Anda (${data.jumlah} orang) sudah tercatat.`
    : `Terima kasih, ${data.nama}, atas konfirmasinya. Doa terbaik untuk Anda.`;
  alertBox.classList.remove('d-none');

  rsvpForm.reset();
  rsvpForm.classList.remove('was-validated');
});

// gallery lightbox
const lightbox = new bootstrap.Modal($('#lightbox'));
const lightboxImg = $('#lightboxImg');

$$('.gallery-img').forEach((img) => {
  img.addEventListener('click', () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.show();
  });
});

// wedding gift
const giftLabel = $('#btnGift span');
$('#giftList').addEventListener('shown.bs.collapse', () => (giftLabel.textContent = 'Sembunyikan'));
$('#giftList').addEventListener('hidden.bs.collapse', () => (giftLabel.textContent = 'Kirim Hadiah'));

$$('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = $(btn.dataset.copy).textContent.trim();
    await navigator.clipboard.writeText(text);
    showToast(`Tersalin: ${text}`);
  });
});

// ucapan & doa
const wishForm = $('#wishForm');
const wishList = $('#wishList');

function timeAgo(timestamp) {
  const secs = (Date.now() - timestamp) / 1000;
  if (secs < 60) return 'baru saja';
  const [size, label] = [[86400, 'hari'], [3600, 'jam'], [60, 'menit']].find(([n]) => secs >= n);
  return `${Math.floor(secs / size)} ${label} yang lalu`;
}

async function renderWishes() {
  let wishes = [];
  try {
    wishes = await db('wishes', 'GET', null, '?select=name,message,created_at&order=created_at.desc&limit=100');
  } catch {
    wishList.textContent = 'Ucapan belum bisa dimuat.';
    return;
  }

  wishList.replaceChildren(...wishes.map((w) => {
    const item = document.createElement('article');
    item.className = 'wish-item glass shadow-none';
    item.append(...[['strong', w.name], ['p', w.message], ['time', timeAgo(Date.parse(w.created_at))]]
      .map(([tag, text]) => Object.assign(document.createElement(tag), { textContent: text })));
    return item;
  }));
  $('#wishCount').textContent = wishes.length;
}
renderWishes();

wishForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  wishForm.classList.add('was-validated');
  if (!wishForm.checkValidity()) return;

  try {
    await db('wishes', 'POST', {
      name: $('#wishName').value.trim(),
      message: $('#wishMessage').value.trim(),
    });
  } catch {
    return showToast('Gagal mengirim, coba lagi ya');
  }

  await renderWishes();
  wishList.scrollTop = 0;
  wishForm.reset();
  wishForm.classList.remove('was-validated');
  if (guest) $('#wishName').value = guest;
  showToast('Terima kasih atas ucapannya!');
});