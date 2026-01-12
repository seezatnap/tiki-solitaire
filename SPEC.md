# Tiki Solitaire - Specification

> **Note:** This is a living specification for a React application. Agents should revalidate each item against the current implementation every time rather than marking items as complete. Visual specifications should be validated using [playwright-vibe-check](https://github.com/seezatnap/playwright-vibe-check), while functional specifications should be validated with unit tests.

## Game Rules
- 8-column tableau, all cards face up
- Move cards: same rank on same rank (e.g., 9 on 9)
- Move cards: two cards summing to 14 (A=1, J=11, Q=12, K=13)
- Empty columns accept any card
- Remove pairs: red + black cards summing to 14
- Maximum 6 pairs can be held
- Form bridges/dominos from pairs (four-suited, e.g., AK77)
- Connect dominos to form chains (e.g., AK77 connects to 772Q)
- Goal: longest chain, ideally circular (same pair at start and end)

## UI Components

### Layout
- Responsive design (desktop to mobile)
- Workyard area above tableau
- Tableau with 8 columns below workyard
- Pairs holding area (up to 6 pairs)
- Chain/domino display area

### Tableau
- 8 columns displayed horizontally
- Cards stack vertically in columns
- Visual feedback for valid drop targets
- Empty column indicators

### Workyard
- Free-form drag area for organizing
- Drag and drop functionality
- Touch support for mobile
- Snap-to-grid or free positioning

### Pairs Area
- Display up to 6 pairs
- Visual indication of pair validity (red+black, sum=14)
- Pairs cannot return to tableau once removed

### Domino/Chain Display
- Four-suited bridge visualization
- Chain connection display
- Wrap long chains with arrow indicators
- Visual distinction for connected vs unconnected dominos

## Interactions
- Click/tap to select cards
- Drag and drop cards
- Touch support for mobile devices
- Visual feedback on hover/touch
- Undo functionality
- New game/reset

## Responsive Behavior
- Desktop: full horizontal layout
- Tablet: adjusted card sizes
- Mobile: stacked layout, smaller cards
- Touch-friendly hit targets

## Visual Design
- Clear card rendering (rank + suit)
- Color coding (red/black suits)
- Drop zone highlighting
- Chain arrows for wrapped display
- Game state indicators
