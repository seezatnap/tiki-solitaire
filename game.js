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
        this.moveCount = 0;

        // Drag state for workyard
        this.draggedDomino = null;
        this.draggedDominoIndex = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.newGame();
        requestAnimationFrame(() => document.body.classList.add('loaded'));
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
        this.moveCount = 0;

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
            chain: JSON.parse(JSON.stringify(this.chain)),
            moveCount: this.moveCount
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
        this.moveCount = state.moveCount;
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
            this.moveCount++;
            return true;
        }

        const targetCard = toColumn[toColumn.length - 1];

        if (this.canStack(card, targetCard)) {
            this.saveState();
            toColumn.push(fromColumn.pop());
            this.moveCount++;
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
        this.moveCount++;

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

    // Check if two pairs can form a domino (must have all 4 suits between them)
    // The pairs do NOT need to have the same values - any 4-suited combination is valid
    canFormDomino(pair1, pair2) {
        // Check if together they have all 4 suits
        const allSuits = new Set([
            pair1[0].suit,
            pair1[1].suit,
            pair2[0].suit,
            pair2[1].suit
        ]);
        return allSuits.size === 4;
    }

    // Create a domino from two pairs
    createDomino(pairIndex1, pairIndex2) {
        if (pairIndex1 === pairIndex2) return false;

        const pair1 = this.pairs[pairIndex1];
        const pair2 = this.pairs[pairIndex2];

        if (!this.canFormDomino(pair1, pair2)) return false;

        this.saveState();

        // Create domino with all 4 cards
        // Each pair contributes one "end" of the domino
        // pair1 = [redCard, blackCard] where redCard.value + blackCard.value = 14
        // The domino's end values are the VALUES of each pair (the sum-to-14 pair)
        // For chain purposes, we use the red card's value as the "end value" of each pair
        const endValue1 = pair1[0].value; // Red card value from pair1
        const endValue2 = pair2[0].value; // Red card value from pair2

        const domino = {
            value1: endValue1,
            value2: endValue2,
            pair1: pair1,
            pair2: pair2,
            cards: [...pair1, ...pair2],
            id: `domino_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        this.dominos.push(domino);
        this.moveCount++;

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

    // Get chain end values
    getChainEndValues() {
        if (this.chain.length === 0) return null;

        const first = this.chain[0];
        const last = this.chain[this.chain.length - 1];

        return {
            start: first.displayValue1 || first.value1,
            end: last.displayValue2 || last.value2
        };
    }

    // Check if a domino can connect to the current chain
    canConnectToChain(domino) {
        if (this.chain.length === 0) return true;

        const ends = this.getChainEndValues();
        return domino.value1 === ends.end || domino.value2 === ends.end;
    }

    // Add domino to chain
    addToChain(dominoIndex) {
        const domino = this.dominos[dominoIndex];
        if (domino.inChain) return false;

        if (this.chain.length === 0) {
            this.saveState();
            this.chain.push({
                ...domino,
                originalIndex: dominoIndex,
                displayValue1: domino.value1,
                displayValue2: domino.value2
            });
            domino.inChain = true;
            this.moveCount++;
            return true;
        }

        // Check if can connect to end of chain
        const lastInChain = this.chain[this.chain.length - 1];
        const lastEndValue = lastInChain.displayValue2 || lastInChain.value2;

        if (domino.value1 === lastEndValue || domino.value2 === lastEndValue) {
            this.saveState();

            let orientedDomino = {
                ...domino,
                originalIndex: dominoIndex
            };

            // Orient so connecting value is at start
            if (domino.value1 === lastEndValue) {
                orientedDomino.displayValue1 = domino.value1;
                orientedDomino.displayValue2 = domino.value2;
            } else {
                orientedDomino.displayValue1 = domino.value2;
                orientedDomino.displayValue2 = domino.value1;
            }

            this.chain.push(orientedDomino);
            domino.inChain = true;
            this.moveCount++;

            this.checkCircular();
            return true;
        }

        return false;
    }

    // Remove last domino from chain
    removeLastFromChain() {
        if (this.chain.length === 0) return false;

        this.saveState();
        const removed = this.chain.pop();

        // Find the original domino and mark it as not in chain
        const originalDomino = this.dominos.find(d => d.id === removed.id);
        if (originalDomino) {
            originalDomino.inChain = false;
        }

        return true;
    }

    // Clear entire chain
    clearChain() {
        if (this.chain.length === 0) return false;

        this.saveState();

        // Mark all dominos as not in chain
        for (const chainDomino of this.chain) {
            const originalDomino = this.dominos.find(d => d.id === chainDomino.id);
            if (originalDomino) {
                originalDomino.inChain = false;
            }
        }

        this.chain = [];
        return true;
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

    // Reorder dominos in workyard
    reorderDominos(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        if (fromIndex < 0 || fromIndex >= this.dominos.length) return;
        if (toIndex < 0 || toIndex >= this.dominos.length) return;

        const domino = this.dominos.splice(fromIndex, 1)[0];
        this.dominos.splice(toIndex, 0, domino);
        this.render();
    }

    // Render the game
    render() {
        this.renderTableau();
        this.renderPairs();
        this.renderDominos();
        this.renderChain();
        this.updateCounts();
        this.highlightConnectableDominos();
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
            slot.classList.remove('filled', 'can-combine');
            slot.classList.remove('dragging', 'drag-over');

            if (this.pairs[index]) {
                slot.classList.add('filled');
                slot.draggable = true;
                const pair = this.pairs[index];

                pair.forEach(card => {
                    const cardEl = this.createCardElement(card, true);
                    cardEl.dataset.pairIndex = index;
                    slot.appendChild(cardEl);
                });

                // Check if this pair can combine with any other pair
                for (let i = 0; i < this.pairs.length; i++) {
                    if (i !== index && this.pairs[i] && this.canFormDomino(pair, this.pairs[i])) {
                        slot.classList.add('can-combine');
                        break;
                    }
                }
            } else {
                slot.draggable = false;
            }
        });
    }

    renderDominos() {
        const container = document.getElementById('dominos-container');
        container.innerHTML = '';

        this.dominos.forEach((domino, index) => {
            const dominoEl = document.createElement('div');
            dominoEl.className = 'domino';
            dominoEl.dataset.index = index;
            dominoEl.dataset.id = domino.id;
            dominoEl.draggable = true;

            if (domino.inChain) {
                dominoEl.classList.add('in-chain');
            }

            // Display the two pairs that form this domino
            // pair1 and pair2 each contain [redCard, blackCard]
            const pair1 = domino.pair1 || domino.cards.slice(0, 2);
            const pair2 = domino.pair2 || domino.cards.slice(2, 4);

            // Get the label showing both end values
            const label1 = this.valueToRank(domino.value1);
            const label2 = this.valueToRank(domino.value2);
            // Also show the complementary values for clarity
            const comp1 = this.valueToRank(14 - domino.value1);
            const comp2 = this.valueToRank(14 - domino.value2);

            dominoEl.innerHTML = `
                <div class="domino-pair" title="${label1}+${comp1}">
                    ${pair1.map(c => this.createCardElement(c, true).outerHTML).join('')}
                </div>
                <div class="domino-divider"></div>
                <div class="domino-pair" title="${label2}+${comp2}">
                    ${pair2.map(c => this.createCardElement(c, true).outerHTML).join('')}
                </div>
                <div class="domino-label">${label1}${comp1} | ${label2}${comp2}</div>
            `;

            container.appendChild(dominoEl);
        });
    }

    highlightConnectableDominos() {
        const dominos = document.querySelectorAll('#dominos-container .domino');

        dominos.forEach((dominoEl, index) => {
            dominoEl.classList.remove('can-connect');

            const domino = this.dominos[index];
            if (!domino.inChain && this.canConnectToChain(domino)) {
                dominoEl.classList.add('can-connect');
            }
        });
    }

    valueToRank(value) {
        return this.ranks[value - 1];
    }

    renderChain() {
        const container = document.getElementById('chain-display');
        container.innerHTML = '';

        if (this.chain.length === 0) {
            container.innerHTML = '<span class="empty-message">Click dominos to build your chain...</span>';
            document.getElementById('remove-last-btn').disabled = true;
            return;
        }

        document.getElementById('remove-last-btn').disabled = false;

        const isCircular = this.checkCircular();

        // Calculate how many dominos fit per row based on container width
        const containerWidth = container.offsetWidth || 400;
        const dominoWidth = 80; // Approximate width of a chain domino with connector
        const maxPerRow = Math.max(2, Math.floor(containerWidth / dominoWidth));

        // Create rows
        let currentRow = document.createElement('div');
        currentRow.className = 'chain-row';

        this.chain.forEach((domino, index) => {
            // Check if we need to wrap to new row
            if (index > 0 && index % maxPerRow === 0) {
                container.appendChild(currentRow);

                // Add wrap indicator
                const wrapIndicator = document.createElement('div');
                wrapIndicator.className = 'chain-wrap-indicator';
                wrapIndicator.innerHTML = `
                    <div class="wrap-line"></div>
                    <div class="wrap-arrow">Display break - chain continues</div>
                    <div class="wrap-line right"></div>
                `;
                container.appendChild(wrapIndicator);

                currentRow = document.createElement('div');
                currentRow.className = 'chain-row';
            }

            const segment = document.createElement('div');
            segment.className = 'chain-segment';

            const val1 = domino.displayValue1 || domino.value1;
            const val2 = domino.displayValue2 || domino.value2;

            const dominoEl = document.createElement('div');
            dominoEl.className = 'chain-domino';

            if (isCircular) {
                dominoEl.classList.add('circular');
            }
            if (index === 0) {
                dominoEl.classList.add('chain-start');
            }
            if (index === this.chain.length - 1) {
                dominoEl.classList.add('chain-end');
            }

            // Show both the value and its complement for each end
            const comp1 = 14 - val1;
            const comp2 = 14 - val2;
            dominoEl.innerHTML = `
                <span class="chain-val">${this.valueToRank(val1)}${this.valueToRank(comp1)}</span>
                <span class="chain-sep">|</span>
                <span class="chain-val">${this.valueToRank(val2)}${this.valueToRank(comp2)}</span>
            `;

            segment.appendChild(dominoEl);

            // Add connector if not last in row and not last overall
            const isLastInRow = (index + 1) % maxPerRow === 0;
            const isLastOverall = index === this.chain.length - 1;

            if (!isLastOverall && !isLastInRow) {
                const connector = document.createElement('span');
                connector.className = 'chain-connector';
                connector.textContent = '―';
                if (isCircular) {
                    connector.classList.add('circular');
                }
                segment.appendChild(connector);
            }

            currentRow.appendChild(segment);
        });

        // Add the last row
        container.appendChild(currentRow);

        // Add circular indicator if applicable
        if (isCircular) {
            const circularBadge = document.createElement('span');
            circularBadge.className = 'chain-circular-badge';
            circularBadge.textContent = 'CIRCULAR!';
            container.appendChild(circularBadge);
        }

        // Update chain length display
        const lengthDisplay = document.getElementById('chain-length');
        lengthDisplay.innerHTML = `(${this.chain.length} dominos${isCircular ? ' <span style="color: #4caf50;">CIRCULAR!</span>' : ''})`;

        if (this.checkWin()) {
            this.showWin();
        }
    }

    updateCounts() {
        const cardsInTableau = this.tableau.reduce((sum, col) => sum + col.length, 0);
        const cardsInPairs = this.pairs.length * 2;
        const cardsInDominos = this.dominos.filter(d => !d.inChain).length * 4;
        const cardsInChain = this.chain.length * 4;

        document.getElementById('pairs-count').textContent = `Pairs: ${this.pairs.length}/6`;
        document.getElementById('dominos-count').textContent = `Dominos: ${this.dominos.length}`;
        document.getElementById('chain-status').textContent = `Chain: ${this.chain.length}`;
        document.getElementById('tableau-cards').textContent = `(${cardsInTableau} cards)`;
    }

    showWin() {
        const modal = document.getElementById('win-modal');
        const message = document.getElementById('win-message');
        message.textContent = `You created a perfect circular chain with all 52 cards!`;

        document.getElementById('win-dominos').textContent = this.chain.length;
        document.getElementById('win-moves').textContent = this.moveCount;

        modal.classList.remove('hidden');
    }

    bindEvents() {
        // New game
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());

        // Undo
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());

        // Clear chain
        document.getElementById('clear-chain-btn').addEventListener('click', () => {
            if (this.clearChain()) {
                this.render();
            }
        });

        // Remove last from chain
        document.getElementById('remove-last-btn').addEventListener('click', () => {
            if (this.removeLastFromChain()) {
                this.render();
            }
        });

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

        // Domino drag in workyard
        this.setupDominoDrag();
        this.setupPairDrag();

        // Handle window resize for chain re-render
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.renderChain();
            }, 100);
        });
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
            if (domino && !domino.closest('#chain-display') && !domino.classList.contains('in-chain')) {
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

        // Touch/drag support for cards
        this.setupCardDragAndDrop();
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
                    col.classList.add('pair-highlight');
                }
            }
        });
    }

    clearHighlights() {
        document.querySelectorAll('.column').forEach(col => {
            col.classList.remove('highlight', 'pair-highlight');
        });
    }

    setupDominoDrag() {
        const container = document.getElementById('dominos-container');
        let draggedEl = null;
        let draggedIndex = null;
        let placeholder = null;
        let touchOffset = { x: 0, y: 0 };

        // Mouse drag events
        container.addEventListener('dragstart', (e) => {
            const domino = e.target.closest('.domino');
            if (!domino || domino.classList.contains('in-chain')) {
                e.preventDefault();
                return;
            }

            draggedEl = domino;
            draggedIndex = parseInt(domino.dataset.index);
            domino.classList.add('dragging');

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedIndex);
        });

        container.addEventListener('dragend', (e) => {
            if (draggedEl) {
                draggedEl.classList.remove('dragging');
                draggedEl = null;
                draggedIndex = null;
            }
            if (placeholder) {
                placeholder.remove();
                placeholder = null;
            }
            container.classList.remove('drag-over');
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.add('drag-over');

            const afterElement = this.getDragAfterElement(container, e.clientX);
            if (draggedEl) {
                if (afterElement == null) {
                    container.appendChild(draggedEl);
                } else {
                    container.insertBefore(draggedEl, afterElement);
                }
            }
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');

            if (draggedEl && draggedIndex !== null) {
                const newIndex = Array.from(container.children).indexOf(draggedEl);
                if (newIndex !== draggedIndex && newIndex !== -1) {
                    // Update the dominos array order
                    const [moved] = this.dominos.splice(draggedIndex, 1);
                    this.dominos.splice(newIndex, 0, moved);
                    this.render();
                }
            }
        });

        // Touch drag for mobile
        container.addEventListener('touchstart', (e) => {
            const domino = e.target.closest('.domino');
            if (!domino || domino.classList.contains('in-chain')) return;

            draggedEl = domino;
            draggedIndex = parseInt(domino.dataset.index);

            const touch = e.touches[0];
            const rect = domino.getBoundingClientRect();
            touchOffset.x = touch.clientX - rect.left;
            touchOffset.y = touch.clientY - rect.top;

            // Create placeholder
            placeholder = domino.cloneNode(true);
            placeholder.classList.add('drag-placeholder');
            domino.parentNode.insertBefore(placeholder, domino.nextSibling);

            domino.classList.add('dragging');
            domino.style.position = 'fixed';
            domino.style.left = `${touch.clientX - touchOffset.x}px`;
            domino.style.top = `${touch.clientY - touchOffset.y}px`;
            domino.style.width = `${rect.width}px`;
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (!draggedEl) return;

            const touch = e.touches[0];
            draggedEl.style.left = `${touch.clientX - touchOffset.x}px`;
            draggedEl.style.top = `${touch.clientY - touchOffset.y}px`;

            // Find insertion point
            const afterElement = this.getDragAfterElement(container, touch.clientX);
            if (placeholder) {
                if (afterElement == null) {
                    container.appendChild(placeholder);
                } else if (afterElement !== draggedEl) {
                    container.insertBefore(placeholder, afterElement);
                }
            }
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            if (!draggedEl) return;

            draggedEl.classList.remove('dragging');
            draggedEl.style.position = '';
            draggedEl.style.left = '';
            draggedEl.style.top = '';
            draggedEl.style.width = '';

            if (placeholder) {
                const newIndex = Array.from(container.children).filter(el => !el.classList.contains('dragging')).indexOf(placeholder);
                placeholder.remove();
                placeholder = null;

                if (newIndex !== draggedIndex && newIndex !== -1) {
                    const [moved] = this.dominos.splice(draggedIndex, 1);
                    this.dominos.splice(newIndex, 0, moved);
                    this.render();
                }
            }

            draggedEl = null;
            draggedIndex = null;
        });
    }

    setupPairDrag() {
        const container = document.getElementById('pairs-container');
        let draggedIndex = null;

        const clearHighlights = () => {
            container.querySelectorAll('.pair-slot').forEach(slot => {
                slot.classList.remove('drag-over', 'dragging');
            });
        };

        container.addEventListener('dragstart', (e) => {
            const slot = e.target.closest('.pair-slot.filled');
            if (!slot) {
                e.preventDefault();
                return;
            }

            draggedIndex = parseInt(slot.dataset.slot);
            slot.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedIndex);
        });

        container.addEventListener('dragover', (e) => {
            const slot = e.target.closest('.pair-slot.filled');
            if (!slot || draggedIndex === null) return;

            e.preventDefault();
            slot.classList.add('drag-over');
        });

        container.addEventListener('dragleave', (e) => {
            const slot = e.target.closest('.pair-slot');
            if (slot) {
                slot.classList.remove('drag-over');
            }
        });

        container.addEventListener('drop', (e) => {
            const slot = e.target.closest('.pair-slot.filled');
            if (!slot || draggedIndex === null) return;

            e.preventDefault();
            const targetIndex = parseInt(slot.dataset.slot);

            if (targetIndex !== draggedIndex) {
                const temp = this.pairs[draggedIndex];
                this.pairs[draggedIndex] = this.pairs[targetIndex];
                this.pairs[targetIndex] = temp;
            }

            draggedIndex = null;
            clearHighlights();
            this.render();
        });

        container.addEventListener('dragend', () => {
            draggedIndex = null;
            clearHighlights();
        });

        // Touch drag for mobile
        container.addEventListener('touchstart', (e) => {
            const slot = e.target.closest('.pair-slot.filled');
            if (!slot) return;

            draggedIndex = parseInt(slot.dataset.slot);
            slot.classList.add('dragging');
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (draggedIndex === null) return;

            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const slot = target?.closest('.pair-slot.filled');

            container.querySelectorAll('.pair-slot').forEach(el => el.classList.remove('drag-over'));
            if (slot) {
                slot.classList.add('drag-over');
            }
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            if (draggedIndex === null) return;

            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            const slot = target?.closest('.pair-slot.filled');

            if (slot) {
                const targetIndex = parseInt(slot.dataset.slot);
                if (targetIndex !== draggedIndex) {
                    const temp = this.pairs[draggedIndex];
                    this.pairs[draggedIndex] = this.pairs[targetIndex];
                    this.pairs[targetIndex] = temp;
                }
            }

            draggedIndex = null;
            clearHighlights();
            this.render();
        });
    }

    getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.domino:not(.dragging):not(.drag-placeholder)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    setupCardDragAndDrop() {
        let draggedElement = null;
        let draggedData = null;
        let touchOffset = { x: 0, y: 0 };

        const gameContainer = document.getElementById('game-container');

        // Mouse drag
        gameContainer.addEventListener('mousedown', (e) => {
            const card = e.target.closest('.card.top-card');
            if (card && !card.closest('#workyard')) {
                this.startCardDrag(e, card);
            }
        });

        // Touch drag
        gameContainer.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.card.top-card');
            if (card && !card.closest('#workyard')) {
                this.startCardDrag(e, card);
            }
        }, { passive: false });

        this.startCardDrag = (e, card) => {
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
