# Matrice — Codebase Explanation

## What Is Matrice?

Matrice is a React-based web application that provides a full-featured UI for **AI-powered image generation and editing**. It is designed as a frontend studio for image synthesis workflows, with planned backend integration for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) (a node-based Stable Diffusion interface).

Users can:
- Generate images from text prompts using multiple models (Flux, SDXL)
- Edit images with inpainting and upscaling tools
- Apply advanced image prompting techniques (img2img, face swap, character/style reference, ControlNet)
- Manage LoRA adapters for style control
- Queue and monitor multiple generation jobs
- Browse, search, and manage a gallery of generated images

## Project Structure

The entire application lives in a single file:

```
matrice/
├── App.jsx          # Full application (~1,850 lines, 118 KB)
├── CODEBASE.md      # This file
└── .git/
```

There is no `package.json`, build config, or test setup checked in. The file is a self-contained React component intended to be mounted by an external entry point (e.g., a Vite or CRA project).

## Technology Stack

| Technology | Role |
|---|---|
| React 18+ | UI framework (functional components, hooks) |
| Tailwind CSS | Utility-first styling (inline classes) |
| Lucide React | Icon library (~50 icons) |
| Google Fonts | Playfair Display (serif), Jost (sans-serif) |
| JavaScript (ES6+) | Language (no TypeScript) |

No state management library is used — all state is managed with `useState` within the root `App` component and passed down via props.

## Code Layout (within App.jsx)

The file is organized into clearly delineated sections:

### 1. Constants & Configuration (Lines 4–59)

Defines all static options used across the UI:

- **`RATIOS`** / **`FLUX_RATIOS`**: 28+ aspect ratio presets
- **`MODEL_OPTIONS`**: Supported models (Flux.1 Dev 12B, Flux.1 Schnell, SDXL Base 1.0)
- **`VAE_OPTIONS`**: 4 VAE models
- **`LORA_OPTIONS`**: 6 style presets (Cyberpunk, Watercolor, Pixel Art, etc.)
- **`SAMPLERS`**: 14 diffusion samplers (euler, dpmpp_2m, ddim, etc.)
- **`SCHEDULERS`**: 7 noise schedulers
- **`CONTROLNET_PREPROCESSORS`**: 9 preprocessor types
- **`DEFAULT_GEN_CONFIG`**: Master configuration object with default generation parameters
- **`DEFAULT_LORA`**: Template for adding new LoRA layers

### 2. API Service Layer (Lines 73–136)

A stub API object with methods that will eventually connect to a backend:

| Method | Endpoint | Purpose |
|---|---|---|
| `api.generate(payload)` | `POST /api/generate` | Submit a generation job |
| `api.edit(payload)` | `POST /api/edit` | Submit an edit job |
| `api.fetchGallery()` | `GET /api/gallery` | Fetch gallery images |
| `api.fetchLoras()` | `GET /api/loras` | Fetch available LoRAs |
| `api.fetchModels()` | `GET /api/models` | Fetch available models |
| `api.connectJobStream(jobId, cb)` | WebSocket | Stream job progress |

All methods are currently mocked — they log to console and return fake responses.

### 3. Utility Functions (Lines 141–164)

- **`getSliderStyle(value, min, max)`**: Computes a gradient fill style for range sliders
- **`normalizeImageShape(img, overrides)`**: Ensures image objects have a consistent shape with all required fields
- **`clampFloat(val, min, max, fallback)`**: Validates and clamps numeric values

### 4. Reusable UI Components (Lines 171–718)

Small, focused components rendered within the main App:

| Component | Purpose |
|---|---|
| `HistorySidebar` | Left sidebar showing thumbnail history of generated images |
| `CustomDropdown` | Animated select dropdown with transition effects |
| `StyledSlider` | Range input with orange gradient fill |
| `ToggleSwitch` | Accessible toggle with `role="switch"` and `aria-checked` |
| `SeedInput` | Seed number input with a randomize (dice) button |
| `LoRAPanel` | Add/remove/configure LoRA adapter layers |
| `CollapsibleCard` | Expandable section with chevron toggle |
| `MetadataDrawer` | Slide-out drawer displaying image generation metadata |
| `PresetManager` | Save/load generation parameter presets |
| `CalendarWidget` | Date picker for gallery filtering |
| `GenerationStatusStrip` | Progress bar for active generation jobs |
| `BouncingBalls` | Animated loading indicator |
| `QueueBar` | Bottom bar visualizing queued/active/completed jobs |

### 5. Main App Component (Lines 720–1848)

The root component manages **31 state variables** covering:

- **Generation settings**: model, prompt, negative prompt, CFG, steps, sampler, scheduler, batch size, seed
- **Image prompting**: img2img, face swap, character reference, style reference, ControlNet — each with enable/disable toggle, strength, and image data
- **LoRA stack**: array of active LoRA layers with model and weight
- **Edit tab**: edit image, prompt, denoise strength, upscale mode, inpaint mode, brush size
- **Gallery**: search query, date filter, pagination, selected images
- **Queue**: array of job objects with status tracking
- **UI state**: active tab, panel visibility, mobile nav toggle

#### Key Functions

| Function | What It Does |
|---|---|
| `handleGenerate()` | Builds generation payload from current settings, creates queue items (respects batch size) |
| `handleQueueDelete()` | Removes a job from the queue |
| `handleReuseParameters()` | Restores all generation settings from a previous job's metadata |
| `handleLoadPreset()` | Applies a saved preset to the current config |
| `handleFileUpload()` | Reads an image file via FileReader API, stores as base64 |
| `handleDeviceUpload()` | Animated upload flow for the Edit tab |
| `handleDeleteSelected()` | Bulk delete selected gallery images |
| `handleSendToEditor()` | Moves a gallery image into the Edit tab |

#### Queue Processing

A `setInterval` loop (every 150ms) simulates job progression through states:

```
queued → generating (0% → 100%) → complete
```

This will be replaced with real WebSocket streaming in production.

## UI Tabs

The interface has three main tabs:

1. **Generate**: Full prompt editor with model selection, sampling parameters, LoRA management, image prompting controls (img2img, face swap, character ref, style ref, ControlNet), and batch generation
2. **Edit**: Image editing workspace with inpainting, upscaling, denoising, and brush tools
3. **Gallery**: Searchable, filterable grid of generated images with metadata viewing, batch operations, and parameter reuse

## Design System

- **Primary**: `#E84E36` (orange-red, used for CTAs and highlights)
- **Background**: `#FDFEF5` (warm cream)
- **Text**: `#1A1917` (near-black brown)
- **Accents**: `#DCD6F7` (lavender), `#FFE4E6` (blush pink)
- **Fonts**: Playfair Display (headings), Jost (body text)

Custom CSS classes handle scrollbars, torn-edge effects, squiggle backgrounds, and slow-spin animations.

## What's Not Yet Implemented

The following are stubbed or marked with TODO comments:

- Backend API integration (all API calls return mocked data)
- WebSocket streaming for real-time job progress
- Real image URLs in queue results (currently placeholder)
- Preview image streaming during generation
- File persistence (presets are stored in component state only)

## Patterns & Conventions

- **No external state management**: Everything flows through `useState` + prop drilling
- **Memoization**: `useCallback` for handlers, `useMemo` for computed values (`filteredGallery`, `groupedImages`)
- **Functional components only**: No class components
- **Naming**: `onXxx` for callback props, `handleXxx` for event handlers
- **Section markers**: `// ============================================================` separates logical sections
- **Accessibility**: ARIA attributes on toggles, semantic HTML, keyboard-accessible controls
