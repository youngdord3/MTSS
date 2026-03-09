let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let correctAnswersCount = 0; // Per la schermata finale
let wrongAnswersCount = 0;   // Per la schermata finale
let selectedIndices = [];

// Elementi DOM aggiuntivi
const quizCard = document.getElementById('quiz-card');
const resultCard = document.getElementById('result-card');
const correctDisplay = document.getElementById('correct-count');
const wrongDisplay = document.getElementById('wrong-count');
const finalScoreDisplay = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

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
    // RANDOMIZZAZIONE: Mescola l'ordine delle domande
    questions.sort(() => Math.random() - 0.5);

    resultCard.classList.add('hidden');
    quizCard.classList.remove('hidden');
    scoreDisplay.innerText = `Punti: 0`;
    loadQuestion();
}

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    selectedIndices = [];

    questionText.innerText = q.question;
    typeBadge.innerText = q.multiple ? "Risposta Multipla" : "Risposta Singola";

    // Cambia classe visiva per indicatori (cerchi/quadrati)
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

// ... (selectOption e updateUI rimangono simili)

submitBtn.onclick = () => {
    if (selectedIndices.length === 0) return alert("Seleziona almeno una risposta!");

    const q = questions[currentQuestionIndex];
    const isCorrect = JSON.stringify(selectedIndices.sort()) === JSON.stringify(q.correct.sort());

    if (isCorrect) {
        score += 2;
        correctAnswersCount++;
    } else {
        wrongAnswersCount++;
        // FEEDBACK VISIVO: Animazione shake se sbagliato
        quizCard.classList.add('shake');
        setTimeout(() => quizCard.classList.remove('shake'), 400);
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
    if (currentQuestionIndex < questions.length) {
        loadQuestion();
    } else {
        showResults();
    }
};

function showResults() {
    quizCard.classList.add('hidden');
    resultCard.classList.remove('hidden');

    correctDisplay.innerText = correctAnswersCount;
    wrongDisplay.innerText = wrongAnswersCount;
    finalScoreDisplay.innerText = `${score}/${questions.length * 2}`;
}

restartBtn.onclick = startQuiz;