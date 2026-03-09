let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0;
let wrongAnswersCount = 0;
let selectedIndices = [];
let userErrors = []; // Array per salvare le domande sbagliate

// Riferimenti DOM (Inclusi quelli mancanti)
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

fetch('quiz.json')
    .then(res => res.json())
    .then(data => {
        questions = data;
        startQuiz();
    });

function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    correctAnswersCount = 0;
    wrongAnswersCount = 0;
    userErrors = [];
    questions.sort(() => Math.random() - 0.5);

    resultCard.classList.add('hidden');
    reviewList.classList.add('hidden');
    reviewBtn.classList.add('hidden');
    quizCard.classList.remove('hidden');
    loadQuestion();
}

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    selectedIndices = [];
    questionText.innerText = q.question;
    typeBadge.innerText = q.multiple ? "Risposta Multipla" : "Risposta Singola";
    optionsContainer.className = q.multiple ? 'options-list multi-choice' : 'options-list single-choice';
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
    counter.innerText = `Domanda ${currentQuestionIndex + 1}/${total}`;
    progress.style.width = `${((currentQuestionIndex + 1) / total) * 100}%`;
}

submitBtn.onclick = () => {
    if (selectedIndices.length === 0) return alert("Seleziona almeno una risposta!");
    const q = questions[currentQuestionIndex];
    const isCorrect = JSON.stringify(selectedIndices.sort()) === JSON.stringify(q.correct.sort());

    if (isCorrect) {
        score += 2;
        correctAnswersCount++;
    } else {
        wrongAnswersCount++;
        // Salviamo l'errore per la revisione
        userErrors.push({
            question: q.question,
            options: q.options,
            correct: q.correct,
            userChoices: [...selectedIndices]
        });
    }

    document.querySelectorAll('.option').forEach((el, i) => {
        if (q.correct.includes(i)) el.classList.add('correct');
        else if (selectedIndices.includes(i)) el.classList.add('wrong');
    });

    scoreDisplay.innerText = `Punti: ${score}`;
    submitBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
};

nextBtn.onclick = () => {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) loadQuestion();
    else showResults();
};

function showResults() {
    quizCard.classList.add('hidden');
    resultCard.classList.remove('hidden');
    correctDisplay.innerText = correctAnswersCount;
    wrongDisplay.innerText = wrongAnswersCount;
    finalScoreDisplay.innerText = `${score}/${questions.length * 2}`;

    if (userErrors.length > 0) reviewBtn.classList.remove('hidden');
}

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
    reviewBtn.innerText = reviewList.classList.contains('hidden') ? "Rivedi Errori" : "Nascondi Revisione";
};

restartBtn.onclick = startQuiz;