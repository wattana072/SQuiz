// ==========================================
// CONFIGURATION
// ==========================================
// ⚠️ สำคัญ: นำ URL ของ Web App จาก Google Apps Script มาใส่ที่นี่
const API_URL = 'https://script.google.com/macros/s/AKfycbwFM1PHTudS1UZ-YnBCVzyM3IWWMgalNic-63XznUFUhoxUjy3q-xqbyhTNP3tuPJfmUg/exec';
const LEADERBOARD_PASSWORD = '072072';

// ==========================================
// STATE VARIABLES
// ==========================================
let state = {
  userName: '',
  quizsetId: '',
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  startTime: null,
  durationSeconds: 0,
  detailedAnswers: {}, // { questionId: selectedChoice }
  timerInterval: null,
  admin: {
    quizSets: [],
    questions: [],
    currentQuizId: null,
    leaderboardData: []
  }
};

let html5QrcodeScanner = null;

// ==========================================
// DOM ELEMENTS
// ==========================================
const DOM = {
  loader: document.getElementById('loader'),
  loaderText: document.getElementById('loader-text'),
  sections: {
    home: document.getElementById('home-section'),
    scanner: document.getElementById('scanner-section'),
    quiz: document.getElementById('quiz-section'),
    result: document.getElementById('result-section'),
    leaderboardAuth: document.getElementById('leaderboard-auth-section'),
    leaderboard: document.getElementById('leaderboard-section'),
    manageQuiz: document.getElementById('manage-quiz-section'),
  },
  inputs: {
    username: document.getElementById('username-input'),
    password: document.getElementById('password-input')
  },
  buttons: {
    startScan: document.getElementById('start-scan-btn'),
    cancelScan: document.getElementById('cancel-scan-btn'),
    goToLeaderboard: document.getElementById('go-to-leaderboard-btn'),
    backHome: document.getElementById('back-home-btn'),
    authSubmit: document.getElementById('auth-submit-btn'),
    authCancel: document.getElementById('auth-cancel-btn'),
    closeLeaderboard: document.getElementById('close-leaderboard-btn'),
    refreshLeaderboard: document.getElementById('refresh-leaderboard-btn'),
    goManageQuiz: document.getElementById('go-manage-quiz-btn'),
    closeManageQuiz: document.getElementById('close-manage-quiz-btn'),
  },
  quiz: {
    indicator: document.getElementById('question-indicator'),
    timer: document.getElementById('timer-display'),
    questionText: document.getElementById('question-text'),
    choicesContainer: document.getElementById('choices-container')
  },
  result: {
    username: document.getElementById('result-username'),
    score: document.getElementById('result-score'),
    time: document.getElementById('result-time')
  },
  leaderboard: {
    body: document.getElementById('leaderboard-body'),
    error: document.getElementById('password-error')
  },
  admin: {
    quizDropdown: document.getElementById('lb-quiz-dropdown'),
    qrcodeDisplay: document.getElementById('qrcode-display'),
    tabLeaderboard: document.getElementById('tab-leaderboard'),
    tabQrcode: document.getElementById('tab-qrcode'),
    viewLeaderboard: document.getElementById('view-leaderboard'),
    viewQrcode: document.getElementById('view-qrcode'),
    mqListView: document.getElementById('mq-list-view'),
    mqQuizList: document.getElementById('mq-quiz-list'),
    mqCreateNewBtn: document.getElementById('mq-create-new-btn'),
    mqQuizFormView: document.getElementById('mq-quiz-form-view'),
    mqFId: document.getElementById('mq-f-id'),
    mqFType: document.getElementById('mq-f-type'),
    mqFTitle: document.getElementById('mq-f-title'),
    mqFDesc: document.getElementById('mq-f-desc'),
    mqFStatus: document.getElementById('mq-f-status'),
    mqFSaveBtn: document.getElementById('mq-f-save-btn'),
    mqFCancelBtn: document.getElementById('mq-f-cancel-btn'),
    mqFManageQBtn: document.getElementById('mq-f-manage-q-btn'),
    mqQuestionFormView: document.getElementById('mq-question-form-view'),
    mqQFormTitle: document.getElementById('mq-q-form-title'),
    mqQCloseBtn: document.getElementById('mq-q-close-btn'),
    mqQList: document.getElementById('mq-q-list'),
    mqQId: document.getElementById('mq-q-id'),
    mqQNum: document.getElementById('mq-q-num'),
    mqQText: document.getElementById('mq-q-text'),
    mqQC1: document.getElementById('mq-q-c1'),
    mqQC2: document.getElementById('mq-q-c2'),
    mqQC3: document.getElementById('mq-q-c3'),
    mqQC4: document.getElementById('mq-q-c4'),
    mqQAns: document.getElementById('mq-q-ans'),
    mqQSaveBtn: document.getElementById('mq-q-save-btn'),
    mqQClearBtn: document.getElementById('mq-q-clear-btn')
  }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function showSection(sectionId) {
  Object.values(DOM.sections).forEach(sec => {
    sec.classList.add('hidden');
  });
  DOM.sections[sectionId].classList.remove('hidden');
}

function showLoader(text = 'กำลังโหลด...') {
  DOM.loaderText.innerText = text;
  DOM.loader.classList.remove('hidden');
}

function hideLoader() {
  DOM.loader.classList.add('hidden');
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ==========================================
// EVENT LISTENERS
// ==========================================
DOM.buttons.startScan.addEventListener('click', () => {
  const name = DOM.inputs.username.value.trim();
  if (!name) {
    alert('กรุณากรอกชื่อผู้เข้ากิจกรรม');
    return;
  }
  state.userName = name;
  startScanner();
});

DOM.buttons.cancelScan.addEventListener('click', stopScanner);

DOM.buttons.goToLeaderboard.addEventListener('click', () => {
  showSection('leaderboardAuth');
});

DOM.buttons.authCancel.addEventListener('click', () => {
  DOM.inputs.password.value = '';
  DOM.leaderboard.error.classList.add('hidden');
  showSection('home');
});

DOM.buttons.authSubmit.addEventListener('click', () => {
  if (DOM.inputs.password.value === LEADERBOARD_PASSWORD) {
    DOM.inputs.password.value = '';
    DOM.leaderboard.error.classList.add('hidden');
    loadLeaderboard();
  } else {
    DOM.leaderboard.error.classList.remove('hidden');
  }
});

DOM.buttons.closeLeaderboard.addEventListener('click', () => {
  showSection('home');
});

DOM.buttons.refreshLeaderboard.addEventListener('click', loadLeaderboard);

DOM.buttons.backHome.addEventListener('click', () => {
  resetState();
  showSection('home');
});

// Admin Event Listeners
DOM.buttons.goManageQuiz.addEventListener('click', () => {
  showSection('manageQuiz');
  loadAdminQuizSets();
});

DOM.buttons.closeManageQuiz.addEventListener('click', () => {
  showSection('leaderboard');
});

// Tab Listeners
DOM.admin.tabLeaderboard.addEventListener('click', () => {
  DOM.admin.tabLeaderboard.classList.remove('text-gray-400', 'border-transparent');
  DOM.admin.tabLeaderboard.classList.add('text-gray-800', 'border-black');
  
  DOM.admin.tabQrcode.classList.remove('text-gray-800', 'border-black');
  DOM.admin.tabQrcode.classList.add('text-gray-400', 'border-transparent');
  
  DOM.admin.viewLeaderboard.classList.remove('hidden');
  DOM.admin.viewQrcode.classList.add('hidden');
});

DOM.admin.tabQrcode.addEventListener('click', () => {
  DOM.admin.tabQrcode.classList.remove('text-gray-400', 'border-transparent');
  DOM.admin.tabQrcode.classList.add('text-gray-800', 'border-black');
  
  DOM.admin.tabLeaderboard.classList.remove('text-gray-800', 'border-black');
  DOM.admin.tabLeaderboard.classList.add('text-gray-400', 'border-transparent');
  
  DOM.admin.viewQrcode.classList.remove('hidden');
  DOM.admin.viewLeaderboard.classList.add('hidden');
});

// ==========================================
// SCANNER LOGIC
// ==========================================
function startScanner() {
  showSection('scanner');
  
  if (!html5QrcodeScanner) {
    html5QrcodeScanner = new Html5Qrcode("reader");
  }

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };
  
  html5QrcodeScanner.start(
    { facingMode: "environment" }, 
    config,
    onScanSuccess,
    onScanFailure
  ).catch(err => {
    alert('ไม่สามารถเปิดกล้องได้: ' + err);
    stopScanner();
  });
}

function stopScanner() {
  if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
    html5QrcodeScanner.stop().then(() => {
      showSection('home');
    }).catch(err => {
      console.error(err);
      showSection('home');
    });
  } else {
    showSection('home');
  }
}

function onScanSuccess(decodedText, decodedResult) {
  // decodedText contains the QuizsetId e.g. "SP001"
  stopScanner();
  state.quizsetId = decodedText.trim();
  fetchQuestions(state.quizsetId);
}

function onScanFailure(error) {
  // Handle scan failure silently
}

// ==========================================
// API & QUIZ LOGIC
// ==========================================
async function fetchQuestions(quizsetId) {
  showLoader('กำลังโหลดชุดคำถาม...');
  try {
    const url = `${API_URL}?action=getQuestions&quizsetId=${quizsetId}`;
    // Use simple fetch, GAS might return CORS redirect if not setup properly, 
    // but standard Web App deployment handles GET JSON fine.
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'success' && data.questions.length > 0) {
      state.questions = data.questions;
      startQuiz();
    } else {
      alert('ไม่พบชุดคำถาม หรือชุดคำถามนี้ถูกปิดการใช้งาน');
      showSection('home');
    }
  } catch (error) {
    console.error(error);
    alert('เกิดข้อผิดพลาดในการดึงข้อมูล โปรดตรวจสอบ API URL ใน Code');
    showSection('home');
  } finally {
    hideLoader();
  }
}

function startQuiz() {
  state.currentQuestionIndex = 0;
  state.score = 0;
  state.detailedAnswers = {};
  state.startTime = new Date();
  
  // Start Timer
  state.timerInterval = setInterval(updateTimer, 1000);
  
  showSection('quiz');
  renderQuestion();
}

function updateTimer() {
  const now = new Date();
  state.durationSeconds = Math.floor((now - state.startTime) / 1000);
  DOM.quiz.timer.innerText = formatTime(state.durationSeconds);
}

function renderQuestion() {
  const q = state.questions[state.currentQuestionIndex];
  
  DOM.quiz.indicator.innerText = `${state.currentQuestionIndex + 1} / ${state.questions.length}`;
  DOM.quiz.questionText.innerText = q.QuestionText;
  
  DOM.quiz.choicesContainer.innerHTML = '';
  
  const choices = [q.Choice1, q.Choice2, q.Choice3, q.Choice4];
  
  choices.forEach(choiceText => {
    if(!choiceText) return; // Skip empty choices
    
    const btn = document.createElement('button');
    btn.className = 'choice-btn w-full bg-white/70 hover:bg-white border-2 border-transparent text-gray-700 font-medium py-4 px-6 rounded-2xl shadow-sm text-left';
    btn.innerText = choiceText;
    
    btn.addEventListener('click', () => handleAnswer(choiceText, btn));
    
    DOM.quiz.choicesContainer.appendChild(btn);
  });
}

function handleAnswer(selectedChoice, buttonElement) {
  // Disable all buttons visually
  const allButtons = DOM.quiz.choicesContainer.querySelectorAll('button');
  allButtons.forEach(btn => {
    btn.disabled = true;
    btn.classList.add('opacity-50');
  });
  
  // Highlight selected
  buttonElement.classList.add('selected', 'opacity-100');
  buttonElement.classList.remove('opacity-50');
  
  const q = state.questions[state.currentQuestionIndex];
  
  // Save detailed answer
  state.detailedAnswers[q.QuestionID] = selectedChoice;
  
  // Grade
  if (selectedChoice.toString().trim() === q.CorrectAnswer.toString().trim()) {
    state.score++;
  }
  
  // Wait a moment then go to next
  setTimeout(() => {
    if (state.currentQuestionIndex < state.questions.length - 1) {
      state.currentQuestionIndex++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }, 500);
}

function finishQuiz() {
  clearInterval(state.timerInterval);
  submitQuizResult();
}

async function submitQuizResult() {
  showLoader('กำลังบันทึกผล...');
  
  const payload = {
    action: 'submitQuiz',
    userName: state.userName,
    quizsetId: state.quizsetId,
    maxScore: state.score,
    duration: state.durationSeconds,
    detailedAnswers: state.detailedAnswers
  };

  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      // text/plain is used to avoid CORS preflight OPTIONS request in GAS
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      }
    });
    
    // Show results
    DOM.result.username.innerText = `คุณ ${state.userName}`;
    DOM.result.score.innerText = `${state.score} / ${state.questions.length}`;
    DOM.result.time.innerText = formatTime(state.durationSeconds);
    
    showSection('result');

  } catch (error) {
    console.error(error);
    alert('เกิดข้อผิดพลาดในการบันทึกผล');
    // Still show result even if save fails so user knows their score
    DOM.result.username.innerText = `คุณ ${state.userName}`;
    DOM.result.score.innerText = `${state.score} / ${state.questions.length}`;
    DOM.result.time.innerText = formatTime(state.durationSeconds);
    showSection('result');
  } finally {
    hideLoader();
  }
}

// ==========================================
// LEADERBOARD LOGIC
// ==========================================
async function loadLeaderboard() {
  showLoader('กำลังโหลดข้อมูล...');
  showSection('leaderboard');
  
  DOM.leaderboard.body.innerHTML = '<tr><td colspan="4" class="text-center py-4">กำลังโหลด...</td></tr>';
  
  try {
    // Fetch both Leaderboard and QuizSets
    const [lbResponse, qzResponse] = await Promise.all([
      fetch(`${API_URL}?action=getLeaderboard`),
      fetch(`${API_URL}?action=getAllQuizSets`)
    ]);
    
    const lbData = await lbResponse.json();
    const qzData = await qzResponse.json();

    if (lbData.status === 'success' && qzData.status === 'success') {
      state.admin.leaderboardData = lbData.leaderboard;
      state.admin.quizSets = qzData.quizSets.filter(q => q.Status === 'Active');
      
      populateLeaderboardDropdown();
    } else {
      DOM.leaderboard.body.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">เกิดข้อผิดพลาด</td></tr>`;
    }
  } catch (error) {
    console.error(error);
    DOM.leaderboard.body.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</td></tr>';
  } finally {
    hideLoader();
  }
}

function populateLeaderboardDropdown() {
  DOM.admin.quizDropdown.innerHTML = '<option value="">-- กรุณาเลือก --</option>';
  state.admin.quizSets.forEach(q => {
    const opt = document.createElement('option');
    opt.value = q.QuizsetID;
    opt.innerText = `${q.QuizsetID}: ${q.Title}`;
    DOM.admin.quizDropdown.appendChild(opt);
  });
  
  // Render empty state initially
  renderLeaderboard('');
  
  DOM.admin.quizDropdown.onchange = (e) => {
    const selectedQuizId = e.target.value;
    renderLeaderboard(selectedQuizId);
    generateQRCode(selectedQuizId);
  };
}

function generateQRCode(quizId) {
  if (!quizId) {
    DOM.admin.qrcodeDisplay.innerHTML = '<span class="text-gray-400 text-sm">กรุณาเลือกชุดข้อสอบ</span>';
    return;
  }
  
  DOM.admin.qrcodeDisplay.innerHTML = '';
  if (qrcodeObj) qrcodeObj.clear();
  qrcodeObj = new QRCode(DOM.admin.qrcodeDisplay, {
    text: quizId,
    width: 200,
    height: 200,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });
}

function renderLeaderboard(quizId) {
  DOM.leaderboard.body.innerHTML = '';
  
  if (!quizId) {
    DOM.leaderboard.body.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-gray-400 font-medium">กรุณาเลือกชุดข้อสอบด้านบน เพื่อดูผลคะแนน</td></tr>';
    return;
  }
  
  const filteredData = state.admin.leaderboardData.filter(d => d.quizsetId === quizId);
  
  if (filteredData.length === 0) {
    DOM.leaderboard.body.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">ยังไม่มีผู้เข้าร่วมในชุดข้อสอบนี้</td></tr>';
    return;
  }

  filteredData.forEach((entry, index) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-white/50 transition";
    
    // Highlight top 3
    let rankHtml = `${index + 1}`;
    if(index === 0) rankHtml = `<i class="fa-solid fa-medal text-yellow-500"></i> 1`;
    else if(index === 1) rankHtml = `<i class="fa-solid fa-medal text-gray-400"></i> 2`;
    else if(index === 2) rankHtml = `<i class="fa-solid fa-medal text-amber-600"></i> 3`;

    tr.innerHTML = `
      <td class="px-4 py-3 font-medium text-gray-800">${rankHtml}</td>
      <td class="px-4 py-3 text-gray-800">${entry.userName} <span class="text-xs text-gray-400 block">${entry.quizsetId}</span></td>
      <td class="px-4 py-3 text-center font-bold text-pastel-purple">${entry.maxScore}</td>
      <td class="px-4 py-3 text-center text-gray-600">${formatTime(entry.duration)}</td>
    `;
    DOM.leaderboard.body.appendChild(tr);
  });
}

function resetState() {
  state.userName = '';
  state.quizsetId = '';
  DOM.inputs.username.value = '';
  clearInterval(state.timerInterval);
}

// Init
DOM.inputs.username.focus();

// ==========================================
// ADMIN LOGIC (SELECT QUIZ & MANAGE QUIZ)
// ==========================================

let qrcodeObj = null;

async function loadAdminQuizSets() {
  showLoader('กำลังโหลดชุดข้อสอบ...');
  DOM.admin.mqQuizFormView.classList.add('hidden');
  DOM.admin.mqListView.classList.remove('hidden');
  
  try {
    const url = `${API_URL}?action=getAllQuizSets`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'success') {
      state.admin.quizSets = data.quizSets;
      renderAdminQuizList();
    }
  } catch (err) {
    console.error(err);
    alert('โหลดข้อมูลล้มเหลว');
  } finally {
    hideLoader();
  }
}

function renderAdminQuizList() {
  const container = DOM.admin.mqQuizList;
  container.innerHTML = '';
  
  if (state.admin.quizSets.length === 0) {
    container.innerHTML = '<div class="text-center text-sm text-gray-500 py-4">ยังไม่มีข้อมูล</div>';
    return;
  }
  
  state.admin.quizSets.forEach(q => {
    const item = document.createElement('div');
    item.className = 'flex justify-between items-center p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition';
    item.innerHTML = `
      <div>
        <div class="font-bold text-gray-800 text-sm">${q.QuizsetID} <span class="${q.Status === 'Active' ? 'text-green-500' : 'text-red-400'} text-xs ml-2">[${q.Status}]</span></div>
        <div class="text-xs text-gray-500">${q.Title}</div>
      </div>
      <div class="flex space-x-2">
        <button class="edit-btn text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"><i class="fa-solid fa-pen"></i></button>
        <button class="del-btn text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    
    item.querySelector('.edit-btn').onclick = () => openQuizForm(q);
    item.querySelector('.del-btn').onclick = () => deleteQuizSet(q.QuizsetID);
    
    container.appendChild(item);
  });
}

DOM.admin.mqCreateNewBtn.onclick = () => openQuizForm(null);
DOM.admin.mqFCancelBtn.onclick = () => {
  DOM.admin.mqQuizFormView.classList.add('hidden');
  DOM.admin.mqListView.classList.remove('hidden');
};

function openQuizForm(quiz) {
  DOM.admin.mqListView.classList.add('hidden');
  DOM.admin.mqQuizFormView.classList.remove('hidden');
  
  if (quiz) {
    state.admin.currentQuizId = quiz.QuizsetID;
    DOM.admin.mqFId.value = quiz.QuizsetID;
    DOM.admin.mqFId.disabled = true; // Prevent changing ID
    DOM.admin.mqFType.value = quiz.QuizType;
    DOM.admin.mqFTitle.value = quiz.Title;
    DOM.admin.mqFDesc.value = quiz.Description;
    DOM.admin.mqFStatus.value = quiz.Status;
    DOM.admin.mqFManageQBtn.classList.remove('hidden');
  } else {
    state.admin.currentQuizId = null;
    DOM.admin.mqFId.value = '';
    DOM.admin.mqFId.disabled = false;
    DOM.admin.mqFType.value = '';
    DOM.admin.mqFTitle.value = '';
    DOM.admin.mqFDesc.value = '';
    DOM.admin.mqFStatus.value = 'Active';
    DOM.admin.mqFManageQBtn.classList.add('hidden'); // Need to save first
  }
}

DOM.admin.mqFSaveBtn.onclick = async () => {
  const payload = {
    action: 'saveQuizSet',
    quizsetId: DOM.admin.mqFId.value.trim(),
    quizType: DOM.admin.mqFType.value.trim(),
    title: DOM.admin.mqFTitle.value.trim(),
    description: DOM.admin.mqFDesc.value.trim(),
    status: DOM.admin.mqFStatus.value
  };
  
  if(!payload.quizsetId) return alert('กรุณากรอกรหัสชุดข้อสอบ');
  
  showLoader('กำลังบันทึก...');
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    alert('บันทึกสำเร็จ');
    loadAdminQuizSets();
  } catch(e) {
    alert('บันทึกล้มเหลว');
  } finally {
    hideLoader();
  }
};

async function deleteQuizSet(id) {
  if(!confirm(`ยืนยันการลบชุดข้อสอบ ${id} ?`)) return;
  
  showLoader('กำลังลบ...');
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteQuizSet', quizsetId: id }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    alert('ลบสำเร็จ');
    loadAdminQuizSets();
  } catch(e) {
    alert('ลบล้มเหลว');
  } finally {
    hideLoader();
  }
}

// Manage Questions Logic
DOM.admin.mqFManageQBtn.onclick = () => {
  const quizId = state.admin.currentQuizId;
  DOM.admin.mqQFormTitle.innerText = `คำถามในชุด ${quizId}`;
  DOM.admin.mqQuestionFormView.classList.remove('hidden');
  loadAdminQuestions(quizId);
};

DOM.admin.mqQCloseBtn.onclick = () => {
  DOM.admin.mqQuestionFormView.classList.add('hidden');
};

async function loadAdminQuestions(quizId) {
  showLoader('กำลังโหลดคำถาม...');
  DOM.admin.mqQList.innerHTML = '<div class="text-center text-sm py-2">กำลังโหลด...</div>';
  clearQuestionForm();
  
  try {
    const url = `${API_URL}?action=getAllQuestionsAdmin&quizsetId=${quizId}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'success') {
      state.admin.questions = data.questions;
      renderAdminQuestionList();
    }
  } catch (err) {
    console.error(err);
    alert('โหลดคำถามล้มเหลว');
  } finally {
    hideLoader();
  }
}

function renderAdminQuestionList() {
  const container = DOM.admin.mqQList;
  container.innerHTML = '';
  
  if (state.admin.questions.length === 0) {
    container.innerHTML = '<div class="text-center text-sm text-gray-500 py-2">ยังไม่มีคำถามในชุดนี้</div>';
    return;
  }
  
  state.admin.questions.forEach(q => {
    const item = document.createElement('div');
    item.className = 'flex justify-between items-start p-2 bg-white rounded-lg border border-gray-200 text-sm';
    item.innerHTML = `
      <div class="flex-1 pr-2">
        <span class="font-bold text-pastel-purple">ข้อ ${q.Number}</span>: ${q.QuestionText}
      </div>
      <div class="flex space-x-1 shrink-0">
        <button class="edit-btn text-blue-500 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"><i class="fa-solid fa-pen"></i></button>
        <button class="del-btn text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    
    item.querySelector('.edit-btn').onclick = () => fillQuestionForm(q);
    item.querySelector('.del-btn').onclick = () => deleteQuestion(q.QuestionID);
    
    container.appendChild(item);
  });
}

function fillQuestionForm(q) {
  DOM.admin.mqQId.value = q.QuestionID;
  DOM.admin.mqQNum.value = q.Number;
  DOM.admin.mqQText.value = q.QuestionText;
  DOM.admin.mqQC1.value = q.Choice1;
  DOM.admin.mqQC2.value = q.Choice2;
  DOM.admin.mqQC3.value = q.Choice3;
  DOM.admin.mqQC4.value = q.Choice4;
  DOM.admin.mqQAns.value = q.CorrectAnswer;
}

function clearQuestionForm() {
  DOM.admin.mqQId.value = '';
  DOM.admin.mqQNum.value = '';
  DOM.admin.mqQText.value = '';
  DOM.admin.mqQC1.value = '';
  DOM.admin.mqQC2.value = '';
  DOM.admin.mqQC3.value = '';
  DOM.admin.mqQC4.value = '';
  DOM.admin.mqQAns.value = '';
}

DOM.admin.mqQClearBtn.onclick = clearQuestionForm;

DOM.admin.mqQSaveBtn.onclick = async () => {
  const payload = {
    action: 'saveQuestion',
    questionId: DOM.admin.mqQId.value.trim(),
    quizsetId: state.admin.currentQuizId,
    number: parseInt(DOM.admin.mqQNum.value) || 0,
    questionText: DOM.admin.mqQText.value.trim(),
    choice1: DOM.admin.mqQC1.value.trim(),
    choice2: DOM.admin.mqQC2.value.trim(),
    choice3: DOM.admin.mqQC3.value.trim(),
    choice4: DOM.admin.mqQC4.value.trim(),
    correctAnswer: DOM.admin.mqQAns.value.trim()
  };
  
  if(!payload.questionText || !payload.correctAnswer) return alert('กรุณากรอกคำถามและเฉลย');
  
  showLoader('กำลังบันทึก...');
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    alert('บันทึกสำเร็จ');
    loadAdminQuestions(state.admin.currentQuizId);
  } catch(e) {
    alert('บันทึกล้มเหลว');
  } finally {
    hideLoader();
  }
};

async function deleteQuestion(id) {
  if(!confirm(`ยืนยันการลบคำถามนี้ ?`)) return;
  
  showLoader('กำลังลบ...');
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteQuestion', questionId: id }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    alert('ลบสำเร็จ');
    loadAdminQuestions(state.admin.currentQuizId);
  } catch(e) {
    alert('ลบล้มเหลว');
  } finally {
    hideLoader();
  }
}
