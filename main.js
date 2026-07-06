// ==========================================
// CONFIGURATION
// ==========================================
// ⚠️ สำคัญ: นำ URL ของ Web App จาก Google Apps Script มาใส่ที่นี่
const API_URL = 'https://script.google.com/macros/s/AKfycbxAPoAczKzKgJARYPV64HP3xAmuhX4sPMs3_iNvMHb2lVpzJY7RlwliRzpezPuTkW8-Ww/exec';
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
  timerInterval: null
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
    refreshLeaderboard: document.getElementById('refresh-leaderboard-btn')
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
  showLoader('กำลังโหลดกระดานคะแนน...');
  showSection('leaderboard');
  
  DOM.leaderboard.body.innerHTML = '<tr><td colspan="4" class="text-center py-4">กำลังโหลด...</td></tr>';
  
  try {
    const url = `${API_URL}?action=getLeaderboard`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'success') {
      renderLeaderboard(data.leaderboard);
    } else {
      DOM.leaderboard.body.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">เกิดข้อผิดพลาด: ${data.message}</td></tr>`;
    }
  } catch (error) {
    console.error(error);
    DOM.leaderboard.body.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</td></tr>';
  } finally {
    hideLoader();
  }
}

function renderLeaderboard(data) {
  DOM.leaderboard.body.innerHTML = '';
  
  if (data.length === 0) {
    DOM.leaderboard.body.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">ยังไม่มีข้อมูล</td></tr>';
    return;
  }

  data.forEach((entry, index) => {
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
