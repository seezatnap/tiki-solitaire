import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  MAX_PAIRS,
  addDominoToChain,
  canConnectToChain,
  canFormDomino,
  canJoinChains,
  canPair,
  canStack,
  checkCircular,
  checkWin,
  clearChain,
  countTableauCards,
  createDominoFromPairs,
  createInitialState,
  createPairFromTableau,
  getChainEndValues,
  getTotalChainLength,
  joinChains,
  moveCard,
  removeLastFromChain,
  reorderChains,
  reorderDominos,
  reorderPairs,
  undoState
} from './gameLogic.js';
import { useChainLayout } from './useChainLayout.js';

const reducer = (state, action) => {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();
    case 'UNDO':
      return undoState(state);
    case 'MOVE_CARD':
      return moveCard(state, action.fromCol, action.toCol);
    case 'CREATE_PAIR':
      return createPairFromTableau(state, action.fromCol, action.toCol);
    case 'CREATE_DOMINO':
      return createDominoFromPairs(state, action.pairIndex1, action.pairIndex2);
    case 'ADD_CHAIN':
      return addDominoToChain(state, action.dominoIndex, action.chainIndex);
    case 'REMOVE_LAST':
      return removeLastFromChain(state, action.chainIndex);
    case 'CLEAR_CHAIN':
      return clearChain(state, action.chainIndex);
    case 'JOIN_CHAINS':
      return joinChains(state, action.chainIndex1, action.chainIndex2);
    case 'REORDER_CHAINS':
      return reorderChains(state, action.fromIndex, action.toIndex);
    case 'REORDER_PAIRS':
      return reorderPairs(state, action.fromIndex, action.toIndex);
    case 'REORDER_DOMINOS':
      return reorderDominos(state, action.fromIndex, action.toIndex);
    default:
      return state;
  }
};

const getTopCard = (tableau, columnIndex) => {
  const column = tableau[columnIndex];
  return column?.[column.length - 1] || null;
};

const chunk = (items, size) => {
  if (!items.length) return [];
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
};

const getDominoPairLabel = (pair) => {
  const [first, second] = pair;
  return `${first.rank}${second.rank}`;
};

const getDominoSubLabel = (pair) => {
  const [first, second] = pair;
  return `${first.suit}${second.suit}`;
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, () => createInitialState());
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPairIndex, setSelectedPairIndex] = useState(null);
  const [selectedChainIndex, setSelectedChainIndex] = useState(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWinOpen, setIsWinOpen] = useState(false);
  const { containerRef, maxPerRow } = useChainLayout();

  const totalChainLength = getTotalChainLength(state.chains);
  const totalTableauCards = countTableauCards(state.tableau);

  useEffect(() => {
    if (checkWin(state.chains)) {
      setIsWinOpen(true);
    }
  }, [state.chains]);

  const clearSelections = () => {
    setSelectedCard(null);
    setSelectedPairIndex(null);
    setSelectedChainIndex(null);
  };

  const handleNewGame = () => {
    dispatch({ type: 'NEW_GAME' });
    setIsWinOpen(false);
    clearSelections();
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO' });
    clearSelections();
  };

  const handleCardClick = (columnIndex) => {
    const topCard = getTopCard(state.tableau, columnIndex);
    if (!topCard) return;

    if (!selectedCard) {
      setSelectedCard({ columnIndex });
      return;
    }

    const fromCol = selectedCard.columnIndex;
    if (fromCol === columnIndex) {
      clearSelections();
      return;
    }

    const fromCard = getTopCard(state.tableau, fromCol);
    const toCard = getTopCard(state.tableau, columnIndex);

    if (fromCard && toCard && canPair(fromCard, toCard) && state.pairs.length < MAX_PAIRS) {
      dispatch({ type: 'CREATE_PAIR', fromCol, toCol: columnIndex });
      clearSelections();
      return;
    }

    if (state.tableau[columnIndex].length === 0 || canStack(fromCard, toCard)) {
      dispatch({ type: 'MOVE_CARD', fromCol, toCol: columnIndex });
      clearSelections();
      return;
    }

    setSelectedCard({ columnIndex });
  };

  const handleEmptyColumnClick = (columnIndex) => {
    if (!selectedCard) return;
    dispatch({ type: 'MOVE_CARD', fromCol: selectedCard.columnIndex, toCol: columnIndex });
    clearSelections();
  };

  const handlePairClick = (pairIndex) => {
    if (selectedPairIndex === null) {
      setSelectedPairIndex(pairIndex);
      return;
    }

    if (selectedPairIndex === pairIndex) {
      setSelectedPairIndex(null);
      return;
    }

    const pair1 = state.pairs[selectedPairIndex];
    const pair2 = state.pairs[pairIndex];

    if (pair1 && pair2 && canFormDomino(pair1, pair2)) {
      dispatch({
        type: 'CREATE_DOMINO',
        pairIndex1: selectedPairIndex,
        pairIndex2: pairIndex
      });
      setSelectedPairIndex(null);
      return;
    }

    setSelectedPairIndex(pairIndex);
  };

  const handleDominoClick = (dominoIndex) => {
    dispatch({ type: 'ADD_CHAIN', dominoIndex, chainIndex: null });
  };

  const handleChainClick = (chainIndex) => {
    if (selectedChainIndex === null) {
      setSelectedChainIndex(chainIndex);
      return;
    }

    if (selectedChainIndex === chainIndex) {
      setSelectedChainIndex(null);
      return;
    }

    // Try to join chains
    const chain1 = state.chains[selectedChainIndex];
    const chain2 = state.chains[chainIndex];

    if (chain1 && chain2 && canJoinChains(chain1, chain2)) {
      dispatch({
        type: 'JOIN_CHAINS',
        chainIndex1: selectedChainIndex,
        chainIndex2: chainIndex
      });
      setSelectedChainIndex(null);
      return;
    }

    setSelectedChainIndex(chainIndex);
  };

  const handlePairDragStart = (event, pairIndex) => {
    event.dataTransfer.setData('pair-index', String(pairIndex));
  };

  const handlePairDrop = (event, targetIndex) => {
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer.getData('pair-index'));
    if (Number.isNaN(fromIndex) || fromIndex === targetIndex) return;
    dispatch({ type: 'REORDER_PAIRS', fromIndex, toIndex: targetIndex });
  };

  const handleDominoDragStart = (event, dominoIndex) => {
    event.dataTransfer.setData('domino-index', String(dominoIndex));
  };

  const handleDominoDrop = (event) => {
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer.getData('domino-index'));
    if (Number.isNaN(fromIndex)) return;

    const target = event.target.closest('.domino');
    const toIndex = target ? Number(target.dataset.index) : state.dominos.length - 1;
    if (Number.isNaN(toIndex) || toIndex === fromIndex) return;

    dispatch({ type: 'REORDER_DOMINOS', fromIndex, toIndex });
  };

  const handleChainDragStart = (event, chainIndex) => {
    event.dataTransfer.setData('chain-index', String(chainIndex));
  };

  const handleChainDrop = (event, targetIndex) => {
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer.getData('chain-index'));
    if (Number.isNaN(fromIndex) || fromIndex === targetIndex) return;
    dispatch({ type: 'REORDER_CHAINS', fromIndex, toIndex: targetIndex });
  };

  const handleCardDragStart = (event, columnIndex) => {
    event.dataTransfer.setData('card-column', String(columnIndex));
    setSelectedCard({ columnIndex });
  };

  const handleColumnDrop = (event, columnIndex) => {
    event.preventDefault();
    const fromCol = Number(event.dataTransfer.getData('card-column'));
    if (Number.isNaN(fromCol)) return;

    const fromCard = getTopCard(state.tableau, fromCol);
    const toCard = getTopCard(state.tableau, columnIndex);

    if (fromCard && toCard && canPair(fromCard, toCard) && state.pairs.length < MAX_PAIRS) {
      dispatch({ type: 'CREATE_PAIR', fromCol, toCol: columnIndex });
    } else {
      dispatch({ type: 'MOVE_CARD', fromCol, toCol: columnIndex });
    }

    clearSelections();
  };

  const getColumnHighlight = (columnIndex) => {
    if (!selectedCard || selectedCard.columnIndex === columnIndex) return '';
    const fromCard = getTopCard(state.tableau, selectedCard.columnIndex);
    const toCard = getTopCard(state.tableau, columnIndex);

    if (state.tableau[columnIndex].length === 0) return 'highlight';
    if (fromCard && toCard && canPair(fromCard, toCard)) return 'pair-highlight';
    if (fromCard && toCard && canStack(fromCard, toCard)) return 'highlight';
    return '';
  };

  // Check if a domino can connect to any chain
  const canDominoConnect = (domino) => {
    if (state.chains.length === 0) return true;
    return state.chains.some(chain => canConnectToChain(domino, chain));
  };

  // Check if this chain can join with the selected chain
  const canJoinWithSelected = (chainIndex) => {
    if (selectedChainIndex === null || selectedChainIndex === chainIndex) return false;
    const chain1 = state.chains[selectedChainIndex];
    const chain2 = state.chains[chainIndex];
    return canJoinChains(chain1, chain2);
  };

  return (
    <div id="game-container">
      <header>
        <h1>Tiki Solitaire</h1>
        <div className="controls">
          <button onClick={handleNewGame}>New Game</button>
          <button onClick={handleUndo}>Undo</button>
          <button id="clear-chain-btn" onClick={() => dispatch({ type: 'CLEAR_CHAIN', chainIndex: null })}>Clear All Chains</button>
          <button id="help-btn" onClick={() => setIsHelpOpen(true)} aria-label="Help">?</button>
        </div>
      </header>

      <main>
        <section id="workyard">
          <div className="workyard-header">
            <h2>Workyard</h2>
            <div className="workyard-info">
              <span>Pairs: {state.pairs.length}/{MAX_PAIRS}</span>
              <span>Dominos: {state.dominos.length}</span>
              <span>Chains: {state.chains.length} ({totalChainLength} dominos)</span>
            </div>
          </div>

          <div id="chains-area">
            <div className="chains-header">
              <h3>
                Chains <span>({state.chains.length} chains, {totalChainLength} dominos total)</span>
              </h3>
            </div>

            <div id="chains-container" ref={containerRef}>
              {state.chains.length === 0 && (
                <span className="empty-message">Click dominos to build chains...</span>
              )}
              {state.chains.map((chain, chainIndex) => {
                const isCircular = checkCircular(chain);
                const chainRows = chunk(chain, maxPerRow);
                const chainEnds = getChainEndValues(chain);
                const isSelected = selectedChainIndex === chainIndex;
                const canJoin = canJoinWithSelected(chainIndex);

                return (
                  <div
                    key={`chain-${chainIndex}`}
                    className={[
                      'chain-container',
                      isCircular ? 'circular' : '',
                      isSelected ? 'selected' : '',
                      canJoin ? 'can-join' : ''
                    ].join(' ')}
                    draggable
                    onDragStart={(e) => handleChainDragStart(e, chainIndex)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleChainDrop(e, chainIndex)}
                    onClick={() => handleChainClick(chainIndex)}
                  >
                    <div className="chain-info">
                      <span className="chain-label">Chain {chainIndex + 1}</span>
                      <span className="chain-ends">{chainEnds?.start} ... {chainEnds?.end}</span>
                      {isCircular && <span className="chain-circular-badge">Circular</span>}
                      <button
                        className="small-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'REMOVE_LAST', chainIndex });
                        }}
                        disabled={chain.length === 0}
                      >
                        Remove Last
                      </button>
                      <button
                        className="small-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'CLEAR_CHAIN', chainIndex });
                        }}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="chain-display">
                      {chainRows.map((row, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="chain-row">
                          {row.map((domino, index) => {
                            const isStart = rowIndex === 0 && index === 0;
                            const isEnd = rowIndex === chainRows.length - 1 && index === row.length - 1;
                            return (
                              <div key={domino.id} className="chain-segment">
                                <div
                                  className={[
                                    'chain-domino',
                                    isCircular ? 'circular' : '',
                                    isStart ? 'chain-start' : '',
                                    isEnd ? 'chain-end' : ''
                                  ].join(' ')}
                                >
                                  <span className="chain-val">{domino.displayValue1 || domino.value1}</span>
                                  <span className="chain-sep">|</span>
                                  <span className="chain-val">{domino.displayValue2 || domino.value2}</span>
                                </div>
                                {index < row.length - 1 && (
                                  <span className={`chain-connector ${isCircular ? 'circular' : ''}`}>—</span>
                                )}
                              </div>
                            );
                          })}
                          {rowIndex < chainRows.length - 1 && (
                            <div className="chain-wrap-indicator">
                              <div className="wrap-line"></div>
                              <div className="wrap-arrow">Display break - chain continues</div>
                              <div className="wrap-line right"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div id="workyard-drag-area">
            <div id="pairs-section">
              <div className="section-label">Pairs (click two matching pairs to form domino)</div>
              <div id="pairs-container">
                {Array.from({ length: MAX_PAIRS }).map((_, slotIndex) => {
                  const pair = state.pairs[slotIndex];
                  const canCombine =
                    pair && state.pairs.some((other, index) => index !== slotIndex && canFormDomino(pair, other));

                  return (
                    <div
                      key={`pair-${slotIndex}`}
                      className={[
                        'pair-slot',
                        pair ? 'filled' : '',
                        canCombine ? 'can-combine' : '',
                        selectedPairIndex === slotIndex ? 'selected' : ''
                      ].join(' ')}
                      data-slot={slotIndex}
                      draggable={Boolean(pair)}
                      onDragStart={(event) => pair && handlePairDragStart(event, slotIndex)}
                      onDragOver={(event) => pair && event.preventDefault()}
                      onDrop={(event) => pair && handlePairDrop(event, slotIndex)}
                      onClick={() => pair && handlePairClick(slotIndex)}
                    >
                      {pair && pair.map((card) => (
                        <div key={card.id} className={`card mini ${card.isRed ? 'red' : 'black'}`}>
                          <div className="card-corner">
                            <span className="card-rank">{card.rank}</span>
                            <span className="card-suit">{card.suit}</span>
                          </div>
                          <span className="card-center">{card.suit}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div id="dominos-section">
              <div className="section-label">Dominos (click to add to chain, drag to reorder)</div>
              <div
                id="dominos-container"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDominoDrop}
              >
                {state.dominos.map((domino, index) => {
                  const pair1 = domino.pair1 || domino.cards.slice(0, 2);
                  const pair2 = domino.pair2 || domino.cards.slice(2, 4);
                  const connectable = !domino.inChain && canDominoConnect(domino);
                  return (
                    <div
                      key={domino.id}
                      className={['domino', domino.inChain ? 'in-chain' : '', connectable ? 'can-connect' : ''].join(' ')}
                      data-index={index}
                      draggable={!domino.inChain}
                      onDragStart={(event) => !domino.inChain && handleDominoDragStart(event, index)}
                      onClick={() => !domino.inChain && handleDominoClick(index)}
                    >
                      <div className="domino-pair" title={getDominoPairLabel(pair1)}>
                        {pair1.map((card) => (
                          <div key={card.id} className={`card mini ${card.isRed ? 'red' : 'black'}`}>
                            <div className="card-corner">
                              <span className="card-rank">{card.rank}</span>
                              <span className="card-suit">{card.suit}</span>
                            </div>
                            <span className="card-center">{card.suit}</span>
                          </div>
                        ))}
                      </div>
                      <div className="domino-divider"></div>
                      <div className="domino-pair" title={getDominoPairLabel(pair2)}>
                        {pair2.map((card) => (
                          <div key={card.id} className={`card mini ${card.isRed ? 'red' : 'black'}`}>
                            <div className="card-corner">
                              <span className="card-rank">{card.rank}</span>
                              <span className="card-suit">{card.suit}</span>
                            </div>
                            <span className="card-center">{card.suit}</span>
                          </div>
                        ))}
                      </div>
                      <div className="domino-label">
                        {domino.value1} | {domino.value2}
                      </div>
                      <div className="domino-sub">
                        {getDominoSubLabel(pair1)} · {getDominoSubLabel(pair2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="tableau">
          <h2>
            Tableau <span id="tableau-cards">({totalTableauCards} cards)</span>
          </h2>
          <div id="tableau-columns">
            {state.tableau.map((column, columnIndex) => (
              <div
                key={`col-${columnIndex}`}
                className={['column', column.length === 0 ? 'empty' : '', getColumnHighlight(columnIndex)].join(' ')}
                data-column={columnIndex}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleColumnDrop(event, columnIndex)}
                onClick={() => column.length === 0 && handleEmptyColumnClick(columnIndex)}
              >
                {column.map((card, cardIndex) => {
                  const isTop = cardIndex === column.length - 1;
                  const isSelected = selectedCard?.columnIndex === columnIndex && isTop;

                  return (
                    <div
                      key={card.id}
                      className={[
                        'card',
                        card.isRed ? 'red' : 'black',
                        'in-column',
                        isTop ? 'top-card' : '',
                        isSelected ? 'selected' : ''
                      ].join(' ')}
                      style={{ top: `${cardIndex * 24}px` }}
                      draggable={isTop}
                      onDragStart={(event) => isTop && handleCardDragStart(event, columnIndex)}
                      onClick={() => isTop && handleCardClick(columnIndex)}
                    >
                      <div className="card-corner">
                        <span className="card-rank">{card.rank}</span>
                        <span className="card-suit">{card.suit}</span>
                      </div>
                      <span className="card-center">{card.suit}</span>
                      <div className="card-corner bottom">
                        <span className="card-rank">{card.rank}</span>
                        <span className="card-suit">{card.suit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
      </main>

      {isHelpOpen && (
        <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setIsHelpOpen(false)}>
          <div className="modal-content">
            <button className="close-modal" onClick={() => setIsHelpOpen(false)}>&times;</button>
            <h2>How to Play Tiki Solitaire</h2>
            <div className="rules">
              <h3>Moving Cards</h3>
              <ul>
                <li>Stack same rank on same rank (e.g., 9 on 9)</li>
                <li>Stack cards that sum to 14 (A=1, J=11, Q=12, K=13)</li>
                <li>Any card can go in an empty column</li>
              </ul>
              <h3>Making Pairs</h3>
              <ul>
                <li>Select two cards: one red, one black, summing to 14</li>
                <li>Examples: A+K, 2+Q, 3+J, 4+10, 5+9, 6+8, 7+7</li>
                <li>Hold up to 6 pairs in the workyard</li>
              </ul>
              <h3>Building Dominos</h3>
              <ul>
                <li>Click two pairs to form a domino</li>
                <li>The two pairs must have all 4 suits between them</li>
                <li>Pairs do NOT need the same values</li>
                <li>Example: A+K + 7+7 = valid (has all suits)</li>
                <li>Example: 3+J + 5+9 = valid (has all suits)</li>
                <li>Invalid: A+K + 2+Q if both have same suits</li>
                <li>Domino values are ordered with lower value first</li>
              </ul>
              <h3>Making Chains</h3>
              <ul>
                <li>Click dominos to add them to a chain</li>
                <li>You can have multiple chains at once</li>
                <li>Dominos connect by matching end values</li>
                <li>Example: A-K connects to A-K, A-K, or K-7</li>
                <li>Click two chains to join them if ends match</li>
                <li>Drag chains to reorder them</li>
                <li>Goal: single circular chain with all 52 cards</li>
              </ul>
              <h3>Workyard Tips</h3>
              <ul>
                <li>Drag dominos and chains to organize them</li>
                <li>Drag pairs to reorder the slots</li>
                <li>Long chains wrap with arrow indicators</li>
                <li>Use "Remove Last" to undo chain additions</li>
                <li>Use "Clear" to remove a specific chain</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {isWinOpen && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-content win-content">
            <h2>Congratulations!</h2>
            <p>You built a full circular chain with all 52 cards!</p>
            <div className="win-stats">
              <div className="stat">
                <span className="stat-value">{totalChainLength}</span>
                <span className="stat-label">Dominos</span>
              </div>
              <div className="stat">
                <span className="stat-value">{state.moveCount}</span>
                <span className="stat-label">Moves</span>
              </div>
            </div>
            <button id="play-again-btn" onClick={handleNewGame}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}
