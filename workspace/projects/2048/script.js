class Game2048 {
    constructor() {
        this.board = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.gameOver = false;
        this.won = false;
        
        this.tileContainer = document.getElementById('tile-container');
        this.scoreDisplay = document.getElementById('score');
        this.bestScoreDisplay = document.getElementById('best-score');
        this.gameOverOverlay = document.getElementById('game-over');
        this.gameWonOverlay = document.getElementById('game-won');
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.newGame();
    }

    newGame() {
        this.board = Array(4).fill().map(() => Array(4).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.won = false;
        this.updateScore();
        this.gameOverOverlay.classList.add('hidden');
        this.gameWonOverlay.classList.add('hidden');
        this.tileContainer.innerHTML = '';
        this.addTile();
        this.addTile();
        this.render();
    }

    addTile() {
        const emptyCells = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) emptyCells.push({ r, c });
            }
        }
        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.board[r][c] = Math.random() < 0.9 ? 2 : 4;
            return { r, c, value: this.board[r][c] };
        }
    }

    render() {
        this.tileContainer.innerHTML = '';
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] !== 0) {
                    this.createTileElement(r, c, this.board[r][c]);
                }
            }
        }
    }

    createTileElement(r, c, value, isNew = false, isMerged = false) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value}`;
        if (isNew) tile.classList.add('tile-new');
        if (isMerged) tile.classList.add('tile-merged');
        
        // Position calculating using CSS grid alignment
        tile.style.top = `${r * 25}%`;
        tile.style.left = `${c * 25}%`;
        tile.textContent = value;
        this.tileContainer.appendChild(tile);
    }

    move(direction) {
        if (this.gameOver) return;

        let moved = false;
        const newBoard = JSON.parse(JSON.stringify(this.board));

        const rotate = (matrix) => {
            const result = matrix.map((row, i) =>
                matrix.map(val => val[i]).reverse()
            );
            return result;
        };

        // Normalize direction to 'left' by rotating
        let rotations = 0;
        if (direction === 'up') rotations = 3;
        if (direction === 'right') rotations = 2;
        if (direction === 'down') rotations = 1;

        for (let i = 0; i < rotations; i++) {
            newBoard.replaceWith = rotate(newBoard); // This is just logic, let's do it properly
        }

        // Real rotation logic
        let tempBoard = JSON.parse(JSON.stringify(this.board));
        for (let i = 0; i < rotations; i++) {
            tempBoard = rotate(tempBoard);
        }

        // Process move left
        for (let r = 0; r < 4; r++) {
            let row = tempBoard[r].filter(val => val !== 0);
            for (let c = 0; c < row.length - 1; c++) {
                if (row[c] === row[c + 1]) {
                    row[c] *= 2;
                    this.score += row[c];
                    row.splice(c + 1, 1);
                    moved = true;
                }
            }
            while (row.length < 4) row.push(0);
            if (JSON.stringify(tempBoard[r]) !== JSON.stringify(row)) moved = true;
            tempBoard[r] = row;
        }

        // Rotate back
        let finalRotations = (4 - rotations) % 4;
        for (let i = 0; i < finalRotations; i++) {
            tempBoard = rotate(tempBoard);
        }

        if (moved) {
            this.board = tempBoard;
            this.addTile();
            this.updateScore();
            this.render();
            this.checkGameState();
        }
    }

    updateScore() {
        this.scoreDisplay.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
        }
        this.bestScoreDisplay.textContent = this.bestScore;
    }

    checkGameState() {
        // Check for 2048
        if (!this.won) {
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    if (this.board[r][c] === 2048) {
                        this.won = true;
                        this.gameWonOverlay.classList.remove('hidden');
                    }
                }
            }
        }

        // Check for game over
        let canMove = false;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (this.board[r][c] === 0) {
                    canMove = true;
                    break;
                }
                if (c < 3 && this.board[r][c] === this.board[r][c + 1]) {
                    canMove = true;
                    break;
                }
                if (r < 3 && this.board[r][c] === this.board[r + 1][c]) {
                    canMove = true;
                    break;
                }
            }
        }

        if (!canMove) {
            this.gameOver = true;
            this.gameOverOverlay.classList.remove('hidden');
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') this.move('up');
            if (e.key === 'ArrowDown') this.move('down');
            if (e.key === 'ArrowLeft') this.move('left');
            if (e.key === 'ArrowRight') this.move('right');
        });

        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        
        document.querySelectorAll('.retry-btn').forEach(btn => {
            btn.addEventListener('click', () => this.newGame());
        });

        // Touch support
        let touchStartX, touchStartY;
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            if (Math.max(absX, absY) > 20) {
                if (absX > absY) {
                    this.move(dx > 0 ? 'right' : 'left');
                } else {
                    this.move(dy > 0 ? 'down' : 'up');
                }
            }
        }, { passive: false });
    }
}

// Start the game
new Game2048();
