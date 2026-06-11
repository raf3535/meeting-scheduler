const API_KEY = "$2a$10$TtILEFovTl/j.KuCSSOLKuPcLQ/yHHCFPUNd26iwFWrop48SBM80G";
const BIN_ID = "67f23e998561e97a50f996bb";
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const LATEST_URL = `${BIN_URL}/latest`;
const STORAGE_KEY = "meetflow-meetings";
const HEADERS = {
  "Content-Type": "application/json",
  "X-Master-Key": API_KEY
};

const form = document.getElementById("meetingForm");
const editingIdInput = document.getElementById("editingId");
const titleInput = document.getElementById("title");
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");
const participantsInput = document.getElementById("participants");
const statusInput = document.getElementById("status");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const formMode = document.getElementById("formMode");
const meetingList = document.getElementById("meetingList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const syncStatus = document.getElementById("syncStatus");
const totalMeetings = document.getElementById("totalMeetings");
const upcomingMeetings = document.getElementById("upcomingMeetings");
const confirmedMeetings = document.getElementById("confirmedMeetings");
const visibleCount = document.getElementById("visibleCount");
const errors = {
  title: document.getElementById("titleError"),
  date: document.getElementById("dateError"),
  time: document.getElementById("timeError")
};

let meetings = [];

function createId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `meeting-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setSyncStatus(message, state) {
  syncStatus.textContent = message;
  syncStatus.dataset.state = state;
}

function getStoredMeetings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function storeMeetings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meetings));
}

function splitDateTime(datetime) {
  if (!datetime) {
    return { date: "", time: "" };
  }

  const [date = "", rawTime = ""] = datetime.split("T");
  return { date, time: rawTime.slice(0, 5) };
}

function normalizeMeeting(meeting) {
  const split = splitDateTime(meeting.datetime);
  const participants = Array.isArray(meeting.participants)
    ? meeting.participants
    : String(meeting.participants || "")
      .split(",")
      .map((participant) => participant.trim())
      .filter(Boolean);

  return {
    id: meeting.id || createId(),
    title: String(meeting.title || "Untitled meeting").trim(),
    date: meeting.date || split.date,
    time: meeting.time || split.time,
    participants,
    status: meeting.status || "Confirmed"
  };
}

function getMeetingDate(meeting) {
  return new Date(`${meeting.date}T${meeting.time || "00:00"}`);
}

function hasValidDate(dateValue) {
  return dateValue instanceof Date && !Number.isNaN(dateValue.getTime());
}

function sortMeetings(meetingA, meetingB) {
  const dateA = getMeetingDate(meetingA);
  const dateB = getMeetingDate(meetingB);
  const timeA = hasValidDate(dateA) ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
  const timeB = hasValidDate(dateB) ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
  return timeA - timeB;
}

function formatDate(dateValue) {
  if (!hasValidDate(dateValue)) {
    return "Date TBD";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(dateValue);
}

function formatTime(dateValue) {
  if (!hasValidDate(dateValue)) {
    return "Time TBD";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(dateValue);
}

function statusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function iconSvg(type) {
  const icons = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18.08V21h2.92L18.78 10.14l-2.92-2.92L5 18.08ZM20.7 8.22a1 1 0 0 0 0-1.42L19.2 5.3a1 1 0 0 0-1.42 0l-1.17 1.17 2.92 2.92 1.17-1.17Z"/></svg>',
    delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h.5l.78 12.08A2.75 2.75 0 0 0 9.02 21h5.96a2.75 2.75 0 0 0 2.74-1.92L18.5 7H19a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9Zm1 2h4v1h-4V5Zm-1.5 2h7l-.74 11.77a.75.75 0 0 1-.75.73H9.99a.75.75 0 0 1-.75-.73L8.5 7Z"/></svg>'
  };

  return icons[type];
}

function createMetaItem(text) {
  const item = document.createElement("span");
  item.className = "meta-item";
  item.textContent = text;
  return item;
}

function createActionButton(label, iconType, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${className || ""}`.trim();
  button.setAttribute("aria-label", label);
  button.title = label;
  button.insertAdjacentHTML("beforeend", iconSvg(iconType));
  const screenReaderLabel = document.createElement("span");
  screenReaderLabel.className = "sr-only";
  screenReaderLabel.textContent = label;
  button.appendChild(screenReaderLabel);
  button.addEventListener("click", onClick);
  return button;
}

function createMeetingCard(meeting) {
  const meetingDate = getMeetingDate(meeting);
  const card = document.createElement("article");
  card.className = "meeting-card";

  const content = document.createElement("div");
  const titleRow = document.createElement("div");
  titleRow.className = "meeting-title-row";

  const title = document.createElement("h3");
  title.textContent = meeting.title;

  const status = document.createElement("span");
  status.className = `status-badge ${statusClass(meeting.status)}`;
  status.textContent = meeting.status;

  titleRow.append(title, status);

  const meta = document.createElement("div");
  meta.className = "meeting-meta";
  meta.append(
    createMetaItem(formatDate(meetingDate)),
    createMetaItem(formatTime(meetingDate))
  );

  const participants = document.createElement("p");
  participants.className = "participants";
  const people = meeting.participants.length ? meeting.participants.join(", ") : "No participants added";
  const participantsLabel = document.createElement("strong");
  participantsLabel.textContent = "Participants:";
  participants.append(participantsLabel, document.createTextNode(` ${people}`));

  content.append(titleRow, meta, participants);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    createActionButton(`Edit ${meeting.title}`, "edit", "", () => startEdit(meeting.id)),
    createActionButton(`Delete ${meeting.title}`, "delete", "delete", () => deleteMeeting(meeting.id))
  );

  card.append(content, actions);
  return card;
}

function getFilteredMeetings() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  return meetings
    .filter((meeting) => {
      const searchableText = [
        meeting.title,
        meeting.status,
        meeting.participants.join(" ")
      ].join(" ").toLowerCase();
      const matchesQuery = !query || searchableText.includes(query);
      const matchesStatus = selectedStatus === "all" || meeting.status === selectedStatus;
      return matchesQuery && matchesStatus;
    })
    .sort(sortMeetings);
}

function updateStats(filteredMeetings) {
  const now = new Date();
  totalMeetings.textContent = meetings.length;
  upcomingMeetings.textContent = meetings.filter((meeting) => {
    const meetingDate = getMeetingDate(meeting);
    return hasValidDate(meetingDate) && meetingDate >= now;
  }).length;
  confirmedMeetings.textContent = meetings.filter((meeting) => meeting.status === "Confirmed").length;
  visibleCount.textContent = `${filteredMeetings.length} shown`;
}

function renderMeetings() {
  const filteredMeetings = getFilteredMeetings();
  meetingList.replaceChildren();
  filteredMeetings.forEach((meeting) => {
    meetingList.appendChild(createMeetingCard(meeting));
  });

  emptyState.hidden = filteredMeetings.length > 0;
  updateStats(filteredMeetings);
}

async function saveToAPI() {
  storeMeetings();
  setSyncStatus("Saving changes", "");

  try {
    const response = await fetch(BIN_URL, {
      method: "PUT",
      headers: HEADERS,
      body: JSON.stringify(meetings)
    });

    if (!response.ok) {
      throw new Error("Unable to save remote data");
    }

    setSyncStatus("Saved", "saved");
  } catch (error) {
    console.error("Error saving to API:", error);
    setSyncStatus("Saved locally", "offline");
  }
}

async function loadFromAPI() {
  setSyncStatus("Loading schedule", "");
  meetings = getStoredMeetings().map(normalizeMeeting);
  renderMeetings();

  try {
    const response = await fetch(LATEST_URL, { headers: HEADERS });
    if (!response.ok) {
      throw new Error("Unable to load remote data");
    }

    const data = await response.json();
    meetings = (Array.isArray(data.record) ? data.record : []).map(normalizeMeeting);
    storeMeetings();
    renderMeetings();
    setSyncStatus("Synced", "saved");
  } catch (error) {
    console.error("Error loading from API:", error);
    setSyncStatus("Offline mode", "offline");
  }
}

function clearErrors() {
  Object.values(errors).forEach((error) => {
    error.textContent = "";
  });
}

function validateForm() {
  clearErrors();
  let isValid = true;
  const title = titleInput.value.trim();
  const selectedDate = dateInput.value;
  const selectedTime = timeInput.value;

  if (title.length < 3) {
    errors.title.textContent = "Use at least 3 characters.";
    isValid = false;
  }

  if (!selectedDate) {
    errors.date.textContent = "Choose a date.";
    isValid = false;
  }

  if (!selectedTime) {
    errors.time.textContent = "Choose a time.";
    isValid = false;
  }

  if (selectedDate && selectedTime) {
    const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
    if (Number.isNaN(selectedDateTime.getTime())) {
      errors.date.textContent = "Choose a valid date and time.";
      isValid = false;
    }
  }

  return isValid;
}

function getFormMeeting() {
  return {
    title: titleInput.value.trim(),
    date: dateInput.value,
    time: timeInput.value,
    participants: participantsInput.value
      .split(",")
      .map((participant) => participant.trim())
      .filter(Boolean),
    status: statusInput.value
  };
}

function resetForm() {
  form.reset();
  editingIdInput.value = "";
  statusInput.value = "Confirmed";
  submitButton.textContent = "Add meeting";
  formMode.textContent = "New";
  cancelEditButton.hidden = true;
  clearErrors();
}

function startEdit(id) {
  const meeting = meetings.find((item) => item.id === id);
  if (!meeting) {
    return;
  }

  editingIdInput.value = meeting.id;
  titleInput.value = meeting.title;
  dateInput.value = meeting.date;
  timeInput.value = meeting.time;
  participantsInput.value = meeting.participants.join(", ");
  statusInput.value = meeting.status;
  submitButton.textContent = "Save changes";
  formMode.textContent = "Editing";
  cancelEditButton.hidden = false;
  titleInput.focus();
}

function deleteMeeting(id) {
  const meeting = meetings.find((item) => item.id === id);
  const confirmed = meeting ? window.confirm(`Delete "${meeting.title}"?`) : false;

  if (!confirmed) {
    return;
  }

  meetings = meetings.filter((item) => item.id !== id);
  renderMeetings();
  saveToAPI();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  const editingId = editingIdInput.value;
  const formMeeting = getFormMeeting();

  if (editingId) {
    meetings = meetings.map((meeting) => (
      meeting.id === editingId ? { ...meeting, ...formMeeting } : meeting
    ));
  } else {
    meetings.push({ id: createId(), ...formMeeting });
  }

  resetForm();
  renderMeetings();
  saveToAPI();
});

cancelEditButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderMeetings);
statusFilter.addEventListener("change", renderMeetings);

loadFromAPI();
