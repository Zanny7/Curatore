---
name: Obsidian Stream
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#303030'
  tertiary-container: '#e4e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1b1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e4e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 2rem
  sidebar-width: 280px
  gutter: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

This design system is built on a foundation of **Minimalism** and **Modern Corporate** aesthetics, optimized for deep-focus consumption of media. The personality is professional, sophisticated, and utilitarian, ensuring the interface recedes to let the content—be it album art or cinematic video—take center stage.

The emotional response should be one of "effortless control." By utilizing a restricted palette and precise geometric alignments, the design system creates an environment that feels organized and high-end, mirroring the precision of professional studio equipment.

## Colors

The color strategy uses a monochrome hierarchy to establish depth without visual noise. The primary background is the deepest gray (#121212), while elevated surfaces like sidebars or active cards use #1E1E1E. 

Pure white is reserved exclusively for high-priority text and primary iconography to ensure maximum readability. A subtle accent border (#333333) is employed to define boundaries between sections, replacing the need for heavy drop shadows and maintaining a sleek, flat appearance.

## Typography

The design system utilizes **Inter** for its neutral, systematic clarity. The typography hierarchy relies on weight and opacity rather than color variation. 

Headlines use tight letter spacing and bold weights for an editorial feel. Secondary information, such as artist names or metadata, is rendered in `body-sm` with a 70% opacity white to maintain a clear visual hierarchy against primary track titles.

## Layout & Spacing

This design system follows a **Fixed Grid** model for structural elements and a fluid internal rhythm for content. A persistent sidebar is used for primary navigation, while the main content area utilizes a 12-column grid.

Spacing is strictly based on a 4px baseline, with 1.5rem (24px) serving as the standard gutter between grid items. Generous page margins of 2rem ensure the interface feels expansive and never cluttered, even when populated with dense media libraries.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** and **Low-contrast Outlines**. Rather than using shadows, which can feel muddy in dark themes, this design system uses increasing luminosity to signify height.

1.  **Level 0 (Base):** #121212 (Main background).
2.  **Level 1 (Surface):** #1E1E1E (Sidebar, secondary panels).
3.  **Level 2 (Active/Floating):** #2A2A2A (Selected states, modals).

Every interactive surface or container is defined by a 1px solid border (#333333) to provide crisp definition against the dark background.

## Shapes

The shape language is consistently **Rounded**, striking a balance between the precision of hard edges and the approachability of soft corners. 

Standard components (buttons, small cards) use a 0.5rem radius. Larger containers like the video player or album art thumbnails utilize a `rounded-lg` (1rem) or `rounded-xl` (1.5rem) radius to create a distinct frame for the media content.

## Components

-   **Buttons:** Primary buttons are solid white with black text for maximum contrast. Secondary buttons use a transparent background with a #333333 border.
-   **Navigation Items:** Sidebar links use a 70% opacity white in their default state, switching to 100% white with a subtle left-aligned accent bar when active.
-   **Media Cards:** Thumbnails feature a 1px internal overlay to ensure white text remains legible even over light images.
-   **Playback Controls:** Icons are clean, geometric, and sized at 24px for standard actions, with the 'Play' toggle slightly enlarged for prominence.
-   **Progress Bars:** Uses a thin #333333 track with a solid white fill to indicate progress, avoiding distracting glow or neon effects.