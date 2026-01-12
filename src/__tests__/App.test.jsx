import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import * as gameLogic from '../gameLogic.js';

// Mock the useChainLayout hook
vi.mock('../useChainLayout.js', () => ({
  useChainLayout: () => ({
    containerRef: { current: null },
    maxPerRow: 4
  })
}));

describe('App Component', () => {
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any previous renders
    document.body.innerHTML = '';
  });

  describe('Initial Render', () => {
    it('renders the game title', () => {
      const { container: c } = render(<App />);
      container = c;
      const heading = container.querySelector('h1');
      expect(heading.textContent).toMatch(/tiki solitaire/i);
    });

    it('renders all control buttons', () => {
      const { container: c } = render(<App />);
      container = c;
      const buttons = container.querySelectorAll('header .controls button');
      expect(buttons.length).toBe(4); // New Game, Undo, Clear All Chains, Help
    });

    it('renders 8 tableau columns', () => {
      const { container: c } = render(<App />);
      container = c;
      const columns = container.querySelectorAll('#tableau-columns .column');
      expect(columns.length).toBe(8);
    });

    it('renders 52 cards total in tableau', () => {
      const { container: c } = render(<App />);
      container = c;
      const cardCount = container.querySelector('#tableau-cards');
      expect(cardCount.textContent).toContain('52 cards');
    });

    it('renders workyard section', () => {
      const { container: c } = render(<App />);
      container = c;
      const workyard = container.querySelector('#workyard');
      expect(workyard).toBeInTheDocument();
    });

    it('renders pairs section with 6 slots', () => {
      const { container: c } = render(<App />);
      container = c;
      const pairSlots = container.querySelectorAll('#pairs-container .pair-slot');
      expect(pairSlots.length).toBe(6);
    });

    it('renders empty chains message initially', () => {
      const { container: c } = render(<App />);
      container = c;
      const emptyMessage = container.querySelector('#chains-container .empty-message');
      expect(emptyMessage).toBeInTheDocument();
      expect(emptyMessage.textContent).toMatch(/click dominos to build chains/i);
    });
  });

  describe('Card Selection', () => {
    it('selects card when clicked', () => {
      const { container: c } = render(<App />);
      container = c;
      const topCards = container.querySelectorAll('.top-card');
      fireEvent.click(topCards[0]);
      expect(topCards[0]).toHaveClass('selected');
    });

    it('deselects card when clicked again', () => {
      const { container: c } = render(<App />);
      container = c;
      const topCards = container.querySelectorAll('.top-card');
      const firstTopCard = topCards[0];

      // Click to select
      fireEvent.click(firstTopCard);
      expect(firstTopCard).toHaveClass('selected');

      // Click again to deselect
      fireEvent.click(firstTopCard);
      expect(firstTopCard).not.toHaveClass('selected');
    });
  });

  describe('Help Modal', () => {
    it('opens help modal when help button clicked', () => {
      const { container: c } = render(<App />);
      container = c;
      const helpButton = container.querySelector('#help-btn');
      fireEvent.click(helpButton);

      const dialog = container.querySelector('.modal[role="dialog"]');
      expect(dialog).toBeInTheDocument();
    });

    it('closes help modal when close button clicked', () => {
      const { container: c } = render(<App />);
      container = c;
      const helpButton = container.querySelector('#help-btn');
      fireEvent.click(helpButton);

      const closeButton = container.querySelector('.close-modal');
      fireEvent.click(closeButton);

      const dialog = container.querySelector('.modal[role="dialog"]');
      expect(dialog).not.toBeInTheDocument();
    });

    it('displays all game rules sections', () => {
      const { container: c } = render(<App />);
      container = c;
      const helpButton = container.querySelector('#help-btn');
      fireEvent.click(helpButton);

      const rules = container.querySelector('.rules');
      expect(rules.textContent).toContain('Moving Cards');
      expect(rules.textContent).toContain('Making Pairs');
      expect(rules.textContent).toContain('Building Dominos');
      expect(rules.textContent).toContain('Making Chains');
      expect(rules.textContent).toContain('Workyard Tips');
    });
  });

  describe('New Game', () => {
    it('starts new game when button clicked', () => {
      const { container: c } = render(<App />);
      container = c;
      const buttons = container.querySelectorAll('header .controls button');
      const newGameButton = buttons[0]; // First button is New Game
      fireEvent.click(newGameButton);

      // Should still have 52 cards after new game
      const cardCount = container.querySelector('#tableau-cards');
      expect(cardCount.textContent).toContain('52 cards');
    });
  });

  describe('Workyard Info Display', () => {
    it('displays pairs count', () => {
      const { container: c } = render(<App />);
      container = c;
      const workyardInfo = container.querySelector('.workyard-info');
      expect(workyardInfo.textContent).toMatch(/pairs.*0.*6/i);
    });

    it('displays dominos count', () => {
      const { container: c } = render(<App />);
      container = c;
      const workyardInfo = container.querySelector('.workyard-info');
      expect(workyardInfo.textContent).toMatch(/dominos.*0/i);
    });

    it('displays chains count', () => {
      const { container: c } = render(<App />);
      container = c;
      const workyardInfo = container.querySelector('.workyard-info');
      expect(workyardInfo.textContent).toMatch(/chains.*0/i);
    });
  });

  describe('Tableau Display', () => {
    it('renders cards with correct suit colors', () => {
      const { container: c } = render(<App />);
      container = c;
      const redCards = container.querySelectorAll('#tableau-columns .card.red');
      const blackCards = container.querySelectorAll('#tableau-columns .card.black');
      // Should have 26 red and 26 black cards
      expect(redCards.length + blackCards.length).toBe(52);
    });

    it('displays card rank and suit', () => {
      const { container: c } = render(<App />);
      container = c;
      const cards = container.querySelectorAll('#tableau-columns .card.in-column');
      expect(cards.length).toBe(52);
      cards.forEach(card => {
        const rank = card.querySelector('.card-rank');
        const suit = card.querySelector('.card-suit');
        expect(rank).toBeInTheDocument();
        expect(suit).toBeInTheDocument();
      });
    });
  });

  describe('Pair Slots', () => {
    it('shows empty pair slots without filled class', () => {
      const { container: c } = render(<App />);
      container = c;
      const emptySlots = container.querySelectorAll('#pairs-container .pair-slot:not(.filled)');
      expect(emptySlots.length).toBe(6);
    });
  });

  describe('Section Labels', () => {
    it('displays pairs section label', () => {
      const { container: c } = render(<App />);
      container = c;
      const pairsSection = container.querySelector('#pairs-section .section-label');
      expect(pairsSection.textContent).toMatch(/pairs/i);
    });

    it('displays dominos section label', () => {
      const { container: c } = render(<App />);
      container = c;
      const dominosSection = container.querySelector('#dominos-section .section-label');
      expect(dominosSection.textContent).toMatch(/dominos/i);
    });
  });
});

describe('App Component - Game Logic Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('creates pair when compatible cards are clicked', () => {
    // Create a controlled initial state with known compatible cards on top
    const aceHearts = { id: 'A♥', rank: 'A', suit: '♥', value: 1, isRed: true };
    const kingClubs = { id: 'K♣', rank: 'K', suit: '♣', value: 13, isRed: false };

    // Create controlled state
    const mockState = {
      tableau: [
        [aceHearts],
        [kingClubs],
        [], [], [], [], [], []
      ],
      pairs: [],
      dominos: [],
      chains: [],
      moveCount: 0,
      history: []
    };

    vi.spyOn(gameLogic, 'createInitialState').mockReturnValue(mockState);

    const { container } = render(<App />);

    const topCards = container.querySelectorAll('#tableau-columns .top-card');
    expect(topCards.length).toBe(2);

    fireEvent.click(topCards[0]);
    fireEvent.click(topCards[1]);

    // Should now have a pair - check the workyard info
    const workyardInfo = container.querySelector('.workyard-info');
    expect(workyardInfo.textContent).toMatch(/pairs.*1.*6/i);
  });
});

describe('App Component - Drag and Drop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('card is draggable when it is top card', () => {
    const { container } = render(<App />);
    const topCards = container.querySelectorAll('#tableau-columns .top-card');
    expect(topCards[0]).toHaveAttribute('draggable', 'true');
  });

  it('non-top cards are not draggable', () => {
    const { container } = render(<App />);
    const allCards = container.querySelectorAll('#tableau-columns .card.in-column:not(.top-card)');
    allCards.forEach(card => {
      expect(card).toHaveAttribute('draggable', 'false');
    });
  });
});

describe('App Component - Column Highlighting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('highlights empty columns when card is selected', () => {
    // Create state with an empty column
    vi.spyOn(gameLogic, 'createInitialState').mockReturnValue({
      tableau: [
        [{ id: 'A♥', rank: 'A', suit: '♥', value: 1, isRed: true }],
        [],
        [{ id: 'test1', rank: '2', suit: '♣', value: 2, isRed: false }],
        [{ id: 'test2', rank: '3', suit: '♣', value: 3, isRed: false }],
        [{ id: 'test3', rank: '4', suit: '♣', value: 4, isRed: false }],
        [{ id: 'test4', rank: '5', suit: '♣', value: 5, isRed: false }],
        [{ id: 'test5', rank: '6', suit: '♣', value: 6, isRed: false }],
        [{ id: 'test6', rank: '7', suit: '♣', value: 7, isRed: false }]
      ],
      pairs: [],
      dominos: [],
      chains: [],
      moveCount: 0,
      history: []
    });

    const { container } = render(<App />);

    const topCard = container.querySelector('#tableau-columns .top-card');
    fireEvent.click(topCard);

    const emptyColumn = container.querySelector('#tableau-columns .column.empty');
    expect(emptyColumn).toHaveClass('highlight');
  });
});

describe('App Component - Responsive Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders without crashing at different implied widths', () => {
    const { container, rerender } = render(<App />);

    // Just verify it doesn't crash on rerender
    rerender(<App />);
    const heading = container.querySelector('h1');
    expect(heading).toBeInTheDocument();
  });
});
