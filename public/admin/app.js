const state = {
  token: localStorage.getItem("adminToken") || "",
  selectedNotificationUser: null,
  data: {
    categories: [],
    products: [],
    appUsers: [],
    earnings: [],
    notifications: [],
    stories: [],
    banners: [],
  },
  user: JSON.parse(localStorage.getItem("adminUser") || "{}"),
};
const selectedNotificationIds = new Set();

const API_BASE = (() => {
  const saved = localStorage.getItem("adminApiBaseUrl");
  if (saved) return saved.replace(/\/+$/, "");

  if (typeof window !== "undefined" && /^https?:/i.test(window.location.origin)) {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "http://localhost:5000";
})();

// Initialize UI Elements on load
window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
  
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  // Handle nav link activation
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section-view');
  const pageTitle = document.getElementById('pageTitle');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').replace('#', '');
      
      // Update links
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update sections
      sections.forEach(s => s.classList.remove('active'));
      const targetSection = document.getElementById(`${targetId}Section`) || document.getElementById('overviewSection');
      if (targetSection) targetSection.classList.add('active');

      // Update title
      if (pageTitle) {
        pageTitle.textContent = link.textContent.trim();
      }

      // Pre-fill profile if section is profile
      if (targetId === 'profile') {
        document.getElementById('profileName').value = state.user.name || '';
        document.getElementById('profileEmail').value = state.user.email || '';
      }

      // Re-init icons
      if (window.lucide) window.lucide.createIcons();
    });
  });

  setupModals();

  const productLogoPreset = document.getElementById("productLogoPreset");
  if (productLogoPreset) {
    productLogoPreset.addEventListener("change", (event) => {
      const selected = event.target.value;
      const customWrap = document.getElementById("productLogoCustomWrap");
      if (!customWrap) return;

      if (selected === "custom") {
        customWrap.classList.remove("hidden");
      } else {
        customWrap.classList.add("hidden");
        document.getElementById("productLogoCustom").value = "";
      }
    });
  }

  const deleteSelectedBtn = document.getElementById("deleteSelectedNotificationsBtn");
  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener("click", deleteSelectedNotifications);
  }
});

const loginSection = document.getElementById("loginSection");
const panelSection = document.getElementById("panelSection");
const logoutBtn = document.getElementById("logoutBtn");
const appShell = document.querySelector(".app-shell");
const MODAL_IDS = [
  "categoryModal",
  "productModal",
  "earningModal",
  "notificationModal",
  "storyModal",
  "userNotificationModal",
  "bannerModal",
];

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("hidden");
  const hasOpenModal = MODAL_IDS.some((id) => {
    const candidate = document.getElementById(id);
    return candidate && !candidate.classList.contains("hidden");
  });
  if (!hasOpenModal) {
    document.body.classList.remove("modal-open");
  }
}

function closeAllModals() {
  MODAL_IDS.forEach((id) => closeModal(id));
}

function setLoggedOutLayout(isLoggedOut) {
  if (!appShell) return;
  if (isLoggedOut) {
    appShell.classList.add("logged-out");
  } else {
    appShell.classList.remove("logged-out");
  }
}

function setupModals() {
  document.querySelectorAll(".open-modal-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-target");
      if (target) openModal(target);
    });
  });

  document.querySelectorAll(".modal-close").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-target");
      if (target) closeModal(target);
    });
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllModals();
  });
}

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error(
      `Backend unreachable. Open admin from ${API_BASE}/admin and ensure server is running.`
    );
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || "Request failed");
  }
  return json.data;
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function renderProductCategoryOptions(categories) {
  const select = document.getElementById("productCategorySlug");
  if (!select) return;
  const currentValue = select.value;

  const options = [`<option value="">Select Category</option>`]
    .concat(
      (categories || []).map(
        (category) => `<option value="${category.slug}">${category.title} (${category.slug})</option>`
      )
    )
    .join("");

  select.innerHTML = options;
  if (currentValue && (categories || []).some((c) => c.slug === currentValue)) {
    select.value = currentValue;
  }
}

function getCommissionText() {
  const type = document.getElementById("productCommissionType").value;
  const rawValue = Number(document.getElementById("productCommissionValue").value);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    throw new Error("Commission value must be a valid positive number.");
  }

  if (type === "percentage") {
    return `${rawValue}% of Loan Amount`;
  }

  return `INR ${rawValue}`;
}

function getProductLogoValue() {
  const preset = document.getElementById("productLogoPreset").value;
  if (preset !== "custom") return preset;

  const customIcon = document.getElementById("productLogoCustom").value.trim();
  if (!customIcon) {
    throw new Error("Please provide custom icon name.");
  }
  return customIcon;
}

function updateNotificationBulkActionButton() {
  const button = document.getElementById("deleteSelectedNotificationsBtn");
  if (!button) return;
  const count = selectedNotificationIds.size;
  button.disabled = count === 0;
  button.textContent = `Delete Selected (${count})`;
}

function syncNotificationSelection(notifications) {
  const validIds = new Set((notifications || []).map((n) => String(n._id)));
  Array.from(selectedNotificationIds).forEach((id) => {
    if (!validIds.has(String(id))) {
      selectedNotificationIds.delete(id);
    }
  });
  updateNotificationBulkActionButton();
}

function handleSelectAllNotifications(checked) {
  if (checked) {
    (state.data.notifications || []).forEach((item) => {
      if (item?._id) selectedNotificationIds.add(String(item._id));
    });
  } else {
    selectedNotificationIds.clear();
  }
  renderNotificationsTable(state.data.notifications || []);
}

function handleNotificationSelection(id, checked) {
  if (!id) return;
  if (checked) {
    selectedNotificationIds.add(String(id));
  } else {
    selectedNotificationIds.delete(String(id));
  }
  updateNotificationBulkActionButton();
  const allIds = (state.data.notifications || []).map((item) => String(item._id));
  const allChecked = allIds.length > 0 && allIds.every((itemId) => selectedNotificationIds.has(itemId));
  const selectAll = document.getElementById("selectAllNotifications");
  if (selectAll) {
    selectAll.checked = allChecked;
  }
}

function renderAppUsersTable(users) {
  const container = document.getElementById("appUsersTableWrap");
  if (!users.length) {
    container.innerHTML = `<p class="muted">No app users found.</p>`;
    return;
  }

  const rows = users
    .map((user, index) => {
      const actionButton = user.isActive
        ? `<button class="btn btn-warning" onclick="toggleAppUserStatus('${user._id}', false)">Block</button>`
        : `<button class="btn btn-success" onclick="toggleAppUserStatus('${user._id}', true)">Unblock</button>`;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${user.name || "User"}</td>
          <td>${user.phone || "-"}</td>
          <td>${user.city || "-"}</td>
          <td>${user.locationPermissionGranted === true ? "Allowed" : user.locationPermissionGranted === false ? "Denied" : "Pending"}</td>
          <td><span class="badge ${user.isActive ? "success" : "muted"}">${user.isActive ? "Active" : "Blocked"}</span></td>
          <td>${user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}</td>
          <td>
            <div class="table-actions">
              ${actionButton}
              <button class="btn btn-primary" onclick="openUserNotificationModal('${user._id}', '${encodeURIComponent(
                user.name || "User"
              )}')">Notify</button>
              <button class="btn btn-danger" onclick="deleteAppUser('${user._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table class="app-users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Phone</th>
            <th>City</th>
            <th>Location Permission</th>
            <th>Status</th>
            <th>Joined At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderProductsTable(products) {
  const container = document.getElementById("productsList");
  if (!products.length) {
    container.innerHTML = `<p class="muted">No products found.</p>`;
    return;
  }

  const rows = products
    .map((product, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${product.name || "-"}</td>
          <td>${product.productCode || "-"}</td>
          <td>${product.categorySlug || "-"}</td>
          <td>${product.commission || "-"}</td>
          <td>${product.isActive ? "Active" : "Inactive"}</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-danger" onclick="deleteProduct('${product._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table class="app-users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Product Code</th>
            <th>Category</th>
            <th>Commission</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderNotificationsTable(notifications) {
  const container = document.getElementById("notificationsList");
  if (!notifications.length) {
    selectedNotificationIds.clear();
    updateNotificationBulkActionButton();
    container.innerHTML = `<p class="muted">No notifications found.</p>`;
    return;
  }

  const allIds = notifications.map((item) => String(item._id));
  const allChecked = allIds.length > 0 && allIds.every((id) => selectedNotificationIds.has(id));

  const rows = notifications
    .map((item, index) => {
      const isChecked = selectedNotificationIds.has(String(item._id));
      return `
        <tr>
          <td><input type="checkbox" ${isChecked ? "checked" : ""} onchange="handleNotificationSelection('${item._id}', this.checked)" /></td>
          <td>${index + 1}</td>
          <td>${item.title || "-"}</td>
          <td>${item.message || "-"}</td>
          <td>${item.type || "-"}</td>
          <td>${item.time || "-"}</td>
          <td>${
            Array.isArray(item.recipientUsers) && item.recipientUsers.length
              ? item.recipientUsers
                  .map((user) => `${user.name || "User"} (${user.phone || "-"})`)
                  .join(", ")
              : "All Users"
          }</td>
          <td>
            <div class="table-actions">
              <button class="btn btn-danger" onclick="deleteNotification('${item._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table class="app-users-table">
        <thead>
          <tr>
            <th><input id="selectAllNotifications" type="checkbox" ${allChecked ? "checked" : ""} onchange="handleSelectAllNotifications(this.checked)" /></th>
            <th>#</th>
            <th>Title</th>
            <th>Message</th>
            <th>Type</th>
            <th>Time</th>
            <th>Target</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
  updateNotificationBulkActionButton();
}

function renderEarningsTable(earnings) {
  const container = document.getElementById("earningsList");
  if (!earnings.length) {
    container.innerHTML = `<p class="muted">No earnings found.</p>`;
    return;
  }

  const rows = earnings
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.title || "-"}</td>
        <td>${item.userId?.name || "-"}</td>
        <td>${item.userId?.phone || "-"}</td>
        <td>${item.customerName || "-"}</td>
        <td>${item.customerPhone || "-"}</td>
        <td>${item.productName || item.productCode || "-"}</td>
        <td>${item.source || "-"}</td>
        <td>${item.paymentMethod || "-"}</td>
        <td>${
          item.paymentMethod === "upi"
            ? item.upiId || "-"
            : item.paymentMethod === "bank"
              ? `${item.bankAccountName || "-"} | ${item.bankAccountNumber || "-"} | ${item.bankIfsc || "-"}`
              : "-"
        }</td>
        <td>${item.amount ?? 0}</td>
        <td>${item.type || "-"}</td>
        <td><span class="badge ${
          item.status === "approved"
            ? "success"
            : item.status === "rejected"
              ? "muted"
              : "warning"
        }">${item.status || "approved"}</span></td>
        <td>${item.dateLabel || "-"}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-success" onclick="verifyEarning('${item._id}', 'approved')">Approve</button>
            <button class="btn btn-warning" onclick="verifyEarning('${item._id}', 'rejected')">Reject</button>
            <button class="btn btn-danger" onclick="deleteEarning('${item._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table class="app-users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Referred By</th>
            <th>User Phone</th>
            <th>Customer</th>
            <th>Customer Phone</th>
            <th>Product</th>
            <th>Source</th>
            <th>Payout Mode</th>
            <th>Payout Details</th>
            <th>Amount</th>
            <th>Type</th>
            <th>Status</th>
            <th>Date Label</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderStoriesTable(stories) {
  const container = document.getElementById("storiesList");
  if (!stories.length) {
    container.innerHTML = `<p class="muted">No stories found.</p>`;
    return;
  }

  const rows = stories
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name || "-"}</td>
        <td>${item.location || "-"}</td>
        <td>${item.quote || "-"}</td>
        <td>${item.color || "-"}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-danger" onclick="deleteStory('${item._id}')">Delete</button>
          </div>
        </td>
      </tr>
    `)
    .join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table class="app-users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Location</th>
            <th>Quote</th>
            <th>Color</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function resetBannerForm() {
  document.getElementById("bannerId").value = "";
  document.getElementById("bannerTitle").value = "";
  document.getElementById("bannerImageUrl").value = "";
  document.getElementById("bannerSortOrder").value = "1";
  document.getElementById("bannerIsActive").value = "true";
  document.getElementById("bannerModalTitle").textContent = "Add Banner";
  document.getElementById("bannerSubmitBtn").textContent = "Save Banner";
}

function openEditBannerModal(encodedBanner) {
  try {
    const banner = JSON.parse(decodeURIComponent(encodedBanner || ""));
    if (!banner?._id) return;

    document.getElementById("bannerId").value = banner._id;
    document.getElementById("bannerTitle").value = banner.title || "";
    document.getElementById("bannerImageUrl").value = banner.imageUrl || "";
    document.getElementById("bannerSortOrder").value = Number.isFinite(Number(banner.sortOrder))
      ? String(banner.sortOrder)
      : "1";
    document.getElementById("bannerIsActive").value = banner.isActive === false ? "false" : "true";
    document.getElementById("bannerModalTitle").textContent = "Edit Banner";
    document.getElementById("bannerSubmitBtn").textContent = "Update Banner";
    openModal("bannerModal");
  } catch (error) {
    alert("Unable to open banner editor.");
  }
}

function renderBannersTable(banners) {
  const container = document.getElementById("bannersList");
  if (!banners.length) {
    container.innerHTML = `<p class="muted">No banners found.</p>`;
    return;
  }

  const rows = banners
    .map((item, index) => {
      const payload = encodeURIComponent(
        JSON.stringify({
          _id: item._id,
          title: item.title || "",
          imageUrl: item.imageUrl || "",
          sortOrder: item.sortOrder || 1,
          isActive: item.isActive !== false,
        })
      );

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${item.imageUrl || ""}" alt="Banner" style="width:72px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #E2E8F0;background:#F8FAFC;" onerror="this.style.display='none'" />
              <span>${item.title || "Untitled Banner"}</span>
            </div>
          </td>
          <td style="word-break:break-all;max-width:280px;">${item.imageUrl || "-"}</td>
          <td>${item.sortOrder ?? 1}</td>
          <td><span class="badge ${item.isActive ? "success" : "muted"}">${item.isActive ? "Active" : "Inactive"}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-warning" onclick="openEditBannerModal('${payload}')">Edit</button>
              <button class="btn btn-danger" onclick="deleteBanner('${item._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table class="app-users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Preview</th>
            <th>Image URL</th>
            <th>Sort</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderCategoriesTable(categories) {
  const container = document.getElementById("categoriesList");
  if (!categories.length) {
    container.innerHTML = `<p class="muted">No categories found.</p>`;
    return;
  }

  const rows = categories
    .map((item, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.title || "-"}</td>
          <td>${item.slug || "-"}</td>
          <td>${item.icon || "-"}</td>
          <td>${item.color || "-"}</td>
          <td><span class="badge ${item.isActive ? "success" : "muted"}">${item.isActive ? "Active" : "Inactive"}</span></td>
          <td>
            <div class="table-actions">
              <button class="btn btn-danger" onclick="deleteCategory('${item._id}')">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="table-wrap">
      <table class="app-users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Slug</th>
            <th>Icon</th>
            <th>Color</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderList(containerId, items, kind) {
  const container = document.getElementById(containerId);
  if (!items.length) {
    container.innerHTML = `<p class="muted">No ${kind} found.</p>`;
    return;
  }

  container.innerHTML = items
    .map((item) => {
      if (kind === "categories") {
        return `<div class="list-item">
          <div>
            <h4>${item.title}</h4>
            <p><strong>Slug:</strong> ${item.slug}</p>
            <p><strong>Icon:</strong> ${item.icon} | <strong>Color:</strong> ${item.color}</p>
            <p><span class="badge ${item.isActive ? 'success' : 'muted'}">${item.isActive ? "Active" : "Inactive"}</span></p>
          </div>
          <button class="btn btn-danger" onclick="deleteCategory('${item._id}')">
            <i data-lucide="trash-2"></i>
          </button>
        </div>`;
      }

      if (kind === "earnings") {
        return `<div class="list-item">
          <div>
            <h4>${item.title}</h4>
            <p>${item.dateLabel} | <span class="badge">${item.type}</span></p>
            <p class="stat-value" style="font-size: 1.1rem">₹ ${item.amount}</p>
          </div>
          <button class="btn btn-danger" onclick="deleteEarning('${item._id}')">
             <i data-lucide="trash-2"></i>
          </button>
        </div>`;
      }

      return `<div class="list-item">
        <div>
          <h4>${item.name}</h4>
          <p><i data-lucide="map-pin" style="width:12px"></i> ${item.location}</p>
          <p>"${item.quote}"</p>
        </div>
        <button class="btn btn-danger" onclick="deleteStory('${item._id}')">
           <i data-lucide="trash-2"></i>
        </button>
      </div>`;
    })
    .join("");
    
  // Re-initialize icons for newly added elements
  if (window.lucide) window.lucide.createIcons();
}

async function refreshAll() {
  const [dashboard, management] = await Promise.all([
    api("/api/admin/dashboard"),
    api("/api/admin/management-data"),
  ]);

  state.data = management;
  syncNotificationSelection(state.data.notifications || []);

  document.getElementById("statCategories").textContent = dashboard.categoryCount;
  document.getElementById("statProducts").textContent = dashboard.productCount;
  document.getElementById("statAppUsers").textContent = dashboard.appUserCount || 0;
  document.getElementById("statNotifications").textContent = dashboard.notificationCount;
  document.getElementById("statStories").textContent = dashboard.storyCount;
  document.getElementById("statEarnings").textContent = currency(dashboard.totalEarnings);

  renderProductCategoryOptions(state.data.categories || []);
  renderCategoriesTable(state.data.categories || []);
  renderProductsTable(state.data.products || []);
  renderAppUsersTable(state.data.appUsers || []);
  renderEarningsTable(state.data.earnings || []);
  renderNotificationsTable(state.data.notifications || []);
  renderStoriesTable(state.data.stories || []);
  renderBannersTable(state.data.banners || []);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("adminToken", state.token);
    localStorage.setItem("adminUser", JSON.stringify(state.user));
    await bootPanel();
  } catch (error) {
    alert(error.message);
  }
}

async function bootPanel() {
  setLoggedOutLayout(false);
  loginSection.classList.add("hidden");
  panelSection.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  try {
    await refreshAll();
  } catch (error) {
    alert(error.message);
    logout();
  }
}

function logout() {
  setLoggedOutLayout(true);
  state.token = "";
  state.user = {};
  state.selectedNotificationUser = null;
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  panelSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
}

function openUserNotificationModal(userId, encodedUserName) {
  state.selectedNotificationUser = userId;
  document.getElementById("userNotificationTargetName").value = decodeURIComponent(encodedUserName || "User");
  document.getElementById("userNotificationTitle").value = "";
  document.getElementById("userNotificationType").value = "";
  document.getElementById("userNotificationTime").value = "";
  document.getElementById("userNotificationMessage").value = "";
  openModal("userNotificationModal");
}

async function onSubmitCategory(e) {
  e.preventDefault();
  try {
    await api("/api/admin/categories", {
      method: "POST",
      body: JSON.stringify({
        slug: document.getElementById("categorySlug").value.trim(),
        title: document.getElementById("categoryTitle").value.trim(),
        icon: document.getElementById("categoryIcon").value.trim(),
        color: document.getElementById("categoryColor").value.trim(),
      }),
    });
    e.target.reset();
    closeModal("categoryModal");
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function onSubmitProduct(e) {
  e.preventDefault();
  try {
    const commissionText = getCommissionText();
    const logoValue = getProductLogoValue();

    await api("/api/admin/products", {
      method: "POST",
      body: JSON.stringify({
        productCode: document.getElementById("productCode").value.trim(),
        categorySlug: document.getElementById("productCategorySlug").value.trim(),
        name: document.getElementById("productName").value.trim(),
        description: document.getElementById("productDescription").value.trim(),
        commission: commissionText,
        logo: logoValue,
        benefits: splitCsv(document.getElementById("productBenefits").value),
        howToEarn: splitCsv(document.getElementById("productHowToEarn").value),
        terms: splitCsv(document.getElementById("productTerms").value),
      }),
    });

    e.target.reset();
    document.getElementById("productLogoCustomWrap").classList.add("hidden");
    closeModal("productModal");
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function onSubmitEarning(e) {
  e.preventDefault();
  try {
    await api("/api/admin/earnings", {
      method: "POST",
      body: JSON.stringify({
        title: document.getElementById("earningTitle").value.trim(),
        amount: Number(document.getElementById("earningAmount").value),
        dateLabel: document.getElementById("earningDateLabel").value.trim(),
        type: document.getElementById("earningType").value,
      }),
    });

    e.target.reset();
    closeModal("earningModal");
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function onSubmitNotification(e) {
  e.preventDefault();
  try {
    await api("/api/admin/notifications", {
      method: "POST",
      body: JSON.stringify({
        title: document.getElementById("notificationTitle").value.trim(),
        message: document.getElementById("notificationMessage").value.trim(),
        type: document.getElementById("notificationType").value.trim() || "info",
        time: document.getElementById("notificationTime").value.trim() || "Just now",
      }),
    });

    e.target.reset();
    closeModal("notificationModal");
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function onSubmitStory(e) {
  e.preventDefault();
  try {
    await api("/api/admin/stories", {
      method: "POST",
      body: JSON.stringify({
        name: document.getElementById("storyName").value.trim(),
        location: document.getElementById("storyLocation").value.trim(),
        avatar: document.getElementById("storyAvatar").value.trim(),
        color: document.getElementById("storyColor").value.trim(),
        quote: document.getElementById("storyQuote").value.trim(),
      }),
    });

    e.target.reset();
    closeModal("storyModal");
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function onSubmitBanner(e) {
  e.preventDefault();
  const bannerId = document.getElementById("bannerId").value.trim();

  try {
    const payload = {
      title: document.getElementById("bannerTitle").value.trim(),
      imageUrl: document.getElementById("bannerImageUrl").value.trim(),
      sortOrder: Number(document.getElementById("bannerSortOrder").value || 1),
      isActive: document.getElementById("bannerIsActive").value === "true",
    };

    if (!payload.imageUrl) {
      throw new Error("Image URL is required.");
    }

    if (bannerId) {
      await api(`/api/admin/banners/${bannerId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await api("/api/admin/banners", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    resetBannerForm();
    closeModal("bannerModal");
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function onSubmitUserNotification(e) {
  e.preventDefault();
  try {
    if (!state.selectedNotificationUser) {
      throw new Error("Please select a user from App Users table.");
    }

    await api(`/api/admin/app-users/${state.selectedNotificationUser}/notifications`, {
      method: "POST",
      body: JSON.stringify({
        title: document.getElementById("userNotificationTitle").value.trim(),
        message: document.getElementById("userNotificationMessage").value.trim(),
        type: document.getElementById("userNotificationType").value.trim() || "info",
        time: document.getElementById("userNotificationTime").value.trim() || "Just now",
      }),
    });

    e.target.reset();
    state.selectedNotificationUser = null;
    closeModal("userNotificationModal");
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function onSubmitProfile(e) {
  e.preventDefault();
  const name = document.getElementById("profileName").value.trim();
  const email = document.getElementById("profileEmail").value.trim();
  const password = document.getElementById("profilePassword").value;

  try {
    const data = await api("/api/admin/profile", {
      method: "PUT",
      body: JSON.stringify({ name, email, password }),
    });

    state.user = data;
    localStorage.setItem("adminUser", JSON.stringify(state.user));
    alert("Profile updated successfully!");
    document.getElementById("profilePassword").value = "";
  } catch (error) {
    alert(error.message);
  }
}

async function deleteCategory(id) {
  if (!confirm("Delete this category? Related products will be deactivated.")) return;
  try {
    await api(`/api/admin/categories/${id}`, { method: "DELETE" });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product?")) return;
  try {
    await api(`/api/admin/products/${id}`, { method: "DELETE" });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteEarning(id) {
  if (!confirm("Delete this earning transaction?")) return;
  try {
    await api(`/api/admin/earnings/${id}`, { method: "DELETE" });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function verifyEarning(id, status) {
  const label = status === "approved" ? "approve" : "reject";
  if (!confirm(`Do you want to ${label} this earning transaction?`)) return;
  try {
    await api(`/api/admin/earnings/${id}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteNotification(id) {
  if (!confirm("Delete this notification?")) return;
  try {
    await api(`/api/admin/notifications/${id}`, { method: "DELETE" });
    selectedNotificationIds.delete(String(id));
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteSelectedNotifications() {
  const ids = Array.from(selectedNotificationIds);
  if (!ids.length) {
    alert("Please select at least one notification.");
    return;
  }
  if (!confirm(`Delete ${ids.length} selected notification(s)?`)) return;

  try {
    await api("/api/admin/notifications/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    selectedNotificationIds.clear();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteStory(id) {
  if (!confirm("Delete this success story?")) return;
  try {
    await api(`/api/admin/stories/${id}`, { method: "DELETE" });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteBanner(id) {
  if (!confirm("Delete this banner?")) return;
  try {
    await api(`/api/admin/banners/${id}`, { method: "DELETE" });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function toggleAppUserStatus(id, isActive) {
  const actionLabel = isActive ? "unblock" : "block";
  if (!confirm(`Do you want to ${actionLabel} this app user?`)) return;
  try {
    await api(`/api/admin/app-users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteAppUser(id) {
  if (!confirm("Delete this app user permanently?")) return;
  try {
    await api(`/api/admin/app-users/${id}`, { method: "DELETE" });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

window.deleteCategory = deleteCategory;
window.deleteProduct = deleteProduct;
window.deleteEarning = deleteEarning;
window.verifyEarning = verifyEarning;
window.deleteNotification = deleteNotification;
window.handleSelectAllNotifications = handleSelectAllNotifications;
window.handleNotificationSelection = handleNotificationSelection;
window.deleteStory = deleteStory;
window.deleteBanner = deleteBanner;
window.openEditBannerModal = openEditBannerModal;
window.toggleAppUserStatus = toggleAppUserStatus;
window.deleteAppUser = deleteAppUser;
window.openUserNotificationModal = openUserNotificationModal;

logoutBtn.addEventListener("click", logout);
document.getElementById("loginForm").addEventListener("submit", handleLogin);
document.getElementById("categoryForm").addEventListener("submit", onSubmitCategory);
document.getElementById("productForm").addEventListener("submit", onSubmitProduct);
document.getElementById("earningForm").addEventListener("submit", onSubmitEarning);
document.getElementById("notificationForm").addEventListener("submit", onSubmitNotification);
document.getElementById("storyForm").addEventListener("submit", onSubmitStory);
document.getElementById("bannerForm").addEventListener("submit", onSubmitBanner);
document.getElementById("userNotificationForm").addEventListener("submit", onSubmitUserNotification);
document.getElementById("profileForm").addEventListener("submit", onSubmitProfile);
document.getElementById("openBannerModalBtn").addEventListener("click", resetBannerForm);
setLoggedOutLayout(!state.token);

if (state.token) {
  bootPanel();
}
