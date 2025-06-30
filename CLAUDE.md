# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a bilingual Jekyll blog built with the Minimal Mistakes theme and custom JavaScript features called "wordplay." The site supports English and Hebrew content with RTL text support. The site uses open-source projects such as GSAP and barba.

## Build and Development Commands

### Jekyll Commands
- **Build**: `npm run build` - Runs Ruby script to process bilingual content then builds Jekyll site
- **Serve**: `npm run serve` - Processes content and serves locally at http://localhost:4000
- **Manual Jekyll**: `bundle exec jekyll build` or `bundle exec jekyll serve`
- **Project Custom Build Command**: `jbuild` at `./zhcrc` file

### Dependencies
- Ruby with Jekyll (~4.4.1) and Bundler
- Node.js (for npm scripts only)
- Minimal Mistakes Jekyll theme (~4.27.1)

## Architecture

### Bilingual Content System
The site uses a custom bilingual system via `build-pages.rb`:
- Content files are stored in `_places/_content/` and `_posts/_content/`
- English files: `filename.md`, Hebrew files: `filename-he.md`
- Build script combines both languages into single files using `%%%HEBREW%%%` separator
- Jekyll configuration sets `lang` and `rtl` properties based on filename patterns

### Collections
- `_places`: Custom collection for location-based content (permalink: `/:name/`)
- `_posts`: Blog posts (permalink: `/posts/:title/`)

## JavaScript "Wordplay" System
Located in `assets/js/wordplay/`, this modular system handles:
- **Header rendering**: Dynamic header content based on page context
- **Language switching**: Toggle between English/Hebrew with RTL support
- **Page transitions**: Smooth navigation animations using Barba.js-style transitions
- **Animation management**: Coordinated animations and transitions

### Key files:
- `index.js`: Main initialization and orchestration
- `header-render.js`: Dynamic header content generation
- `language.js`: Language detection and switching logic
- `transitions.js`: Page transition animations
- `config.js`: Shared configuration and selectors

### Header animation
**GSAP** animations are used for both content and header
**barba** keep a consistent header and replace content dynamically 
content and header animations are triggred by `word-items` and their animations happen simultaneously 

### Theme Customization
- Uses "noirbloom" skin variant of Minimal Mistakes
- Custom SCSS in `_sass/minimal-mistakes/_noirbloom-custom.scss` and `_wordplay.scss`
- Custom navigation via `_data/navigation.yml` and `_data/wordplay.yml`

## Key Files to Understand

1. `build-pages.rb` - Bilingual content processing script
2. `_config.yml` - Jekyll configuration with bilingual defaults
3. `assets/js/wordplay/index.js` - JavaScript system entry point
4. `_layouts/default.html` - Main template (currently modified)
5. `_data/wordplay.yml` - Configuration data for wordplay system

## Development Workflow

1. Create content in `_places/_content/` or `_posts/_content/` directories
2. English files use `.md` extension, Hebrew use `-he.md` suffix
3. Run `jbuild` to process and build site using:
   bundle exec jekyll clean
   ruby build_pages.rb
   bundle exec jekyll build
   JEKYLL_ENV=production bundle exec jekyll serve --host=0.0.0.0
4. The build script will combine bilingual content and generate final markdown files uning build_page.rb

## CSS/SCSS Structure
- Main styles: `assets/css/main.scss`
- Custom overrides: `assets/css/custom.scss`
- Theme customizations in `_sass/minimal-mistakes/` directory