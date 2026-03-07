// Mastermind Game Logic

// Game Configuration
const CONFIG = {
    CODE_LENGTH: 4,
    MAX_ATTEMPTS: 10,
    COLORS: [
        { name: 'red', class: 'color-red', hex: '#e74c3c' },
        { name: 'blue', class: 'color-blue', hex: '#3498db' },
        { name: 'green', class: 'color-green', hex: '#2ecc71' },
        { name: 'yellow', class: 'color-yellow', hex: '#f1c40f' },
        { name: 'purple', class: 'color-purple', hex: '#9b59b6' },
        { name: 'orange', class: 'color-orange', hex: '#e67e22' },
        { name: 'pink', class: 'color-pink', hex: '#ff6b9d' },
        { name: 'cyan', class: 'color-cyan', hex: '#1abc9c' }
    ]
};

// Game State
let gameState = {
    secretCode: [],
    currentGuess: [],
    attempts: [],
    currentAttempt: 1,
    selectedColor: null,
    gameOver: false
};

// DOM Elements
const elements = {
    board: document.getElementById('board'),
    guessSlots: document.getElementById('guess-slots'),
    palette: document.getElementById('palette'),
    submitBtn: document.getElementById('submit-btn'),
    clearBtn: document.getElementById('clear-btn'),
    newGameBtn: document.getElementById('new-game-btn'),
    status: document.getElementById('status'),
    guessCount: document.getElementById('guess-count'),
    secretCode: document.getElementById('secret-code'),
    secretCodeDisplay: document.getElementById('secret-code-display')
};

// Initialize the game
function initGame() {
    generateSecretCode();
    renderPalette();
    resetGameState();
    updateUI();
    showMessage('Click a color, then click a slot to place it!');
}

// Generate a random secret code
function generateSecretCode() {
    gameState.secretCode = [];
    for (let i = 0; i < CONFIG.CODE_LENGTH; i++) {
        const randomIndex = Math.floor(Math.random() * CONFIG.COLORS.length);
        gameState.secretCode.push(CONFIG.COLORS[randomIndex]);
    }
    console.log('Secret Code:', gameState.secretCode.map(c => c.name).join(', ')); // For testing
}

// Reset game state
function resetGameState() {
    gameState.currentGuess = [];
    gameState.attempts = [];
    gameState.currentAttempt = 1;
    gameState.selectedColor = null;
    gameState.gameOver = false;
    elements.secretCode.classList.add('hidden');
    elements.secretCodeDisplay.innerHTML = '';
}

// Render the color palette
function renderPalette() {
    elements.palette.innerHTML = '';
    CONFIG.COLORS.forEach(color => {
        const tile = document.createElement('div');
        tile.className = `color-tile ${color.class}`;
        tile.dataset.color = color.name;
        tile.title = color.name;
        tile.addEventListener('click', () => selectColor(color));
        elements.palette.appendChild(tile);
    });
}

// Select a color from the palette
function selectColor(color) {
    if (gameState.gameOver) return;

    gameState.selectedColor = color;

    // Update palette UI
    document.querySelectorAll('.color-tile').forEach(tile => {
        tile.classList.remove('selected');
        if (tile.dataset.color === color.name) {
            tile.classList.add('selected');
        }
    });

    showMessage(`Selected: ${color.name}. Click a slot to place it!`);
}

// Place color in a slot
function placeColor(slotIndex) {
    if (gameState.gameOver || !gameState.selectedColor) return;
    if (gameState.currentGuess.length > slotIndex) {
        gameState.currentGuess[slotIndex] = gameState.selectedColor;
    } else {
        gameState.currentGuess.push(gameState.selectedColor);
    }
    updateGuessSlots();
    updateSubmitButton();
}

// Update the guess slots display
function updateGuessSlots() {
    const slots = elements.guessSlots.querySelectorAll('.slot');
    slots.forEach((slot, index) => {
        slot.className = 'slot';
        if (gameState.currentGuess[index]) {
            const color = gameState.currentGuess[index];
            slot.style.background = color.hex;
            slot.classList.add('filled');
        } else {
            slot.style.background = 'rgba(0, 0, 0, 0.3)';
            slot.classList.add('empty');
        }
    });
}

// Update submit button state
function updateSubmitButton() {
    elements.submitBtn.disabled = gameState.currentGuess.length !== CONFIG.CODE_LENGTH || gameState.gameOver;
}

// Clear current guess
function clearGuess() {
    gameState.currentGuess = [];
    gameState.selectedColor = null;
    updateGuessSlots();
    updateSubmitButton();

    // Clear palette selection
    document.querySelectorAll('.color-tile').forEach(tile => {
        tile.classList.remove('selected');
    });

    showMessage('Guess cleared. Select colors again!');
}

// Submit the current guess
function submitGuess() {
    if (gameState.currentGuess.length !== CONFIG.CODE_LENGTH || gameState.gameOver) return;

    const feedback = evaluateGuess(gameState.currentGuess);
    gameState.attempts.push({
        guess: [...gameState.currentGuess],
        feedback: feedback
    });

    renderBoard();
    clearGuess();

    // Check win/lose conditions
    if (feedback.black === CONFIG.CODE_LENGTH) {
        endGame(true);
    } else if (gameState.currentAttempt >= CONFIG.MAX_ATTEMPTS) {
        endGame(false);
    } else {
        gameState.currentAttempt++;
        elements.guessCount.textContent = gameState.currentAttempt;
        showMessage(`Attempt ${gameState.currentAttempt}/${CONFIG.MAX_ATTEMPTS}. Keep guessing!`);
    }
}

// Evaluate the guess against the secret code
function evaluateGuess(guess) {
    const secret = [...gameState.secretCode];
    const guessCopy = [...guess];

    let black = 0; // Correct color, correct position
    let white = 0; // Correct color, wrong position

    // First pass: count black pegs (exact matches)
    for (let i = 0; i < CONFIG.CODE_LENGTH; i++) {
        if (guessCopy[i].name === secret[i].name) {
            black++;
            guessCopy[i] = null;
            secret[i] = null;
        }
    }

    // Second pass: count white pegs (color exists but wrong position)
    for (let i = 0; i < CONFIG.CODE_LENGTH; i++) {
        if (guessCopy[i] === null) continue;

        for (let j = 0; j < CONFIG.CODE_LENGTH; j++) {
            if (secret[j] !== null && guessCopy[i].name === secret[j].name) {
                white++;
                guessCopy[i] = null;
                secret[j] = null;
                break;
            }
        }
    }

    return { black, white };
}

// Render the game board with all attempts
function renderBoard() {
    elements.board.innerHTML = '';

    gameState.attempts.forEach((attempt, index) => {
        const row = document.createElement('div');
        row.className = 'row';

        // Row number
        const rowNumber = document.createElement('div');
        rowNumber.className = 'row-number';
        rowNumber.textContent = index + 1;
        row.appendChild(rowNumber);

        // Guess display
        const guessDisplay = document.createElement('div');
        guessDisplay.className = 'guess-display';
        attempt.guess.forEach(color => {
            const colorDot = document.createElement('div');
            colorDot.className = 'guess-color';
            colorDot.style.background = color.hex;
            guessDisplay.appendChild(colorDot);
        });
        row.appendChild(guessDisplay);

        // Feedback
        const feedback = document.createElement('div');
        feedback.className = 'feedback';

        // Add black pegs
        for (let i = 0; i < attempt.feedback.black; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg black';
            feedback.appendChild(peg);
        }

        // Add white pegs
        for (let i = 0; i < attempt.feedback.white; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg white';
            feedback.appendChild(peg);
        }

        // Add empty pegs
        const emptyCount = CONFIG.CODE_LENGTH - attempt.feedback.black - attempt.feedback.white;
        for (let i = 0; i < emptyCount; i++) {
            const peg = document.createElement('div');
            peg.className = 'feedback-peg empty';
            feedback.appendChild(peg);
        }

        row.appendChild(feedback);
        elements.board.appendChild(row);
    });

    // Scroll to bottom
    elements.board.scrollTop = elements.board.scrollHeight;
}

// End the game
function endGame(won) {
    gameState.gameOver = true;
    elements.submitBtn.disabled = true;
    elements.clearBtn.disabled = true;

    // Show secret code
    showSecretCode();

    if (won) {
        elements.status.className = 'status win';
        showMessage(`🎉 Congratulations! You cracked the code in ${gameState.attempts.length} attempts!`);
    } else {
        elements.status.className = 'status lose';
        showMessage(`💔 Game Over! The code was revealed. Better luck next time!`);
    }
}

// Show the secret code
function showSecretCode() {
    elements.secretCode.classList.remove('hidden');
    elements.secretCodeDisplay.innerHTML = '';

    gameState.secretCode.forEach(color => {
        const colorDot = document.createElement('div');
        colorDot.className = 'code-color';
        colorDot.style.background = color.hex;
        elements.secretCodeDisplay.appendChild(colorDot);
    });
}

// Update UI elements
function updateUI() {
    elements.guessCount.textContent = gameState.currentAttempt;
    elements.submitBtn.disabled = true;
    elements.clearBtn.disabled = false;
    elements.status.className = 'status';
    updateGuessSlots();
}

// Show message in status area
function showMessage(message) {
    elements.status.innerHTML = `<p>${message}</p>`;
}

// Event Listeners
function setupEventListeners() {
    // Slot clicks
    elements.guessSlots.querySelectorAll('.slot').forEach((slot, index) => {
        slot.addEventListener('click', () => placeColor(index));
    });

    // Control buttons
    elements.submitBtn.addEventListener('click', submitGuess);
    elements.clearBtn.addEventListener('click', clearGuess);
    elements.newGameBtn.addEventListener('click', initGame);

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (gameState.gameOver) return;

        // Number keys 1-8 to select colors
        if (e.key >= '1' && e.key <= '8') {
            const index = parseInt(e.key) - 1;
            if (index < CONFIG.COLORS.length) {
                selectColor(CONFIG.COLORS[index]);
            }
        }

        // Enter to submit
        if (e.key === 'Enter' && !elements.submitBtn.disabled) {
            submitGuess();
        }

        // Escape to clear
        if (e.key === 'Escape') {
            clearGuess();
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initGame();
});
