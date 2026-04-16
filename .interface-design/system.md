# Agent-First CLI - Design System

## Direction

Terminal Native. The site should feel like a well-formatted terminal session, not a web app wearing a dark theme. Monospace headings, dark surfaces, code blocks as hero elements. The aesthetic serves the audience: CLI tool authors and agent builders who live in terminals.

## Feel

Cold, precise, authoritative. A technical manifesto, not a marketing site. Dense enough to respect the reader's time, spacious enough to be readable.

## Depth Strategy

Borders-only. Low-opacity rgba borders define structure without demanding attention. No shadows. Surface color shifts (bg → surface) establish hierarchy.

## Color Tokens

```css
--color-terminal-bg: #0d1117;           /* page background */
--color-terminal-surface: #161b22;      /* cards, code blocks, elevated surfaces */
--color-terminal-border: #30363d;       /* structural borders */
--color-terminal-text: #c9d1d9;         /* primary text */
--color-terminal-text-secondary: #848d97; /* secondary/muted text */
--color-terminal-green: #7ee787;        /* accent: links, headings, list markers, interactive highlights */
--color-terminal-amber: #ffa657;        /* emphasis: numbers, counters, category labels, hover states */
--color-terminal-blue: #79c0ff;         /* informational (reserved) */
--color-terminal-red: #ff7b72;          /* destructive/error (reserved) */
```

## Typography

- **Headings**: JetBrains Mono, bold. Terminal feel.
- **Body**: Inter. Readable at length.
- **Code**: JetBrains Mono. Consistent with headings.
- **Labels/metadata**: JetBrains Mono, small, secondary color, uppercase tracking for category headers.

## Spacing

Base unit from Tailwind defaults (0.25rem). Component spacing via Tailwind utility classes. No custom scale; Tailwind's built-in spacing covers all needs.

## Key Patterns

### Links (prose/article)
- Color: terminal-green
- Underline with 2px offset
- Hover: terminal-amber

### Lists (unordered)
- No default browser bullets
- Green monospace `–` marker, absolutely positioned
- 1.5rem left padding per item
- Nested lists use `›` chevron in secondary color

### Lists (ordered)
- CSS counter with amber monospace numbers (`1.`, `2.`)
- Same positioning as unordered
- Nested lists inherit unordered marker style

### Code blocks
- Surface background with border
- 8px border-radius
- 1.25rem padding
- Monospace, 0.875rem, 1.7 line-height

### Inline code
- Surface background, border, 4px radius
- Tight padding (0.15em 0.4em)

### Cards (principle grid)
- Surface background, border, rounded-lg
- Hover: border shifts to green
- Internal: amber number, white title, secondary italic tagline

### Section headings (prose h2)
- Monospace, green, 1.25rem
- 2.5rem top margin for breathing room

### Navigation
- Same background as page (no sidebar differentiation)
- Border-bottom separation
- Green logo, secondary nav links, hover to primary text

### Selection highlight
- Green background, dark text (inverted)
