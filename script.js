// ─── STATE ────────────────────────────────────────────────────────────────────
let allQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;
let wrongAnswersCount = 0;
let selectedIndices = [];
let userErrors = [];
let isTrainingMode = false;
let selectedTags = new Set();

const STORAGE_KEY = 'quiz_errors';

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const setupCard = document.getElementById('setup-card');
const tagsContainer = document.getElementById('tags-container');
const selectAllBtn = document.getElementById('select-all-btn');
const deselectAllBtn = document.getElementById('deselect-all-btn');
const slider = document.getElementById('question-count-slider');
const countDisplay = document.getElementById('count-display');
const availableCount = document.getElementById('available-count');
const setupError = document.getElementById('setup-error');
const startQuizBtn = document.getElementById('start-quiz-btn');
const startTrainingSetup = document.getElementById('start-training-setup-btn');
const errorsCountBadge = document.getElementById('errors-count-badge');
const trainingBanner = document.getElementById('training-banner');
const quizCard = document.getElementById('quiz-card');
const questionText = document.getElementById('question-text');
const questionTag = document.getElementById('question-tag');
const optionsContainer = document.getElementById('options-container');
const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const progress = document.getElementById('progress-bar');
const counter = document.getElementById('counter');
const scoreDisplay = document.getElementById('score');
const typeBadge = document.getElementById('question-type');
const explanationBox = document.getElementById('explanation-box');
const explanationText = document.getElementById('explanation-text');
const resultCard = document.getElementById('result-card');
const correctDisplay = document.getElementById('correct-count');
const wrongDisplay = document.getElementById('wrong-count');
const finalScoreDisplay = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const reviewBtn = document.getElementById('review-btn');
const reviewList = document.getElementById('review-list');
const trainingBtn = document.getElementById('training-btn');
const persistentBadge = document.getElementById('persistent-errors-badge');
const clearErrorsBtn = document.getElementById('clear-errors-btn');

// ─── LOCALSTORAGE ─────────────────────────────────────────────────────────────
function loadPersistedErrors() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}
function savePersistedErrors(errors) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(errors)); } catch { }
}
function mergeErrors(newErrors) {
    const stored = loadPersistedErrors();
    newErrors.forEach(err => {
        if (!stored.find(e => e.question === err.question)) stored.push(err);
    });
    savePersistedErrors(stored);
}
function removeFromPersistedErrors(q) {
    savePersistedErrors(loadPersistedErrors().filter(e => e.question !== q));
}

// ─── SORT / COMPARE ───────────────────────────────────────────────────────────
function numSort(arr) { return [...arr].sort((a, b) => a - b); }
function answersEqual(selected, correct) {
    const a = numSort(selected), b = numSort(correct);
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ─── BADGES ──────────────────────────────────────────────────────────────────
function updatePersistentBadge() {
    const count = loadPersistedErrors().length;
    persistentBadge.textContent = count + ' errori salvati';
    persistentBadge.classList.toggle('hidden', count === 0);
    errorsCountBadge.textContent = count;
    errorsCountBadge.classList.toggle('hidden', count === 0);
}

// ─── TAGS & SETUP ─────────────────────────────────────────────────────────────
function getAllTags() {
    const tags = new Set();
    allQuestions.forEach(q => (q.tags || []).forEach(t => tags.add(t)));
    return [...tags].sort();
}

function getFilteredCount() {
    if (selectedTags.size === 0) return 0;
    return allQuestions.filter(q => (q.tags || []).some(t => selectedTags.has(t))).length;
}

function renderTags() {
    tagsContainer.innerHTML = '';
    getAllTags().forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag-toggle active';
        btn.textContent = tag;
        btn.dataset.tag = tag;
        selectedTags.add(tag);
        btn.onclick = () => {
            if (selectedTags.has(tag)) {
                selectedTags.delete(tag);
                btn.classList.remove('active');
            } else {
                selectedTags.add(tag);
                btn.classList.add('active');
            }
            updateSliderMax();
        };
        tagsContainer.appendChild(btn);
    });
    updateSliderMax();
}

function updateSliderMax() {
    const avail = getFilteredCount();
    availableCount.textContent = avail;
    const maxVal = Math.max(avail, 1);
    slider.max = maxVal;
    if (parseInt(slider.value) > avail) slider.value = avail;
    countDisplay.textContent = slider.value;
}

selectAllBtn.onclick = () => {
    document.querySelectorAll('.tag-toggle').forEach(btn => {
        btn.classList.add('active');
        selectedTags.add(btn.dataset.tag);
    });
    updateSliderMax();
};

deselectAllBtn.onclick = () => {
    document.querySelectorAll('.tag-toggle').forEach(btn => {
        btn.classList.remove('active');
        selectedTags.delete(btn.dataset.tag);
    });
    updateSliderMax();
};

slider.oninput = () => { countDisplay.textContent = slider.value; };

// ─── INIT ─────────────────────────────────────────────────────────────────────
fetch('quiz.json')
    .then(r => r.json())
    .then(data => {
        allQuestions = data;
        renderTags();
        updatePersistentBadge();
        showSetup();
    });

// ─── SCREENS ─────────────────────────────────────────────────────────────────
function showSetup() {
    setupCard.classList.remove('hidden');
    quizCard.classList.add('hidden');
    resultCard.classList.add('hidden');
    trainingBanner.classList.add('hidden');
    progress.style.width = '0%';
    counter.innerText = '';
    scoreDisplay.innerText = 'Punti: 0';
    updatePersistentBadge();
}

function hideSetup() {
    setupCard.classList.add('hidden');
    setupError.classList.add('hidden');
}

// ─── START QUIZ ───────────────────────────────────────────────────────────────
startQuizBtn.onclick = () => {
    if (selectedTags.size === 0) { setupError.classList.remove('hidden'); return; }
    setupError.classList.add('hidden');

    isTrainingMode = false;
    resetCounters();

    const pool = allQuestions
        .filter(q => (q.tags || []).some(t => selectedTags.has(t)))
        .sort(() => Math.random() - 0.5)
        .slice(0, parseInt(slider.value));

    if (pool.length === 0) { setupError.classList.remove('hidden'); return; }

    questions = pool;
    hideSetup();
    trainingBanner.classList.add('hidden');
    quizCard.classList.remove('hidden');
    resultCard.classList.add('hidden');
    reviewList.classList.add('hidden');
    loadQuestion();
};

// ─── TRAINING MODE ────────────────────────────────────────────────────────────
startTrainingSetup.onclick = startTrainingMode;
trainingBtn.onclick = startTrainingMode;

function startTrainingMode() {
    const stored = loadPersistedErrors();
    if (stored.length === 0) { alert('Nessun errore salvato! Completa prima un quiz.'); return; }

    isTrainingMode = true;
    resetCounters();

    questions = [...stored].sort(() => Math.random() - 0.5).map(e => ({
        question: e.question,
        options: e.options,
        correct: e.correct,
        multiple: e.correct.length > 1,
        tags: e.tags || [],
        explanation: e.explanation || ''
    }));

    hideSetup();
    trainingBanner.classList.remove('hidden');
    quizCard.classList.remove('hidden');
    resultCard.classList.add('hidden');
    reviewList.classList.add('hidden');
    loadQuestion();
}

function resetCounters() {
    currentQuestionIndex = 0;
    score = 0;
    correctAnswersCount = 0;
    wrongAnswersCount = 0;
    userErrors = [];
    scoreDisplay.innerText = 'Punti: 0';
}

// ─── LOAD QUESTION ────────────────────────────────────────────────────────────
function loadQuestion() {
    const q = questions[currentQuestionIndex];
    selectedIndices = [];

    questionText.innerText = q.question;
    typeBadge.innerText = q.multiple ? 'Risposta Multipla' : 'Risposta Singola';

    const tag = (q.tags || [])[0] || '';
    questionTag.textContent = tag;
    questionTag.style.display = tag ? 'inline-block' : 'none';

    optionsContainer.className = q.multiple
        ? 'options-list multi-choice'
        : 'options-list single-choice';
    optionsContainer.innerHTML = '';

    explanationBox.classList.add('hidden');
    explanationBox.classList.remove('explanation-correct', 'explanation-wrong');
    explanationText.textContent = '';

    nextBtn.classList.add('hidden');
    submitBtn.classList.remove('hidden');

    q.options.forEach((opt, i) => {
        const div = document.createElement('div');
        div.className = 'option';
        div.innerText = opt;
        div.onclick = () => selectOption(i, div);
        optionsContainer.appendChild(div);
    });

    updateUI();
}

function selectOption(index, element) {
    const q = questions[currentQuestionIndex];
    if (q.multiple) {
        if (selectedIndices.includes(index)) {
            selectedIndices = selectedIndices.filter(i => i !== index);
            element.classList.remove('selected');
        } else {
            selectedIndices.push(index);
            element.classList.add('selected');
        }
    } else {
        document.querySelectorAll('.option').forEach(el => el.classList.remove('selected'));
        selectedIndices = [index];
        element.classList.add('selected');
    }
}

function updateUI() {
    const total = questions.length;
    const cur = currentQuestionIndex + 1;
    counter.innerText = (isTrainingMode ? '🔁 ' : '') + 'Domanda ' + cur + '/' + total;
    progress.style.width = ((cur / total) * 100) + '%';
}

// ─── SUBMIT ───────────────────────────────────────────────────────────────────
submitBtn.onclick = () => {
    if (selectedIndices.length === 0) {
        optionsContainer.classList.add('shake');
        setTimeout(() => optionsContainer.classList.remove('shake'), 400);
        return;
    }

    const q = questions[currentQuestionIndex];
    const isCorrect = answersEqual(selectedIndices, q.correct);

    if (isCorrect) {
        score += 2;
        correctAnswersCount++;
        if (isTrainingMode) { removeFromPersistedErrors(q.question); updatePersistentBadge(); }
    } else {
        wrongAnswersCount++;
        const errEntry = {
            question: q.question,
            options: q.options,
            correct: q.correct,
            userChoices: [...selectedIndices],
            tags: q.tags || [],
            explanation: q.explanation || ''
        };
        userErrors.push(errEntry);
        mergeErrors([errEntry]);
        updatePersistentBadge();
    }

    document.querySelectorAll('.option').forEach((el, i) => {
        if (q.correct.includes(i)) el.classList.add('correct');
        else if (selectedIndices.includes(i)) el.classList.add('wrong');
    });

    if (q.explanation) {
        explanationText.textContent = q.explanation;
        explanationBox.classList.remove('hidden');
        explanationBox.classList.add(isCorrect ? 'explanation-correct' : 'explanation-wrong');
    }

    scoreDisplay.innerText = 'Punti: ' + score;
    submitBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
};

// ─── NEXT ─────────────────────────────────────────────────────────────────────
nextBtn.onclick = () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) loadQuestion();
    else showResults();
};

// ─── RESULTS ─────────────────────────────────────────────────────────────────
function showResults() {
    quizCard.classList.add('hidden');
    resultCard.classList.remove('hidden');
    trainingBanner.classList.add('hidden');

    correctDisplay.innerText = correctAnswersCount;
    wrongDisplay.innerText = wrongAnswersCount;
    finalScoreDisplay.innerText = score + '/' + (questions.length * 2);

    reviewBtn.classList.toggle('hidden', userErrors.length === 0);
    trainingBtn.classList.toggle('hidden', loadPersistedErrors().length === 0);
    reviewList.classList.add('hidden');
    reviewBtn.innerText = 'Rivedi Errori';

    const pct = correctAnswersCount / questions.length;
    const msgEl = document.getElementById('result-message');
    if (isTrainingMode && userErrors.length === 0)
        msgEl.textContent = '🎉 Perfetto! Hai risposto correttamente a tutti gli errori salvati.';
    else if (pct >= 0.9)
        msgEl.textContent = '🔥 Eccellente! Sei praticamente pronto per l\'esame.';
    else if (pct >= 0.7)
        msgEl.textContent = '👍 Buon risultato! Qualche lacuna da colmare.';
    else
        msgEl.textContent = '📚 C\'è ancora da studiare. Usa la modalità allenamento!';
}

// ─── REVIEW ──────────────────────────────────────────────────────────────────
reviewBtn.onclick = () => {
    if (!reviewList.classList.contains('hidden')) {
        reviewList.classList.add('hidden');
        reviewBtn.innerText = 'Rivedi Errori';
        return;
    }
    reviewList.innerHTML = '';
    userErrors.forEach(err => {
        const item = document.createElement('div');
        item.className = 'review-item';
        const optsHtml = err.options.map((opt, idx) => {
            const isCor = err.correct.includes(idx);
            const wasCh = err.userChoices.includes(idx);
            const cls = (isCor && wasCh) ? 'both' : isCor ? 'correct-was' : wasCh ? 'user-had' : '';
            return '<div class="review-opt ' + cls + '">' + opt + '</div>';
        }).join('');
        const explHtml = err.explanation
            ? '<div class="review-explanation">💡 ' + err.explanation + '</div>' : '';
        item.innerHTML = '<span class="review-q-text">' + err.question + '</span>' + optsHtml + explHtml;
        reviewList.appendChild(item);
    });
    reviewList.classList.remove('hidden');
    reviewBtn.innerText = 'Nascondi Revisione';
};

// ─── BUTTONS ─────────────────────────────────────────────────────────────────
restartBtn.onclick = showSetup;

clearErrorsBtn.onclick = () => {
    if (confirm('Cancellare tutti gli errori salvati?')) {
        savePersistedErrors([]);
        updatePersistentBadge();
        trainingBtn.classList.add('hidden');
    }
};