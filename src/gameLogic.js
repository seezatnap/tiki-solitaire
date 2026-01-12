export const SUITS = ['♥', '♦', '♣', '♠'];
export const SUIT_NAMES = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const RANK_VALUES = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13
};

export const MAX_PAIRS = 6;
export const MAX_HISTORY = 50;

export const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        rank,
        suit,
        value: RANK_VALUES[rank],
        isRed: suit === '♥' || suit === '♦',
        id: `${rank}${suit}`
      });
    }
  }
  return deck;
};

export const shuffleDeck = (deck, rng = Math.random) => {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const dealTableau = (deck, columnCount = 8) => {
  const tableau = Array.from({ length: columnCount }, () => []);
  deck.forEach((card, index) => {
    tableau[index % columnCount].push(card);
  });
  return tableau;
};

export const createInitialState = (deck = shuffleDeck(createDeck())) => ({
  tableau: dealTableau(deck),
  pairs: [],
  dominos: [],
  chains: [], // Multiple chains support
  moveCount: 0,
  history: []
});

export const canStack = (topCard, bottomCard) => {
  if (!topCard || !bottomCard) return false;
  return topCard.rank === bottomCard.rank || topCard.value + bottomCard.value === 14;
};

export const canPair = (card1, card2) => {
  if (!card1 || !card2) return false;
  return card1.isRed !== card2.isRed && card1.value + card2.value === 14;
};

// Get the lower value of a pair (for ordering)
export const getPairLowerValue = (pair) => {
  const [cardA, cardB] = pair;
  return Math.min(cardA.value, cardB.value);
};

// Get normalized pair label with lower value first (e.g., "A-K" not "K-A")
export const getPairLabel = (pair) => {
  const [cardA, cardB] = pair;
  const ordered = [cardA, cardB].sort((a, b) => a.value - b.value);
  return `${ordered[0].rank}-${ordered[1].rank}`;
};

export const canFormDomino = (pair1, pair2) => {
  if (!pair1 || !pair2) return false;
  const allSuits = new Set([pair1[0].suit, pair1[1].suit, pair2[0].suit, pair2[1].suit]);
  return allSuits.size === 4;
};

const snapshotState = (state) => ({
  tableau: JSON.parse(JSON.stringify(state.tableau)),
  pairs: JSON.parse(JSON.stringify(state.pairs)),
  dominos: JSON.parse(JSON.stringify(state.dominos)),
  chains: JSON.parse(JSON.stringify(state.chains)),
  moveCount: state.moveCount
});

const withHistory = (state) => {
  const history = [...state.history, snapshotState(state)];
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
  return history;
};

export const undoState = (state) => {
  if (state.history.length === 0) return state;
  const previous = state.history[state.history.length - 1];
  return {
    ...previous,
    history: state.history.slice(0, -1)
  };
};

export const moveCard = (state, fromCol, toCol) => {
  if (fromCol === toCol) return state;
  const fromColumn = state.tableau[fromCol];
  const toColumn = state.tableau[toCol];
  if (!fromColumn || !toColumn || fromColumn.length === 0) return state;

  const card = fromColumn[fromColumn.length - 1];
  const targetCard = toColumn[toColumn.length - 1];

  if (toColumn.length !== 0 && !canStack(card, targetCard)) {
    return state;
  }

  const nextTableau = state.tableau.map((column, index) => {
    if (index === fromCol) return column.slice(0, -1);
    if (index === toCol) return [...column, card];
    return column;
  });

  return {
    ...state,
    tableau: nextTableau,
    moveCount: state.moveCount + 1,
    history: withHistory(state)
  };
};

export const createPairFromTableau = (state, fromCol, toCol) => {
  if (state.pairs.length >= MAX_PAIRS) return state;
  if (fromCol === toCol) return state;
  const fromColumn = state.tableau[fromCol];
  const toColumn = state.tableau[toCol];
  if (!fromColumn?.length || !toColumn?.length) return state;

  const card1 = fromColumn[fromColumn.length - 1];
  const card2 = toColumn[toColumn.length - 1];
  if (!canPair(card1, card2)) return state;

  const nextTableau = state.tableau.map((column, index) => {
    if (index === fromCol) return column.slice(0, -1);
    if (index === toCol) return column.slice(0, -1);
    return column;
  });

  const pair = card1.isRed ? [card1, card2] : [card2, card1];
  return {
    ...state,
    tableau: nextTableau,
    pairs: [...state.pairs, pair],
    moveCount: state.moveCount + 1,
    history: withHistory(state)
  };
};

// Normalize domino values so lower value pair comes first
// This ensures 5-9 matches 9-5 because both become 5-9
export const normalizeDominoValues = (value1, value2) => {
  // Extract the lower numeric value from each pair label (e.g., "A-K" -> 1, "5-9" -> 5)
  const getNumericValue = (label) => {
    const rank = label.split('-')[0];
    return RANK_VALUES[rank] || parseInt(rank, 10);
  };

  const num1 = getNumericValue(value1);
  const num2 = getNumericValue(value2);

  if (num1 <= num2) {
    return { value1, value2 };
  }
  return { value1: value2, value2: value1 };
};

export const createDominoFromPairs = (state, pairIndex1, pairIndex2) => {
  if (pairIndex1 === pairIndex2) return state;
  const pair1 = state.pairs[pairIndex1];
  const pair2 = state.pairs[pairIndex2];
  if (!pair1 || !pair2 || !canFormDomino(pair1, pair2)) return state;

  const label1 = getPairLabel(pair1);
  const label2 = getPairLabel(pair2);

  // Normalize so lower value comes first
  const { value1, value2 } = normalizeDominoValues(label1, label2);

  // Determine which pair corresponds to value1 and value2
  const orderedPair1 = label1 === value1 ? pair1 : pair2;
  const orderedPair2 = label1 === value1 ? pair2 : pair1;

  const domino = {
    id: `domino_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    pair1: orderedPair1,
    pair2: orderedPair2,
    value1,
    value2,
    cards: [...orderedPair1, ...orderedPair2],
    inChain: false
  };

  const indices = [pairIndex1, pairIndex2].sort((a, b) => b - a);
  const nextPairs = [...state.pairs];
  nextPairs.splice(indices[0], 1);
  nextPairs.splice(indices[1], 1);

  return {
    ...state,
    pairs: nextPairs,
    dominos: [...state.dominos, domino],
    moveCount: state.moveCount + 1,
    history: withHistory(state)
  };
};

export const canConnectDominos = (dominoA, dominoB) => {
  return dominoA.value1 === dominoB.value1 ||
    dominoA.value1 === dominoB.value2 ||
    dominoA.value2 === dominoB.value1 ||
    dominoA.value2 === dominoB.value2;
};

export const getChainEndValues = (chain) => {
  if (!chain || !chain.length) return null;
  const first = chain[0];
  const last = chain[chain.length - 1];
  return {
    start: first.displayValue1 || first.value1,
    end: last.displayValue2 || last.value2
  };
};

// Check if domino can connect to any chain end (start or end of any chain)
export const canConnectToChain = (domino, chain) => {
  if (!chain || !chain.length) return true;
  const ends = getChainEndValues(chain);
  return domino.value1 === ends.end || domino.value2 === ends.end;
};

// Check if domino can connect to the start of a chain
export const canConnectToChainStart = (domino, chain) => {
  if (!chain || !chain.length) return true;
  const ends = getChainEndValues(chain);
  return domino.value1 === ends.start || domino.value2 === ends.start;
};

// Get all chains this domino can connect to
export const getConnectableChains = (domino, chains) => {
  const result = [];
  chains.forEach((chain, chainIndex) => {
    const ends = getChainEndValues(chain);
    if (!ends) return;

    if (domino.value1 === ends.end || domino.value2 === ends.end) {
      result.push({ chainIndex, position: 'end' });
    }
    if (domino.value1 === ends.start || domino.value2 === ends.start) {
      result.push({ chainIndex, position: 'start' });
    }
  });
  return result;
};

// Add domino to a specific chain
export const addDominoToChain = (state, dominoIndex, chainIndex = null) => {
  const domino = state.dominos[dominoIndex];
  if (!domino || domino.inChain) return state;

  const chains = [...state.chains];

  // If no chain specified and no chains exist, start a new chain
  if (chainIndex === null && chains.length === 0) {
    const oriented = {
      ...domino,
      originalIndex: dominoIndex,
      displayValue1: domino.value1,
      displayValue2: domino.value2
    };
    const nextDominos = state.dominos.map((item, index) =>
      index === dominoIndex ? { ...item, inChain: true } : item
    );
    return {
      ...state,
      dominos: nextDominos,
      chains: [[oriented]],
      moveCount: state.moveCount + 1,
      history: withHistory(state)
    };
  }

  // If no chain specified, try to connect to any existing chain
  if (chainIndex === null) {
    for (let i = 0; i < chains.length; i++) {
      if (canConnectToChain(domino, chains[i])) {
        chainIndex = i;
        break;
      }
    }

    // If still can't connect, start a new chain
    if (chainIndex === null) {
      const oriented = {
        ...domino,
        originalIndex: dominoIndex,
        displayValue1: domino.value1,
        displayValue2: domino.value2
      };
      const nextDominos = state.dominos.map((item, index) =>
        index === dominoIndex ? { ...item, inChain: true } : item
      );
      return {
        ...state,
        dominos: nextDominos,
        chains: [...chains, [oriented]],
        moveCount: state.moveCount + 1,
        history: withHistory(state)
      };
    }
  }

  const chain = chains[chainIndex];
  if (!chain) return state;

  // Check if can connect to end
  const ends = getChainEndValues(chain);
  const canConnectEnd = domino.value1 === ends.end || domino.value2 === ends.end;
  const canConnectStart = domino.value1 === ends.start || domino.value2 === ends.start;

  if (!canConnectEnd && !canConnectStart) {
    // Can't connect to this chain, start new chain
    const oriented = {
      ...domino,
      originalIndex: dominoIndex,
      displayValue1: domino.value1,
      displayValue2: domino.value2
    };
    const nextDominos = state.dominos.map((item, index) =>
      index === dominoIndex ? { ...item, inChain: true } : item
    );
    return {
      ...state,
      dominos: nextDominos,
      chains: [...chains, [oriented]],
      moveCount: state.moveCount + 1,
      history: withHistory(state)
    };
  }

  const oriented = {
    ...domino,
    originalIndex: dominoIndex
  };

  // Prefer connecting to end
  if (canConnectEnd) {
    if (domino.value1 === ends.end) {
      oriented.displayValue1 = domino.value1;
      oriented.displayValue2 = domino.value2;
    } else {
      oriented.displayValue1 = domino.value2;
      oriented.displayValue2 = domino.value1;
    }
    chains[chainIndex] = [...chain, oriented];
  } else {
    // Connect to start
    if (domino.value2 === ends.start) {
      oriented.displayValue1 = domino.value1;
      oriented.displayValue2 = domino.value2;
    } else {
      oriented.displayValue1 = domino.value2;
      oriented.displayValue2 = domino.value1;
    }
    chains[chainIndex] = [oriented, ...chain];
  }

  const nextDominos = state.dominos.map((item, index) =>
    index === dominoIndex ? { ...item, inChain: true } : item
  );

  return {
    ...state,
    dominos: nextDominos,
    chains,
    moveCount: state.moveCount + 1,
    history: withHistory(state)
  };
};

// Remove last domino from a specific chain
export const removeLastFromChain = (state, chainIndex = 0) => {
  if (!state.chains.length || !state.chains[chainIndex]?.length) return state;

  const chains = [...state.chains];
  const chain = [...chains[chainIndex]];
  const removed = chain.pop();

  if (chain.length === 0) {
    // Remove empty chain
    chains.splice(chainIndex, 1);
  } else {
    chains[chainIndex] = chain;
  }

  const nextDominos = state.dominos.map((domino) =>
    domino.id === removed.id ? { ...domino, inChain: false } : domino
  );

  return {
    ...state,
    dominos: nextDominos,
    chains,
    history: withHistory(state)
  };
};

// Clear a specific chain or all chains
export const clearChain = (state, chainIndex = null) => {
  if (!state.chains.length) return state;

  let chainsToRemove;
  let nextChains;

  if (chainIndex === null) {
    // Clear all chains
    chainsToRemove = state.chains.flat();
    nextChains = [];
  } else {
    // Clear specific chain
    chainsToRemove = state.chains[chainIndex] || [];
    nextChains = state.chains.filter((_, i) => i !== chainIndex);
  }

  const ids = new Set(chainsToRemove.map((domino) => domino.id));
  const nextDominos = state.dominos.map((domino) =>
    ids.has(domino.id) ? { ...domino, inChain: false } : domino
  );

  return {
    ...state,
    dominos: nextDominos,
    chains: nextChains,
    history: withHistory(state)
  };
};

// Check if two chains can be joined
export const canJoinChains = (chain1, chain2) => {
  if (!chain1?.length || !chain2?.length) return false;
  const ends1 = getChainEndValues(chain1);
  const ends2 = getChainEndValues(chain2);

  return ends1.end === ends2.start ||
         ends1.end === ends2.end ||
         ends1.start === ends2.start ||
         ends1.start === ends2.end;
};

// Join two chains together
export const joinChains = (state, chainIndex1, chainIndex2) => {
  if (chainIndex1 === chainIndex2) return state;
  if (!state.chains[chainIndex1] || !state.chains[chainIndex2]) return state;

  const chain1 = state.chains[chainIndex1];
  const chain2 = state.chains[chainIndex2];

  if (!canJoinChains(chain1, chain2)) return state;

  const ends1 = getChainEndValues(chain1);
  const ends2 = getChainEndValues(chain2);

  let joinedChain;

  if (ends1.end === ends2.start) {
    // chain1 -> chain2
    joinedChain = [...chain1, ...chain2];
  } else if (ends1.end === ends2.end) {
    // chain1 -> reversed chain2
    joinedChain = [...chain1, ...reverseChain(chain2)];
  } else if (ends1.start === ends2.end) {
    // chain2 -> chain1
    joinedChain = [...chain2, ...chain1];
  } else if (ends1.start === ends2.start) {
    // reversed chain2 -> chain1
    joinedChain = [...reverseChain(chain2), ...chain1];
  } else {
    return state;
  }

  const indices = [chainIndex1, chainIndex2].sort((a, b) => b - a);
  const nextChains = [...state.chains];
  nextChains.splice(indices[0], 1);
  nextChains.splice(indices[1], 1);
  nextChains.push(joinedChain);

  return {
    ...state,
    chains: nextChains,
    moveCount: state.moveCount + 1,
    history: withHistory(state)
  };
};

// Reverse a chain (swap display values)
export const reverseChain = (chain) => {
  return chain.slice().reverse().map(domino => ({
    ...domino,
    displayValue1: domino.displayValue2,
    displayValue2: domino.displayValue1
  }));
};

// Reorder chains
export const reorderChains = (state, fromIndex, toIndex) => {
  if (fromIndex === toIndex) return state;
  if (fromIndex < 0 || fromIndex >= state.chains.length) return state;
  if (toIndex < 0 || toIndex >= state.chains.length) return state;

  const nextChains = [...state.chains];
  const [moved] = nextChains.splice(fromIndex, 1);
  nextChains.splice(toIndex, 0, moved);

  return {
    ...state,
    chains: nextChains,
    history: withHistory(state)
  };
};

export const checkCircular = (chain) => {
  if (!chain || chain.length < 2) return false;
  const first = chain[0];
  const last = chain[chain.length - 1];
  const start = first.displayValue1 || first.value1;
  const end = last.displayValue2 || last.value2;
  return start === end;
};

export const checkWin = (chains) => {
  // Win requires a single chain with all 52 cards that is circular
  if (!chains || chains.length !== 1) return false;
  const chain = chains[0];
  const totalCards = chain.length * 4;
  return totalCards === 52 && checkCircular(chain);
};

// Get total chain length across all chains
export const getTotalChainLength = (chains) => {
  if (!chains) return 0;
  return chains.reduce((sum, chain) => sum + chain.length, 0);
};

export const reorderPairs = (state, fromIndex, toIndex) => {
  if (fromIndex === toIndex) return state;
  if (fromIndex < 0 || fromIndex >= state.pairs.length) return state;
  if (toIndex < 0 || toIndex >= state.pairs.length) return state;

  const nextPairs = [...state.pairs];
  const [moved] = nextPairs.splice(fromIndex, 1);
  nextPairs.splice(toIndex, 0, moved);

  return {
    ...state,
    pairs: nextPairs,
    history: withHistory(state)
  };
};

export const reorderDominos = (state, fromIndex, toIndex) => {
  if (fromIndex === toIndex) return state;
  if (fromIndex < 0 || fromIndex >= state.dominos.length) return state;
  if (toIndex < 0 || toIndex >= state.dominos.length) return state;

  const nextDominos = [...state.dominos];
  const [moved] = nextDominos.splice(fromIndex, 1);
  nextDominos.splice(toIndex, 0, moved);

  return {
    ...state,
    dominos: nextDominos,
    history: withHistory(state)
  };
};

export const countTableauCards = (tableau) => tableau.reduce((sum, col) => sum + col.length, 0);
