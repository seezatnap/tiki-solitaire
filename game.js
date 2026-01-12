// Tiki Solitaire Game Logic

class TikiSolitaire {
    constructor() {
        this.suits = ['♥', '♦', '♣', '♠'];
        this.suitNames = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.rankValues = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

        this.tableau = []; // 8 columns
        this.pairs = []; // up to 6 pairs
        this.dominos = []; // formed dominos
        this.chain = []; // connected dominos
        this.selectedCard = null;
        this.selectedDomino = null;
        this.history = []; // for undo

        this.init();
    }

    init() {
        this.bindEvents();
        this.newGame();
    }

    createDeck() {
        const deck = [];
        for (const suit of this.suits) {
            for (const rank of this.ranks) {
                deck.push({
                    rank,
                    suit,
                    value: this.rankValues[rank],
                    isRed: suit === '♥' || suit === '♦',
                    id: `${rank}${suit}`
                });
            }
        }
        return deck;
    }

    shuffle(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    newGame() {
        const deck = this.shuffle(this.createDeck());
        this.tableau = Array(8).fill(null).map(() => []);
        this.pairs = [];
        this.dominos = [];
        this.chain = [];
        this.selectedCard = null;
        this.selectedDomino = null;
        this.history = [];

        // Deal cards to 8 columns (6-7 cards each)
        let cardIndex = 0;
        for (let i = 0; i < 52; i++) {
            const column = i % 8;
            this.tableau[column].push(deck[cardIndex++]);
        }

        this.render();
    }

    saveState() {
        this.history.push({
            tableau: JSON.parse(JSON.stringify(this.tableau)),
            pairs: JSON.parse(JSON.stringify(this.pairs)),
            dominos: JSON.parse(JSON.stringify(this.dominos)),
            chain: JSON.parse(JSON.stringify(this.chain))
        });
        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length === 0) return;

        const state = this.history.pop();
        this.tableau = state.tableau;
        this.pairs = state.pairs;
        this.dominos = state.dominos;
        this.chain = state.chain;
        this.selectedCard = null;
        this.selectedDomino = null;
        this.render();
    }

    // Check if two cards can stack (same rank OR sum to 14)
    canStack(topCard, bottomCard) {
        if (!topCard || !bottomCard) return false;
        return topCard.rank === bottomCard.rank || topCard.value + bottomCard.value === 14;
    }

    // Check if two cards can form a pair (red + black, sum to 14)
    canPair(card1, card2) {
        if (!card1 || !card2) return false;
        return card1.isRed !== card2.isRed && card1.value + card2.value === 14;
    }

    // Move card between columns
    moveCard(fromCol, toCol) {
        if (fromCol === toCol) return false;

        const fromColumn = this.tableau[fromCol];
        const toColumn = this.tableau[toCol];

        if (fromColumn.length === 0) return false;

        const card = fromColumn[fromColumn.length - 1];

        // Empty column accepts any card
        if (toColumn.length === 0) {
            this.saveState();
            toColumn.push(fromColumn.pop());
            return true;
        }

        const targetCard = toColumn[toColumn.length - 1];

        if (this.canStack(card, targetCard)) {
            this.saveState();
            toColumn.push(fromColumn.pop());
            return true;
        }

        return false;
    }

    // Create a pair from two cards
    createPair(card1Info, card2Info) {
        if (this.pairs.length >= 6) return false;

        const card1 = this.getCardFromLocation(card1Info);
        const card2 = this.getCardFromLocation(card2Info);

        if (!this.canPair(card1, card2)) return false;

        this.saveState();

        // Remove cards from tableau
        this.removeCardFromLocation(card1Info);
        this.removeCardFromLocation(card2Info);

        // Add to pairs (red card first for consistency)
        const pair = card1.isRed ? [card1, card2] : [card2, card1];
        this.pairs.push(pair);

        return true;
    }

    getCardFromLocation(location) {
        if (location.type === 'tableau') {
            const column = this.tableau[location.column];
            return column[column.length - 1];
        }
        return null;
    }

    removeCardFromLocation(location) {
        if (location.type === 'tableau') {
            this.tableau[location.column].pop();
        }
    }

    // Check if two pairs can form a domino (must have all 4 suits for same values)
    canFormDomino(pair1, pair2) {
        // Get the values
        const value1 = pair1[0].value;
        const value2 = 14 - value1; // The complementary value

        // Check if pair2 has the same values
        if (pair2[0].value !== value1) return false;

        // Check if together they have all 4 suits for each value
        const suits1 = new Set([pair1[0].suit, pair1[1].suit, pair2[0].suit, pair2[1].suit]);
        return suits1.size === 4;
    }

    // Create a domino from two pairs
    createDomino(pairIndex1, pairIndex2) {
        if (pairIndex1 === pairIndex2) return false;

        const pair1 = this.pairs[pairIndex1];
        const pair2 = this.pairs[pairIndex2];

        if (!this.canFormDomino(pair1, pair2)) return false;

        this.saveState();

        // Create domino with all 4 cards organized by value
        const value1 = pair1[0].value;
        const value2 = 14 - value1;

        const domino = {
            value1,
            value2,
            cards: [...pair1, ...pair2],
            id: `domino_${Date.now()}`
        };

        this.dominos.push(domino);

        // Remove pairs (remove higher index first)
        const indices = [pairIndex1, pairIndex2].sort((a, b) => b - a);
        this.pairs.splice(indices[0], 1);
        this.pairs.splice(indices[1], 1);

        return true;
    }

    // Check if two dominos can connect
    canConnect(domino1, domino2) {
        return domino1.value1 === domino2.value1 ||
               domino1.value1 === domino2.value2 ||
               domino1.value2 === domino2.value1 ||
               domino1.value2 === domino2.value2;
    }

    // Get the connecting value between two dominos
    getConnectingValue(domino1, domino2) {
        if (domino1.value2 === domino2.value1) return domino1.value2;
        if (domino1.value2 === domino2.value2) return domino1.value2;
        if (domino1.value1 === domino2.value1) return domino1.value1;
        if (domino1.value1 === domino2.value2) return domino1.value1;
        return null;
    }

    // Add domino to chain
    addToChain(dominoIndex) {
        const domino = this.dominos[dominoIndex];

        if (this.chain.length === 0) {
            this.saveState();
            this.chain.push({ ...domino, originalIndex: dominoIndex });
            domino.inChain = true;
            return true;
        }

        // Check if can connect to end of chain
        const lastInChain = this.chain[this.chain.length - 1];

        if (this.canConnect(lastInChain, domino)) {
            this.saveState();

            // Determine orientation
            const connectValue = this.getConnectingValue(lastInChain, domino);
            let orientedDomino = { ...domino, originalIndex: dominoIndex };

            // Orient so connecting value is at start
            if (domino.value2 === connectValue) {
                // Swap values for display
                orientedDomino.displayValue1 = domino.value2;
                orientedDomino.displayValue2 = domino.value1;
            } else {
                orientedDomino.displayValue1 = domino.value1;
                orientedDomino.displayValue2 = domino.value2;
            }

            this.chain.push(orientedDomino);
            domino.inChain = true;

            this.checkCircular();
            return true;
        }

        return false;
    }

    // Check if chain is circular
    checkCircular() {
        if (this.chain.length < 2) return false;

        const first = this.chain[0];
        const last = this.chain[this.chain.length - 1];

        const firstStart = first.displayValue1 || first.value1;
        const lastEnd = last.displayValue2 || last.value2;

        return firstStart === lastEnd;
    }

    // Check win condition
    checkWin() {
        // Win if all cards are in chain and chain is circular
        const totalCardsInChain = this.chain.length * 4;
        return totalCardsInChain === 52 && this.checkCircular();
    }

    // Render the game
    render() {
        this.renderTableau();
        this.renderPairs();
        this.renderDominos();
        this.renderChain();
        this.updateCounts();
    }

    renderTableau() {
        const columns = document.querySelectorAll('.column');

        columns.forEach((colEl, colIndex) => {
            colEl.innerHTML = '';
            const column = this.tableau[colIndex];

            if (column.length === 0) {
                colEl.classList.add('empty');
            } else {
                colEl.classList.remove('empty');

                column.forEach((card, cardIndex) => {
                    const cardEl = this.createCardElement(card, false);
                    cardEl.classList.add('in-column');
                    cardEl.style.top = `${cardIndex * parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-stack-offset'))}px`;
                    cardEl.dataset.column = colIndex;
                    cardEl.dataset.index = cardIndex;

                    // Only top card is interactive
                    if (cardIndex === column.length - 1) {
                        cardEl.classList.add('top-card');
                    } else {
                        cardEl.style.pointerEvents = 'none';
                    }

                    colEl.appendChild(cardEl);
                });
            }
        });
    }

    createCardElement(card, mini = false) {
        const cardEl = document.createElement('div');
        cardEl.className = `card ${card.isRed ? 'red' : 'black'}${mini ? ' mini' : ''}`;
        cardEl.dataset.id = card.id;

        cardEl.innerHTML = `
            <div class="card-corner">
                <span class="card-rank">${card.rank}</span>
                <span class="card-suit">${card.suit}</span>
            </div>
            <span class="card-center">${card.suit}</span>
            <div class="card-corner bottom">
                <span class="card-rank">${card.rank}</span>
                <span class="card-suit">${card.suit}</span>
            </div>
        `;

        return cardEl;
    }

    renderPairs() {
        const slots = document.querySelectorAll('.pair-slot');

        slots.forEach((slot, index) => {
            slot.innerHTML = '';
            slot.classList.remove('filled');

            if (this.pairs[index]) {
                slot.classList.add('filled');
                const pair = this.pairs[index];

                pair.forEach(card => {
                    const cardEl = this.createCardElement(card, true);
                    cardEl.dataset.pairIndex = index;
                    slot.appendChild(cardEl);
                });
            }
        });

        document.getElementById('pairs-count').textContent = `(${this.pairs.length}/6)`;
    }

    renderDominos() {
        const container = document.getElementById('dominos-container');
        container.innerHTML = '';

        this.dominos.forEach((domino, index) => {
            if (domino.inChain) return;

            const dominoEl = document.createElement('div');
            dominoEl.className = 'domino';
            dominoEl.dataset.index = index;

            // Group cards by value
            const value1Cards = domino.cards.filter(c => c.value === domino.value1);
            const value2Cards = domino.cards.filter(c => c.value === domino.value2);

            dominoEl.innerHTML = `
                <div class="domino-pair">
                    ${value1Cards.map(c => this.createCardElement(c, true).outerHTML).join('')}
                </div>
                <div class="domino-divider"></div>
                <div class="domino-pair">
                    ${value2Cards.map(c => this.createCardElement(c, true).outerHTML).join('')}
                </div>
                <div class="domino-label">${this.valueToRank(domino.value1)}${this.valueToRank(domino.value2)}</div>
            `;

            container.appendChild(dominoEl);
        });
    }

    valueToRank(value) {
        return this.ranks[value - 1];
    }

    renderChain() {
        const container = document.getElementById('chain-display');
        container.innerHTML = '';

        if (this.chain.length === 0) {
            container.innerHTML = '<span style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">Click dominos to build your chain...</span>';
            return;
        }

        const isCircular = this.checkCircular();
        const maxPerRow = window.innerWidth < 768 ? 3 : 6;

        this.chain.forEach((domino, index) => {
            // Add wrap arrow if needed
            if (index > 0 && index % maxPerRow === 0) {
                const wrapArrow = document.createElement('div');
                wrapArrow.className = 'chain-wrap-arrow';
                container.appendChild(wrapArrow);
            }

            const segment = document.createElement('div');
            segment.className = 'chain-segment';

            const val1 = domino.displayValue1 || domino.value1;
            const val2 = domino.displayValue2 || domino.value2;

            const dominoEl = document.createElement('div');
            dominoEl.className = `chain-domino${isCircular && index === 0 ? ' circular' : ''}`;
            dominoEl.innerHTML = `
                <span>${this.valueToRank(val1)}</span>
                <span style="margin: 0 4px;">-</span>
                <span>${this.valueToRank(val2)}</span>
            `;

            segment.appendChild(dominoEl);

            // Add connector if not last
            if (index < this.chain.length - 1) {
                const connector = document.createElement('span');
                connector.className = 'chain-connector';
                connector.textContent = '―';
                segment.appendChild(connector);
            } else if (isCircular) {
                const connector = document.createElement('span');
                connector.className = 'chain-connector';
                connector.textContent = '↺';
                connector.style.color = '#4caf50';
                segment.appendChild(connector);
            }

            container.appendChild(segment);
        });

        document.getElementById('chain-length').textContent = `(${this.chain.length} dominos${isCircular ? ' - CIRCULAR!' : ''})`;

        if (this.checkWin()) {
            this.showWin();
        }
    }

    updateCounts() {
        const cardsInTableau = this.tableau.reduce((sum, col) => sum + col.length, 0);
        const cardsInPairs = this.pairs.length * 2;
        const cardsInDominos = this.dominos.filter(d => !d.inChain).length * 4;
        const cardsInChain = this.chain.length * 4;
    }

    showWin() {
        const modal = document.getElementById('win-modal');
        const message = document.getElementById('win-message');
        message.textContent = `You created a perfect circular chain with all 52 cards in ${this.chain.length} dominos!`;
        modal.classList.remove('hidden');
    }

    bindEvents() {
        // New game
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());

        // Undo
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());

        // Help modal
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-modal').classList.remove('hidden');
        });

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        document.getElementById('play-again-btn').addEventListener('click', () => {
            document.getElementById('win-modal').classList.add('hidden');
            this.newGame();
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Card interactions
        this.setupCardInteractions();
    }

    setupCardInteractions() {
        const gameContainer = document.getElementById('game-container');

        // Track selected cards for pairing
        let firstSelectedCard = null;

        // Click handler for cards and dominos
        gameContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            const column = e.target.closest('.column');
            const pairSlot = e.target.closest('.pair-slot');
            const domino = e.target.closest('.domino');

            // Handle domino click - add to chain
            if (domino && !domino.closest('#chain-display')) {
                const index = parseInt(domino.dataset.index);
                if (this.addToChain(index)) {
                    this.render();
                }
                return;
            }

            // Handle card click in tableau
            if (card && card.classList.contains('top-card')) {
                const colIndex = parseInt(card.dataset.column);

                // If we have a selected card already
                if (firstSelectedCard) {
                    const firstColIndex = parseInt(firstSelectedCard.dataset.column);

                    if (firstColIndex === colIndex) {
                        // Deselect
                        firstSelectedCard.classList.remove('selected');
                        firstSelectedCard = null;
                        this.clearHighlights();
                        return;
                    }

                    // Try to create pair
                    const card1Info = { type: 'tableau', column: firstColIndex };
                    const card2Info = { type: 'tableau', column: colIndex };

                    if (this.createPair(card1Info, card2Info)) {
                        firstSelectedCard.classList.remove('selected');
                        firstSelectedCard = null;
                        this.clearHighlights();
                        this.render();
                        return;
                    }

                    // Try to move card
                    if (this.moveCard(firstColIndex, colIndex)) {
                        firstSelectedCard.classList.remove('selected');
                        firstSelectedCard = null;
                        this.clearHighlights();
                        this.render();
                        return;
                    }

                    // Invalid move - select new card instead
                    firstSelectedCard.classList.remove('selected');
                    firstSelectedCard = card;
                    card.classList.add('selected');
                    this.highlightValidMoves(colIndex);
                } else {
                    // Select this card
                    firstSelectedCard = card;
                    card.classList.add('selected');
                    this.highlightValidMoves(colIndex);
                }
                return;
            }

            // Handle empty column click
            if (column && column.classList.contains('empty') && firstSelectedCard) {
                const fromCol = parseInt(firstSelectedCard.dataset.column);
                const toCol = parseInt(column.dataset.column);

                if (this.moveCard(fromCol, toCol)) {
                    firstSelectedCard.classList.remove('selected');
                    firstSelectedCard = null;
                    this.clearHighlights();
                    this.render();
                }
                return;
            }

            // Handle pair slot click - create domino from two pairs
            if (pairSlot && pairSlot.classList.contains('filled')) {
                const pairIndex = parseInt(pairSlot.dataset.slot);

                // Check if another pair is selected
                const selectedPair = document.querySelector('.pair-slot.selected');

                if (selectedPair) {
                    const otherIndex = parseInt(selectedPair.dataset.slot);

                    if (otherIndex === pairIndex) {
                        // Deselect
                        selectedPair.classList.remove('selected');
                        return;
                    }

                    // Try to create domino
                    if (this.createDomino(otherIndex, pairIndex)) {
                        selectedPair.classList.remove('selected');
                        this.render();
                    } else {
                        // Select new pair instead
                        selectedPair.classList.remove('selected');
                        pairSlot.classList.add('selected');
                    }
                } else {
                    pairSlot.classList.add('selected');
                }
                return;
            }

            // Click elsewhere - deselect
            if (firstSelectedCard) {
                firstSelectedCard.classList.remove('selected');
                firstSelectedCard = null;
                this.clearHighlights();
            }

            const selectedPair = document.querySelector('.pair-slot.selected');
            if (selectedPair) {
                selectedPair.classList.remove('selected');
            }
        });

        // Touch/drag support
        this.setupDragAndDrop();
    }

    highlightValidMoves(fromCol) {
        const card = this.tableau[fromCol][this.tableau[fromCol].length - 1];

        document.querySelectorAll('.column').forEach((col, index) => {
            if (index === fromCol) return;

            const column = this.tableau[index];

            if (column.length === 0) {
                col.classList.add('highlight');
            } else {
                const targetCard = column[column.length - 1];
                if (this.canStack(card, targetCard)) {
                    col.classList.add('highlight');
                }
                if (this.canPair(card, targetCard)) {
                    col.classList.add('highlight');
                    col.style.borderColor = '#4caf50';
                }
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.column').forEach(col => {
            col.classList.remove('highlight');
            col.style.borderColor = '';
        });
    }

    setupDragAndDrop() {
        let draggedElement = null;
        let draggedData = null;
        let touchOffset = { x: 0, y: 0 };

        const gameContainer = document.getElementById('game-container');

        // Mouse drag
        gameContainer.addEventListener('mousedown', (e) => {
            const card = e.target.closest('.card.top-card');
            if (card) {
                this.startDrag(e, card);
            }
        });

        // Touch drag
        gameContainer.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.card.top-card');
            if (card) {
                this.startDrag(e, card);
            }
        }, { passive: false });

        this.startDrag = (e, card) => {
            e.preventDefault();

            const colIndex = parseInt(card.dataset.column);
            draggedData = { type: 'card', column: colIndex };

            // Create drag clone
            draggedElement = card.cloneNode(true);
            draggedElement.classList.add('dragging');
            draggedElement.style.position = 'fixed';
            draggedElement.style.pointerEvents = 'none';
            draggedElement.style.zIndex = '1000';
            document.body.appendChild(draggedElement);

            const rect = card.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            touchOffset.x = clientX - rect.left;
            touchOffset.y = clientY - rect.top;

            draggedElement.style.left = `${clientX - touchOffset.x}px`;
            draggedElement.style.top = `${clientY - touchOffset.y}px`;

            card.classList.add('selected');
            this.highlightValidMoves(colIndex);
        };

        const moveDrag = (e) => {
            if (!draggedElement) return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            draggedElement.style.left = `${clientX - touchOffset.x}px`;
            draggedElement.style.top = `${clientY - touchOffset.y}px`;
        };

        const endDrag = (e) => {
            if (!draggedElement) return;

            const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
            const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

            // Find drop target
            draggedElement.style.display = 'none';
            const dropTarget = document.elementFromPoint(clientX, clientY);
            draggedElement.style.display = '';

            const column = dropTarget?.closest('.column');
            const card = dropTarget?.closest('.card.top-card');

            if (column && draggedData) {
                const toCol = parseInt(column.dataset.column);
                const fromCol = draggedData.column;

                // Try pair first if dropping on a card
                if (card) {
                    const card1Info = { type: 'tableau', column: fromCol };
                    const card2Info = { type: 'tableau', column: toCol };

                    if (this.createPair(card1Info, card2Info)) {
                        this.render();
                    } else if (this.moveCard(fromCol, toCol)) {
                        this.render();
                    }
                } else if (this.moveCard(fromCol, toCol)) {
                    this.render();
                }
            }

            // Cleanup
            document.body.removeChild(draggedElement);
            draggedElement = null;
            draggedData = null;
            this.clearHighlights();

            document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
        };

        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('touchmove', moveDrag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    }
}

// Start the game
const game = new TikiSolitaire();
