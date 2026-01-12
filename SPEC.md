# Tiki Solitaire - Specification Checklist

> This is a living checklist for the React implementation. All functional specs should be validated with unit tests. Visual specs should be validated with playwright-vibe-check.

---

## Game Rules

### Card Values
- [ ] A = 1, 2-10 = face value, J = 11, Q = 12, K = 13
- [ ] Cards sum to 14: A+K, 2+Q, 3+J, 4+10, 5+9, 6+8, 7+7

### Tableau
- [ ] 8-column tableau dealt at game start
- [ ] All cards are face up
- [ ] 52 cards distributed (6-7 cards per column)

### Moving Cards in Tableau
- [ ] Stack same rank on same rank (e.g., 9 on 9)
- [ ] Stack cards that sum to 14 (e.g., A on K, 6 on 8)
- [ ] Empty columns accept any card
- [ ] Only top card of each column is moveable

### Creating Pairs
- [ ] Select two cards: one red suit, one black suit
- [ ] Cards must sum to 14
- [ ] Valid pairs: A♥+K♣, A♥+K♠, A♦+K♣, A♦+K♠, etc.
- [ ] Maximum 6 pairs can be held in workyard
- [ ] Pairs cannot be returned to tableau once removed

### Forming Dominos (CRITICAL - Four-Suited Rule)
- [ ] **Any two pairs that together have all 4 suits can form a domino**
- [ ] The pairs do NOT need to have the same values
- [ ] Example: 3♥+J♣ and 5♦+9♠ can form a domino (has ♥♦♣♠)
- [ ] Example: A♥+K♣ and A♦+K♠ can form a domino (has ♥♦♣♠)
- [ ] Example: A♥+K♣ and 7♦+7♠ can form a domino (has ♥♦♣♠)
- [ ] Invalid: A♥+K♣ + 2♥+Q♣ (only has ♥♣, missing ♦♠)
- [ ] **Domino values are always ordered with lower value first** (e.g., 5-9 not 9-5)
- [ ] 5-9 matches 9-5 because they normalize to 5-9

### Building Chains
- [ ] Click dominos to add them to a chain
- [ ] **Multiple chains can exist simultaneously** in the workyard
- [ ] First domino can start a new chain
- [ ] Subsequent dominos must connect by matching one end value
- [ ] Example: [A-K] connects to [K-7] connects to [7-2]
- [ ] Dominos can be oriented (flipped) to connect
- [ ] **Chains can be reordered** in the workyard (drag and drop)
- [ ] **Chains can be joined** when their end values match
- [ ] Goal: Longest possible chain
- [ ] Perfect game: Circular chain using all 52 cards

### Win Condition
- [ ] All 52 cards are in the chain (13 dominos × 4 cards)
- [ ] Chain is circular (start value = end value)

---

## Layout and Structure

### Overall Layout
- [ ] Header with title and controls at top
- [ ] Workyard area below header (above tableau)
- [ ] Tableau area at bottom
- [ ] Responsive from desktop (1400px) to mobile (320px)

### Header
- [ ] Game title "Tiki Solitaire"
- [ ] New Game button
- [ ] Undo button
- [ ] Clear Chain button
- [ ] Help (?) button

### Workyard Area
- [ ] Visually distinct from tableau (different background)
- [ ] Contains: Chains display, Pairs section, Dominos section
- [ ] Counts visible: pairs (X/6), dominos, chain length
- [ ] **Items in workyard can be dragged to reorder**

### Chain Display Section
- [ ] Shows connected dominos in order
- [ ] **Supports multiple chains**
- [ ] "Remove Last" button to undo last chain addition
- [ ] Chain length indicator with domino count
- [ ] Circular indicator when chain forms a loop
- [ ] **Long chains wrap with arrow indicators showing continuation**

### Pairs Section
- [ ] 6 pair slots displayed
- [ ] Empty slots show dashed border
- [ ] Filled slots show 2 mini cards
- [ ] Visual indicator when pairs can combine into domino
- [ ] Drag pairs to reorder within slots

### Dominos Section
- [ ] Shows all formed dominos not in chains
- [ ] Dominos are clickable to add to chain
- [ ] Dominos in chain are greyed out
- [ ] Visual indicator for dominos that can connect to chain ends
- [ ] **Dominos draggable to reorder in workyard**

### Tableau Area
- [ ] 8 columns visible
- [ ] Cards stack vertically with overlap
- [ ] Empty columns show placeholder indicator
- [ ] Card count displayed in section header

---

## Interactions

### Card Interactions (Tableau)
- [ ] Click to select top card
- [ ] Click another card to move/pair
- [ ] Drag and drop between columns
- [ ] Visual highlight on valid move targets
- [ ] Green highlight on valid pair targets
- [ ] Click empty column to move selected card there

### Pair Slot Interactions
- [ ] Click filled pair to select
- [ ] Click another pair to attempt domino creation
- [ ] Drag pairs to reorder within slots
- [ ] Visual feedback during drag

### Domino Interactions
- [ ] Click domino to add to chain (if valid)
- [ ] Drag dominos to reorder in workyard
- [ ] Greyed out when already in chain
- [ ] Pulsing highlight when can connect to chain

### Chain Interactions
- [ ] "Remove Last" removes most recent domino from chain
- [ ] "Clear Chain" removes all dominos from chain
- [ ] Removed dominos return to available pool
- [ ] **Drag chains to reorder in workyard**
- [ ] **Click to join compatible chains**

---

## Chain Wrapping Display

### Wrap Behavior
- [ ] Long chains wrap to multiple rows
- [ ] Wrap point calculated based on container width
- [ ] Approximately 2-6 dominos per row depending on screen size

### Wrap Indicators
- [ ] Visual "display break" indicator between rows
- [ ] Left arrow pointing to continuation
- [ ] Right arrow pointing from previous
- [ ] Text label: "Display break - chain continues"
- [ ] Animated subtle pulse effect
- [ ] Golden/accent color scheme

### Chain Segment Display
- [ ] Each domino shows as [Value1 - Value2] with lower value first
- [ ] Connector (―) between dominos in same row
- [ ] Start domino has thicker left border
- [ ] End domino has thicker right border
- [ ] Circular chain: green glow/border on all segments

---

## Responsive Breakpoints

### Desktop (> 1100px)
- [ ] Card width: 60px, height: 84px
- [ ] Full workyard with pairs and dominos side by side
- [ ] All 8 columns visible without scrolling

### Large Tablet (900px - 1100px)
- [ ] Card width: 52px, height: 72px
- [ ] Workyard sections may stack

### Tablet (768px - 900px)
- [ ] Card width: 48px, height: 66px
- [ ] Workyard sections stack vertically
- [ ] Pair slots in 2 rows of 3

### Mobile Landscape (540px - 768px)
- [ ] Card width: 44px, height: 60px
- [ ] Compact header with wrapped controls
- [ ] Tableau may require horizontal scroll

### Mobile Portrait (380px - 540px)
- [ ] Card width: 38px, height: 52px
- [ ] Single column workyard layout
- [ ] Mini cards very compact

### Small Mobile (< 380px)
- [ ] Card width: 34px, height: 46px
- [ ] Minimal padding throughout
- [ ] Chain dominos very compact

---

## Visual Design

### Color Scheme
- [ ] Background: Dark green gradient (#1b4b3a to #0b241c)
- [ ] Accent: Gold (#f6c343)
- [ ] Text: Off-white (#f7f4ed)
- [ ] Red suits: #d32f2f
- [ ] Black suits: #212121
- [ ] Success/circular: Green (#46c072)

### Typography
- [ ] Display font: Cinzel (headers, titles)
- [ ] Body font: Space Grotesk (UI, labels)
- [ ] Legible at all sizes

### Card Design
- [ ] White background with dark border
- [ ] Rank and suit in corners
- [ ] Large centered suit symbol
- [ ] Red for hearts/diamonds
- [ ] Black for clubs/spades

### Animations
- [ ] Card hover lift effect
- [ ] Selection glow
- [ ] Connectable domino pulse
- [ ] Circular badge pop-in
- [ ] Wrap indicator subtle pulse

---

## Touch Support

### Touch Interactions
- [ ] Tap to select cards
- [ ] Drag cards between columns
- [ ] Drag pairs to reorder
- [ ] Drag dominos to reorder
- [ ] **Drag chains to reorder**
- [ ] Touch-friendly button sizes (min 44px)

### Touch-Specific Styles
- [ ] Hover effects disabled on touch devices
- [ ] Larger touch targets on mobile
- [ ] No accidental selection during drag

---

## Game State Management

### Undo System
- [ ] Saves state before each action
- [ ] Maximum 50 undo states
- [ ] Undo restores: tableau, pairs, dominos, chains

### State Tracking
- [ ] Move counter
- [ ] Cards in tableau count
- [ ] Pairs count (X/6)
- [ ] Dominos count
- [ ] Chain length (per chain and total)

---

## Modals

### Help Modal
- [ ] Explains all game rules
- [ ] Moving cards section
- [ ] Making pairs section
- [ ] Building dominos section
- [ ] Making chains section (including multiple chains)
- [ ] Workyard tips
- [ ] Close button (×)
- [ ] Click outside to close

### Win Modal
- [ ] "Congratulations!" message
- [ ] Shows total dominos (13)
- [ ] Shows total moves
- [ ] "Play Again" button

---

## Technical Implementation

### Technology Stack
- [ ] React 18 with hooks (useReducer, useState, useRef, useMemo, useLayoutEffect)
- [ ] Vite for build tooling
- [ ] Vitest for unit tests
- [ ] Playwright with playwright-vibe-check for visual tests
- [ ] @testing-library/react for component tests

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
- [ ] `createDeck()` - Creates 52 cards with correct properties
- [ ] `shuffleDeck()` - Randomizes deck order
- [ ] `dealTableau()` - Distributes cards to 8 columns
- [ ] `canStack()` - Same rank or sum to 14
- [ ] `canPair()` - Red+black, sum to 14
- [ ] `canFormDomino()` - All 4 suits present
- [ ] `getPairLabel()` - Returns normalized label with lower value first
- [ ] `moveCard()` - Valid moves update state correctly
- [ ] `createPairFromTableau()` - Removes cards, creates pair
- [ ] `createDominoFromPairs()` - Removes pairs, creates domino with correct values
- [ ] `addDominoToChain()` - Validates connection, updates chain
- [ ] `checkCircular()` - Detects circular chains
- [ ] `checkWin()` - 52 cards and circular
- [ ] React component rendering tests
- [ ] User interaction tests (click, drag)

### Visual Tests (Playwright + vibe-check)
- [ ] Desktop layout (1400px wide)
- [ ] Large tablet layout (1000px wide)
- [ ] Tablet layout (800px wide)
- [ ] Mobile landscape (600px wide)
- [ ] Mobile portrait (400px wide)
- [ ] Small mobile (360px wide)
- [ ] Help modal appearance
- [ ] Win modal appearance
- [ ] Card selection states
- [ ] Domino connection highlights
- [ ] Chain wrap indicators

---

*Last updated: React implementation with unit tests and visual tests*
