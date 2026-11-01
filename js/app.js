
/* =================================
   SUPABASE CONFIGURATION
================================= */

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const OWNER_UID = "YOUR_OWNER_UUID";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =================================
   ELEMENTS
================================= */

const $ = (id) => document.getElementById(id);

const loginModal = $("loginModal");
const adminPanel = $("adminPanel");
const loginForm = $("loginForm");
const projectForm = $("projectForm");
const projectGrid = $("projectGrid");
const adminProjectList = $("adminProjectList");

let currentUser = null;
let projects = [];

/* =================================
   HELPERS
================================= */

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function safeURL(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function showMessage(element, message, success = false) {
  element.textContent = message;
  element.style.color = success ? "#83c995" : "#e98b8b";
}

function resetProjectForm() {
  projectForm.reset();
  $("projectId").value = "";
  $("formTitle").textContent = "ADD NEW PROJECT";
  $("saveProject").textContent = "SAVE PROJECT";
  $("projectMessage").textContent = "";
}

/* =================================
   PROJECT DISPLAY
================================= */

async function loadProjects() {
  projectGrid.innerHTML = '<p class="loading-text">Loading projects...</p>';

  const { data, error } = await supabaseClient
    .from("projects")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    projectGrid.innerHTML =
      '<p class="loading-text">Unable to load projects. Check database configuration.</p>';
    console.error(error);
    return;
  }

  projects = data || [];
  renderProjects();
  renderAdminProjects();
}

function renderProjects() {
  if (!projects.length) {
    projectGrid.innerHTML =
      '<p class="loading-text">No projects published yet.</p>';
    return;
  }

  projectGrid.innerHTML = projects.map((project, index) => {
    const link = safeURL(project.link);
    const title = escapeHTML(project.title);
    const description = escapeHTML(project.description);
    const category = escapeHTML(project.category);
    const tech = escapeHTML(project.tech);

    return `
      <article class="project-card">
        <div>
          <div class="project-top">
            <span>${String(index + 1).padStart(2, "0")} / PROJECT</span>
            <span>${category}</span>
          </div>

          <h3>${title}</h3>
          <p>${description}</p>
          <div class="project-tech">${tech}</div>
        </div>

        <div class="project-bottom">
          <span class="project-featured">
            ${project.featured ? "★ FEATURED" : "PERSONAL PROJECT"}
          </span>

          ${
            link
              ? `<a href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">VIEW PROJECT ↗</a>`
              : `<span class="mono">IN DEVELOPMENT</span>`
          }
        </div>
      </article>
    `;
  }).join("");
}

/* =================================
   AUTHENTICATION
================================= */

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    return null;
  }

  return data.session;
}

async function openOwnerAccess() {
  const session = await getSession();

  if (!session) {
    loginModal.classList.add("show");
    return;
  }

  if (session.user.id !== OWNER_UID) {
    await supabaseClient.auth.signOut();
    loginModal.classList.add("show");
    return;
  }

  currentUser = session.user;
  openAdmin();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  const message = $("loginMessage");
  const submitButton = loginForm.querySelector("button[type='submit']");

  submitButton.disabled = true;
  submitButton.textContent = "AUTHENTICATING...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  submitButton.disabled = false;
  submitButton.textContent = "SIGN IN ↗";

  if (error) {
    showMessage(message, "Login gagal. Periksa email dan password.");
    return;
  }

  if (data.user.id !== OWNER_UID) {
    await supabaseClient.auth.signOut();
    showMessage(message, "Akun ini tidak memiliki akses owner.");
    return;
  }

  currentUser = data.user;
  message.textContent = "";
  loginForm.reset();
  loginModal.classList.remove("show");
  openAdmin();
});

function openAdmin() {
  $("adminUser").textContent =
    currentUser?.email || "OWNER MODE";

  adminPanel.classList.add("show");
  loadProjects();
}

async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert("Logout gagal: " + error.message);
    return;
  }

  currentUser = null;
  adminPanel.classList.remove("show");
  loginModal.classList.remove("show");
}

/* =================================
   CREATE / UPDATE PROJECT
================================= */

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser || currentUser.id !== OWNER_UID) {
    showMessage($("projectMessage"), "Unauthorized.");
    return;
  }

  const id = $("projectId").value;

  const payload = {
    title: $("projectTitle").value.trim(),
    description: $("projectDescription").value.trim(),
    category: $("projectCategory").value.trim() || "Web Development",
    tech: $("projectTech").value.trim(),
    link: safeURL($("projectLink").value.trim()) || null,
    image: safeURL($("projectImage").value.trim()) || null,
    featured: $("projectFeatured").checked,
    updated_at: new Date().toISOString()
  };

  if (!payload.title || !payload.description) {
    showMessage($("projectMessage"), "Nama dan deskripsi wajib diisi.");
    return;
  }

  const saveButton = $("saveProject");
  saveButton.disabled = true;
  saveButton.textContent = "SAVING...";

  let result;

  if (id) {
    result = await supabaseClient
      .from("projects")
      .update(payload)
      .eq("id", id)
      .select();
  } else {
    result = await supabaseClient
      .from("projects")
      .insert(payload)
      .select();
  }

  saveButton.disabled = false;
  saveButton.textContent = id ? "UPDATE PROJECT" : "SAVE PROJECT";

  if (result.error) {
    showMessage($("projectMessage"), result.error.message);
    return;
  }

  showMessage(
    $("projectMessage"),
    id ? "Project berhasil diperbarui." : "Project berhasil ditambahkan.",
    true
  );

  resetProjectForm();
  await loadProjects();
});

/* =================================
   EDIT PROJECT
================================= */

function editProject(id) {
  if (!currentUser || currentUser.id !== OWNER_UID) return;

  const project = projects.find(item => String(item.id) === String(id));

  if (!project) return;

  $("projectId").value = project.id;
  $("projectTitle").value = project.title || "";
  $("projectDescription").value = project.description || "";
  $("projectCategory").value = project.category || "";
  $("projectTech").value = project.tech || "";
  $("projectLink").value = project.link || "";
  $("projectImage").value = project.image || "";
  $("projectFeatured").checked = Boolean(project.featured);

  $("formTitle").textContent = "EDIT PROJECT";
  $("saveProject").textContent = "UPDATE PROJECT";

  $("projectForm").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

/* =================================
   DELETE PROJECT
================================= */

async function deleteProject(id) {
  if (!currentUser || currentUser.id !== OWNER_UID) return;

  const confirmed = confirm(
    "Yakin ingin menghapus project ini?"
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus: " + error.message);
    return;
  }

  await loadProjects();
}

/* =================================
   ADMIN PROJECT LIST
================================= */

function renderAdminProjects() {
  if (!currentUser || currentUser.id !== OWNER_UID) {
    adminProjectList.innerHTML = "";
    return;
  }

  if (!projects.length) {
    adminProjectList.innerHTML =
      '<p class="loading-text">Belum ada project.</p>';
    return;
  }

  adminProjectList.innerHTML = projects.map(project => `
    <div class="admin-project">
      <div>
        <h4>${escapeHTML(project.title)}</h4>
        <small>${escapeHTML(project.category)}</small>
      </div>

      <div class="admin-actions">
        <button type="button" data-edit="${project.id}">EDIT</button>
        <button type="button" class="delete-btn" data-delete="${project.id}">
          DELETE
        </button>
      </div>
    </div>
  `).join("");
}

adminProjectList.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    editProject(editButton.dataset.edit);
  }

  if (deleteButton) {
    deleteProject(deleteButton.dataset.delete);
  }
});

/* =================================
   UI EVENTS
================================= */

$("ownerBtn").addEventListener("click", openOwnerAccess);

$("closeLogin").addEventListener("click", () => {
  loginModal.classList.remove("show");
});

$("closeAdmin").addEventListener("click", () => {
  adminPanel.classList.remove("show");
});

$("logoutBtn").addEventListener("click", logout);

$("cancelEdit").addEventListener("click", resetProjectForm);

$("menuBtn").addEventListener("click", () => {
  $("navMenu").classList.toggle("open");
});

document.querySelectorAll("#navMenu a").forEach(link => {
  link.addEventListener("click", () => {
    $("navMenu").classList.remove("open");
  });
});

loginModal.addEventListener("click", (event) => {
  if (event.target === loginModal) {
    loginModal.classList.remove("show");
  }
});

adminPanel.addEventListener("click", (event) => {
  if (event.target === adminPanel) {
    adminPanel.classList.remove("show");
  }
});

/* =================================
   AUTH STATE
================================= */

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (!session) {
    currentUser = null;
    adminPanel.classList.remove("show");
    return;
  }

  if (session.user.id === OWNER_UID) {
    currentUser = session.user;
  } else {
    currentUser = null;
    adminPanel.classList.remove("show");

    if (event === "SIGNED_IN") {
      supabaseClient.auth.signOut();
    }
  }
});

/* =================================
   INITIALIZE
================================= */

loadProjects();
