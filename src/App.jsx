import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  MAX_PAIRS,
  addDominoToChain,
  addDominoToChainEnd,
  addDominoToChainStart,
  canConnectToChain,
  canConnectToChainEnd,
  canConnectToChainStart,
  canFormDomino,
  canJoinChains,
  canPair,
  canStack,
  checkCircular,
  checkWin,
  clearSavedState,
  countTableauCards,
  createDominoFromPairs,
  createInitialState,
  createNewChainWithDomino,
  createPairFromTableau,
  getChainEndValues,
  getTotalChainLength,
  joinChains,
  loadState,
  moveCard,
  reorderChains,
  reorderDominos,
  reorderPairs,
  saveState,
  undoState
} from './gameLogic.js';
import { useChainLayout } from './useChainLayout.js';

const getInitialState = () => {
  const savedState = loadState();
  if (savedState) {
    return savedState;
  }
  return createInitialState();
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'NEW_GAME':
      clearSavedState();
      return createInitialState();
    case 'UNDO':
      return undoState(state);
    case 'MOVE_CARD':
      return moveCard(state, action.fromCol, action.toCol);
    case 'CREATE_PAIR':
      return createPairFromTableau(state, action.fromCol, action.toCol);
    case 'CREATE_DOMINO':
      return createDominoFromPairs(state, action.pairIndex1, action.pairIndex2);
    case 'CREATE_NEW_CHAIN':
      return createNewChainWithDomino(state, action.dominoIndex);
    case 'ADD_TO_CHAIN_END':
      return addDominoToChainEnd(state, action.dominoIndex, action.chainIndex);
    case 'ADD_TO_CHAIN_START':
      return addDominoToChainStart(state, action.dominoIndex, action.chainIndex);
    case 'ADD_CHAIN':
      return addDominoToChain(state, action.dominoIndex, action.chainIndex);
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

// Component to render a mini card
const MiniCard = ({ card }) => (
  <div className={`card mini ${card.isRed ? 'red' : 'black'}`}>
    <div className="card-corner">
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{card.suit}</span>
    </div>
    <span className="card-center">{card.suit}</span>
  </div>
);

// Component to render a domino with full card display
const DominoDisplay = ({ domino, isCircular, isStart, isEnd, compact }) => {
  const pair1 = domino.pair1 || domino.cards?.slice(0, 2) || [];
  const pair2 = domino.pair2 || domino.cards?.slice(2, 4) || [];

  return (
    <div
      className={[
        'domino-display',
        isCircular ? 'circular' : '',
        isStart ? 'chain-start' : '',
        isEnd ? 'chain-end' : '',
        compact ? 'compact' : ''
      ].filter(Boolean).join(' ')}
    >
      <div className="domino-pair">
        {pair1.map((card) => (
          <MiniCard key={card.id} card={card} />
        ))}
      </div>
      <div className="domino-divider-vertical"></div>
      <div className="domino-pair">
        {pair2.map((card) => (
          <MiniCard key={card.id} card={card} />
        ))}
      </div>
      <div className="domino-value-label">
        {domino.displayValue1 || domino.value1} | {domino.displayValue2 || domino.value2}
      </div>
    </div>
  );
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, getInitialState);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPairIndex, setSelectedPairIndex] = useState(null);
  const [selectedChainIndex, setSelectedChainIndex] = useState(null);
  const [dragOverChain, setDragOverChain] = useState(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWinOpen, setIsWinOpen] = useState(false);
  const { containerRef, maxPerRow } = useChainLayout();

  const totalChainLength = getTotalChainLength(state.chains);
  const totalTableauCards = countTableauCards(state.tableau);
  const availableDominos = state.dominos.filter(d => !d.inChain).length;

  // Save state to localStorage on every state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (checkWin(state.chains)) {
      setIsWinOpen(true);
    }
  }, [state.chains]);

  const clearSelections = () => {
    setSelectedCard(null);
    setSelectedPairIndex(null);
    setSelectedChainIndex(null);
    setDragOverChain(null);
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

  // Click on domino creates a new chain
  const handleDominoClick = (dominoIndex) => {
    dispatch({ type: 'CREATE_NEW_CHAIN', dominoIndex });
  };

  // Click on chain to select for potential joining
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
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDominoDrop = (event) => {
    event.preventDefault();
    setDragOverChain(null);
    const fromIndex = Number(event.dataTransfer.getData('domino-index'));
    if (Number.isNaN(fromIndex)) return;

    const target = event.target.closest('.domino');
    const toIndex = target ? Number(target.dataset.index) : state.dominos.length - 1;
    if (Number.isNaN(toIndex) || toIndex === fromIndex) return;

    dispatch({ type: 'REORDER_DOMINOS', fromIndex, toIndex });
  };

  // Handle dropping a domino onto a chain drop zone
  const handleChainDropZone = (event, chainIndex, position) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverChain(null);

    const dominoIndex = Number(event.dataTransfer.getData('domino-index'));
    if (Number.isNaN(dominoIndex)) {
      // Maybe it's a chain being dropped to join
      const draggedChainIndex = Number(event.dataTransfer.getData('chain-index'));
      if (!Number.isNaN(draggedChainIndex) && draggedChainIndex !== chainIndex) {
        dispatch({
          type: 'JOIN_CHAINS',
          chainIndex1: draggedChainIndex,
          chainIndex2: chainIndex
        });
      }
      return;
    }

    const domino = state.dominos[dominoIndex];
    if (!domino || domino.inChain) return;

    if (position === 'start') {
      dispatch({ type: 'ADD_TO_CHAIN_START', dominoIndex, chainIndex });
    } else {
      dispatch({ type: 'ADD_TO_CHAIN_END', dominoIndex, chainIndex });
    }
  };

  const handleChainDragStart = (event, chainIndex) => {
    event.dataTransfer.setData('chain-index', String(chainIndex));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleChainDrop = (event, targetIndex) => {
    event.preventDefault();
    setDragOverChain(null);

    const fromChainIndex = Number(event.dataTransfer.getData('chain-index'));
    if (!Number.isNaN(fromChainIndex)) {
      if (fromChainIndex !== targetIndex) {
        // Check if we should join or reorder
        const chain1 = state.chains[fromChainIndex];
        const chain2 = state.chains[targetIndex];
        if (canJoinChains(chain1, chain2)) {
          dispatch({
            type: 'JOIN_CHAINS',
            chainIndex1: fromChainIndex,
            chainIndex2: targetIndex
          });
        } else {
          dispatch({ type: 'REORDER_CHAINS', fromIndex: fromChainIndex, toIndex: targetIndex });
        }
      }
      return;
    }

    // Check if it's a domino being dropped on the chain
    const dominoIndex = Number(event.dataTransfer.getData('domino-index'));
    if (!Number.isNaN(dominoIndex)) {
      const domino = state.dominos[dominoIndex];
      if (domino && !domino.inChain) {
        // Try to add to end first, then start
        const chain = state.chains[targetIndex];
        if (canConnectToChainEnd(domino, chain)) {
          dispatch({ type: 'ADD_TO_CHAIN_END', dominoIndex, chainIndex: targetIndex });
        } else if (canConnectToChainStart(domino, chain)) {
          dispatch({ type: 'ADD_TO_CHAIN_START', dominoIndex, chainIndex: targetIndex });
        }
      }
    }
  };

  const handleChainDragOver = (event, chainIndex, position = null) => {
    event.preventDefault();
    setDragOverChain({ chainIndex, position });
  };

  const handleChainDragLeave = () => {
    setDragOverChain(null);
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
    return state.chains.some(chain =>
      canConnectToChainEnd(domino, chain) || canConnectToChainStart(domino, chain)
    );
  };

  // Check if this chain can join with the selected chain
  const canJoinWithSelected = (chainIndex) => {
    if (selectedChainIndex === null || selectedChainIndex === chainIndex) return false;
    const chain1 = state.chains[selectedChainIndex];
    const chain2 = state.chains[chainIndex];
    return canJoinChains(chain1, chain2);
  };

  // Check if drop zone should be highlighted
  const isDropZoneActive = (chainIndex, position) => {
    if (!dragOverChain) return false;
    return dragOverChain.chainIndex === chainIndex && dragOverChain.position === position;
  };

  return (
    <div id="game-container">
      <header>
        <h1>Tiki Solitaire</h1>
        <div className="controls">
          <button onClick={handleNewGame}>New Game</button>
          <button onClick={handleUndo}>Undo</button>
          <button id="help-btn" onClick={() => setIsHelpOpen(true)} aria-label="Help">?</button>
        </div>
      </header>

      <main>
        <section id="workyard">
          <div className="workyard-header">
            <h2>Workyard</h2>
            <div className="workyard-info">
              <span>Pairs: {state.pairs.length}/{MAX_PAIRS}</span>
              <span>Dominos: {availableDominos}</span>
              <span>Chains: {state.chains.length} ({totalChainLength} dominos)</span>
            </div>
          </div>

          <div id="chains-area">
            <div className="chains-header">
              <h3>
                Chains <span>({state.chains.length} chains, {totalChainLength} dominos total)</span>
              </h3>
              <span className="chain-hint">Click domino to create chain. Drag to add.</span>
            </div>

            <div id="chains-container" ref={containerRef}>
              {state.chains.length === 0 && (
                <span className="empty-message">Click a domino to start a chain...</span>
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
                    ].filter(Boolean).join(' ')}
                    draggable
                    onDragStart={(e) => handleChainDragStart(e, chainIndex)}
                    onDragOver={(e) => handleChainDragOver(e, chainIndex)}
                    onDragLeave={handleChainDragLeave}
                    onDrop={(e) => handleChainDrop(e, chainIndex)}
                    onClick={() => handleChainClick(chainIndex)}
                  >
                    <div className="chain-info">
                      <span className="chain-label">Chain {chainIndex + 1}</span>
                      <span className="chain-ends">{chainEnds?.start} ... {chainEnds?.end}</span>
                      <span className="chain-length">{chain.length} domino{chain.length !== 1 ? 's' : ''}</span>
                      {isCircular && <span className="chain-circular-badge">Circular</span>}
                    </div>

                    <div className="chain-display">
                      {/* Start drop zone */}
                      <div
                        className={[
                          'chain-drop-zone',
                          'drop-start',
                          isDropZoneActive(chainIndex, 'start') ? 'active' : ''
                        ].filter(Boolean).join(' ')}
                        onDragOver={(e) => handleChainDragOver(e, chainIndex, 'start')}
                        onDragLeave={handleChainDragLeave}
                        onDrop={(e) => handleChainDropZone(e, chainIndex, 'start')}
                      >
                        <span className="drop-indicator">+</span>
                      </div>

                      {chainRows.map((row, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="chain-row">
                          {row.map((domino, index) => {
                            const isStart = rowIndex === 0 && index === 0;
                            const isEnd = rowIndex === chainRows.length - 1 && index === row.length - 1;
                            return (
                              <div key={domino.id} className="chain-segment">
                                <DominoDisplay
                                  domino={domino}
                                  isCircular={isCircular}
                                  isStart={isStart}
                                  isEnd={isEnd}
                                  compact
                                />
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

                      {/* End drop zone */}
                      <div
                        className={[
                          'chain-drop-zone',
                          'drop-end',
                          isDropZoneActive(chainIndex, 'end') ? 'active' : ''
                        ].filter(Boolean).join(' ')}
                        onDragOver={(e) => handleChainDragOver(e, chainIndex, 'end')}
                        onDragLeave={handleChainDragLeave}
                        onDrop={(e) => handleChainDropZone(e, chainIndex, 'end')}
                      >
                        <span className="drop-indicator">+</span>
                      </div>
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
                      ].filter(Boolean).join(' ')}
                      data-slot={slotIndex}
                      draggable={Boolean(pair)}
                      onDragStart={(event) => pair && handlePairDragStart(event, slotIndex)}
                      onDragOver={(event) => pair && event.preventDefault()}
                      onDrop={(event) => pair && handlePairDrop(event, slotIndex)}
                      onClick={() => pair && handlePairClick(slotIndex)}
                    >
                      {pair && pair.map((card) => (
                        <MiniCard key={card.id} card={card} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div id="dominos-section">
              <div className="section-label">Dominos (click to create chain, drag onto chain to add)</div>
              <div
                id="dominos-container"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDominoDrop}
              >
                {state.dominos.map((domino, index) => {
                  // Skip dominos that are already in a chain - they disappear from workyard
                  if (domino.inChain) return null;

                  const pair1 = domino.pair1 || domino.cards.slice(0, 2);
                  const pair2 = domino.pair2 || domino.cards.slice(2, 4);
                  const connectable = canDominoConnect(domino);
                  return (
                    <div
                      key={domino.id}
                      className={[
                        'domino',
                        connectable ? 'can-connect' : ''
                      ].filter(Boolean).join(' ')}
                      data-index={index}
                      draggable
                      onDragStart={(event) => handleDominoDragStart(event, index)}
                      onClick={() => handleDominoClick(index)}
                    >
                      <div className="domino-pair">
                        {pair1.map((card) => (
                          <MiniCard key={card.id} card={card} />
                        ))}
                      </div>
                      <div className="domino-divider"></div>
                      <div className="domino-pair">
                        {pair2.map((card) => (
                          <MiniCard key={card.id} card={card} />
                        ))}
                      </div>
                      <div className="domino-label">
                        {domino.value1} | {domino.value2}
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
            {state.tableau.map((column, columnIndex) => {
              // Calculate column height based on card count
              // Each card offset is 24px (--card-stack-offset), plus card height at the end
              const columnMinHeight = column.length > 0
                ? `calc(${(column.length - 1) * 24}px + var(--card-height) + 8px)`
                : undefined;

              return (
              <div
                key={`col-${columnIndex}`}
                className={['column', column.length === 0 ? 'empty' : '', getColumnHighlight(columnIndex)].filter(Boolean).join(' ')}
                data-column={columnIndex}
                style={{ minHeight: columnMinHeight }}
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
                      ].filter(Boolean).join(' ')}
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
            );
            })}
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
              </ul>
              <h3>Making Chains</h3>
              <ul>
                <li><strong>Click</strong> a domino to start a NEW chain</li>
                <li><strong>Drag</strong> a domino onto a chain to add it</li>
                <li>You can drop on the start OR end of a chain</li>
                <li>Dominos connect by matching end values</li>
                <li>Example: A-K connects to K-7 connects to 7-2</li>
                <li><strong>Chains are permanent</strong> - plan carefully!</li>
                <li>Click two chains to join them if ends match</li>
                <li>Goal: single circular chain with all 52 cards</li>
              </ul>
              <h3>Workyard Tips</h3>
              <ul>
                <li>Drag dominos to reorder them</li>
                <li>Drag pairs to reorder the slots</li>
                <li>Drag chains to reorder them</li>
                <li>Long chains wrap with arrow indicators</li>
                <li>Think ahead - chains cannot be undone!</li>
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
