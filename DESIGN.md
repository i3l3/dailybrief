---
name: DailyBrief
description: A private daily reading desk in translucent forest glass.
colors:
  background: "#0c171b"
  panel: "rgb(20, 34, 39)"
  text: "#e8f0ee"
  muted: "#a0b4b5"
  subtle: "#8da6a7"
  line: "rgba(184, 214, 209, 0.12)"
  accent: "#b7ddac"
  accent-strong: "#ceefc5"
  red: "#f19c9b"
  blue: "#90b8f1"
  amber: "#e7c591"
typography:
  display:
    fontFamily: "Noto Sans KR Variable, Noto Sans KR, sans-serif"
    fontSize: "56px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Noto Sans KR Variable, Noto Sans KR, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.035em"
  featured-title:
    fontFamily: "Noto Sans KR Variable, Noto Sans KR, sans-serif"
    fontSize: "20px"
    fontWeight: 550
    lineHeight: 1.6
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Noto Sans KR Variable, Noto Sans KR, sans-serif"
    fontSize: "14px"
    fontWeight: 550
    lineHeight: 1.7
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Noto Sans KR Variable, Noto Sans KR, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  summary:
    fontFamily: "Noto Sans KR Variable, Noto Sans KR, sans-serif"
    fontSize: "12px"
    lineHeight: 1.9
  label:
    fontFamily: "Noto Sans KR Variable, Noto Sans KR, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  metadata:
    fontFamily: "Noto Sans KR Variable, Noto Sans KR, sans-serif"
    fontSize: "10px"
rounded:
  tag: "4px"
  compact: "7px"
  control: "8px"
  toast: "10px"
  navigation: "12px"
  panel: "14px"
  login: "16px"
spacing:
  tight: "5px"
  small: "8px"
  control: "10px"
  compact: "12px"
  row: "16px"
  panel: "18px"
  column: "20px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#172b24"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "#d2ebc8"
  button-secondary:
    backgroundColor: "rgba(30, 50, 54, 0.3)"
    textColor: "#d5e2df"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    typography: "{typography.label}"
  button-danger:
    backgroundColor: "#553033"
    textColor: "#ffd1cf"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    typography: "{typography.label}"
  input:
    backgroundColor: "rgba(5, 17, 22, 0.45)"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  panel:
    backgroundColor: "rgba(20, 34, 39, 0.82)"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
  tag:
    backgroundColor: "rgba(175, 211, 169, 0.07)"
    textColor: "#b7d3bb"
    rounded: "{rounded.tag}"
    padding: "2px 7px"
  navigation-active:
    backgroundColor: "rgba(184, 221, 172, 0.1)"
    textColor: "{colors.accent-strong}"
    rounded: "{rounded.navigation}"
    width: "44px"
    height: "44px"
  filter-active:
    backgroundColor: "rgba(184, 221, 172, 0.1)"
    textColor: "{colors.accent}"
    rounded: "{rounded.compact}"
    padding: "6px 12px"
---

# Design System: DailyBrief

## Overview

**Creative North Star: "A private daily reading desk"**

A private daily reading desk in the user-chosen liquid-glass / gethomepage world. Forest-teal gradients sit behind translucent panels; warm pale text and sage actions keep dense Korean information calm and readable. The dashboard and settings share the same materials and controls.

The visual system is code-led: CSS backgrounds provide atmosphere and Lucide vectors provide the icon vocabulary. No shipping raster imagery is used. Source names, timestamps, connector state and explicit empty states remain part of the reading surface.

**Key Characteristics:**
- Forest-teal atmosphere with transparent, lightly bordered panels.
- Compact Korean typography with a larger greeting and weather reading.
- Pale sage actions and quiet, persistent state feedback.
- A desktop rail that becomes labeled bottom navigation on mobile.

## Colors

The primary palette is forest teal, pale sage and warm white; semantic colors retain their context rather than becoming decoration. The frontmatter records canonical color values from `src/app/globals.css`.

### Primary

- **Pale sage** (`accent`): primary actions, focus rings, selected filters, saved controls and status dots.
- **Light sage** (`accent-strong`): active navigation and emphasized hover text.

### Secondary

- **Warm red** (`red`): upward market movement and danger text.
- **Cool blue** (`blue`): downward market movement.
- **Soft amber** (`amber`): connector warnings and notification indicators. Severity badges use related contextual tints.

### Neutral

- **Forest night** (`background`) and **glass teal** (`panel`): the default atmospheric canvas and panel RGB base. Panel opacity defaults to 82% and is set through appearance preferences.
- **Warm white** (`text`): primary reading text.
- **Muted teal** (`muted`) and **subtle teal** (`subtle`): descriptions, metadata and counts.
- **Mist line** (`line`): quiet separators and navigation borders. Panel and field borders use slightly stronger transparent mist tones.

**The Visible Source Rule.** Keep source names, timestamps and failure or unconfigured states beside the information they qualify.

Forest is the default theme. Midnight substitutes a navy background and RGB panel base (25, 30, 48); slate substitutes a charcoal background and RGB panel base (35, 41, 47). Both preserve the shared action and text palette. Theme gradients and contextual component colors are recorded in the source and sidecar snippets, rather than promoted into extra global brand accents.

## Typography

**Display and body font:** Noto Sans KR Variable, with Noto Sans KR and sans-serif fallbacks. It is self-hosted through `@fontsource-variable/noto-sans-kr` in `src/app/layout.tsx`; the document language is Korean.

**Character:** Korean text stays compact and clear. Variable weights establish hierarchy without introducing a second display face. Numerals in weather, quotes and counts use tabular figures.

### Hierarchy

- **Display:** the weather reading, with a lighter degree suffix.
- **Headline:** the dashboard greeting; it steps to 27px below 950px and 25px below 640px. Login uses a separate compact heading (24px, weight 550; 23px on mobile).
- **Featured title:** leading article, constrained to 28ch on desktop; 18px below 1250px and 19px below 640px, with mobile measure 24ch.
- **Title:** standard article titles; panel headings use the same 14px size and weight with slightly tighter tracking. Mail titles use 13px.
- **Body:** base interface copy; mobile base is 13px. Article summaries use the summary role and a 72ch maximum; single-feed summaries can reach 75ch. Featured summaries use line-height 1.95.
- **Label / metadata:** action labels and source context. Small status and badge details range from 8–11px; retain their supporting role rather than copying them for main reading text.

**The Reading Hierarchy Rule.** Use the greeting and key reading for scale; keep metadata quieter than content titles, and place the date below the greeting.

## Layout

Desktop uses a fixed left rail (88px), a content container capped at 1660px and horizontal padding of 42px. The top bar is 90px high. The overview row uses three columns (1 : 1.08 : 1.22), an 18px gap and compact panels. The feed below uses asymmetric columns (1.34 : 1), separated by 20px. A single-feed view is capped at 1100px. These describe the dashboard surface; new screens should reuse the spacing and navigation system without copying its page composition.

- At 1750px and wider, content centers with 110px left padding to clear the rail.
- At 1250px and below, content padding is 28px, overview becomes two columns with stocks spanning both, and feed columns become 1.2 : 1.
- At 950px and below, the rail narrows to 72px, padding becomes 22px and feeds become one column. Settings navigation changes from a sticky left column to a horizontal overflow row.
- At 640px and below, content uses 18px side padding and 68px bottom clearance. The rail becomes a fixed 66px bottom bar with visible labels; the header becomes 69px high. Overview and feed cards stack in one column, and stock quotes return to rows. The feed search and new-only control occupy a full toolbar row.

Settings use a 195px navigation column, a 28px gap and a content area capped at 1040px. Three- and two-column field groups collapse on mobile; stock inputs retain two columns. Login centers a card capped at 425px, with 38px padding (30px by 25px on mobile). Repeated internal gaps range from 5–20px; major section spacing is 28–30px.

## Elevation & Depth

The system layers transparent panels over CSS radial gradients. Panels blur the background (22px); the desktop rail uses 24px blur, and mobile bottom navigation uses 20px. Thin mist borders make their edges legible. Panels have no ambient cast shadow at rest.

### Shadow Vocabulary

- **Selected navigation:** `inset 0 0 0 1px rgba(184, 221, 172, 0.1)` adds a quiet inner edge on desktop. Mobile selected navigation uses color without the inset edge or fill.
- **Floating notice:** `0 12px 36px rgba(0, 0, 0, 0.3)` separates the toast from content; it sits above the mobile bar.

**The Quiet Glass Rule.** Use translucency, blur and thin borders for panel depth; reserve the floating ambient shadow for transient notices.

State transitions use 0.18s for background, text, border and toggle movement. Loading uses a one-second linear spinner and 1.5-second linear skeleton shimmer. Reduced-motion preference disables animations and transitions and changes smooth scrolling to automatic scrolling.

## Shapes

Soft rectangles organize dense information: panel corners use the shared panel radius, controls use the control radius, and small tags use the tag radius. Login is slightly rounder. Avatars, state dots and toggle thumbs are circular. Articles are separated by fine lines within their container; they are not individually raised tiles. Inputs have a one-pixel mist border and dark translucent fill.

## Components

### Buttons

Compact and direct. Primary, secondary and danger variants share 40px minimum height, 10px by 16px padding, a 9px icon gap and the label type role. The sage primary lightens on hover; the secondary uses a transparent outlined surface. Disabled buttons use 45% opacity and the not-allowed cursor. Shared keyboard focus is a 2px sage outline with 4px offset. Icon buttons use a quiet color and tinted selected/hover fill; source actions expose saved and read states with `aria-pressed`.

### Chips

Topic tags use a low-opacity sage background and compact corners; hover doubles the fill alpha. Interest filters have muted default text, sage active text and a tinted active surface, with `aria-pressed`. Meal segments use a dark inset track and a filled selected segment. Mail account filters use sage text for the selected account and a connector-state dot; both controls expose selection with `aria-pressed`.

### Cards / Containers

Glass panels use the shared panel RGB base at the appearance-selected opacity, a one-pixel translucent mist border and the shared panel radius. Overview panels use 17px by 21px leading padding; feed panels use 18px by 22px leading padding; mobile reduces horizontal padding. Headers pair a Lucide vector, a restrained title, an optional count and a contextual action. Source rows carry timestamps, links, compact tags and in-place summaries. Read articles soften their title color; saved actions use sage.

### Inputs / Fields

Fields use dark translucent fill, one-pixel mist borders, control corners, 11px by 12px padding and 44px minimum height. Hover strengthens the input/select border. Placeholders are muted teal, carets are sage and keyboard focus follows the shared outline. Compact feed search embeds its icon in a 32px field; its width grows on mobile. Checkbox and range accents are sage. Errors appear in bordered warm-red messages with `role="alert"`; success uses the corresponding quiet green message.

### Navigation

The desktop icon rail uses 44px square targets, Lucide icons, accessible names and title hints. Active navigation has light sage text and a transparent sage fill; selected destinations expose `aria-current="page"`. Mobile adds visible labels beneath 19px icons. Settings tabs share the muted-to-sage selected language and expose `aria-pressed`; appearance choices do the same.

### Source context and empty states

Weather, meals and prices include a compact source/update stamp; cached errors switch it to warning color. Empty panels center a Lucide icon, a plain explanation and an optional sage configuration link. Loading skeletons share panel geometry. No-results states explain filters. Preview surfaces visibly state that their data is synthetic. Toasts use `role="status"`, an explicit close control and responsive positioning above the bottom navigation.

## Do's and Don'ts

### Do:
- **Do** reuse the forest, midnight or slate background themes with the shared text and action palette.
- **Do** preserve explicit selected, saved, read, loading, empty and error states in both visual and semantic controls.
- **Do** use Lucide SVG icons and CSS atmosphere consistently across dashboard and settings.
- **Do** retain source context and visibly label synthetic preview content.
- **Do** respect reduced-motion preferences and keep keyboard focus visible.

### Don't:
- **Don't** substitute raster decoration for the implemented CSS backgrounds and vector icons.
- **Don't** remove panel translucency and thin borders when extending the chosen glass world.
- **Don't** use the market red and blue directions as generic success and failure labels; errors and connector warnings have their own context.
- **Don't** turn compact metadata into a new display or promotional label style.
