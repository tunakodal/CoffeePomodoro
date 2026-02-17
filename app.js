const els = {
  coffeeImg: document.getElementById("coffeeImg"),
  timeText: document.getElementById("timeText"),
  timerSub: document.getElementById("timerSub"),
  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  restartBtn: document.getElementById("restartBtn"),
  focusInput: document.getElementById("focusInput"),
  breakInput: document.getElementById("breakInput"),
  applyBtn: document.getElementById("applyBtn"),
  todoForm: document.getElementById("todoForm"),
  todoInput: document.getElementById("todoInput"),
  todoList: document.getElementById("todoList"),
};

const STORAGE_KEY = "coffee_pomodoro_v3";

// 5 images => levels 4..0
const LEVEL_MAX = 4;   // full
const LEVEL_MIN = 0;   // empty
const LEVEL_STEPS = 4; // 4 transitions
const TAIL_SEC = 5;    // last 5 seconds rule

let state = {
  mode: "focus",
  focusMin: 55,
  breakMin: 5,

  running: false,
  intervalId: null,

  totalSec: 55 * 60,
  remainingSec: 55 * 60,

  elapsedSec: 0,       // for break count-up
  displaySec: 55 * 60, // what we show

  level: LEVEL_MAX,

  segmentSec: 1,
  segmentLeftSec: 1,
  changesDone: 0,

  todos: [],
};

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function fmtTime(sec){
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function coffeeSrc(level){
  level = clamp(level, LEVEL_MIN, LEVEL_MAX);
  return `assets/coffee_${level}.png`;
}

function persist(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    focusMin: state.focusMin,
    breakMin: state.breakMin,
    todos: state.todos,
  }));
}

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const p = JSON.parse(raw);
    if(typeof p.focusMin === "number") state.focusMin = p.focusMin;
    if(typeof p.breakMin === "number") state.breakMin = p.breakMin;
    if(Array.isArray(p.todos)) state.todos = p.todos;
  }catch{}
}

function setMode(mode){
  state.mode = mode;

  state.totalSec = (mode === "focus" ? state.focusMin : state.breakMin) * 60;
  state.remainingSec = state.totalSec;

  state.elapsedSec = 0;
  state.displaySec = (mode === "focus") ? state.remainingSec : 0;

  state.level = (mode === "focus") ? LEVEL_MAX : LEVEL_MIN;

  // 4 level changes BEFORE last 5 seconds
  const effective = Math.max(1, state.totalSec - TAIL_SEC);
  state.segmentSec = Math.max(1, Math.floor(effective / LEVEL_STEPS));
  state.segmentLeftSec = state.segmentSec;

  state.changesDone = 0;
}

function applyTailRule(){
  if(state.remainingSec <= TAIL_SEC){
    state.level = (state.mode === "focus") ? LEVEL_MIN : LEVEL_MAX;
  }
}

function updateUI(){
  const label = state.mode === "focus" ? "Focus" : "Break";
  els.timerSub.textContent = label;

  els.timeText.textContent = fmtTime(state.displaySec);
  els.coffeeImg.src = coffeeSrc(state.level);

  els.startBtn.disabled = state.running;
  els.pauseBtn.disabled = !state.running;
}

function tick(){
  if(!state.running) return;

  state.remainingSec -= 1;
  state.elapsedSec += 1;

  // focus down, break up
  state.displaySec = (state.mode === "focus") ? state.remainingSec : state.elapsedSec;

  // segment-based level changes only outside last 5 seconds
  if(state.remainingSec > TAIL_SEC){
    state.segmentLeftSec -= 1;

    if(state.segmentLeftSec <= 0 && state.changesDone < LEVEL_STEPS){
      state.changesDone += 1;

      if(state.mode === "focus"){
        state.level = clamp(LEVEL_MAX - state.changesDone, LEVEL_MIN, LEVEL_MAX);
      } else {
        state.level = clamp(LEVEL_MIN + state.changesDone, LEVEL_MIN, LEVEL_MAX);
      }

      state.segmentLeftSec = state.segmentSec;
    }
  }

  // tail override
  applyTailRule();

  // end
  if(state.remainingSec <= 0){
    state.level = (state.mode === "focus") ? LEVEL_MIN : LEVEL_MAX;
    state.displaySec = (state.mode === "focus") ? 0 : state.totalSec;

    updateUI();

    setMode(state.mode === "focus" ? "break" : "focus");
    updateUI();
    return;
  }

  updateUI();
}

function start(){
  if(state.running) return;
  state.running = true;
  state.intervalId = setInterval(tick, 1000);
  updateUI();
}

function pause(){
  state.running = false;
  if(state.intervalId){
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  updateUI();
}

function restart(){
  pause();
  setMode("focus");
  updateUI();
}

function applySettings(){
  const f = parseInt(els.focusInput.value, 10);
  const b = parseInt(els.breakInput.value, 10);

  state.focusMin = clamp(isNaN(f) ? 55 : f, 1, 180);
  state.breakMin = clamp(isNaN(b) ? 5 : b, 1, 60);

  persist();
  restart();
}

/* --------- TODO --------- */
function renderTodos(){
  els.todoList.innerHTML = "";
  for(const t of state.todos){
    const li = document.createElement("li");
    li.className = "todo-item" + (t.done ? " done" : "");

    const text = document.createElement("div");
    text.className = "todo-text";
    text.textContent = t.text;

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    const doneBtn = document.createElement("button");
    doneBtn.className = "iconbtn done";
    doneBtn.type = "button";
    doneBtn.textContent = t.done ? "↺" : "✓";
    doneBtn.onclick = () => {
      t.done = !t.done;
      persist();
      renderTodos();
    };

    const delBtn = document.createElement("button");
    delBtn.className = "iconbtn del";
    delBtn.type = "button";
    delBtn.textContent = "✕";
    delBtn.onclick = () => {
      state.todos = state.todos.filter(x => x.id !== t.id);
      persist();
      renderTodos();
    };

    actions.appendChild(doneBtn);
    actions.appendChild(delBtn);

    li.appendChild(text);
    li.appendChild(actions);
    els.todoList.appendChild(li);
  }
}

function addTodo(text){
  const clean = (text || "").trim();
  if(!clean) return;
  state.todos.unshift({ id: crypto.randomUUID(), text: clean, done: false });
  state.todos = state.todos.slice(0, 14);
  persist();
  renderTodos();
}

function init(){
  load();

  // default: 55 / 5 (or loaded)
  els.focusInput.value = state.focusMin;
  els.breakInput.value = state.breakMin;

  setMode("focus");
  updateUI();

  els.startBtn.addEventListener("click", start);
  els.pauseBtn.addEventListener("click", pause);
  els.restartBtn.addEventListener("click", restart);
  els.applyBtn.addEventListener("click", applySettings);

  els.todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(els.todoInput.value);
    els.todoInput.value = "";
  });

  renderTodos();
}

init();
