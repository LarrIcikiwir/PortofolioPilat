
/* =====================================================
   PILAR REHAN S.T. — PORTOFOLIO
   JavaScript + Supabase
===================================================== */


/* =====================================================
   01. KONFIGURASI
===================================================== */

const SUPABASE_URL = "https://mqqgleosncngwmxjjoit.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_mj6sYgtaX9gvgI5I6xCz6g_u2G9MnLH";

const OWNER_UID = "3be8b6b2-f81b-41e9-b2f1-3d4cba14bf41";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =====================================================
   02. ELEMENT HTML
===================================================== */

const $ = id => document.getElementById(id);

const loginModal = $("loginModal");
const adminPanel = $("adminPanel");

const loginForm = $("loginForm");
const projectForm = $("projectForm");

const projectGrid = $("projectGrid");
const adminProjectList = $("adminProjectList");

let projects = [];
let currentUser = null;


/* =====================================================
   03. UTILITAS
===================================================== */

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}


function safeURL(value) {
  if (!value) return "";

  try {
    const url = new URL(value);

    if (
      url.protocol === "https:" ||
      url.protocol === "http:"
    ) {
      return url.href;
    }
  } catch (error) {
    return "";
  }

  return "";
}


function showMessage(element, message, success = false) {
  if (!element) return;

  element.textContent = message;

  element.style.color = success
    ? "#83c995"
    : "#d94848";
}


function setLoading(button, loading, text) {
  if (!button) return;

  button.disabled = loading;

  button.textContent = loading
    ? "MEMPROSES..."
    : text;
}


function isOwner(user) {
  return Boolean(user && user.id === OWNER_UID);
}


/* =====================================================
   04. ANIMASI SCROLL
===================================================== */

function initReveal() {
  const elements = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    elements.forEach(element => {
      element.classList.add("show");
    });

    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -40px 0px"
  });

  elements.forEach(element => {
    observer.observe(element);
  });
}


/* =====================================================
   05. PEMERIKSAAN GAMBAR
===================================================== */

function initImages() {
  document.querySelectorAll(".image-box img").forEach(img => {
    const wrapper = img.parentElement;

    function imageFailed() {
      wrapper.classList.add("image-missing");
    }

    img.addEventListener("error", imageFailed);

    if (img.complete && img.naturalWidth === 0) {
      imageFailed();
    }
  });
}


/* =====================================================
   06. PAGE LOADER
===================================================== */

window.addEventListener("load", () => {
  const loader = $("pageLoader");

  if (loader) {
    loader.classList.add("done");
  }
});


/* =====================================================
   07. NAVIGASI MOBILE
===================================================== */

const menuBtn = $("menuBtn");
const navMenu = $("navMenu");

if (menuBtn && navMenu) {
  menuBtn.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });

  navMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
    });
  });
}


/* =====================================================
   08. MODAL
===================================================== */

function openModal(element) {
  if (!element) return;

  element.classList.add("active");
  document.body.style.overflow = "hidden";
}


function closeModal(element) {
  if (!element) return;

  element.classList.remove("active");

  const anotherModal = document.querySelector(
    ".modal-backdrop.active, .admin-backdrop.active"
  );

  if (!anotherModal) {
    document.body.style.overflow = "";
  }
}


if ($("closeLogin")) {
  $("closeLogin").addEventListener("click", () => {
    closeModal(loginModal);
  });
}


if ($("closeAdmin")) {
  $("closeAdmin").addEventListener("click", () => {
    closeModal(adminPanel);
  });
}


if (loginModal) {
  loginModal.addEventListener("click", event => {
    if (event.target === loginModal) {
      closeModal(loginModal);
    }
  });
}


if (adminPanel) {
  adminPanel.addEventListener("click", event => {
    if (event.target === adminPanel) {
      closeModal(adminPanel);
    }
  });
}


/* =====================================================
   09. TOMBOL AKSES PEMILIK
===================================================== */

if ($("ownerBtn")) {
  $("ownerBtn").addEventListener("click", async () => {
    const { data, error } = await db.auth.getUser();

    if (error) {
      console.error(error);
    }

    const user = data?.user;

    if (isOwner(user)) {
      openModal(adminPanel);
      await loadProjects();
    } else {
      openModal(loginModal);
    }
  });
}


/* =====================================================
   10. LOGIN PEMILIK
===================================================== */

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const button = loginForm.querySelector(
      'button[type="submit"]'
    );

    const originalText = "MASUK ↗";

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    showMessage($("loginMessage"), "");

    setLoading(button, true, originalText);

    try {
      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (!isOwner(data.user)) {
        await db.auth.signOut();

        throw new Error(
          "Akun ini tidak memiliki akses pemilik."
        );
      }

      currentUser = data.user;

      loginForm.reset();

      closeModal(loginModal);
      openModal(adminPanel);

      await loadProjects();

    } catch (error) {
      showMessage(
        $("loginMessage"),
        error.message
      );

    } finally {
      setLoading(button, false, originalText);
    }
  });
}


/* =====================================================
   11. MENGAMBIL DATA PROYEK
===================================================== */

async function loadProjects() {
  if (!projectGrid) return;

  projectGrid.innerHTML = `
    <p class="loading-text">
      MEMUAT PROYEK...
    </p>
  `;

  try {
    const { data, error } = await db
      .from("projects")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    projects = data || [];

    renderProjects();
    renderAdminProjects();

  } catch (error) {
    console.error("Gagal mengambil proyek:", error);

    projectGrid.innerHTML = `
      <p class="loading-text">
        GAGAL MEMUAT PROYEK. PERIKSA KONEKSI DATABASE.
      </p>
    `;
  }
}


/* =====================================================
   12. MENAMPILKAN PROYEK
===================================================== */

function renderProjects() {
  if (!projectGrid) return;

  if (projects.length === 0) {
    projectGrid.innerHTML = `
      <p class="loading-text">
        BELUM ADA PROYEK YANG DITAMPILKAN.
      </p>
    `;

    return;
  }

  projectGrid.innerHTML = projects.map((project, index) => {
    const link = safeURL(project.link);

    return `
      <article class="project-card reveal show">

        <div>
          <div class="project-top">
            <span>
              ${String(index + 1).padStart(2, "0")}
              / ${escapeHTML(project.category)}
            </span>

            <span>
              ${project.featured ? "FEATURED" : "PROJECT"}
            </span>
          </div>

          <h3>
            ${escapeHTML(project.title)}
          </h3>

          <p>
            ${escapeHTML(project.description)}
          </p>

          <div class="project-tech">
            ${escapeHTML(project.tech || "PROYEK DIGITAL")}
          </div>
        </div>

        <div class="project-bottom">

          <span class="project-featured">
            ${project.featured
              ? "★ PROYEK UNGGULAN"
              : "ARSIP PROYEK"}
          </span>

          ${
            link
              ? `
                <a
                  href="${escapeHTML(link)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  BUKA PROYEK ↗
                </a>
              `
              : `
                <span class="mono">
                  BELUM ADA TAUTAN
                </span>
              `
          }

        </div>

      </article>
    `;
  }).join("");
}


/* =====================================================
   13. DAFTAR PROYEK ADMIN
===================================================== */

function renderAdminProjects() {
  if (!adminProjectList) return;

  if (projects.length === 0) {
    adminProjectList.innerHTML = `
      <p class="loading-text">
        BELUM ADA PROYEK.
      </p>
    `;

    return;
  }

  adminProjectList.innerHTML = projects.map(project => `
    <div class="admin-project">

      <div>
        <strong>
          ${escapeHTML(project.title)}
        </strong>

        <p>
          ${escapeHTML(project.category)}
        </p>
      </div>

      <div class="admin-project-actions">

        <button
          type="button"
          data-edit="${project.id}"
        >
          UBAH
        </button>

        <button
          type="button"
          data-delete="${project.id}"
        >
          HAPUS
        </button>

      </div>

    </div>
  `).join("");
}


/* =====================================================
   14. RESET FORM PROYEK
===================================================== */

function resetProjectForm() {
  if (!projectForm) return;

  projectForm.reset();

  $("projectId").value = "";

  $("formTitle").textContent = "TAMBAH PROYEK";

  $("saveProject").textContent = "SIMPAN PROYEK";

  showMessage($("projectMessage"), "");
}


if ($("cancelEdit")) {
  $("cancelEdit").addEventListener("click", resetProjectForm);
}


/* =====================================================
   15. MENYIMPAN PROYEK
===================================================== */

if (projectForm) {
  projectForm.addEventListener("submit", async event => {
    event.preventDefault();

    const button = $("saveProject");
    const editingId = $("projectId").value;

    const originalText = editingId
      ? "SIMPAN PERUBAHAN"
      : "SIMPAN PROYEK";

    const payload = {
      title: $("projectTitle").value.trim(),

      description: $("projectDescription").value.trim(),

      category:
        $("projectCategory").value.trim() ||
        "Pengembangan Web",

      tech: $("projectTech").value.trim(),

      link: safeURL($("projectLink").value),

      image: safeURL($("projectImage").value),

      featured: $("projectFeatured").checked,

      updated_at: new Date().toISOString()
    };

    showMessage($("projectMessage"), "");

    if (!payload.title || !payload.description) {
      showMessage(
        $("projectMessage"),
        "Nama dan deskripsi proyek wajib diisi."
      );

      return;
    }

    setLoading(button, true, originalText);

    try {
      const { data: { user }, error: authError } =
        await db.auth.getUser();

      if (authError) throw authError;

      if (!isOwner(user)) {
        throw new Error(
          "Sesi pemilik tidak valid. Silakan login kembali."
        );
      }

      let result;

      if (editingId) {
        result = await db
          .from("projects")
          .update(payload)
          .eq("id", editingId);

      } else {
        result = await db
          .from("projects")
          .insert(payload);
      }

      if (result.error) {
        throw result.error;
      }

      showMessage(
        $("projectMessage"),
        editingId
          ? "PROYEK BERHASIL DIPERBARUI."
          : "PROYEK BERHASIL DITAMBAHKAN.",
        true
      );

      resetProjectForm();

      await loadProjects();

    } catch (error) {
      console.error(error);

      showMessage(
        $("projectMessage"),
        error.message
      );

    } finally {
      button.disabled = false;
      button.textContent = "SIMPAN PROYEK";
    }
  });
}


/* =====================================================
   16. EDIT DAN HAPUS PROYEK
===================================================== */

if (adminProjectList) {
  adminProjectList.addEventListener("click", async event => {

    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    /* EDIT */

    if (editId) {
      const project = projects.find(
        item => String(item.id) === editId
      );

      if (!project) return;

      $("projectId").value = project.id;

      $("projectTitle").value = project.title || "";

      $("projectDescription").value =
        project.description || "";

      $("projectCategory").value =
        project.category || "";

      $("projectTech").value =
        project.tech || "";

      $("projectLink").value =
        project.link || "";

      $("projectImage").value =
        project.image || "";

      $("projectFeatured").checked =
        Boolean(project.featured);

      $("formTitle").textContent = "UBAH PROYEK";

      $("saveProject").textContent = "SIMPAN PERUBAHAN";

      $("projectForm").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }


    /* HAPUS */

    if (deleteId) {
      const project = projects.find(
        item => String(item.id) === deleteId
      );

      if (!project) return;

      const confirmed = confirm(
        `Yakin ingin menghapus "${project.title}"?`
      );

      if (!confirmed) return;

      try {
        const { data: { user }, error: authError } =
          await db.auth.getUser();

        if (authError) throw authError;

        if (!isOwner(user)) {
          throw new Error("Akses ditolak.");
        }

        const { error } = await db
          .from("projects")
          .delete()
          .eq("id", deleteId);

        if (error) throw error;

        await loadProjects();

        resetProjectForm();

      } catch (error) {
        alert("Gagal menghapus proyek: " + error.message);
      }
    }

  });
}


/* =====================================================
   17. LOGOUT
===================================================== */

if ($("logoutBtn")) {
  $("logoutBtn").addEventListener("click", async () => {
    const confirmed = confirm(
      "Yakin ingin keluar dari panel pemilik?"
    );

    if (!confirmed) return;

    const { error } = await db.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    currentUser = null;

    closeModal(adminPanel);

    resetProjectForm();

    renderAdminProjects();
  });
}


/* =====================================================
   18. PEMERIKSAAN SESSION
===================================================== */

db.auth.onAuthStateChange((event, session) => {
  const user = session?.user || null;

  currentUser = isOwner(user) ? user : null;

  if (user && !isOwner(user)) {
    db.auth.signOut();
  }
});


/* =====================================================
   19. INISIALISASI
===================================================== */

async function initApp() {
  initReveal();
  initImages();

  const { data, error } = await db.auth.getUser();

  if (!error && isOwner(data.user)) {
    currentUser = data.user;
  }

  await loadProjects();
}

initApp();
