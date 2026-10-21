"use strict";
(() => {
  const STORAGE_KEY = "workshop-gallery-records-v3";
  const MAX_FILE_SIZE = 8 * 1024 * 1024;
  const MAX_IMAGE_DIMENSION = 1000;
  const IMAGE_QUALITY = 0.78;
  const SAVE_DELAY = 250;
  const CATEGORIES = ["Chair", "Table", "Cabinet", "Bed", "Sofa", "Shelf", "Other"];
  const STATUSES = ["Planned", "In progress", "Completed"];
  
  const elements = {
    connectionStatus: document.getElementById("connection-status"),
    statusDot: document.querySelector(".status-dot"),
    totalCount: document.getElementById("total-count"),
    progressCount: document.getElementById("progress-count"),
    completedCount: document.getElementById("completed-count"),
    materialCount: document.getElementById("material-count"),
    addButton: document.getElementById("add-piece-button"),
    emptyAddButton: document.getElementById("empty-add-button"),
    filterForm: document.getElementById("filter-form"),
    searchInput: document.getElementById("search-input"),
    categoryFilter: document.getElementById("category-filter"),
    statusFilter: document.getElementById("status-filter"),
    sortFilter: document.getElementById("sort-filter"),
    resetFilters: document.getElementById("reset-filters"),
    resultsCount: document.getElementById("results-count"),
    galleryGrid: document.getElementById("gallery-grid"),
    emptyState: document.getElementById("empty-state"),
    emptyTitle: document.getElementById("empty-title"),
    emptyDescription: document.getElementById("empty-description"),
    loadingIndicator: document.getElementById("loading-indicator"),
    
    // Form Dialog
    dialog: document.getElementById("furniture-dialog"),
    dialogTitle: document.getElementById("dialog-title"),
    closeDialogButton: document.getElementById("close-dialog-button"),
    cancelDialogButton: document.getElementById("cancel-dialog-button"),
    form: document.getElementById("furniture-form"),
    recordId: document.getElementById("record-id"),
    name: document.getElementById("furniture-name"),
    category: document.getElementById("furniture-category"),
    status: document.getElementById("furniture-status"),
    material: document.getElementById("furniture-material"),
    price: document.getElementById("furniture-price"),
    dimensions: document.getElementById("furniture-dimensions"),
    description: document.getElementById("furniture-description"),
    photoInput: document.getElementById("furniture-photo"),
    photoError: document.getElementById("photo-error"),
    photoPreviewContainer: document.getElementById("photo-preview-container"),
    photoPreview: document.getElementById("photo-preview"),
    removePhotoButton: document.getElementById("remove-photo-button"),
    saveButton: document.getElementById("save-piece-button"),

    // Detail View Dialog
    detailDialog: document.getElementById("detail-dialog"),
    closeDetailButton: document.getElementById("close-detail-button"),
    detailCloseAction: document.getElementById("detail-close-action"),
    detailRecordNumber: document.getElementById("detail-record-number"),
    detailImageWrap: document.getElementById("detail-image-wrap"),
    detailName: document.getElementById("detail-name"),
    detailCategory: document.getElementById("detail-category"),
    detailStatus: document.getElementById("detail-status"),
    detailPrice: document.getElementById("detail-price"),
    detailMaterial: document.getElementById("detail-material"),
    detailDimensions: document.getElementById("detail-dimensions"),
    detailDescription: document.getElementById("detail-description"),

    toastRegion: document.getElementById("toast-region")
  };

  let records = [];
  let editingId = null;
  let currentPhoto = "";
  let photoRemoved = false;
  let pendingPhoto = false;
  let isSaving = false;
  let storageHealthy = true;
  let toastTimer = null;
  let photoRequestId = 0;

  const cleanText = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `piece-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createRecordNumber(record) {
    return `WG-${record.createdAt.toString(36).toUpperCase().slice(-6)}`;
  }

  function announceAnalytics(action) {
    console.info("[Analytics] User interacted with Handcrafted Furniture Workshop Gallery", { action });
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    toast.textContent = message;
    elements.toastRegion.replaceChildren(toast);
    
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      if (toast.isConnected) toast.remove();
      toastTimer = null;
    }, 4000);
  }

  function setConnectionStatus() {
    const online = navigator.onLine;
    elements.connectionStatus.textContent = online ? "Local workspace" : "Offline mode";
    elements.statusDot.classList.toggle("offline", !online);
  }

  function syncSaveButton() {
    elements.saveButton.disabled = isSaving || pendingPhoto || !storageHealthy;
    if (isSaving) {
      elements.saveButton.textContent = "Saving...";
    } else if (pendingPhoto) {
      elements.saveButton.textContent = "Processing photo...";
    } else {
      elements.saveButton.textContent = editingId ? "Save changes" : "Save furniture";
    }
  }

  function showLoading(loading) {
    elements.loadingIndicator.hidden = !loading;
    elements.galleryGrid.setAttribute("aria-busy", String(loading));
    syncSaveButton();
  }

  function isValidRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) return false;
    return (
      typeof record.id === "string" && record.id.length > 0 &&
      typeof record.name === "string" && record.name.trim().length >= 2 && record.name.length <= 80 &&
      typeof record.category === "string" && CATEGORIES.includes(record.category) &&
      typeof record.status === "string" && STATUSES.includes(record.status) &&
      typeof record.material === "string" && record.material.trim().length > 0 &&
      typeof record.price === "string" && record.price.trim().length > 0 &&
      typeof record.createdAt === "number" && Number.isFinite(record.createdAt)
    );
  }

  function readRecords() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        records = [];
        storageHealthy = true;
        return;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new Error("Saved gallery data is not a list.");

      records = parsed.filter(isValidRecord);
      storageHealthy = true;
    } catch (error) {
      console.error("Unable to read gallery records:", error);
      records = [];
      storageHealthy = false;
      showToast("Saved records could not be read. Browser data protected.", "error");
    }
  }

  function persistRecords() {
    if (!storageHealthy) return false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      return true;
    } catch (error) {
      console.error("Unable to save records:", error);
      showToast("Could not save changes. Storage may be full.", "error");
      return false;
    }
  }

  function getFilteredRecords() {
    const search = cleanText(elements.searchInput.value).toLowerCase();
    const category = elements.categoryFilter.value;
    const status = elements.statusFilter.value;
    const sort = elements.sortFilter.value;

    const filtered = records.filter((record) => {
      const searchableText = [record.name, record.recordNumber, record.category, record.material, record.price, record.description, record.status].join(" ").toLowerCase();
      const matchesSearch = !search || searchableText.includes(search);
      const matchesCategory = category === "all" || record.category === category;
      const matchesStatus = status === "all" || record.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "oldest") return a.createdAt - b.createdAt;
      return b.createdAt - a.createdAt;
    });
    return filtered;
  }

  function updateSummary() {
    elements.totalCount.textContent = String(records.length);
    elements.progressCount.textContent = String(records.filter(r => r.status === "In progress").length);
    elements.completedCount.textContent = String(records.filter(r => r.status === "Completed").length);
    const uniqueMaterials = new Set(records.map(r => r.material.toLowerCase()).filter(Boolean));
    elements.materialCount.textContent = String(uniqueMaterials.size);
  }

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function openDetailModal(record) {
    elements.detailRecordNumber.textContent = record.recordNumber;
    elements.detailName.textContent = record.name;
    elements.detailCategory.textContent = record.category;
    elements.detailStatus.textContent = record.status;
    elements.detailPrice.textContent = record.price;
    elements.detailMaterial.textContent = record.material || "Not specified";
    elements.detailDimensions.textContent = record.dimensions || "Not specified";
    elements.detailDescription.textContent = record.description || "No description provided for this piece.";

    elements.detailImageWrap.replaceChildren();
    if (record.photo) {
      const img = document.createElement("img");
      img.src = record.photo;
      img.alt = `Detailed view of ${record.name}`;
      img.className = "detail-modal-image";
      elements.detailImageWrap.append(img);
    } else {
      const ph = createElement("div", "card-placeholder detail-placeholder", "◇");
      ph.setAttribute("aria-label", "No photograph uploaded");
      elements.detailImageWrap.append(ph);
    }

    elements.detailDialog.showModal();
    document.body.classList.add("dialog-open");
    announceAnalytics("view-furniture-details");
  }

  function closeDetailModal() {
    if (elements.detailDialog.open) {
      elements.detailDialog.close();
    }
    document.body.classList.remove("dialog-open");
  }

  function createCard(record) {
    const card = createElement("article", "furniture-card");
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `View details for ${record.name}`);

    // Clicking anywhere on card opens details view
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return; // Don't trigger if Edit/Delete button was clicked directly
      openDetailModal(record);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDetailModal(record);
      }
    });

    const imageWrap = createElement("div", "card-image-wrap");
    if (record.photo) {
      const image = document.createElement("img");
      image.className = "card-image";
      image.src = record.photo;
      image.alt = `Photograph of ${record.name}`;
      image.loading = "lazy";
      imageWrap.append(image);
    } else {
      const placeholder = createElement("div", "card-placeholder", "◇");
      placeholder.setAttribute("aria-label", "No photograph uploaded");
      imageWrap.append(placeholder);
    }

    imageWrap.append(createElement("span", "card-category", record.category));
    
    const content = createElement("div", "card-content");
    const meta = createElement("div", "card-meta");
    meta.append(createElement("span", "card-id", record.recordNumber));
    
    const statusClass = record.status.toLowerCase().replace(/\s+/g, "-");
    const statusBadge = createElement("span", `status-badge status-${statusClass}`, record.status);
    meta.append(statusBadge);

    const title = createElement("h3", "card-title", record.name);
    
    // Price badge inside card
    const priceTag = createElement("div", "card-price", record.price);

    const description = createElement("p", "card-description", record.description || "No description has been added for this piece.");

    const details = createElement("div", "card-details");
    const r1 = createElement("div", "detail-row");
    r1.append(createElement("span", "detail-label", "Material"), createElement("span", "detail-value", record.material || "Not specified"));
    
    const r2 = createElement("div", "detail-row");
    r2.append(createElement("span", "detail-label", "Price"), createElement("span", "detail-value price-bold", record.price));
    details.append(r1, r2);

    const actions = createElement("div", "card-actions");
    const editButton = createElement("button", "button button-secondary", "Edit");
    editButton.type = "button";
    editButton.setAttribute("aria-label", `Edit ${record.name}`);
    editButton.addEventListener("click", () => openEditForm(record.id));

    const deleteButton = createElement("button", "button button-secondary delete-button", "Delete");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Delete ${record.name}`);
    deleteButton.addEventListener("click", () => deleteRecord(record.id));

    actions.append(editButton, deleteButton);
    content.append(meta, title, description, details, actions);
    card.append(imageWrap, content);
    return card;
  }

  function renderGallery() {
    const filteredRecords = getFilteredRecords();
    const hasRecords = filteredRecords.length > 0;
    const hasAnyRecords = records.length > 0;
    
    elements.galleryGrid.replaceChildren();
    filteredRecords.forEach(record => elements.galleryGrid.append(createCard(record)));

    elements.resultsCount.textContent = `${filteredRecords.length} ${filteredRecords.length === 1 ? "piece" : "pieces"} found`;
    elements.emptyState.hidden = hasRecords;
    elements.galleryGrid.hidden = !hasRecords;

    if (!hasAnyRecords) {
      elements.emptyTitle.textContent = storageHealthy ? "Your gallery is ready" : "Saved data needs attention";
      elements.emptyDescription.textContent = storageHealthy ? "No data found. Add your first furniture piece to start building the collection." : "No valid records available.";
      elements.emptyAddButton.hidden = !storageHealthy;
    } else if (!hasRecords) {
      elements.emptyTitle.textContent = "No matching furniture";
      elements.emptyDescription.textContent = "No data found for these filters. Try another search or reset.";
      elements.emptyAddButton.hidden = true;
    }
    updateSummary();
  }

  function resetFieldErrors() {
    elements.form.querySelectorAll(".field-error").forEach(el => el.textContent = "");
    elements.form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute("aria-invalid"));
  }

  function setFieldError(field, message) {
    field.setAttribute("aria-invalid", "true");
    const describedByIds = (field.getAttribute("aria-describedby") || "").split(/\s+/);
    const errorId = describedByIds.find(id => id.endsWith("-error"));
    if (errorId) {
      const errEl = document.getElementById(errorId);
      if (errEl) errEl.textContent = message;
    }
  }

  function validateForm() {
    resetFieldErrors();
    let isValid = true;
    let firstInvalid = null;

    const nameVal = cleanText(elements.name.value);
    const catVal = elements.category.value;
    const statVal = elements.status.value;
    const matVal = cleanText(elements.material.value);
    const priceVal = cleanText(elements.price.value);

    if (!nameVal) { setFieldError(elements.name, "Enter a furniture name."); isValid = false; firstInvalid ||= elements.name; }
    else if (nameVal.length < 2) { setFieldError(elements.name, "Name must be at least 2 characters."); isValid = false; firstInvalid ||= elements.name; }

    if (!catVal) { setFieldError(elements.category, "Select a category."); isValid = false; firstInvalid ||= elements.category; }
    if (!statVal) { setFieldError(elements.status, "Select a status."); isValid = false; firstInvalid ||= elements.status; }
    if (!matVal) { setFieldError(elements.material, "Enter primary material."); isValid = false; firstInvalid ||= elements.material; }
    if (!priceVal) { setFieldError(elements.price, "Enter the price."); isValid = false; firstInvalid ||= elements.price; }

    if (!isValid && firstInvalid) firstInvalid.focus();
    return isValid;
  }

  function showPhotoPreview(photoData) {
    if (!photoData) {
      elements.photoPreview.removeAttribute("src");
      elements.photoPreviewContainer.hidden = true;
      return;
    }
    elements.photoPreview.src = photoData;
    elements.photoPreviewContainer.hidden = false;
  }

  function clearPhotoSelection() {
    photoRequestId++;
    currentPhoto = "";
    photoRemoved = true;
    pendingPhoto = false;
    elements.photoInput.value = "";
    elements.photoInput.disabled = false;
    elements.photoError.textContent = "";
    elements.photoInput.removeAttribute("aria-invalid");
    showPhotoPreview("");
    syncSaveButton();
  }

  function resetForm() {
    photoRequestId++;
    elements.form.reset();
    resetFieldErrors();
    elements.recordId.value = "";
    currentPhoto = "";
    photoRemoved = false;
    pendingPhoto = false;
    elements.photoInput.value = "";
    elements.photoInput.disabled = false;
    elements.photoError.textContent = "";
    elements.photoInput.removeAttribute("aria-invalid");
    showPhotoPreview("");
    syncSaveButton();
  }

  function openCreateForm() {
    if (isSaving) return;
    if (!storageHealthy) { showToast("Adding records disabled.", "error"); return; }
    resetForm();
    editingId = null;
    elements.dialogTitle.textContent = "Add furniture";
    syncSaveButton();
    elements.dialog.showModal();
    document.body.classList.add("dialog-open");
    elements.name.focus();
    announceAnalytics("open-add-form");
  }

  function openEditForm(id) {
    if (isSaving) return;
    if (!storageHealthy) { showToast("Editing disabled.", "error"); return; }
    
    const record = records.find(item => item.id === id);
    if (!record) { showToast("Record not found.", "error"); return; }

    resetForm();
    editingId = id;
    elements.recordId.value = record.id;
    elements.name.value = record.name;
    elements.category.value = record.category;
    elements.status.value = record.status;
    elements.material.value = record.material;
    elements.price.value = record.price || "";
    elements.dimensions.value = record.dimensions;
    elements.description.value = record.description;
    currentPhoto = record.photo || "";
    photoRemoved = false;
    pendingPhoto = false;
    showPhotoPreview(currentPhoto);
    elements.dialogTitle.textContent = "Edit furniture";
    syncSaveButton();
    elements.dialog.showModal();
    document.body.classList.add("dialog-open");
    elements.name.focus();
    announceAnalytics("open-edit-form");
  }

  function closeForm() {
    if (isSaving) { showToast("Please wait until saving finishes.", "warning"); return; }
    photoRequestId++;
    if (elements.dialog.open) elements.dialog.close();
    document.body.classList.remove("dialog-open");
    resetForm();
    editingId = null;
    syncSaveButton();
  }

  function readAndCompressImage(file) {
    return new Promise((resolve, reject) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
      if (!allowedTypes.includes(file.type)) { reject(new Error("Choose a JPG, PNG, WebP, or AVIF image.")); return; }
      if (file.size > MAX_FILE_SIZE) { reject(new Error("Image must be 8 MB or smaller.")); return; }

      let objectUrl = "";
      let settled = false;
      const cleanup = () => { if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = ""; } };
      const fail = (msg) => { if (!settled) { settled = true; cleanup(); reject(new Error(msg)); } };
      const succeed = (val) => { if (!settled) { settled = true; cleanup(); resolve(val); } };

      try { objectUrl = URL.createObjectURL(file); } catch { fail("Unable to read image."); return; }

      const image = new Image();
      image.onload = () => {
        try {
          if (!image.naturalWidth || !image.naturalHeight) { fail("Invalid image selected."); return; }
          const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const ctx = canvas.getContext("2d");
          if (!ctx) { fail("Browser processing error."); return; }

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
          succeed(compressed);
        } catch (err) {
          fail("Unable to process image.");
        }
      };
      image.onerror = () => fail("Unable to open image.");
      image.src = objectUrl;
    });
  }

  async function handlePhotoChange() {
    const file = elements.photoInput.files?.[0];
    elements.photoError.textContent = "";
    elements.photoInput.removeAttribute("aria-invalid");
    if (!file) { pendingPhoto = false; syncSaveButton(); return; }

    const reqId = ++photoRequestId;
    pendingPhoto = true;
    elements.photoInput.disabled = true;
    syncSaveButton();

    try {
      const data = await readAndCompressImage(file);
      if (reqId !== photoRequestId || !elements.dialog.open) return;
      currentPhoto = data;
      photoRemoved = false;
      showPhotoPreview(data);
      showToast("Photograph added to form.", "success");
    } catch (error) {
      if (reqId !== photoRequestId || !elements.dialog.open) return;
      elements.photoInput.value = "";
      const msg = error instanceof Error ? error.message : "Unable to process image.";
      setFieldError(elements.photoInput, msg);
      showToast(msg, "error");
    } finally {
      if (reqId === photoRequestId) {
        pendingPhoto = false;
        elements.photoInput.disabled = false;
        syncSaveButton();
      }
    }
  }

  async function saveForm(event) {
    event.preventDefault();
    if (!storageHealthy || isSaving || pendingPhoto) {
      if (pendingPhoto) showToast("Wait for photo processing to finish.", "warning");
      return;
    }
    if (!validateForm()) { showToast("Please correct highlighted fields.", "error"); return; }

    isSaving = true;
    showLoading(true);
    
    if (elements.dialog.open) {
      elements.dialog.close();
    }
    document.body.classList.remove("dialog-open");

    const values = {
      name: cleanText(elements.name.value),
      category: elements.category.value,
      status: elements.status.value,
      material: cleanText(elements.material.value),
      price: cleanText(elements.price.value),
      dimensions: cleanText(elements.dimensions.value),
      description: cleanText(elements.description.value)
    };

    const wasEditing = Boolean(editingId);
    const prevRecords = records.slice();
    const now = Date.now();
    const existing = editingId ? records.find(r => r.id === editingId) : null;
    
    if (editingId && !existing) {
      showToast("Record no longer exists.", "error");
      isSaving = false;
      showLoading(false);
      resetForm();
      editingId = null;
      return;
    }

    const photo = photoRemoved ? "" : currentPhoto || existing?.photo || "";
    const updatedRecord = {
      id: existing?.id || createId(),
      recordNumber: existing?.recordNumber || "",
      ...values,
      photo,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    if (!updatedRecord.recordNumber) {
      updatedRecord.recordNumber = createRecordNumber(updatedRecord);
    }

    records = existing ? records.map(r => r.id === existing.id ? updatedRecord : r) : [updatedRecord, ...records];

    try {
      await new Promise(res => window.setTimeout(res, SAVE_DELAY));
      if (!persistRecords()) {
        records = prevRecords;
        showLoading(false);
        renderGallery();
        return;
      }
      showToast(wasEditing ? "Furniture record updated." : "Furniture added to gallery.", "success");
      announceAnalytics(wasEditing ? "edit-furniture" : "add-furniture");
      
      resetForm();
      editingId = null;
      renderGallery();
    } catch (error) {
      console.error("Save error:", error);
      records = prevRecords;
      showToast("Unexpected error saving changes.", "error");
      renderGallery();
    } finally {
      isSaving = false;
      showLoading(false);
    }
  }

  function deleteRecord(id) {
    if (isSaving || !storageHealthy) { showToast("Deleting disabled.", "error"); return; }
    const record = records.find(item => item.id === id);
    if (!record) { showToast("Record not found.", "error"); return; }

    const prevRecords = records.slice();
    records = records.filter(item => item.id !== id);
    if (!persistRecords()) {
      records = prevRecords;
      renderGallery();
      return;
    }
    renderGallery();
    showToast("Furniture record deleted.", "success");
    announceAnalytics("delete-furniture");
  }

  function resetFilters() {
    elements.searchInput.value = "";
    elements.categoryFilter.value = "all";
    elements.statusFilter.value = "all";
    elements.sortFilter.value = "newest";
    renderGallery();
    announceAnalytics("reset-filters");
  }

  function bindEvents() {
    elements.addButton.addEventListener("click", openCreateForm);
    elements.emptyAddButton.addEventListener("click", openCreateForm);
    elements.closeDialogButton.addEventListener("click", closeForm);
    elements.cancelDialogButton.addEventListener("click", closeForm);

    // Detail modal events
    elements.closeDetailButton.addEventListener("click", closeDetailModal);
    elements.detailCloseAction.addEventListener("click", closeDetailModal);
    elements.detailDialog.addEventListener("cancel", (e) => { e.preventDefault(); closeDetailModal(); });
    elements.detailDialog.addEventListener("click", (e) => { if (e.target === elements.detailDialog) closeDetailModal(); });
    
    elements.dialog.addEventListener("cancel", (e) => { e.preventDefault(); closeForm(); });
    elements.dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
    elements.dialog.addEventListener("click", (e) => { if (e.target === elements.dialog) closeForm(); });

    elements.form.addEventListener("submit", saveForm);
    elements.photoInput.addEventListener("change", handlePhotoChange);
    elements.removePhotoButton.addEventListener("click", clearPhotoSelection);
    elements.filterForm.addEventListener("submit", (e) => e.preventDefault());

    elements.searchInput.addEventListener("input", renderGallery);
    elements.categoryFilter.addEventListener("change", renderGallery);
    elements.statusFilter.addEventListener("change", renderGallery);
    elements.sortFilter.addEventListener("change", renderGallery);
    elements.resetFilters.addEventListener("click", resetFilters);

    [elements.name, elements.category, elements.status, elements.material, elements.price, elements.dimensions, elements.description].forEach(field => {
      const clearError = () => {
        if (field.getAttribute("aria-invalid") !== "true") return;
        field.removeAttribute("aria-invalid");
        const describedByIds = (field.getAttribute("aria-describedby") || "").split(/\s+/);
        const errorId = describedByIds.find(id => id.endsWith("-error"));
        if (errorId) {
          const errEl = document.getElementById(errorId);
          if (errEl) errEl.textContent = "";
        }
      };
      field.addEventListener("input", clearError);
      field.addEventListener("change", clearError);
    });

    window.addEventListener("online", setConnectionStatus);
    window.addEventListener("offline", setConnectionStatus);
  }

  function initialize() {
    readRecords();
    bindEvents();
    setConnectionStatus();
    renderGallery();
    syncSaveButton();
  }

  initialize();
})();