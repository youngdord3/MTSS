// ─── STATE ───────────────────────────────────────────────────────────────────
let allQuestions = [];
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;
let wrongAnswersCount = 0;
let selectedIndices = [];
let userErrors = [];
let isTrainingMode = false;
let trainingQueue = [];

const STORAGE_KEY = 'quiz_errors';

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const progress = document.getElementById('progress-bar');
const counter = document.getElementById('counter');
const scoreDisplay = document.getElementById('score');
const typeBadge = document.getElementById('question-type');
const quizCard = document.getElementById('quiz-card');
const resultCard = document.getElementById('result-card');
const correctDisplay = document.getElementById('correct-count');
const wrongDisplay = document.getElementById('wrong-count');
const finalScoreDisplay = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const reviewBtn = document.getElementById('review-btn');
const reviewList = document.getElementById('review-list');
const trainingBtn = document.getElementById('training-btn');
const trainingBanner = document.getElementById('training-banner');
const persistentBadge = document.getElementById('persistent-errors-badge');

// ─── LOCALSTORAGE HELPERS ────────────────────────────────────────────────────
function loadPersistedErrors() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function savePersistedErrors(errors) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
    } catch {
        // storage non disponibile
    }
}

function mergeErrors(newErrors) {
    const stored = loadPersistedErrors();
    newErrors.forEach(err => {
        const exists = stored.find(e => e.question === err.question);
        if (!exists) stored.push(err);
    });
    savePersistedErrors(stored);
}

function removeFromPersistedErrors(questionText) {
    const stored = loadPersistedErrors().filter(e => e.question !== questionText);
    savePersistedErrors(stored);
}

function updatePersistentBadge() {
    const count = loadPersistedErrors().length;
    if (count > 0) {
        persistentBadge.textContent = `${count} errori salvati`;
        persistentBadge.classList.remove('hidden');
    } else {
        persistentBadge.classList.add('hidden');
    }
}

// ─── SORT HELPER (fix: numeric sort) ─────────────────────────────────────────
function numSort(arr) {
    return [...arr].sort((a, b) => a - b);
}

function answersEqual(selected, correct) {
    const a = numSort(selected);
    const b = numSort(correct);
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
fetch('quiz.json')
    .then(res => res.json())
    .then(data => {
        allQuestions = data;
        updatePersistentBadge();
        startQuiz();
    });

// ─── QUIZ FLOW ────────────────────────────────────────────────────────────────
function startQuiz() {
    isTrainingMode = false;
    currentQuestionIndex = 0;
    score = 0;
    correctAnswersCount = 0;
    wrongAnswersCount = 0;
    userErrors = [];

    questions = [...allQuestions].sort(() => Math.random() - 0.5);

    resultCard.classList.add('hidden');
    reviewList.classList.add('hidden');
    reviewBtn.classList.add('hidden');
    trainingBtn.classList.add('hidden');
    quizCard.classList.remove('hidden');
    trainingBanner.classList.add('hidden');

    loadQuestion();
}

function startTrainingMode() {
    const stored = loadPersistedErrors();
    if (stored.length === 0) {
        alert('Nessun errore salvato! Completa prima un quiz.');
        return;
    }

    isTrainingMode = true;
    currentQuestionIndex = 0;
    score = 0;
    correctAnswersCount = 0;
    wrongAnswersCount = 0;
    userErrors = [];

    // In training mode, questions are the persisted errors (shuffled)
    trainingQueue = [...stored].sort(() => Math.random() - 0.5);
    questions = trainingQueue.map(e => ({
        question: e.question,
        options: e.options,
        correct: e.correct,
        multiple: e.correct.length > 1
    }));

    resultCard.classList.add('hidden');
    reviewList.classList.add('hidden');
    reviewBtn.classList.add('hidden');
    trainingBtn.classList.add('hidden');
    quizCard.classList.remove('hidden');
    trainingBanner.classList.remove('hidden');

    loadQuestion();
}

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    selectedIndices = [];
    questionText.innerText = q.question;
    typeBadge.innerText = q.multiple ? 'Risposta Multipla' : 'Risposta Singola';
    optionsContainer.className = q.multiple
        ? 'options-list multi-choice'
        : 'options-list single-choice';
    optionsContainer.innerHTML = '';
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
    const current = currentQuestionIndex + 1;
    const prefix = isTrainingMode ? '🔁 Allenamento ' : '';
    counter.innerText = `${prefix}Domanda ${current}/${total}`;
    progress.style.width = `${(current / total) * 100}%`;
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
        // Se siamo in training mode e rispondiamo giusto → rimuovi dagli errori persistenti
        if (isTrainingMode) {
            removeFromPersistedErrors(q.question);
            updatePersistentBadge();
        }
    } else {
        wrongAnswersCount++;
        const errEntry = {
            question: q.question,
            options: q.options,
            correct: q.correct,
            userChoices: [...selectedIndices]
        };
        userErrors.push(errEntry);
        // Salva negli errori persistenti (evita duplicati)
        mergeErrors([errEntry]);
        updatePersistentBadge();
    }

    // Mostra feedback visivo
    document.querySelectorAll('.option').forEach((el, i) => {
        if (q.correct.includes(i)) el.classList.add('correct');
        else if (selectedIndices.includes(i)) el.classList.add('wrong');
    });

    scoreDisplay.innerText = `Punti: ${score}`;
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
    correctDisplay.innerText = correctAnswersCount;
    wrongDisplay.innerText = wrongAnswersCount;
    finalScoreDisplay.innerText = `${score}/${questions.length * 2}`;

    if (userErrors.length > 0) reviewBtn.classList.remove('hidden');

    // Mostra bottone allenamento se ci sono errori salvati
    if (loadPersistedErrors().length > 0) {
        trainingBtn.classList.remove('hidden');
    }

    // Messaggio contestuale
    const pct = correctAnswersCount / questions.length;
    const msgEl = document.getElementById('result-message');
    if (msgEl) {
        if (isTrainingMode && userErrors.length === 0) {
            msgEl.textContent = '🎉 Perfetto! Hai risposto correttamente a tutti gli errori. Continua così!';
        } else if (pct >= 0.9) {
            msgEl.textContent = '🔥 Eccellente! Sei praticamente pronto per l\'esame.';
        } else if (pct >= 0.7) {
            msgEl.textContent = '👍 Buon risultato! Qualche lacuna da colmare.';
        } else {
            msgEl.textContent = '📚 C\'è ancora da studiare. Usa la modalità allenamento!';
        }
    }
}

// ─── REVIEW ──────────────────────────────────────────────────────────────────
reviewBtn.onclick = () => {
    reviewList.innerHTML = '';
    userErrors.forEach(err => {
        const item = document.createElement('div');
        item.className = 'review-item';
        let optionsHtml = '';
        err.options.forEach((opt, idx) => {
            const isCorrect = err.correct.includes(idx);
            const wasChosen = err.userChoices.includes(idx);
            let statusClass = '';
            if (isCorrect && wasChosen) statusClass = 'both';
            else if (isCorrect) statusClass = 'correct-was';
            else if (wasChosen) statusClass = 'user-had';
            optionsHtml += `<div class="review-opt ${statusClass}">${opt}</div>`;
        });
        item.innerHTML = `<span class="review-q-text">${err.question}</span>${optionsHtml}`;
        reviewList.appendChild(item);
    });
    reviewList.classList.toggle('hidden');
    reviewBtn.innerText = reviewList.classList.contains('hidden')
        ? 'Rivedi Errori'
        : 'Nascondi Revisione';
};

// ─── BUTTONS ──────────────────────────────────────────────────────────────────
restartBtn.onclick = startQuiz;
trainingBtn.onclick = startTrainingMode;

// Bottone per cancellare tutti gli errori salvati
const clearErrorsBtn = document.getElementById('clear-errors-btn');
if (clearErrorsBtn) {
    clearErrorsBtn.onclick = () => {
        if (confirm('Sei sicuro di voler cancellare tutti gli errori salvati?')) {
            savePersistedErrors([]);
            updatePersistentBadge();
            trainingBtn.classList.add('hidden');
        }
    };
}