let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedIndices = [];

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const submitBtn = document.getElementById('submit-btn');
const nextBtn = document.getElementById('next-btn');
const progress = document.getElementById('progress-bar');
const counter = document.getElementById('counter');
const scoreDisplay = document.getElementById('score');
const typeBadge = document.getElementById('question-type');

// Carica il file JSON
fetch('quiz.json')
    .then(res => res.json())
    .then(data => {
        questions = data;
        loadQuestion();
    });

function loadQuestion() {
    const q = questions[currentQuestionIndex];
    selectedIndices = [];

    questionText.innerText = q.question;
    typeBadge.innerText = q.multiple ? "Risposta Multipla" : "Risposta Singola";
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
    counter.innerText = `Domanda ${current}/${total}`;
    progress.style.width = `${(current / total) * 100}%`;
}

submitBtn.onclick = () => {
    if (selectedIndices.length === 0) return alert("Seleziona almeno una risposta!");

    const q = questions[currentQuestionIndex];
    const isCorrect = JSON.stringify(selectedIndices.sort()) === JSON.stringify(q.correct.sort());

    if (isCorrect) score += 2; // Ogni domanda vale 2 punti come nel PDF

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
        questionText.innerText = `Quiz Terminato! Punteggio finale: ${score}/${questions.length * 2}`;
        optionsContainer.innerHTML = '';
        nextBtn.classList.add('hidden');
    }
};