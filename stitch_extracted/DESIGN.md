---
name: Obsidian Archive
colors:
  surface: '#131318'
  surface-dim: '#131318'
  surface-bright: '#39393e'
  surface-container-lowest: '#0e0e13'
  surface-container-low: '#1b1b20'
  surface-container: '#1f1f24'
  surface-container-high: '#2a292f'
  surface-container-highest: '#35343a'
  on-surface: '#e4e1e8'
  on-surface-variant: '#c7c5d0'
  inverse-surface: '#e4e1e8'
  inverse-on-surface: '#303035'
  outline: '#91909a'
  outline-variant: '#46464f'
  surface-tint: '#bdc2ff'
  primary: '#dfe0ff'
  on-primary: '#262b5e'
  primary-container: '#bdc2ff'
  on-primary-container: '#494e83'
  inverse-primary: '#555a90'
  secondary: '#ddb8ff'
  on-secondary: '#40215d'
  secondary-container: '#5a3b78'
  on-secondary-container: '#ceaaf0'
  tertiary: '#ffdea3'
  on-tertiary: '#412d00'
  tertiary-container: '#f7bd3e'
  on-tertiary-container: '#6b4d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dfe0ff'
  primary-fixed-dim: '#bdc2ff'
  on-primary-fixed: '#101549'
  on-primary-fixed-variant: '#3d4276'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb8ff'
  on-secondary-fixed: '#290947'
  on-secondary-fixed-variant: '#573976'
  tertiary-fixed: '#ffdea4'
  tertiary-fixed-dim: '#f7bd3e'
  on-tertiary-fixed: '#261900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#131318'
  on-background: '#e4e1e8'
  surface-variant: '#35343a'
  obsidian-deep: '#0a0a0f'
  surface-glass: rgba(26, 26, 40, 0.7)
  confirmed-emerald: '#34d399'
  inferred-amber: '#fbbf24'
  unknown-rose: '#f87171'
  info-sky: '#60a5fa'
typography:
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 64px
  gutter: 20px
  margin: 32px
---

## Brand & Style

The design system embodies "Decision Archaeology"—the practice of unearthing technical rationale buried in git history. The brand personality is high-precision, forensic, and elite, targeted at senior engineers and architects who require verifiable truth over generative speculation.

The visual style is a hybrid of **High-Contrast Editorial** and **Engineering Terminal Minimalism**. It utilizes an elegant serif for high-level narration and branding, contrasted against a utilitarian sans-serif for functional UI. The aesthetic is "dark mode first," utilizing glassmorphic depth and a minimalist layout to reduce cognitive load during complex architectural audits.

**Core Principles:**
- **Forensic Precision:** Use monospaced fonts for raw evidence and metadata tags.
- **Academic Authority:** Utilize high-contrast serifs for titles to evoke the feeling of a well-documented technical archive.
- **Glassmorphic Depth:** Employ layered translucent surfaces to maintain context without visual clutter.
- **Semantic Certainty:** Use high-contrast status colors to differentiate between hard facts (Confirmed) and logical deductions (Inferred).

## Colors

The palette is anchored in **Obsidian Deep (#0a0a0f)**, providing a void-like canvas that allows glassmorphic surfaces and neon semantic accents to pop. 

Functional areas rely heavily on the semantic palette to communicate status without words:
- **Emerald (Confirmed):** Verified PR links and accepted decisions.
- **Amber (Inferred):** AI-synthesized rationale lacking a direct quote.
- **Rose (Unknown/Graveyard):** Discarded experiments and anti-patterns.
- **Sky (Info):** Metadata, branch names, and repository switches.

Interactive states utilize a subtle increase in surface opacity (from 0.7 to 0.85) rather than a color shift to maintain the "glass" physical metaphor. High-level brand moments use an Indigo-to-Orchid gradient.

## Typography

The typography system uses a three-tier strategy to balance elegance with technical utility.

1.  **Headlines (Playfair Display):** High-contrast serif used for page titles, module headers, and brand storytelling. It provides an "editorial" feel that suggests the software is crafting a narrative from your git history.
2.  **UI & Body (Hanken Grotesk):** A clean, modern sans-serif used for all structural UI elements, descriptions, and buttons. It maintains the "engineering tool" efficiency.
3.  **Data & Archaeology (JetBrains Mono):** Reserved for code snippets, hashes, and system-level labels. It signals to the user when they are viewing "raw evidence" versus synthesized narrative.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a max-width container of 1440px. It utilizes a specialized dual-pane model for its core inspector tools to mimic professional IDE environments.

- **Desktop (1440px+):** 12 columns, 20px gutters, 32px margins. 
- **Tablet (768px-1439px):** 8 columns, 16px gutters, 24px margins.
- **Mobile (<767px):** 4 columns, 12px gutters, 16px margins.

For the **Blame-to-Why Inspector**, the screen is split 60/40 between the code (left) and synthesis (right). In the **Decision Chat**, the feed is centered with a max-width of 800px to optimize readability. Spacing is tight and efficient, prioritizing information density over "airy" marketing aesthetics.

## Elevation & Depth

Elevation is achieved through the **Obsidian Glass** metaphor. Depth is communicated via transparency and edge definition rather than traditional drop shadows.

1.  **Backdrop Blur:** All cards and overlays must use `backdrop-filter: blur(12px)`.
2.  **Ghost Borders:** Use a 1px solid border with low opacity (`rgba(255, 255, 255, 0.1)`) to define edges.
3.  **Layer Stacking:**
    *   **Layer 0 (Canvas):** The base obsidian background (#0a0a0f).
    *   **Layer 1 (Panels):** Glassmorphic surfaces with 70% opacity.
    *   **Layer 2 (Overlays):** 90% opacity with a brighter 1px top-border highlight to simulate a top-down light source.
4.  **Semantic Glow:** Critical alerts or "Graveyard" items may use a subtle colored outer glow matching their status color (e.g., Rose) to indicate urgency.

## Shapes

The shape language is **Rounded (0.5rem)**. This provides a "hardware-standard" look—precise but not sharp—softening the dark aesthetic to feel like a premium professional suite.

- **Standard Containers:** 0.5rem (8px).
- **Control Pills:** Fully rounded (pill-shaped) for author avatars and source tags to provide high contrast against the rectangular nature of code blocks and panels.
- **Input Fields:** 0.5rem with a 1px inset border when focused.

## Components

### Obsidian Cards
The foundational container. Features a 1px `rgba(255, 255, 255, 0.1)` border and 12px backdrop blur. Use **Playfair Display** for card titles to create a high-end documentation feel.

### Buttons
- **Primary:** Gradient background (#818cf8 to #c084fc) with high-contrast text.
- **Secondary/Ghost:** 1px glass border, white text, 10% white background shift on hover.
- **Export/Action:** Specifically uses **Sky (#60a5fa)** for outbound technical actions.

### Confidence Matrix Bar
A custom segmented progress bar (Emerald/Amber/Rose) showing the ratio of evidence types. Use `label-caps` for the percentage values displayed on hover.

### GitHub Citation Pills
Small, high-density pills containing a 20px author avatar and `code-sm` text for the commit hash. A semantic colored dot indicates the confidence level.

### Code Editor & Blame View
A dedicated terminal area using `JetBrains Mono`. Line numbers should be rendered in a dimmed Sky color. Active lines are highlighted with a 10% opacity Indigo tint across the full row width.

### Input Fields
Dark, inset surfaces with `Hanken Grotesk` for user-entered text and `label-caps` for the field labels (placed above the input).