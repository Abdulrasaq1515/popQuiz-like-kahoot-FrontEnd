// Configuration
const API_BASE = 'http://localhost:8080/api';

// global state at the top
let currentQuiz = null;
let currentPlayer = null;
let currentUser = null; // Add this for logged-in user
let currentQuestionIndex = 0;
let gameTimer = null;
let timeRemaining = 15;
let playerScore = 0;
let questionBanks = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadQuestionBanks();
    addQuestion();
});

// Screen Management
function showScreen(screenId) {
    // Clear any existing timers when switching screens
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.remove('active'));
    
    // Show selected screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Load data for specific screens
    if (screenId === 'active') {
        loadActiveQuizzes();
    }
}

// Message System
function showMessage(message, type = 'info') {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error' : 'success';
    messageDiv.textContent = message;
    messagesDiv.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Quiz Creation Functions
function toggleQuizMode() {
    const mode = document.getElementById('quizMode').value;
    const manualMode = document.getElementById('manualMode');
    const autoMode = document.getElementById('autoMode');
    
    if (mode === 'manual') {
        manualMode.style.display = 'block';
        autoMode.style.display = 'none';
    } else {
        // Auto mode selected - show message and switch back
        manualMode.style.display = 'block';
        autoMode.style.display = 'none';
        showMessage('🚧 Automatic quiz creation is coming soon! Using manual mode instead.', 'info');
        // Switch back to manual mode
        setTimeout(() => {
            document.getElementById('quizMode').value = 'manual';
        }, 100);
    }
}
function addQuestion() {
    const container = document.getElementById('questionsContainer');
    const questionDiv = document.createElement('div');
    questionDiv.className = 'add-question';
    
    questionDiv.innerHTML = `
        <div class="form-group">
            <label>Question:</label>
            <textarea class="question-text-input" placeholder="Enter your question..." rows="2"></textarea>
        </div>
        
        <div class="form-group">
            <label>Options:</label>
            <div class="options-container">
                <div class="question-options">
                    <input type="text" class="option-input" placeholder="Option 1">
                    <input type="radio" name="correct-${Date.now()}" value="0">
                </div>
                <div class="question-options">
                    <input type="text" class="option-input" placeholder="Option 2">
                    <input type="radio" name="correct-${Date.now()}" value="1">
                </div>
                <div class="question-options">
                    <input type="text" class="option-input" placeholder="Option 3">
                    <input type="radio" name="correct-${Date.now()}" value="2">
                </div>
                <div class="question-options">
                    <input type="text" class="option-input" placeholder="Option 4">
                    <input type="radio" name="correct-${Date.now()}" value="3">
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label>Difficulty:</label>
            <select class="difficulty-select">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
            </select>
        </div>
        
        <div class="form-group">
            <label>Category:</label>
            <input type="text" class="category-input" placeholder="e.g., Math, Science, History">
        </div>
        
        <button class="btn btn-danger" onclick="removeQuestion(this)">🗑️ Remove Question</button>
    `;
    
    container.appendChild(questionDiv);
}

function removeQuestion(button) {
    button.parentElement.remove();
}

async function createQuiz() {
    const title = document.getElementById('quizTitle').value.trim();
    if (!title) {
        showMessage('Please enter a quiz title', 'error');
        return;
    }

    const questions = [];
    const questionDivs = document.querySelectorAll('.add-question');
    
    for (let div of questionDivs) {
        const questionText = div.querySelector('.question-text-input').value.trim();
        const optionInputs = div.querySelectorAll('.option-input');
        const correctRadio = div.querySelector('input[type="radio"]:checked');
        const difficulty = div.querySelector('.difficulty-select').value;
        const category = div.querySelector('.category-input').value.trim();
        
        if (!questionText) {
            showMessage('Please fill in all question texts', 'error');
            return;
        }
        
        const options = Array.from(optionInputs).map(input => input.value.trim()).filter(val => val);
        
        if (options.length < 2) {
            showMessage('Each question must have at least 2 options', 'error');
            return;
        }
        
        if (!correctRadio) {
            showMessage('Please select the correct answer for each question', 'error');
            return;
        }
        
        questions.push({
            text: questionText,
            options: options,
            correctIndex: parseInt(correctRadio.value),
            difficulty: difficulty,
            category: category || 'general'
        });
    }
    
    if (questions.length === 0) {
        showMessage('Please add at least one question', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/quizzes/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                mode: 'manual',
                questions: questions
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            currentQuiz = data;
            document.getElementById('lobbyQuizCode').textContent = data.code;
            showScreen('lobby');
            showMessage('Quiz created successfully!', 'success');
            startLobbyPolling();
        } else {
            // Handle error from simple error response
            showMessage(data.error || 'Failed to create quiz', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

async function createQuizFromBank() {
    showMessage('🚧 Question Bank feature is coming soon! Please use manual quiz creation for now.', 'info');
    return;
}

// Join Quiz Functions
async function joinQuiz() {
    const quizCode = document.getElementById('joinQuizCode').value.trim();
    const nickname = document.getElementById('playerNickname').value.trim();
    
    if (!quizCode || !nickname) {
        showMessage('Please enter both quiz code and nickname', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/quizzes/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quizCode: quizCode,
                nickname: nickname
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            currentPlayer = data;
            
            // Get quiz details
            const quizResponse = await fetch(`${API_BASE}/quizzes/${quizCode}`);
            const quizData = await quizResponse.json();
            
            if (quizResponse.ok) {
                currentQuiz = quizData;
                document.getElementById('lobbyQuizCode').textContent = quizCode;
                showScreen('lobby');
                showMessage('Joined quiz successfully!', 'success');
                startLobbyPolling();
            } else {
                showMessage(quizData.error || 'Failed to get quiz details', 'error');
            }
        } else {
            showMessage(data.error || 'Failed to join quiz', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

// Lobby Functions
function startLobbyPolling() {
    const pollLobby = async () => {
        try {
            const response = await fetch(`${API_BASE}/quizzes/${currentQuiz.code}`);
            const data = await response.json();
            
            if (response.ok) {
                currentQuiz = data;
                updatePlayersDisplay();
                
                // If quiz started, move to game screen
                if (data.status === 'ACTIVE') {
                    showScreen('game');
                    startGamePlay();
                    return; // Stop polling
                }
            } else {
                showMessage(data.error || 'Failed to get quiz status', 'error');
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
        
        // Continue polling every 2 seconds
        setTimeout(pollLobby, 2000);
    };
    
    pollLobby();
}

function updatePlayersDisplay() {
    const container = document.getElementById('playersContainer');
    container.innerHTML = '';
    
    if (currentQuiz.players && currentQuiz.players.length > 0) {
        currentQuiz.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            playerDiv.innerHTML = `
                <span>👤 ${player.nickname}</span>
                <span>Score: ${player.score}</span>
            `;
            container.appendChild(playerDiv);
        });
    } else {
        container.innerHTML = '<p>No players joined yet...</p>';
    }
}

async function startQuiz() {
    try {
        const response = await fetch(`${API_BASE}/quizzes/start/${currentQuiz.code}`, {
            method: 'POST'
        });

        const data = await response.json();
        
        if (response.ok) {
            showMessage('Quiz started!', 'success');
        } else {
            showMessage(data.error || 'Failed to start quiz', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

// Game Functions
function startGamePlay() {
    currentQuestionIndex = 0;
    playerScore = 0;
    document.getElementById('currentScore').textContent = playerScore;
    showCurrentQuestion();
}

function showCurrentQuestion() {
    if (currentQuestionIndex >= currentQuiz.questions.length) {
        finishQuiz();
        return;
    }
    
    const question = currentQuiz.questions[currentQuestionIndex];
    document.getElementById('currentQuestion').textContent = question.text;
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
        button.onclick = () => selectOption(index);
        optionsContainer.appendChild(button);
    });
    
    // Reset and start timer
    timeRemaining = 15;
    updateTimer();
    startTimer();
    
    // Hide next/finish buttons
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('finishBtn').style.display = 'none';
}

function selectOption(optionIndex) {
    // Disable all option buttons
    const buttons = document.querySelectorAll('.option-button');
    buttons.forEach((btn, index) => {
        btn.disabled = true;
        if (index === optionIndex) {
            btn.classList.add('selected');
        }
    });
    
    // Stop timer
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    // Submit answer
    submitAnswer(optionIndex);
}

async function submitAnswer(chosenIndex) {
    const timeTaken = 15 - timeRemaining;
    
    try {
        const response = await fetch(`${API_BASE}/quizzes/answer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quizCode: currentQuiz.code,
                nickname: currentPlayer.nickname,
                questionIndex: currentQuestionIndex,
                chosenIndex: chosenIndex,
                timeTaken: timeTaken
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            // Update score
            playerScore = data.totalScore;
            document.getElementById('currentScore').textContent = playerScore;
            
            // Show correct answer
            const buttons = document.querySelectorAll('.option-button');
            buttons[data.correctIndex].classList.add('correct');
            
            if (!data.correct) {
                buttons[chosenIndex].classList.add('incorrect');
            }
            
            // Show appropriate message
            if (data.correct) {
                showMessage(`Correct! +${data.scoreGained} points`, 'success');
            } else {
                showMessage('Wrong answer!', 'error');
            }
            
            // Show next button or finish button
            if (currentQuestionIndex < currentQuiz.questions.length - 1) {
                document.getElementById('nextBtn').style.display = 'inline-block';
            } else {
                document.getElementById('finishBtn').style.display = 'inline-block';
            }
        } else {
            showMessage(data.error || 'Failed to submit answer', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    showCurrentQuestion();
}

function startTimer() {
    // Clear any existing timer first to prevent multiple timers
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    
    // Create a new timer
    gameTimer = setInterval(() => {
        // Decrement time
        timeRemaining--;
        
        // Ensure time doesn't go below 0
        if (timeRemaining <= 0) {
            timeRemaining = 0; // Set to 0 to prevent negative values
            clearInterval(gameTimer);
            gameTimer = null;
            
            // Auto-submit with no answer (will be incorrect)
            selectOption(-1);
        }
        
        // Update the display
        updateTimer();
    }, 1000); // 1000ms = 1 second
}

function updateTimer() {
    // Ensure we only display positive values
    const displayTime = Math.max(0, timeRemaining);
    document.getElementById('timer').textContent = displayTime;
    
    // Change color based on time remaining
    const timer = document.getElementById('timer');
    if (timeRemaining <= 5) {
        timer.style.color = '#ff6b6b';
    } else if (timeRemaining <= 10) {
        timer.style.color = '#ffd43b';
    } else {
        timer.style.color = '#51cf66';
    }
}

async function finishQuiz() {
    try {
        // Complete the quiz
        const completeResponse = await fetch(`${API_BASE}/quizzes/${currentQuiz.code}/complete`, {
            method: 'POST'
        });
        
        const completeData = await completeResponse.json();
        
        if (!completeResponse.ok) {
            showMessage(completeData.error || 'Failed to complete quiz', 'error');
            return;
        }
        
        // Get results
        const response = await fetch(`${API_BASE}/quizzes/${currentQuiz.code}/results`);
        const data = await response.json();
        
        if (response.ok) {
            displayResults(data);
            showScreen('results');
        } else {
            showMessage(data.error || 'Failed to load results', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

function displayResults(results) {
    const container = document.getElementById('leaderboardContainer');
    container.innerHTML = '';
    
    results.leaderboard.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        // Add special styling for top 3
        if (index === 0) item.classList.add('first');
        else if (index === 1) item.classList.add('second');
        else if (index === 2) item.classList.add('third');
        
        const position = index + 1;
        let medal = '';
        if (position === 1) medal = '🥇';
        else if (position === 2) medal = '🥈';
        else if (position === 3) medal = '🥉';
        
        item.innerHTML = `
            <span class="position">${position} ${medal}</span>
            <span>${player.nickname}</span>
            <span>${player.score} pts</span>
        `;
        
        container.appendChild(item);
    });
}

// Load Question Banks
async function loadQuestionBanks() {
    const select = document.getElementById('questionBank');
    select.innerHTML = '<option value="">📚 Question Banks - Coming Soon!</option>';
    select.disabled = true;
}

// Load Active Quizzes
async function loadActiveQuizzes() {
    const container = document.getElementById('activeQuizzesList');
    container.innerHTML = '<div class="loading">Loading active quizzes...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/quizzes/active`);
        const data = await response.json();
        
        if (response.ok) {
            displayActiveQuizzes(data);
        } else {
            container.innerHTML = '<p>Failed to load active quizzes</p>';
            showMessage(data.error || 'Failed to load quizzes', 'error');
        }
    } catch (error) {
        container.innerHTML = '<p>Network error loading quizzes</p>';
        showMessage('Network error: ' + error.message, 'error');
    }
}

function displayActiveQuizzes(quizzes) {
    const container = document.getElementById('activeQuizzesList');
    container.innerHTML = '';
    
    if (quizzes.length === 0) {
        container.innerHTML = '<p>No active quizzes found. Create one to get started!</p>';
        return;
    }
    
    quizzes.forEach(quiz => {
        const quizDiv = document.createElement('div');
        quizDiv.className = 'player-item';
        quizDiv.style.cursor = 'pointer';
        quizDiv.innerHTML = `
            <div>
                <strong>${quiz.title}</strong><br>
                <small>Code: ${quiz.code} | Status: ${quiz.status} | Players: ${quiz.players.length}</small>
            </div>
            <button class="btn" onclick="quickJoin('${quiz.code}')">Quick Join</button>
        `;
        container.appendChild(quizDiv);
    });
}

function quickJoin(quizCode) {
    document.getElementById('joinQuizCode').value = quizCode;
    showScreen('join');
}

function playAgain() {
    currentQuiz = null;
    currentPlayer = null;
    currentQuestionIndex = 0;
    playerScore = 0;
    showScreen('home');
}
// Add this to your JavaScript after the other functions

// Registration Functions
async function registerUser() {
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const role = document.getElementById('registerRole').value;

    // Validation
    if (!username) {
        showMessage('Please enter a username', 'error');
        return;
    }
    
    if (!email) {
        showMessage('Please enter an email', 'error');
        return;
    }
    
    if (!password) {
        showMessage('Please enter a password', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                role: role
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            showMessage('Account created successfully! You can now create and join quizzes.', 'success');
            
            // Clear the form
            document.getElementById('registerUsername').value = '';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerRole').value = 'USER';
            
            // Optionally redirect to home or login
            setTimeout(() => {
                showScreen('home');
            }, 2000);
        } else {
            showMessage(data.error || 'Failed to create account', 'error');
        }
    } catch (error) {
        showMessage('Network error: ' + error.message, 'error');
    }
}

// Optional: Add login function if you want login functionality
async function loginUser() {
    // This would require a login endpoint in your backend
    showMessage('Login functionality coming soon!', 'info');
}