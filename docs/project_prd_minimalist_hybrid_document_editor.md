# text editor

## Project: Modern Minimalist Hybrid Document Editor (Visual, Markdown & Semantic HTML)

---

### 1. Executive Summary & Vision
The **Modern Minimalist Hybrid Document Editor** is a next-generation SaaS content creation workspace engineered for engineering teams, technical writers, and product managers. Built with principles borrowed from tools like Linear, Notion, and Craft, it eliminates the cognitive overhead of traditional bulky rich-text editors while bridging the gap between raw code (Markdown/CommonMark, Semantic HTML5) and visual WYSIWYG editing.

The core interface maximizes writing immersion via a distraction-free full-screen writing canvas, an ergonomic bottom-docked formatting toolbar with smart progressive disclosure, and a collapsible contextual properties sidebar for document metadata.

---

### 2. Target Personas & Problem Statement

#### 2.1 Target Personas
- **Technical Writers & Developer Advocates:** Need strict Markdown/CommonMark compliance, clean code blocks, footnotes, syntax shortcuts, and exportable, semantic HTML without inline CSS bloat.
- **Product Managers & Engineering Leads:** Value speed, distraction-free drafting, live readability metrics, task checklists, and immediate cloud sync.
- **Content Creators & Marketers:** Prefer intuitive visual WYSIWYG editing with single-click formatting, media embeds, and clean typography.

#### 2.2 Core Problems Solved
- **Top-heavy Toolbars:** Traditional editors crowd the top screen space, forcing repetitive vertical eye and mouse travel away from active typing lines.
- **WYSIWYG / Markdown Disconnect:** Switching between raw markdown and rich visual views often breaks formatting, introduces messy inline HTML tags, or requires a redundant split "Preview" pane.
- **Metadata Clutter:** File parameters (URLs, slugs, folders, tags, author history) usually pollute the top of the canvas, reducing effective vertical viewport space.

---

### 3. Key Architectural & Layout Principles

#### 3.1 Single Unified Canvas with Collapsible Properties Sidebar
- **Main Canvas:** Centered, spacious white canvas (`bg-white`, soft subtle border, rounded card contour) optimized for reading rhythm (~720px to 840px prose width) with comfortable padding (32px–48px).
- **Collapsible Right Inspector / Sidebar:**
  - Houses all document configuration: Title, URL Slug with 1-click clipboard copy and live route preview, Parent Folder selector, and Categorization Tags (`#general`, `#release-notes`, etc.).
  - Real-time Document Metrics: Word count, character count, estimated reading time, format engine indicator.
  - Audit & Version History: Author avatar, last edited relative timestamp, draft version badge (`Draft v1.4`), and revision history link.
  - Toggleable via the top navigation bar (`Properties` toggle) to allow a 100% full-screen immersive writing mode.

#### 3.2 Bottom-Docked Ergonomic Formatting Toolbar & Dock
- Anchored at the bottom center of the viewport to keep editing actions proximate to the user's natural focal plane.
- **Tiered Progressive Disclosure:**
  - **Primary Row (Essential Tools):** Heading hierarchy (`H1`, `H2`, `H3`), inline typography (`Bold`, `Italic`), structural blocks (`Bullet List`, `Numbered List`), embeds (`Link`, `Attach Image`, `Table`, `Blockquote`), and a **"More"** expansion chevron.
  - **Secondary Expandable Row:** Slides open smoothly beneath the primary tier when expanded, providing extended syntax: `Undo`/`Redo`, `Strikethrough`, `Highlight`, `Subscript (X₂)`, `Superscript (X²)`, `Inline Code`, `Fenced Code Block ({ })`, `Task Checklist (- [ ])`, `Horizontal Rule (---)`, `Footnote ([^1])`, `Heading ID (#id)`, `Definition List`, and `Emoji Picker`.

#### 3.3 Multi-Mode View Switcher (Right-Aligned in Bottom Dock)
- **Visual Mode (WYSIWYG):** Direct interactive typography, live table editing, task list checking, callout notices, and styled quotes with emerald accents.
- **Markdown Mode (MD):** Monospaced code view supporting full CommonMark + Extended syntax (GitHub Flavored Markdown).
- **HTML Mode:** Semantic, clean HTML5 output viewer with zero inline styling, featuring a dedicated 1-click "Copy HTML" utility.

---

### 4. Detailed Feature Specifications

| Feature Module                   | Requirement Description                                                                                                      | User Value                                               |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| **Ergonomic Bottom Dock**        | Floating rounded dock pinned to bottom center with essential tools and smooth accordion expansion for extended tools.        | Faster formatting without scrolling or eye fatigue.      |
| **Triple Mode Switching**        | Seamless switching between Visual, MD, and semantic HTML without losing cursor position or document state.                   | Accommodates both developers and non-technical writers.  |
| **Right Metadata Inspector**     | Collapsible sidebar housing title, canonical slug, folder routing, tag manager, metrics, and audit history.                  | Eliminates header clutter and keeps canvas clean.        |
| **Markdown Shortcut Triggers**   | Inline triggers (e.g., `# `, `## `, `- [ ]`, ` `code` `, `> `) auto-convert to rich formatting in Visual mode.               | Seamless typing flow without taking hands off keyboard.  |
| **Quick Command Palette (`⌘K`)** | Centered modal overlay offering searchable formatting shortcuts, syntax triggers, and document actions.                      | High-power keyboard navigation for power users.          |
| **Live Readability & Sync HUD**  | Real-time word count, character count, reading duration, and instantaneous cloud save status indicator (`● Saved to cloud`). | Instant reassurance and content length monitoring.       |
| **Semantic HTML5 Export**        | Clean HTML generator with standardized tags (`<article>`, `<h1>`, `<blockquote>`, `<table>`) free of inline CSS bloat.       | Direct publishing to CMS or static site generators.      |
| **Version History & Revert**     | Version history logging changes by author timestamp with 1-click restore functionality.                                      | Document safety, accountability, and team collaboration. |

---

### 5. Design System & Visual Aesthetics

- **Style Philosophy:** Minimalist SaaS Productivity UI (crafted with crisp borders, subtle shadows, and intentional whitespace).
- **Typography Hierarchy:**
  - UI & Body Prose: `Inter`, system `-apple-system`, `BlinkMacSystemFont` (clean legibility at 15px/16px, 1.6line height).
  - Code & Shortcuts: `JetBrains Mono` or `Fira Code` for raw markdown, syntax tags, and shortcut badges (`⌘K`).
- **Color Palette Tokens:**
  - **Canvas Surface:** `#FFFFFF` (pure white canvas and floating toolbars).
  - **Workspace Background:** `#F9FAFB` to `#F3F4F6` (soft cool neutral).
  - **Borders & Dividers:** `#E5E7EB` (subtle light gray hairline borders).
  - **Prose Text:** Primary `#111827`, Secondary `#374151`, Muted `#6B7280`.
  - **Brand & Active Accent:** Emerald Green (`#10B981` / `#047857`) for active mode pills, status dots, and blockquote highlights.

---

### 6. Technical & Non-Functional Requirements
- **Performance:** Instantaneous mode transitions (< 50ms) between Visual, MD, and HTML without document re-rendering lag.
- **Accessibility (a11y):** Full keyboard navigation support across toolbar buttons, ARIA labels for formatting controls, high contrast ratios (WCAG AAA for text).
- **Cross-Platform Responsiveness:** Fluid scaling on standard desktop displays (1280px to 2560px), with the sidebar collapsing gracefully into an overlay drawer on narrower screens.
- **Extensibility:** Modular toolbar architecture allowing custom plugin extensions (e.g., Mermaid.js diagramming, MathJax/LaTeX equations).

