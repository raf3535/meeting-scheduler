const API_KEY = "$2a$10$TtILEFovTl/j.KuCSSOLKuPcLQ/yHHCFPUNd26iwFWrop48SBM80G";
const BIN_ID = "67f23e998561e97a50f996bb";

const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
const LATEST_URL = `${BIN_URL}/latest`;
const HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': API_KEY
};

const form = document.getElementById('meetingForm');
const titleInput = document.getElementById('title');
const datetimeInput = document.getElementById('datetime');
const meetingList = document.getElementById('meetingList');

let meetings = [];

function renderMeetings() {
  meetingList.innerHTML = '';
  meetings.forEach((meeting, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span><strong>${meeting.title}</strong> — ${new Date(meeting.datetime).toLocaleString()}</span>
      <button onclick="deleteMeeting(${index})">Delete</button>
    `;
    meetingList.appendChild(li);
  });
}

function saveToAPI() {
  fetch(BIN_URL, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(meetings)
  }).catch(err => console.error('❌ Error saving to API:', err));
}

function loadFromAPI() {
  fetch(LATEST_URL, { headers: HEADERS })
    .then(res => res.json())
    .then(data => {
      console.log('Fetched Data:', data); // Log the whole response to inspect the structure
      meetings = Array.isArray(data.record) ? data.record : []; // Ensure meetings is an array
      renderMeetings();
    })
    .catch(err => console.error('❌ Error loading from API:', err));
}

function deleteMeeting(index) {
  meetings.splice(index, 1);
  renderMeetings();
  saveToAPI();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const newMeeting = {
    title: titleInput.value,
    datetime: datetimeInput.value
  };
  meetings.push(newMeeting);
  titleInput.value = '';
  datetimeInput.value = '';
  renderMeetings();
  saveToAPI();
});

loadFromAPI();
