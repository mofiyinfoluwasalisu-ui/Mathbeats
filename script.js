// script.js — shared logic for all pages

// ---- Utilities ----
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

const STORAGE_KEY = 'mathbeats_state_v1';
const defaultState = {points:0, level:1, streak:0, badges:[], highestLevel:1};

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {...defaultState};
  }catch(e){
    console.error('loadState error',e);
    return {...defaultState};
  }
}
function saveState(st){ localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); }
let state = loadState();

// Add active nav style
function markActiveNav(){
  const page = document.documentElement.getAttribute('data-page') || 'home';
  qsa('.nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href').includes(page));
  });
}

// ---- Motivational quotes ----
const quotes = [
  "Mistakes are proof you're trying.",
  "Every problem has a rhythm—find its beat!",
  "Small steps = big learning.",
  "Practice makes progress, not perfection.",
  "You are smarter than your doubt."
];

function setRandomQuote(el){
  if(!el) return;
  el.innerText = quotes[Math.floor(Math.random()*quotes.length)];
}

// ---- Simple term data ----
const TERMS = {
  coefficient: {
    title: "Coefficient",
    expl: "A coefficient is a number that multiplies a variable. In 3x, 3 is the coefficient.",
    example: "Example: 3x + 2 = 11 → coefficient 3 multiplies x"
  },
  variable: {
    title: "Variable",
    expl: "A variable represents a number that can change. In x + 2 = 5, x is the variable.",
    example: "Solve x + 2 = 5 → x = 3"
  },
  equation:{
    title:"Equation",
    expl:"An equation shows two things are equal using an '=' sign. Solve to find unknowns.",
    example:"2x + 4 = 12 → x = 4"
  },
  mean:{
    title:"Mean (Average)",
    expl:"Add numbers and divide by how many there are.",
    example:"Mean of 2,5,7 → (2+5+7)/3 = 14/3 = 4.67"
  },
  median:{title:"Median", expl:"The middle value when numbers are ordered.", example:"Median of 1,3,9 is 3"}
};

// ---- Quiz / Game logic ----
const QUIZ_BANK = [
  {q:"What is the coefficient in 5x + 2?", choices:["5","x","2"], a:0},
  {q:"In the expression 3y, what is 3?", choices:["variable","coefficient","constant"], a:1},
  {q:"Solve: x + 3 = 7 → x = ?", choices:["4","10","-4"], a:0},
  {q:"Mean of 2 and 6 is:", choices:["4","8","3"], a:0}
];

function randomQuestion(){
  return QUIZ_BANK[Math.floor(Math.random()*QUIZ_BANK.length)];
}

function updateScoreboardUI(){
  qs('#points') && (qs('#points').innerText = state.points);
  qs('#level') && (qs('#level').innerText = state.level);
  qs('#streak') && (qs('#streak').innerText = state.streak);
}

// Award points and check badges
function awardPoints(n){
  state.points += n;
  state.streak = (n>0) ? state.streak + 1 : 0;
  if(state.points >= state.level * 30){
    state.level++;
    if(state.level > state.highestLevel) state.highestLevel = state.level;
    // Earn a level badge
    const name = `Reached level ${state.level}`;
    if(!state.badges.includes(name)) state.badges.push(name);
  }
  // streak badge
  if(state.streak >= 5 && !state.badges.includes('5-in-a-row')) state.badges.push('5-in-a-row');
  saveState(state);
  updateScoreboardUI();
}

// ---- Music (Web Audio): turn numbers/words into melody ----
// We'll map digits/letters to note frequencies (simple mapping).
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playMelodyFromText(text, duration=0.35){
  if(!text) return;
  // sanitize: convert to sequence of numbers between 0..11 (chromatic-ish)
  const arr = Array.from(text).map(ch => {
    if(/\d/.test(ch)) return Number(ch);
    const code = ch.toLowerCase().charCodeAt(0);
    if(code >= 97 && code <= 122) return (code-97) % 12;
    return Math.floor(Math.random()*12);
  }).slice(0,12);
  const base = 220; // frequency base
  let now = audioCtx.currentTime;
  arr.forEach((n,i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base * Math.pow(2, n/12), now + i*duration);
    gain.gain.setValueAtTime(0.0001, now + i*duration);
    gain.gain.exponentialRampToValueAtTime(0.18, now + i*duration + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (i+1)*duration - 0.02);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i*duration);
    osc.stop(now + (i+1)*duration);
  });
}

// ---- Badges UI ----
const BADGE_LIST = [
  {id:'5-in-a-row', title:'5-in-a-row', desc:'Answer 5 correct in a row'},
  {id:'level-3', title:'Level 3', desc:'Reached level 3'},
  {id:'level-5', title:'Level 5', desc:'Reached level 5'}
];

function renderBadges(){
  const grid = qs('#badges-grid');
  if(!grid) return;
  grid.innerHTML = '';
  // show badges from BADGE_LIST and mark unlocked
  BADGE_LIST.forEach(b => {
    const unlocked = state.badges.some(name => name.toLowerCase().includes(b.title.toLowerCase()));
    const div = document.createElement('div');
    div.className = `badge ${unlocked? 'unlocked':''} ${!unlocked ? 'locked':''}`;
    div.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="${unlocked? '#ffd166' : '#7d8590'}" d="M12 2l2.7 6 6.3.5-4.7 3.8L18 20l-6-3.4L6 20l1.7-7.7L3 8.5l6.3-.5z"></path>
      </svg>
      <div class="title">${b.title}</div>
      <div class="desc" style="font-size:12px;color:#cfe7ff;margin-top:6px">${b.desc}</div>
    `;
    grid.appendChild(div);
  });

  qs('#total-points') && (qs('#total-points').innerText = state.points);
  qs('#highest-level') && (qs('#highest-level').innerText = state.highestLevel || state.level);
}

// ---- Page-specific wiring ----
function initHome(){
  markActiveNav();
  setRandomQuote(qs('#motivational-quote'));
  qs('#new-quote') && qs('#new-quote').addEventListener('click', () => setRandomQuote(qs('#motivational-quote')));
  updateScoreboardUI();
}

function initLearn(){
  markActiveNav();
  const select = qs('#term-select');
  const title = qs('#term-title');
  const expl = qs('#term-expl');
  const example = qs('#term-example');

  function showTerm(key){
    const t = TERMS[key];
    if(!t) return;
    title.innerText = t.title;
    expl.innerText = t.expl;
    example.innerText = t.example;
  }
  showTerm(select.value);
  select.addEventListener('change', () => showTerm(select.value));

  // simple example "speak" explanation using speechSynthesis if available
  qs('#hear-term') && qs('#hear-term').addEventListener('click', () => {
    const tex = `${qs('#term-title').innerText}. ${qs('#term-expl').innerText}`;
    if('speechSynthesis' in window){
      const u = new SpeechSynthesisUtterance(tex);
      window.speechSynthesis.speak(u);
    } else {
      // fallback: play melody of the term letters
      playMelodyFromText(qs('#term-title').innerText);
    }
  });

  qs('#quiz-from-term') && qs('#quiz-from-term').addEventListener('click', () => {
    // Quick redirect to game with small hint (store in session)
    sessionStorage.setItem('quiz_hint', qs('#term-title').innerText.toLowerCase());
    window.location.href = 'game.html';
  });
}

function initGame(){
  markActiveNav();
  updateScoreboardUI();
  const qZone = qs('#question-text');
  const choicesWrap = qs('#choices');
  const musicControl = qs('#music-control');
  const musicInput = qs('#music-input');

  function renderQuestion(obj){
    qZone.innerText = obj.q;
    choicesWrap.innerHTML = '';
    obj.choices.forEach((c,i) => {
      const btn = document.createElement('button');
      btn.className = 'choice';
      btn.innerText = c;
      btn.addEventListener('click', () => {
        if(i === obj.a){
          awardPoints(10);
          btn.style.background = 'linear-gradient(90deg,#a7f3d0,#60a5fa)';
          setTimeout(()=> newQuestion(), 500);
        } else {
          awardPoints(0);
          btn.style.background = 'linear-gradient(90deg,#ff9a9e,#fecfef)';
          // small shake
          btn.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:360});
        }
      });
      choicesWrap.appendChild(btn);
    });
  }

  function newQuestion(){
    const maybeHint = sessionStorage.getItem('quiz_hint');
    let q = randomQuestion();
    // if a hint exists, prefer questions containing the hint
    if(maybeHint){
      const found = QUIZ_BANK.find(qq => qq.q.toLowerCase().includes(maybeHint));
      if(found) q = found;
      sessionStorage.removeItem('quiz_hint');
    }
    renderQuestion(q);
  }

  qs('#new-question') && qs('#new-question').addEventListener('click', newQuestion);
  newQuestion();

  // music mode UI
  qs('#music-mode') && qs('#music-mode').addEventListener('click', () => {
    musicControl.classList.toggle('hidden');
  });
  qs('#play-music') && qs('#play-music').addEventListener('click', () => {
    const val = musicInput.value || '12345';
    playMelodyFromText(val);
  });
}

function initRewards(){
  markActiveNav();
  renderBadges();
  qs('#reset-data') && qs('#reset-data').addEventListener('click', () => {
    if(confirm('Reset progress? This will clear points and badges.')){
      state = {...defaultState};
      saveState(state);
      renderBadges();
      updateScoreboardUI();
    }
  });
}

// global init
document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.documentElement.getAttribute('data-page') || 'home';
  // small nav-click handler to highlight links on this page (also handles back/forward)
  qsa('.nav-link').forEach(a => {
    a.addEventListener('click', () => {
      qsa('.nav-link').forEach(n=>n.classList.remove('active'));
      a.classList.add('active');
    });
  });

  if(page === 'home') initHome();
  if(page === 'learn') initLearn();
  if(page === 'game') initGame();
  if(page === 'rewards') initRewards();

  // common updates
  updateScoreboardUI();
});
