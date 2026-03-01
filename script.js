/**
 * BFL GALLERY — script.js
 * Full gallery logic: upload, render, lightbox, filter, sort, toast, cursor
 */

'use strict';

/* =============================================
   CONSTANTS & STATE
   ============================================= */
const STORAGE_KEY = 'bflGalleryPhotos_v2';
const MAX_FILE_MB = 10;

const SAMPLE_PHOTOS = [
  { id: 9001, src: 'https://picsum.photos/seed/bfl_a/700/900', title: 'Sunrise di Pegunungan', author: 'Arif Budiman', category: 'alam',       likes: 47, timestamp: Date.now() - 120000 },
  { id: 9002, src: 'https://picsum.photos/seed/bfl_b/800/550', title: 'Jalanan Kota Malam',   author: 'Siti Rahayu',   category: 'kota',        likes: 31, timestamp: Date.now() - 3600000 },
  { id: 9003, src: 'https://picsum.photos/seed/bfl_c/550/750', title: 'Potret Sang Seniman',  author: 'Denny Pratama', category: 'manusia',     likes: 68, timestamp: Date.now() - 7200000 },
  { id: 9004, src: 'https://picsum.photos/seed/bfl_d/700/480', title: 'Gedung Tua Kolonial',  author: 'Mega Lestari',  category: 'arsitektur',  likes: 22, timestamp: Date.now() - 86400000 },
  { id: 9005, src: 'https://picsum.photos/seed/bfl_e/600/600', title: 'Mie Goreng Spesial',   author: 'Rizky Fajar',   category: 'kuliner',     likes: 55, timestamp: Date.now() - 14400000 },
  { id: 9006, src: 'https://picsum.photos/seed/bfl_f/650/900', title: 'Hutan Tropis Magis',   author: 'Layla Anggr.',  category: 'alam',        likes: 89, timestamp: Date.now() - 18000000 },
  { id: 9007, src: 'https://picsum.photos/seed/bfl_g/800/520', title: 'Pantai Barat Sunset',  author: 'Hendra Wijaya', category: 'alam',        likes: 104, timestamp: Date.now() - 900000 },
  { id: 9008, src: 'https://picsum.photos/seed/bfl_h/560/700', title: 'Momen Bahagia',        author: 'Putri Ayu',     category: 'manusia',     likes: 38, timestamp: Date.now() - 259200000 },
  { id: 9009, src: 'https://picsum.photos/seed/bfl_i/750/500', title: 'Dermaga Senja',        author: 'Bayu Setiawan', category: 'alam',        likes: 73, timestamp: Date.now() - 43200000 },
  { id: 9010, src: 'https://picsum.photos/seed/bfl_j/580/820', title: 'Street Art Gaul',      author: 'Nadia Putri',   category: 'kota',        likes: 41, timestamp: Date.now() - 5400000 },
];

let state = {
  photos: [],
  filter: 'all',
  sort: 'newest',
  lightboxIndex: -1,
  selectedFile: null,
};

/* =============================================
   LOCAL STORAGE
   ============================================= */
function loadPhotos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.photos = raw ? JSON.parse(raw) : [];
  } catch {
    state.photos = [];
  }
  if (state.photos.length === 0) {
    state.photos = [...SAMPLE_PHOTOS];
    savePhotos();
  }
}

function savePhotos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.photos));
  } catch (e) {
    Toast.show('⚠️ Storage penuh, foto lama mungkin hilang.', 'warn');
  }
}

/* =============================================
   FILTERED & SORTED PHOTO LIST
   ============================================= */
function getDisplayPhotos() {
  let list = state.filter === 'all'
    ? [...state.photos]
    : state.photos.filter(p => p.category === state.filter);

  if (state.sort === 'popular') {
    list.sort((a, b) => b.likes - a.likes);
  } else {
    list.sort((a, b) => b.timestamp - a.timestamp);
  }

  return list;
}

/* =============================================
   GALLERY RENDER
   ============================================= */
const Gallery = (() => {
  const grid = document.getElementById('masonryGrid');
  const emptyState = document.getElementById('emptyState');

  function render() {
    const photos = getDisplayPhotos();
    updateCounter();

    if (photos.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.add('show');
      return;
    }

    emptyState.classList.remove('show');

    grid.innerHTML = photos.map((photo, idx) => {
      const isNew     = (Date.now() - photo.timestamp) < 3600000 * 6;
      const isPopular = photo.likes >= 80;
      const badge     = isNew
        ? '<div class="card-badge badge-new">NEW</div>'
        : isPopular
          ? '<div class="card-badge badge-popular">🔥 HOT</div>'
          : '';

      return `
        <div class="photo-card" data-id="${photo.id}" style="animation-delay:${idx * 40}ms">
          <img src="${photo.src}" alt="${esc(photo.title)}" loading="lazy" />
          ${badge}
          <div class="card-overlay">
            <div class="card-title">${esc(photo.title)}</div>
            <div class="card-meta">by ${esc(photo.author)} · ${esc(photo.category)}</div>
            <div class="card-actions">
              <button class="card-btn like-btn ${photo.liked ? 'liked' : ''}"
                data-id="${photo.id}"
                onclick="Gallery.like(event, ${photo.id})">
                ${photo.liked ? '❤️' : '🤍'} ${photo.likes}
              </button>
              <button class="card-btn"
                onclick="Gallery.download(event, '${photo.src}', '${esc(photo.title)}')">
                ⬇️ Save
              </button>
            </div>
          </div>
        </div>`;
    }).join('');

    // Attach lightbox open on card click (not button)
    grid.querySelectorAll('.photo-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-btn')) return;
        const id = parseInt(card.dataset.id);
        Lightbox.open(id);
      });
    });
  }

  function updateCounter() {
    const el = document.getElementById('photoCounter');
    if (el) el.textContent = `${state.photos.length} FOTO`;
  }

  function like(e, id) {
    e.stopPropagation();
    const photo = state.photos.find(p => p.id === id);
    if (!photo) return;
    photo.liked = !photo.liked;
    photo.likes += photo.liked ? 1 : -1;
    savePhotos();
    render();
  }

  function download(e, src, title) {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = src;
    a.download = title + '.jpg';
    a.click();
    Toast.show('⬇️ Mengunduh foto...');
  }

  function scrollToGallery() {
    document.getElementById('gallerySection').scrollIntoView({ behavior: 'smooth' });
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return { render, updateCounter, like, download, scrollToGallery, scrollToTop };
})();

/* =============================================
   UPLOAD MODAL
   ============================================= */
const UploadModal = (() => {
  const backdrop = document.getElementById('uploadBackdrop');
  const dropZone  = document.getElementById('dropZone');
  const dropPreview = document.getElementById('dropPreview');
  const fileInput = document.getElementById('fileInput');
  const publishBtn = document.getElementById('publishBtn');
  const publishLabel = document.getElementById('publishLabel');
  const publishSpinner = document.getElementById('publishSpinner');

  function open() {
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('photoTitle').focus(), 300);
  }

  function close() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    reset();
  }

  function reset() {
    state.selectedFile = null;
    fileInput.value = '';
    dropPreview.src = '';
    dropPreview.style.display = 'none';
    dropZone.classList.remove('has-preview', 'dragover');
    document.getElementById('photoTitle').value = '';
    document.getElementById('photoAuthor').value = '';
    document.getElementById('photoCategory').value = 'alam';
    setPublishing(false);
  }

  function setPublishing(yes) {
    publishBtn.disabled = yes;
    publishLabel.style.display = yes ? 'none' : '';
    publishSpinner.classList.toggle('active', yes);
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      Toast.show('❌ Format file tidak didukung.');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      Toast.show(`❌ File terlalu besar (maks. ${MAX_FILE_MB}MB)`);
      return;
    }
    state.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      dropPreview.src = ev.target.result;
      dropPreview.style.display = 'block';
      dropZone.classList.add('has-preview');
    };
    reader.readAsDataURL(file);

    // Auto-fill title from filename
    const titleField = document.getElementById('photoTitle');
    if (!titleField.value) {
      titleField.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    }
  }

  function publish() {
    if (!state.selectedFile) {
      Toast.show('⚠️ Pilih foto terlebih dahulu!');
      dropZone.style.borderColor = '#e879f9';
      setTimeout(() => dropZone.style.borderColor = '', 2000);
      return;
    }

    const title  = (document.getElementById('photoTitle').value.trim()) || 'Tanpa Judul';
    const author = (document.getElementById('photoAuthor').value.trim()) || 'Anonim';
    const cat    = document.getElementById('photoCategory').value;

    setPublishing(true);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const photo = {
        id:        Date.now(),
        src:       ev.target.result,
        title,
        author,
        category:  cat,
        likes:     0,
        liked:     false,
        timestamp: Date.now(),
      };
      state.photos.unshift(photo);
      savePhotos();
      close();
      Gallery.render();
      Toast.show('✅ Foto berhasil dipublish!');
    };
    reader.readAsDataURL(state.selectedFile);
  }

  // Drag & drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  });

  // Backdrop click to close
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  return { open, close, publish };
})();

/* =============================================
   LIGHTBOX
   ============================================= */
const Lightbox = (() => {
  const backdrop = document.getElementById('lightboxBackdrop');
  const img       = document.getElementById('lightboxImg');
  const media     = document.getElementById('lightboxMedia');
  const infoEl    = document.getElementById('lightboxInfo');

  function open(id) {
    const displayList = getDisplayPhotos();
    const idx = displayList.findIndex(p => p.id === id);
    if (idx === -1) return;
    state.lightboxIndex = idx;
    show(displayList[idx]);
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function show(photo) {
    img.src = photo.src;
    img.alt = photo.title;
    infoEl.innerHTML = `
      <div class="lb-title">${esc(photo.title)}</div>
      <div class="lb-meta">by ${esc(photo.author)} · ${esc(photo.category)} · ❤️ ${photo.likes}</div>
    `;
    // Restart animation
    media.style.animation = 'none';
    requestAnimationFrame(() => {
      media.style.animation = '';
    });
  }

  function navigate(dir) {
    const list = getDisplayPhotos();
    state.lightboxIndex = (state.lightboxIndex + dir + list.length) % list.length;
    show(list[state.lightboxIndex]);
  }

  function close() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    state.lightboxIndex = -1;
  }

  // Backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  document.getElementById('lightboxClose').addEventListener('click', close);
  document.getElementById('lbPrev').addEventListener('click', () => navigate(-1));
  document.getElementById('lbNext').addEventListener('click', () => navigate(1));

  return { open, close, navigate };
})();

/* =============================================
   TOAST NOTIFICATIONS
   ============================================= */
const Toast = (() => {
  const container = document.getElementById('toastContainer');

  function show(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 350);
    }, 3000);
  }

  return { show };
})();

/* =============================================
   HERO FRAME — collage of first photos
   ============================================= */
function buildHeroFrame() {
  const frame = document.getElementById('heroFrame');
  if (!frame) return;

  const photos = state.photos.slice(0, 4);
  if (photos.length === 0) {
    frame.style.display = 'none';
    return;
  }

  frame.innerHTML = `<div class="frame-grid">
    ${photos.map((p, i) => `
      <div class="frame-thumb ${i === 0 ? 'tall' : ''}">
        <img src="${p.src}" alt="${esc(p.title)}" loading="lazy" />
      </div>`
    ).join('')}
  </div>`;
}

/* =============================================
   CURSOR GLOW
   ============================================= */
function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow || window.matchMedia('(hover: none)').matches) return;

  document.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
  });
}

/* =============================================
   HEADER SCROLL EFFECT
   ============================================= */
function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* =============================================
   FILTER & SORT EVENTS
   ============================================= */
function initFilters() {
  document.getElementById('filterTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    state.filter = btn.dataset.cat;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Gallery.render();
  });

  document.getElementById('sortSelect').addEventListener('change', (e) => {
    state.sort = e.target.value;
    Gallery.render();
  });
}

/* =============================================
   KEYBOARD SHORTCUTS
   ============================================= */
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('lightboxBackdrop');
    const up = document.getElementById('uploadBackdrop');

    if (lb.classList.contains('open')) {
      if (e.key === 'Escape')      Lightbox.close();
      if (e.key === 'ArrowLeft')   Lightbox.navigate(-1);
      if (e.key === 'ArrowRight')  Lightbox.navigate(1);
    } else if (up.classList.contains('open')) {
      if (e.key === 'Escape') UploadModal.close();
    } else {
      if (e.key === 'u' || e.key === 'U') UploadModal.open();
    }
  });
}

/* =============================================
   WIRE UP BUTTONS
   ============================================= */
function initButtons() {
  // Upload open
  document.getElementById('openUploadBtn').addEventListener('click', UploadModal.open);
  document.getElementById('heroUploadBtn').addEventListener('click', UploadModal.open);
  const emptyBtn = document.getElementById('emptyUploadBtn');
  if (emptyBtn) emptyBtn.addEventListener('click', UploadModal.open);

  // Upload close
  document.getElementById('closeUploadBtn').addEventListener('click', UploadModal.close);
  document.getElementById('cancelUploadBtn').addEventListener('click', UploadModal.close);

  // Publish
  document.getElementById('publishBtn').addEventListener('click', UploadModal.publish);
}

/* =============================================
   ESCAPE HTML
   ============================================= */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* =============================================
   INIT
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  loadPhotos();
  buildHeroFrame();
  Gallery.render();
  initFilters();
  initButtons();
  initKeyboard();
  initHeaderScroll();
  initCursorGlow();

  // Tip toast
  setTimeout(() => Toast.show('💡 Tekan "U" untuk upload foto cepat!'), 2000);
});
