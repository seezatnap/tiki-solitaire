import { describe, it, expect, beforeEach } from 'vitest';
import {
  SUITS,
  RANKS,
  RANK_VALUES,
  MAX_PAIRS,
  MAX_HISTORY,
  createDeck,
  shuffleDeck,
  dealTableau,
  createInitialState,
  canStack,
  canPair,
  getPairLowerValue,
  getPairLabel,
  canFormDomino,
  normalizeDominoValues,
  undoState,
  moveCard,
  createPairFromTableau,
  createDominoFromPairs,
  canConnectDominos,
  getChainEndValues,
  canConnectToChain,
  canConnectToChainStart,
  getConnectableChains,
  addDominoToChain,
  removeLastFromChain,
  clearChain,
  canJoinChains,
  joinChains,
  reverseChain,
  reorderChains,
  checkCircular,
  checkWin,
  getTotalChainLength,
  reorderPairs,
  reorderDominos,
  countTableauCards
} from '../gameLogic.js';

// Helper function to create a card
const makeCard = (rank, suit) => ({
  rank,
  suit,
  value: RANK_VALUES[rank],
  isRed: suit === '♥' || suit === '♦',
  id: `${rank}${suit}`
});

// Helper function to create a pair
const makePair = (card1, card2) => [card1, card2];

describe('createDeck', () => {
  it('creates a deck with 52 cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it('has 4 suits with 13 cards each', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      const suitCards = deck.filter(c => c.suit === suit);
      expect(suitCards).toHaveLength(13);
    }
  });

  it('has all ranks for each suit', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const card = deck.find(c => c.suit === suit && c.rank === rank);
        expect(card).toBeDefined();
        expect(card.value).toBe(RANK_VALUES[rank]);
      }
    }
  });

  it('sets isRed correctly for hearts and diamonds', () => {
    const deck = createDeck();
    const redCards = deck.filter(c => c.isRed);
    const blackCards = deck.filter(c => !c.isRed);
    expect(redCards).toHaveLength(26);
    expect(blackCards).toHaveLength(26);
    expect(redCards.every(c => c.suit === '♥' || c.suit === '♦')).toBe(true);
    expect(blackCards.every(c => c.suit === '♣' || c.suit === '♠')).toBe(true);
  });

  it('creates unique card IDs', () => {
    const deck = createDeck();
    const ids = deck.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(52);
  });
});

describe('shuffleDeck', () => {
  it('returns a deck with all 52 cards', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
  });

  it('does not modify the original deck', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(original);
  });

  it('uses provided RNG function', () => {
    const deck = createDeck();
    // Use a fixed seed for deterministic testing
    let seed = 12345;
    const seededRng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const shuffled1 = shuffleDeck(deck, seededRng);

    seed = 12345;
    const shuffled2 = shuffleDeck(deck, seededRng);

    expect(shuffled1.map(c => c.id)).toEqual(shuffled2.map(c => c.id));
  });

  it('produces different order with different RNG', () => {
    const deck = createDeck();
    const shuffled1 = shuffleDeck(deck, () => 0.1);
    const shuffled2 = shuffleDeck(deck, () => 0.9);
    expect(shuffled1.map(c => c.id)).not.toEqual(shuffled2.map(c => c.id));
  });
});

describe('dealTableau', () => {
  it('creates 8 columns by default', () => {
    const deck = createDeck();
    const tableau = dealTableau(deck);
    expect(tableau).toHaveLength(8);
  });

  it('distributes all 52 cards', () => {
    const deck = createDeck();
    const tableau = dealTableau(deck);
    const totalCards = tableau.reduce((sum, col) => sum + col.length, 0);
    expect(totalCards).toBe(52);
  });

  it('distributes cards evenly (6-7 per column)', () => {
    const deck = createDeck();
    const tableau = dealTableau(deck);
    tableau.forEach(col => {
      expect(col.length).toBeGreaterThanOrEqual(6);
      expect(col.length).toBeLessThanOrEqual(7);
    });
  });

  it('respects custom column count', () => {
    const deck = createDeck();
    const tableau = dealTableau(deck, 4);
    expect(tableau).toHaveLength(4);
    expect(tableau.every(col => col.length === 13)).toBe(true);
  });
});

describe('createInitialState', () => {
  it('creates initial state with correct structure', () => {
    const state = createInitialState();
    expect(state.tableau).toHaveLength(8);
    expect(state.pairs).toEqual([]);
    expect(state.dominos).toEqual([]);
    expect(state.chains).toEqual([]);
    expect(state.moveCount).toBe(0);
    expect(state.history).toEqual([]);
  });

  it('uses provided deck', () => {
    const deck = createDeck(); // Unshuffled
    const state = createInitialState(deck);
    // First card should be A♥ (first card in unshuffled deck)
    expect(state.tableau[0][0].id).toBe('A♥');
  });
});

describe('canStack', () => {
  it('returns true for same rank', () => {
    const card1 = makeCard('9', '♥');
    const card2 = makeCard('9', '♣');
    expect(canStack(card1, card2)).toBe(true);
  });

  it('returns true for cards summing to 14', () => {
    // A(1) + K(13) = 14
    expect(canStack(makeCard('A', '♥'), makeCard('K', '♣'))).toBe(true);
    // 2 + Q(12) = 14
    expect(canStack(makeCard('2', '♥'), makeCard('Q', '♣'))).toBe(true);
    // 3 + J(11) = 14
    expect(canStack(makeCard('3', '♥'), makeCard('J', '♣'))).toBe(true);
    // 4 + 10 = 14
    expect(canStack(makeCard('4', '♥'), makeCard('10', '♣'))).toBe(true);
    // 5 + 9 = 14
    expect(canStack(makeCard('5', '♥'), makeCard('9', '♣'))).toBe(true);
    // 6 + 8 = 14
    expect(canStack(makeCard('6', '♥'), makeCard('8', '♣'))).toBe(true);
    // 7 + 7 = 14
    expect(canStack(makeCard('7', '♥'), makeCard('7', '♣'))).toBe(true);
  });

  it('returns false for different ranks not summing to 14', () => {
    expect(canStack(makeCard('2', '♥'), makeCard('3', '♣'))).toBe(false);
    expect(canStack(makeCard('A', '♥'), makeCard('2', '♣'))).toBe(false);
  });

  it('returns false for null cards', () => {
    expect(canStack(null, makeCard('9', '♣'))).toBe(false);
    expect(canStack(makeCard('9', '♥'), null)).toBe(false);
    expect(canStack(null, null)).toBe(false);
  });
});

describe('canPair', () => {
  it('returns true for red + black cards summing to 14', () => {
    // A♥ + K♣
    expect(canPair(makeCard('A', '♥'), makeCard('K', '♣'))).toBe(true);
    // A♦ + K♠
    expect(canPair(makeCard('A', '♦'), makeCard('K', '♠'))).toBe(true);
    // 5♥ + 9♣
    expect(canPair(makeCard('5', '♥'), makeCard('9', '♣'))).toBe(true);
  });

  it('returns false for same color cards', () => {
    // Both red
    expect(canPair(makeCard('A', '♥'), makeCard('K', '♦'))).toBe(false);
    // Both black
    expect(canPair(makeCard('A', '♣'), makeCard('K', '♠'))).toBe(false);
  });

  it('returns false for cards not summing to 14', () => {
    expect(canPair(makeCard('A', '♥'), makeCard('2', '♣'))).toBe(false);
  });

  it('returns false for null cards', () => {
    expect(canPair(null, makeCard('K', '♣'))).toBe(false);
    expect(canPair(makeCard('A', '♥'), null)).toBe(false);
  });
});

describe('getPairLowerValue', () => {
  it('returns the lower value of the pair', () => {
    const pair = makePair(makeCard('K', '♥'), makeCard('A', '♣'));
    expect(getPairLowerValue(pair)).toBe(1); // A = 1
  });

  it('handles 7+7 pair correctly', () => {
    const pair = makePair(makeCard('7', '♥'), makeCard('7', '♣'));
    expect(getPairLowerValue(pair)).toBe(7);
  });
});

describe('getPairLabel', () => {
  it('returns label with lower value first', () => {
    // K-A should become A-K
    const pair1 = makePair(makeCard('K', '♥'), makeCard('A', '♣'));
    expect(getPairLabel(pair1)).toBe('A-K');

    // 9-5 should become 5-9
    const pair2 = makePair(makeCard('9', '♥'), makeCard('5', '♣'));
    expect(getPairLabel(pair2)).toBe('5-9');
  });

  it('handles equal values', () => {
    const pair = makePair(makeCard('7', '♥'), makeCard('7', '♣'));
    expect(getPairLabel(pair)).toBe('7-7');
  });
});

describe('canFormDomino', () => {
  it('returns true when pairs have all 4 suits', () => {
    const pair1 = makePair(makeCard('A', '♥'), makeCard('K', '♣'));
    const pair2 = makePair(makeCard('5', '♦'), makeCard('9', '♠'));
    expect(canFormDomino(pair1, pair2)).toBe(true);
  });

  it('returns false when pairs are missing suits', () => {
    // Both pairs have ♥ and ♣ only
    const pair1 = makePair(makeCard('A', '♥'), makeCard('K', '♣'));
    const pair2 = makePair(makeCard('2', '♥'), makeCard('Q', '♣'));
    expect(canFormDomino(pair1, pair2)).toBe(false);
  });

  it('returns false for null pairs', () => {
    const pair = makePair(makeCard('A', '♥'), makeCard('K', '♣'));
    expect(canFormDomino(null, pair)).toBe(false);
    expect(canFormDomino(pair, null)).toBe(false);
  });
});

describe('normalizeDominoValues', () => {
  it('keeps values in order when already normalized', () => {
    const result = normalizeDominoValues('A-K', '5-9');
    expect(result.value1).toBe('A-K');
    expect(result.value2).toBe('5-9');
  });

  it('swaps values when out of order', () => {
    const result = normalizeDominoValues('5-9', 'A-K');
    expect(result.value1).toBe('A-K');
    expect(result.value2).toBe('5-9');
  });

  it('handles equal values', () => {
    const result = normalizeDominoValues('7-7', '7-7');
    expect(result.value1).toBe('7-7');
    expect(result.value2).toBe('7-7');
  });
});

describe('moveCard', () => {
  let state;

  beforeEach(() => {
    const deck = createDeck();
    state = createInitialState(deck);
  });

  it('moves card to empty column', () => {
    // Empty a column first
    const emptyState = { ...state, tableau: state.tableau.map((col, i) => i === 7 ? [] : col) };
    const result = moveCard(emptyState, 0, 7);
    expect(result.tableau[0].length).toBe(state.tableau[0].length - 1);
    expect(result.tableau[7].length).toBe(1);
    expect(result.moveCount).toBe(1);
  });

  it('moves card to compatible card (same rank)', () => {
    // Set up columns where top cards have same rank
    const card = makeCard('A', '♥');
    const targetCard = makeCard('A', '♣');
    const customState = {
      ...state,
      tableau: [
        [card],
        [targetCard],
        ...state.tableau.slice(2)
      ]
    };
    const result = moveCard(customState, 0, 1);
    expect(result.tableau[0]).toHaveLength(0);
    expect(result.tableau[1]).toHaveLength(2);
  });

  it('returns same state for invalid move', () => {
    // Try to move to column with incompatible card
    const card = makeCard('2', '♥');
    const targetCard = makeCard('5', '♣');
    const customState = {
      ...state,
      tableau: [
        [card],
        [targetCard],
        ...state.tableau.slice(2)
      ]
    };
    const result = moveCard(customState, 0, 1);
    expect(result).toBe(customState);
  });

  it('returns same state when moving to same column', () => {
    const result = moveCard(state, 0, 0);
    expect(result).toBe(state);
  });

  it('adds to history', () => {
    const emptyState = { ...state, tableau: state.tableau.map((col, i) => i === 7 ? [] : col) };
    const result = moveCard(emptyState, 0, 7);
    expect(result.history).toHaveLength(1);
  });
});

describe('createPairFromTableau', () => {
  let state;

  beforeEach(() => {
    state = createInitialState();
  });

  it('creates pair from compatible cards', () => {
    const customState = {
      ...state,
      tableau: [
        [makeCard('A', '♥')],
        [makeCard('K', '♣')],
        ...state.tableau.slice(2)
      ]
    };
    const result = createPairFromTableau(customState, 0, 1);
    expect(result.pairs).toHaveLength(1);
    expect(result.tableau[0]).toHaveLength(0);
    expect(result.tableau[1]).toHaveLength(0);
  });

  it('puts red card first in pair', () => {
    const customState = {
      ...state,
      tableau: [
        [makeCard('K', '♣')],
        [makeCard('A', '♥')],
        ...state.tableau.slice(2)
      ]
    };
    const result = createPairFromTableau(customState, 0, 1);
    expect(result.pairs[0][0].isRed).toBe(true);
  });

  it('returns same state when pairs are full', () => {
    const fullPairsState = {
      ...state,
      pairs: Array(MAX_PAIRS).fill([makeCard('A', '♥'), makeCard('K', '♣')]),
      tableau: [
        [makeCard('2', '♦')],
        [makeCard('Q', '♠')],
        ...state.tableau.slice(2)
      ]
    };
    const result = createPairFromTableau(fullPairsState, 0, 1);
    expect(result).toBe(fullPairsState);
  });

  it('returns same state for incompatible cards', () => {
    const customState = {
      ...state,
      tableau: [
        [makeCard('A', '♥')],
        [makeCard('2', '♣')],
        ...state.tableau.slice(2)
      ]
    };
    const result = createPairFromTableau(customState, 0, 1);
    expect(result).toBe(customState);
  });
});

describe('createDominoFromPairs', () => {
  let state;

  beforeEach(() => {
    state = {
      ...createInitialState(),
      pairs: [
        makePair(makeCard('A', '♥'), makeCard('K', '♣')),
        makePair(makeCard('5', '♦'), makeCard('9', '♠'))
      ]
    };
  });

  it('creates domino from compatible pairs', () => {
    const result = createDominoFromPairs(state, 0, 1);
    expect(result.dominos).toHaveLength(1);
    expect(result.pairs).toHaveLength(0);
  });

  it('normalizes domino values with lower value first', () => {
    const result = createDominoFromPairs(state, 0, 1);
    const domino = result.dominos[0];
    // A-K (value 1) should come before 5-9 (value 5)
    expect(domino.value1).toBe('A-K');
    expect(domino.value2).toBe('5-9');
  });

  it('returns same state for same pair indices', () => {
    const result = createDominoFromPairs(state, 0, 0);
    expect(result).toBe(state);
  });

  it('returns same state for incompatible pairs', () => {
    const incompatibleState = {
      ...state,
      pairs: [
        makePair(makeCard('A', '♥'), makeCard('K', '♣')),
        makePair(makeCard('2', '♥'), makeCard('Q', '♣'))
      ]
    };
    const result = createDominoFromPairs(incompatibleState, 0, 1);
    expect(result).toBe(incompatibleState);
  });
});

describe('addDominoToChain', () => {
  let state;
  let domino1;
  let domino2;

  beforeEach(() => {
    domino1 = {
      id: 'domino1',
      value1: 'A-K',
      value2: '5-9',
      pair1: makePair(makeCard('A', '♥'), makeCard('K', '♣')),
      pair2: makePair(makeCard('5', '♦'), makeCard('9', '♠')),
      cards: [],
      inChain: false
    };
    domino2 = {
      id: 'domino2',
      value1: '3-J',
      value2: '5-9',
      pair1: makePair(makeCard('3', '♥'), makeCard('J', '♣')),
      pair2: makePair(makeCard('5', '♦'), makeCard('9', '♠')),
      cards: [],
      inChain: false
    };
    state = {
      ...createInitialState(),
      dominos: [domino1, domino2]
    };
  });

  it('starts new chain with first domino', () => {
    const result = addDominoToChain(state, 0);
    expect(result.chains).toHaveLength(1);
    expect(result.chains[0]).toHaveLength(1);
    expect(result.dominos[0].inChain).toBe(true);
  });

  it('adds connecting domino to chain end', () => {
    // First add domino1 (A-K | 5-9)
    let result = addDominoToChain(state, 0);
    // Then add domino2 (3-J | 5-9) which connects at 5-9
    result = addDominoToChain(result, 1);
    expect(result.chains[0]).toHaveLength(2);
  });

  it('starts new chain when domino cannot connect', () => {
    const disconnectedDomino = {
      id: 'domino3',
      value1: '2-Q',
      value2: '4-10',
      pair1: makePair(makeCard('2', '♥'), makeCard('Q', '♣')),
      pair2: makePair(makeCard('4', '♦'), makeCard('10', '♠')),
      cards: [],
      inChain: false
    };
    const stateWithDisconnected = {
      ...state,
      dominos: [domino1, disconnectedDomino]
    };

    let result = addDominoToChain(stateWithDisconnected, 0);
    result = addDominoToChain(result, 1);
    expect(result.chains).toHaveLength(2);
  });

  it('returns same state for domino already in chain', () => {
    let result = addDominoToChain(state, 0);
    result = addDominoToChain(result, 0); // Try to add same domino again
    expect(result.chains[0]).toHaveLength(1);
  });
});

describe('removeLastFromChain', () => {
  let state;

  beforeEach(() => {
    const domino = {
      id: 'domino1',
      value1: 'A-K',
      value2: '5-9',
      inChain: true
    };
    state = {
      ...createInitialState(),
      dominos: [{ ...domino, inChain: true }],
      chains: [[{
        ...domino,
        displayValue1: 'A-K',
        displayValue2: '5-9'
      }]]
    };
  });

  it('removes last domino from chain', () => {
    const result = removeLastFromChain(state, 0);
    expect(result.chains).toHaveLength(0); // Empty chains are removed
    expect(result.dominos[0].inChain).toBe(false);
  });

  it('returns same state when chain is empty', () => {
    const emptyState = { ...state, chains: [[]] };
    const result = removeLastFromChain(emptyState, 0);
    expect(result).toBe(emptyState);
  });
});

describe('clearChain', () => {
  let state;

  beforeEach(() => {
    const domino1 = { id: 'd1', inChain: true };
    const domino2 = { id: 'd2', inChain: true };
    state = {
      ...createInitialState(),
      dominos: [
        { ...domino1, inChain: true },
        { ...domino2, inChain: true }
      ],
      chains: [
        [{ ...domino1, displayValue1: 'A-K', displayValue2: '5-9' }],
        [{ ...domino2, displayValue1: '2-Q', displayValue2: '3-J' }]
      ]
    };
  });

  it('clears specific chain', () => {
    const result = clearChain(state, 0);
    expect(result.chains).toHaveLength(1);
    expect(result.dominos[0].inChain).toBe(false);
    expect(result.dominos[1].inChain).toBe(true);
  });

  it('clears all chains when chainIndex is null', () => {
    const result = clearChain(state, null);
    expect(result.chains).toHaveLength(0);
    expect(result.dominos[0].inChain).toBe(false);
    expect(result.dominos[1].inChain).toBe(false);
  });
});

describe('canJoinChains', () => {
  it('returns true when chain ends match', () => {
    const chain1 = [{ displayValue1: 'A-K', displayValue2: '5-9' }];
    const chain2 = [{ displayValue1: '5-9', displayValue2: '2-Q' }];
    expect(canJoinChains(chain1, chain2)).toBe(true);
  });

  it('returns true when chain1 end matches chain2 end (reverse)', () => {
    const chain1 = [{ displayValue1: 'A-K', displayValue2: '5-9' }];
    const chain2 = [{ displayValue1: '2-Q', displayValue2: '5-9' }];
    expect(canJoinChains(chain1, chain2)).toBe(true);
  });

  it('returns false when no ends match', () => {
    const chain1 = [{ displayValue1: 'A-K', displayValue2: '5-9' }];
    const chain2 = [{ displayValue1: '2-Q', displayValue2: '3-J' }];
    expect(canJoinChains(chain1, chain2)).toBe(false);
  });

  it('returns false for empty chains', () => {
    expect(canJoinChains([], [])).toBe(false);
    expect(canJoinChains([{ displayValue1: 'A-K', displayValue2: '5-9' }], [])).toBe(false);
  });
});

describe('joinChains', () => {
  let state;

  beforeEach(() => {
    const chain1 = [{ id: 'd1', displayValue1: 'A-K', displayValue2: '5-9' }];
    const chain2 = [{ id: 'd2', displayValue1: '5-9', displayValue2: '2-Q' }];
    state = {
      ...createInitialState(),
      chains: [chain1, chain2]
    };
  });

  it('joins compatible chains', () => {
    const result = joinChains(state, 0, 1);
    expect(result.chains).toHaveLength(1);
    expect(result.chains[0]).toHaveLength(2);
  });

  it('returns same state for same chain indices', () => {
    const result = joinChains(state, 0, 0);
    expect(result).toBe(state);
  });

  it('returns same state for incompatible chains', () => {
    const incompatibleState = {
      ...state,
      chains: [
        [{ id: 'd1', displayValue1: 'A-K', displayValue2: '5-9' }],
        [{ id: 'd2', displayValue1: '2-Q', displayValue2: '3-J' }]
      ]
    };
    const result = joinChains(incompatibleState, 0, 1);
    expect(result).toBe(incompatibleState);
  });
});

describe('reverseChain', () => {
  it('reverses chain and swaps display values', () => {
    const chain = [
      { id: 'd1', displayValue1: 'A-K', displayValue2: '5-9' },
      { id: 'd2', displayValue1: '5-9', displayValue2: '2-Q' }
    ];
    const reversed = reverseChain(chain);
    expect(reversed[0].id).toBe('d2');
    expect(reversed[0].displayValue1).toBe('2-Q');
    expect(reversed[0].displayValue2).toBe('5-9');
    expect(reversed[1].id).toBe('d1');
    expect(reversed[1].displayValue1).toBe('5-9');
    expect(reversed[1].displayValue2).toBe('A-K');
  });
});

describe('checkCircular', () => {
  it('returns true when start equals end', () => {
    const chain = [
      { displayValue1: 'A-K', displayValue2: '5-9' },
      { displayValue1: '5-9', displayValue2: 'A-K' }
    ];
    expect(checkCircular(chain)).toBe(true);
  });

  it('returns false when start does not equal end', () => {
    const chain = [
      { displayValue1: 'A-K', displayValue2: '5-9' },
      { displayValue1: '5-9', displayValue2: '2-Q' }
    ];
    expect(checkCircular(chain)).toBe(false);
  });

  it('returns false for chain with less than 2 dominos', () => {
    expect(checkCircular([])).toBe(false);
    expect(checkCircular([{ displayValue1: 'A-K', displayValue2: '5-9' }])).toBe(false);
  });
});

describe('checkWin', () => {
  it('returns true for single circular chain with 13 dominos', () => {
    // 13 dominos = 52 cards
    const chain = Array(13).fill(null).map((_, i) => ({
      displayValue1: i === 0 ? 'A-K' : `${i}-${i}`,
      displayValue2: i === 12 ? 'A-K' : `${i + 1}-${i + 1}`
    }));
    // Make it circular
    chain[12].displayValue2 = 'A-K';

    expect(checkWin([chain])).toBe(true);
  });

  it('returns false for non-circular chain', () => {
    const chain = Array(13).fill(null).map((_, i) => ({
      displayValue1: `${i}-${i}`,
      displayValue2: `${i + 1}-${i + 1}`
    }));
    expect(checkWin([chain])).toBe(false);
  });

  it('returns false for multiple chains', () => {
    const chain1 = Array(7).fill(null).map((_, i) => ({
      displayValue1: `${i}-${i}`,
      displayValue2: `${i + 1}-${i + 1}`
    }));
    const chain2 = Array(6).fill(null).map((_, i) => ({
      displayValue1: `${i + 7}-${i + 7}`,
      displayValue2: `${i + 8}-${i + 8}`
    }));
    expect(checkWin([chain1, chain2])).toBe(false);
  });

  it('returns false for chain with fewer than 52 cards', () => {
    const chain = [{ displayValue1: 'A-K', displayValue2: 'A-K' }];
    expect(checkWin([chain])).toBe(false);
  });
});

describe('getTotalChainLength', () => {
  it('returns sum of all chain lengths', () => {
    const chains = [
      [{ id: 'd1' }, { id: 'd2' }],
      [{ id: 'd3' }]
    ];
    expect(getTotalChainLength(chains)).toBe(3);
  });

  it('returns 0 for empty chains array', () => {
    expect(getTotalChainLength([])).toBe(0);
  });

  it('returns 0 for null/undefined', () => {
    expect(getTotalChainLength(null)).toBe(0);
    expect(getTotalChainLength(undefined)).toBe(0);
  });
});

describe('undoState', () => {
  it('restores previous state', () => {
    const previousState = createInitialState();
    const currentState = {
      ...previousState,
      moveCount: 5,
      history: [{ ...previousState }]
    };
    const result = undoState(currentState);
    expect(result.moveCount).toBe(0);
    expect(result.history).toHaveLength(0);
  });

  it('returns same state when history is empty', () => {
    const state = createInitialState();
    const result = undoState(state);
    expect(result).toBe(state);
  });
});

describe('reorderPairs', () => {
  it('reorders pairs', () => {
    const state = {
      ...createInitialState(),
      pairs: [
        makePair(makeCard('A', '♥'), makeCard('K', '♣')),
        makePair(makeCard('5', '♦'), makeCard('9', '♠'))
      ]
    };
    const result = reorderPairs(state, 0, 1);
    expect(result.pairs[0][0].rank).toBe('5');
    expect(result.pairs[1][0].rank).toBe('A');
  });

  it('returns same state for same indices', () => {
    const state = { ...createInitialState(), pairs: [[]] };
    const result = reorderPairs(state, 0, 0);
    expect(result).toBe(state);
  });

  it('returns same state for invalid indices', () => {
    const state = { ...createInitialState(), pairs: [[]] };
    expect(reorderPairs(state, -1, 0)).toBe(state);
    expect(reorderPairs(state, 0, 5)).toBe(state);
  });
});

describe('reorderDominos', () => {
  it('reorders dominos', () => {
    const state = {
      ...createInitialState(),
      dominos: [{ id: 'd1' }, { id: 'd2' }]
    };
    const result = reorderDominos(state, 0, 1);
    expect(result.dominos[0].id).toBe('d2');
    expect(result.dominos[1].id).toBe('d1');
  });
});

describe('reorderChains', () => {
  it('reorders chains', () => {
    const state = {
      ...createInitialState(),
      chains: [[{ id: 'd1' }], [{ id: 'd2' }]]
    };
    const result = reorderChains(state, 0, 1);
    expect(result.chains[0][0].id).toBe('d2');
    expect(result.chains[1][0].id).toBe('d1');
  });
});

describe('countTableauCards', () => {
  it('counts all cards in tableau', () => {
    const state = createInitialState();
    expect(countTableauCards(state.tableau)).toBe(52);
  });

  it('returns 0 for empty tableau', () => {
    expect(countTableauCards(Array(8).fill([]))).toBe(0);
  });
});
