# Tiki Solitaire - Specification Checklist

> This is a living checklist for the React implementation. All functional specs should be validated with unit tests. Visual specs should be validated with playwright-vibe-check.

---

## Game Rules

### Card Values
- [x] A = 1, 2-10 = face value, J = 11, Q = 12, K = 13
- [x] Cards sum to 14: A+K, 2+Q, 3+J, 4+10, 5+9, 6+8, 7+7

### Tableau
- [x] 8-column tableau dealt at game start
- [x] All cards are face up
- [x] 52 cards distributed (6-7 cards per column)

### Moving Cards in Tableau
- [x] Stack same rank on same rank (e.g., 9 on 9)
- [x] Stack cards that sum to 14 (e.g., A on K, 6 on 8)
- [x] Empty columns accept any card
- [x] Only top card of each column is moveable

### Creating Pairs
- [x] Select two cards: one red suit, one black suit
- [x] Cards must sum to 14
- [x] Valid pairs: A♥+K♣, A♥+K♠, A♦+K♣, A♦+K♠, etc.
- [x] Maximum 6 pairs can be held in workyard
- [x] Pairs cannot be returned to tableau once removed

### Forming Dominos (CRITICAL - Four-Suited Rule)
- [x] **Any two pairs that together have all 4 suits can form a domino**
- [x] The pairs do NOT need to have the same values
- [x] Example: 3♥+J♣ and 5♦+9♠ can form a domino (has ♥♦♣♠)
- [x] Example: A♥+K♣ and A♦+K♠ can form a domino (has ♥♦♣♠)
- [x] Example: A♥+K♣ and 7♦+7♠ can form a domino (has ♥♦♣♠)
- [x] Invalid: A♥+K♣ + 2♥+Q♣ (only has ♥♣, missing ♦♠)
- [x] **Domino values are always ordered with lower value first** (e.g., 5-9 not 9-5)
- [x] 5-9 matches 9-5 because they normalize to 5-9

### Building Chains (UPDATED UX)
- [x] **Chains are permanent once created - cannot be cleared or undone**
- [x] **Drag dominos onto chains** to add them (clicking creates new chain)
- [x] **Click a domino to start a new chain** with that domino
- [x] **Drag dominos to the beginning OR end of chains** to extend them
- [x] **Multiple chains can exist simultaneously** in the workyard
- [x] Dominos must connect by matching one end value
- [x] Example: [A-K] connects to [K-7] connects to [7-2]
- [x] Dominos can be oriented (flipped) to connect
- [x] **Chains can be joined** by dragging one chain onto another when end values match
- [x] **Cannot remove dominos from chains once added** (strategic)
- [x] Goal: Longest possible chain
- [x] Perfect game: Circular chain using all 52 cards

### Win Condition
- [x] All 52 cards are in the chain (13 dominos × 4 cards)
- [x] Chain is circular (start value = end value)

---

## Layout and Structure

### Overall Layout
- [x] Header with title and controls at top
- [x] Workyard area below header (above tableau)
- [x] Tableau area at bottom
- [x] Responsive from desktop (1400px) to mobile (320px)
- [x] **Page scrolls when workyard has many chains (tableau not crunched)**

### Header
- [x] Game title "Tiki Solitaire"
- [x] New Game button
- [x] Undo button
- [x] Help (?) button
- [ ] ~~Clear Chain button~~ (REMOVED - chains are permanent)

### Workyard Area
- [x] Visually distinct from tableau (different background)
- [x] Contains: Chains display, Pairs section, Dominos section
- [x] Counts visible: pairs (X/6), dominos, chain length
- [x] **Items in workyard can be dragged to reorder**

### Chain Display Section (UPDATED)
- [x] Shows connected dominos in order
- [x] **Supports multiple chains**
- [x] **Each chain displayed with full domino-style cards** (not text-only)
- [x] Chain length indicator with domino count
- [x] Circular indicator when chain forms a loop
- [x] **Long chains wrap with arrow indicators showing continuation**
- [x] **Drop zones at chain start/end for adding dominos**
- [ ] ~~"Remove Last" button~~ (REMOVED - chains are permanent)
- [ ] ~~"Clear" button~~ (REMOVED - chains are permanent)

### Pairs Section
- [x] 6 pair slots displayed
- [x] Empty slots show dashed border
- [x] Filled slots show 2 mini cards
- [x] Visual indicator when pairs can combine into domino
- [x] Drag pairs to reorder within slots

### Dominos Section
- [x] Shows only available dominos (not in chains)
- [x] **Click domino to create NEW chain with it**
- [x] **Drag domino onto chain to add it** (beginning or end)
- [x] **Dominos disappear from workyard once added to chains**
- [x] Visual indicator for dominos that can connect to chain ends
- [x] **Dominos draggable to reorder in workyard**

### Tableau Area
- [x] 8 columns visible
- [x] Cards stack vertically with overlap
- [x] Empty columns show placeholder indicator
- [x] Card count displayed in section header

---

## Interactions

### Card Interactions (Tableau)
- [x] Click to select top card
- [x] Click another card to move/pair
- [x] Drag and drop between columns
- [x] Visual highlight on valid move targets
- [x] Green highlight on valid pair targets
- [x] Click empty column to move selected card there

### Pair Slot Interactions
- [x] Click filled pair to select
- [x] Click another pair to attempt domino creation
- [x] Drag pairs to reorder within slots
- [x] Visual feedback during drag

### Domino Interactions (UPDATED)
- [x] **Click domino to create a NEW chain with it**
- [x] **Drag domino onto existing chain to add it**
- [x] **Can drop on chain start or end to extend in either direction**
- [x] Drag dominos to reorder in workyard
- [x] Greyed out when already in chain
- [x] Pulsing highlight when can connect to chain

### Chain Interactions (UPDATED)
- [x] **Chains are permanent - no remove/clear operations**
- [x] **Accept dropped dominos at start or end**
- [x] **Drag chains onto other chains to join them** (when ends match)
- [x] **Visual drop zones indicate where dominos can be added**
- [x] **Click to select chain for potential joining**
- [x] **Drag chains to reorder in workyard**

---

## Chain Wrapping Display

### Wrap Behavior
- [x] Long chains wrap to multiple rows
- [x] Wrap point calculated based on container width
- [x] Approximately 2-6 dominos per row depending on screen size

### Wrap Indicators
- [x] Visual "display break" indicator between rows
- [x] Left arrow pointing to continuation
- [x] Right arrow pointing from previous
- [x] Text label: "Display break - chain continues"
- [x] Animated subtle pulse effect
- [x] Golden/accent color scheme

### Chain Segment Display (UPDATED)
- [x] **Each domino in chain displayed with full card-style UI** (like dominos section)
- [x] **Shows both pairs of cards in the domino**
- [x] Connector (―) between dominos in same row
- [x] Start domino has thicker left border
- [x] End domino has thicker right border
- [x] Circular chain: green glow/border on all segments
- [x] **Drop zone indicators at start and end of chain**

---

## Responsive Breakpoints

### Desktop (> 1100px)
- [x] Card width: 60px, height: 84px
- [x] Full workyard with pairs and dominos side by side
- [x] All 8 columns visible without scrolling

### Large Tablet (900px - 1100px)
- [x] Card width: 52px, height: 72px
- [x] Workyard sections may stack

### Tablet (768px - 900px)
- [x] Card width: 48px, height: 66px
- [x] Workyard sections stack vertically
- [x] Pair slots in 2 rows of 3

### Mobile Landscape (540px - 768px)
- [x] Card width: 44px, height: 60px
- [x] Compact header with wrapped controls
- [x] Tableau may require horizontal scroll

### Mobile Portrait (380px - 540px)
- [x] Card width: 38px, height: 52px
- [x] Single column workyard layout
- [x] Mini cards very compact

### Small Mobile (< 380px)
- [x] Card width: 34px, height: 46px
- [x] Minimal padding throughout
- [x] Chain dominos very compact

---

## Visual Design

### Color Scheme
- [x] Background: Dark green gradient (#1b4b3a to #0b241c)
- [x] Accent: Gold (#f6c343)
- [x] Text: Off-white (#f7f4ed)
- [x] Red suits: #d32f2f
- [x] Black suits: #212121
- [x] Success/circular: Green (#46c072)

### Typography
- [x] Display font: Cinzel (headers, titles)
- [x] Body font: Space Grotesk (UI, labels)
- [x] Legible at all sizes

### Card Design
- [x] White background with dark border
- [x] Rank and suit in corners
- [x] Large centered suit symbol
- [x] Red for hearts/diamonds
- [x] Black for clubs/spades

### Animations
- [x] Card hover lift effect
- [x] Selection glow
- [x] Connectable domino pulse
- [x] Circular badge pop-in
- [x] Wrap indicator subtle pulse
- [x] **Drop zone highlight on drag over**

---

## Touch Support

### Touch Interactions
- [x] Tap to select cards
- [x] Drag cards between columns
- [x] Drag pairs to reorder
- [x] Drag dominos to reorder
- [x] **Drag dominos onto chains to add**
- [x] **Drag chains to reorder**
- [x] **Drag chains onto chains to join**
- [x] Touch-friendly button sizes (min 44px)

### Touch-Specific Styles
- [x] Hover effects disabled on touch devices
- [x] Larger touch targets on mobile
- [x] No accidental selection during drag

---

## Game State Management

### Undo System
- [x] Saves state before each action
- [x] Maximum 50 undo states
- [x] Undo restores: tableau, pairs, dominos
- [x] **Undo does NOT affect chains** (chains are permanent)

### State Tracking
- [x] Move counter
- [x] Cards in tableau count
- [x] Pairs count (X/6)
- [x] Dominos count
- [x] Chain length (per chain and total)

### State Persistence
- [x] **Game state persisted to localStorage on every state change**
- [x] **State automatically loaded from localStorage on page load**
- [x] **New Game clears persisted state**
- [x] **Persists: tableau, pairs, dominos, chains, moveCount**
- [x] **Gracefully handles corrupted or missing localStorage data**

---

## Modals

### Help Modal
- [x] Explains all game rules
- [x] Moving cards section
- [x] Making pairs section
- [x] Building dominos section
- [x] Making chains section (including multiple chains, drag to add)
- [x] Workyard tips
- [x] Close button (×)
- [x] Click outside to close

### Win Modal
- [x] "Congratulations!" message
- [x] Shows total dominos (13)
- [x] Shows total moves
- [x] "Play Again" button

---

## Technical Implementation

### Technology Stack
- [x] React 18 with hooks (useReducer, useState, useRef, useMemo, useLayoutEffect)
- [x] Vite for build tooling
- [x] Vitest for unit tests
- [x] Playwright with playwright-vibe-check for visual tests
- [x] @testing-library/react for component tests

### Files Structure
- `src/main.jsx` - React entry point
- `src/App.jsx` - Main game component
- `src/gameLogic.js` - Pure game logic functions
- `src/useChainLayout.js` - Custom hook for chain layout calculations
- `src/styles.css` - All styling and responsive design
- `src/__tests__/` - Unit tests for game logic
- `tests/` - Playwright visual tests

### Key Functions (gameLogic.js)
- `canStack(card1, card2)` - Check if cards can stack
- `canPair(card1, card2)` - Check if cards can form pair (red+black, sum=14)
- `canFormDomino(pair1, pair2)` - Check if pairs have all 4 suits
- `getPairLabel(pair)` - Get normalized label with lower value first
- `canConnectToChain(domino, chain)` - Check if domino connects to chain end
- `canConnectToChainStart(domino, chain)` - Check if domino connects to chain start
- `addDominoToChainStart(state, dominoIndex, chainIndex)` - Add domino to chain start
- `addDominoToChainEnd(state, dominoIndex, chainIndex)` - Add domino to chain end
- `checkCircular(chain)` - Check if chain forms a loop
- `checkWin(chain)` - Check for perfect circular chain with all cards

### CSS Custom Properties
- `--card-width`, `--card-height` - Card dimensions
- `--card-stack-offset` - Vertical overlap in columns
- `--column-gap` - Gap between tableau columns
- Various color variables for theming

---

## Testing Requirements

### Unit Tests (Vitest)
- [x] `createDeck()` - Creates 52 cards with correct properties
- [x] `shuffleDeck()` - Randomizes deck order
- [x] `dealTableau()` - Distributes cards to 8 columns
- [x] `canStack()` - Same rank or sum to 14
- [x] `canPair()` - Red+black, sum to 14
- [x] `canFormDomino()` - All 4 suits present
- [x] `getPairLabel()` - Returns normalized label with lower value first
- [x] `moveCard()` - Valid moves update state correctly
- [x] `createPairFromTableau()` - Removes cards, creates pair
- [x] `createDominoFromPairs()` - Removes pairs, creates domino with correct values
- [x] `addDominoToChainEnd()` - Add domino to chain end
- [x] `addDominoToChainStart()` - Add domino to chain start
- [x] `createNewChainWithDomino()` - Create new chain from domino click
- [x] `joinChains()` - Join compatible chains via drag
- [x] `checkCircular()` - Detects circular chains
- [x] `checkWin()` - 52 cards and circular
- [x] React component rendering tests
- [x] User interaction tests (click, drag)
- [x] Column height calculation for large card stacks
- [x] Domino visibility in workyard (hidden when in chain)

### Visual Tests (Playwright + vibe-check)
- [x] Desktop layout (1400px wide)
- [x] Large tablet layout (1000px wide)
- [x] Tablet layout (800px wide)
- [x] Mobile landscape (600px wide)
- [x] Mobile portrait (400px wide)
- [x] Small mobile (360px wide)
- [x] Help modal appearance
- [x] Win modal appearance
- [x] Card selection states
- [x] Domino connection highlights
- [x] Chain wrap indicators
- [x] **Chain domino-style display**
- [x] **Drop zone highlights**
- [x] **Page scrolling with many chains**
- [x] **Tableau column expansion for large stacks**

---

## Summary of Key Features

### Four-Suited Domino Rule
- Two pairs can form a domino if they together contain all 4 suits (♥♦♣♠)
- The pairs do NOT need to share the same values
- Example: 3♥+J♣ and 5♦+9♠ is valid (has all 4 suits)

### Workyard Functionality
- Drag items to reorder pairs, dominos, and chains
- Dominos disappear from workyard once added to chains
- Click domino to create new chain, drag to add to existing chain

### Page Scrolling
- Page scrolls when workyard has many chains
- Tableau maintains usable size and is never crunched

### State Persistence
- Game state saved to localStorage on every change
- State automatically restored on page load
- New Game clears saved state

### Dynamic Tableau Height
- Columns expand to accommodate large card stacks
- Min-height calculated based on card count

---

*Last updated: React implementation with permanent chains, drag-to-add dominos, full domino-style chain display, dynamic column heights, page scrolling support, localStorage persistence*
