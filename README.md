# 🎮 Rotomatch - Advanced Memory Matching Game v.2.0.0

[![CI/CD Pipeline](https://github.com/APorkolab/Rotomatch/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/APorkolab/Rotomatch/actions/workflows/ci-cd.yml)
[![codecov](https://codecov.io/gh/APorkolab/Rotomatch/branch/main/graph/badge.svg)](https://codecov.io/gh/APorkolab/Rotomatch)
[![Performance](https://img.shields.io/badge/Lighthouse-90%2B-green)](https://rotomatch.aporkolab.com)
[![License](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)

A sophisticated, enterprise-grade memory matching game built with Angular 22.2.1, featuring modern architecture, comprehensive testing, and advanced game mechanics.

## 🚀 What's New in v2.0.0

### 🏗️ **Senior+++ Architecture Improvements**
- **Modern TypeScript**: Strict typing, no `any` types, comprehensive interfaces
- **Angular Signals**: Reactive state management with computed values
- **Error Handling**: Comprehensive error boundaries with retry logic
- **Performance Monitoring**: Real-time FPS tracking and optimization suggestions
- **Advanced State Management**: Persistent game state with auto-save
- **Achievement System**: Unlock achievements and track detailed statistics

### 🎯 **Game Features**
- **Multiple Difficulty Levels**: Easy, Medium, Hard with different timing constraints
- **Game Timer**: Real-time timer with pause/resume functionality
- **Statistics Tracking**: Comprehensive game statistics and best scores
- **Achievement System**: 12+ achievements across different categories
- **Auto-Save**: Persistent game state across page reloads
- **Responsive Design**: Optimized for all device sizes

### 🛠️ **Developer Experience**
- **CI/CD Pipeline**: Automated testing, linting, and deployment
- **Code Quality**: ESLint + Prettier with comprehensive rules
- **Performance Auditing**: Lighthouse CI integration
- **Type Safety**: 100% TypeScript coverage with strict mode
- **Testing**: Unit tests with high coverage
- **Documentation**: Comprehensive inline documentation

## 📚 Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Performance](#performance)
- [Contributing](#contributing)
- [Original Task Description](#original-task-description)

## 🚀 Quick Start

### Prerequisites
- Node.js `^22.22.3 || ^24.15.0 || >=26.0.0` (22.22.3+ on 22.x, 24.15.0+ on 24.x, or 26.0.0+), as specified in [package.json](package.json)
- npm 10.0.0 or higher (supports 10.x, 11.x, and newer versions)
- A modern browser covered by the project's [Browserslist configuration](.browserslistrc)

### Installation

```bash
# Clone the repository
git clone https://github.com/APorkolab/Rotomatch.git
cd Rotomatch

# Install dependencies
npm ci

# Start development server
npm start

# Open your browser to http://localhost:4200
```

### Quick Commands

```bash
# Development
npm start              # Start dev server
npm run build         # Production build
npm run build:dev     # Development build
npm run watch         # Watch mode

# Testing & Quality
npm test              # Vitest unit/component tests in headless Chromium (see Testing below)
npm run test:ci       # Single test run with V8 coverage
npm run test:coverage # Tests with V8 coverage in watch mode
npm run lint          # Lint code
npm run lint:fix      # Fix linting issues
npm run format        # Format code

# Analysis
npm run build:analyze # Bundle analysis
npm run audit:security # Security audit
```

## 🎯 Features

### 🎮 Core Game Mechanics
- **Card Matching**: Classic memory game with flip animations
- **Deck Sizes**: Configurable from 4 to 20 cards (2-10 pairs)
- **Difficulty Levels**: 
  - **Easy**: 2.5s card reveal time, no limits
  - **Medium**: 1.5s reveal time, 5-minute time limit
  - **Hard**: 0.8s reveal time, attempt limits, 3-minute time limit

### 🏆 Achievement System
- **12+ Unique Achievements** across 6 categories:
  - 🎆 **Beginner**: First game completions
  - 🎯 **Skill**: Perfect games and win streaks
  - ⚡ **Speed**: Time-based challenges
  - 💪 **Persistence**: Long-term engagement
  - 🏆 **Mastery**: Expert-level accomplishments
  - 🎁 **Special**: Unique scenarios

### 📊 Statistics & Analytics
- **Game Statistics**: Win rate, average attempts, play time
- **Performance Metrics**: Best scores per deck size and difficulty
- **Progress Tracking**: Achievement progress and completion rates
- **Historical Data**: Persistent statistics across sessions

### 🔄 Advanced State Management
- **Auto-Save**: Game state persists across page reloads
- **Pause/Resume**: Interrupt and continue games seamlessly
- **Error Recovery**: Graceful handling of invalid states
- **Performance Optimized**: Efficient state updates with signals

## 🏗️ Architecture

### 📦 Project Structure
```
src/
├── app/
│   ├── components/          # Reusable UI components
│   ├── pages/               # Route components
│   ├── services/            # Business logic services
│   ├── types/               # TypeScript interfaces
│   ├── model/               # Data models
│   └── utils/               # Utility functions
├── assets/               # Static assets
└── environments/         # Environment configs
```

### 🔧 Core Services

#### 🎮 GameStateManagerService
- **Reactive State**: Angular signals for real-time updates
- **Game Logic**: Card flipping, matching, and win conditions
- **Timer Management**: Precise timing with pause/resume
- **Persistence**: Auto-save to localStorage

#### 🏆 AchievementsService
- **Achievement Tracking**: Automatic unlock detection
- **Statistics Engine**: Comprehensive game analytics
- **Progress Calculation**: Real-time achievement progress

#### ⚡ PerformanceService
- **FPS Monitoring**: Real-time frame rate tracking
- **Performance Metrics**: Load times, memory usage
- **Optimization Suggestions**: Automatic performance hints
- **Device Capabilities**: Hardware detection

#### 🛡️ ErrorHandlerService
- **Global Error Handling**: Catch and process all errors
- **Retry Logic**: Automatic retry with exponential backoff
- **User-Friendly Messages**: Convert technical errors
- **Error Logging**: Development and production logging

### 📝 Type Safety
- **Comprehensive Interfaces**: Every data structure typed
- **Strict TypeScript**: No `any` types, strict mode enabled
- **Enum Usage**: Type-safe constants and states
- **Generic Types**: Reusable type definitions

## 🛠️ Development

### 🔧 Development Setup
```bash
# Install dependencies
npm ci

# Set up pre-commit hooks
npm run prepare

# Start development with hot reload
npm start
```

### 🔍 Code Quality Tools
- **ESLint**: Comprehensive linting with Angular-specific rules
- **Prettier**: Consistent code formatting
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters on staged files only

### 📋 Coding Standards
- **TypeScript Strict Mode**: Maximum type safety
- **Angular Style Guide**: Following official conventions
- **SOLID Principles**: Clean architecture patterns
- **Reactive Programming**: RxJS and Angular signals

## Testing

Unit and component tests use Angular's `@angular/build:unit-test` builder with Vitest 5 and the Playwright browser provider. [angular.json](angular.json) configures `ChromiumHeadless`; coverage uses `@vitest/coverage-v8`.

After `npm ci`, install the Chromium binary required by Playwright:

```bash
npm exec -- playwright install chromium

# On Linux/CI, also install the required system libraries:
npm exec -- playwright install --with-deps chromium
```

```bash
npm test              # Watch mode
npm run test:coverage # Watch mode with coverage
npm run test:ci       # Single run with coverage (ng test --watch=false --coverage)
```

HTML and LCOV coverage reports are written to `coverage/MatchingGameAngular/`; a text summary is printed in the terminal. The [CI workflow](.github/workflows/ci-cd.yml) installs Chromium, runs `npm run test:ci`, and uploads this directory as the `coverage` artifact. Codecov uploads use `coverage/MatchingGameAngular/lcov.info` when `CODECOV_TOKEN` is configured.

The `e2e` script remains in `package.json`, but `angular.json` has no E2E target configured. The Playwright provider above runs the unit and component tests.

## 1. Original Task Description

> Your task is to build a simple card-matching game, the kind that your
> brother/sister/best friend always cheated at when you were little. In
> case you need a reminder, here’s how it should work:
>
> 1. Present the user with an even number of cards, “face down”.
>
> 2. When the user clicks a card, “flip it over” and reveal the hidden image.
>
> 3. When two cards are revealed:
>
> 4. If the cards are identical, remove them from play.
>
> 5. If they are not, flip them back.
>
> 6. The game ends when all the cards are removed.
>
> To get full points, your app should also fulfill all of the below
> requirements:
>
> - It should be responsive.
>
> - It should have a landing page for the app that explains the rules, and a separate screen for the actual game.
>
> - We expect a SPA.
>
> - Allow the user to play more than one game without reloading the page.
>
> - Allow the user to set the number of cards before a new game (min. 3, max. 10 pairs).
>
> - Present the user with a step counter that increments after every second card flip.
>
> - Allow the user to continue the previously played game after reloading the page.
>
> We have attached some assets and a basic UI design scheme; implement
> them as closely as possible. Aside from that, use any framework. This
> is your project. Just make it happen.
>
> You need to deliver a working game that we can play through until the
> end, otherwise, we can’t evaluate your submission. It doesn’t have to
> be perfect but it cannot contain game-breaking bugs.
>
> We’ll be expecting your submission via a GitHub link. _Please commit
> regularly, at least after each feature while you work._
>
> You have five hours, starting now.

## 2. Version history

Technologies used: Angular 14 and Bootstrap 5, other NPM libraries (see _package.json_ for the exact list).

### v.1.0.0 (2022-11-01)

- Package size is now customizable,
- The game state is saved to localstorage, if the user moves to another page and then wants to continue the game, the program will reset the state (currently restore after reload is disabled, but it can be enabled).
- Develop appropriate routing.
- Design more faithful to the design specification.
- Bug fixing (complete elimination of 'any').
- Correction of respositivity errors.
- Rationalisation of function assignment and card service.
- Storing data in a Card model instead of JSON, in line with good practice.
- Background map (_thanks to **vedanti** for the wonderful photo: https://www.pexels.com/photo/gray-pavement-245250/_).
- **Timeframe used:** _About 16 hours_.

### v.0.0.9 (2022-01-19)

- First implementation of the task.
- Writing basic operation and game mechanics.
- Implement partial responsiveness.
- **Time frame used:** _5 hours_

#### Evaluation of the version:

> "No implementation of several features during the implementation of the task.
> or were implemented incorrectly, such as:
>
> - Deck selector
>
> - Save game state (use localStorage for example)
>
> The UI was nicely implemented, more or less followed in the task
> expected and adapted to the UI sent as a sample, in addition to the
> attached materials and the responsive look and feel
> supported (there were some sliding elements).
>
> While the framework chosen (Angular) was a good choice for the task
> solution, but the complete lack of routing is very bad practice.
> For this reason, all pages were > crammed into one main component.
>
> The styling used Sass but the implementation did not use
> its capabilities were not exploited, I mean nesting.
>
> Although the use of TypeScript was implemented, there were a lot of
> any or many places lacked call signiture and there is no
> interfaces and enums were not used."

## 3. Legal information

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />This <span xmlns:dct="http://purl.org/dc/terms/" href="http://purl.org/dc/dcmitype/InteractiveResource" rel="dct:type">work</span> by <a xmlns:cc="http://creativecommons.org/ns#" href="https://aporkolab.com" property="cc:attributionName" rel="cc:attributionURL">Ádám Dr. Porkoláb</a> is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International License</a>.<br />Based on a work at <a xmlns:dct="http://purl.org/dc/terms/" href="https://github.com/APorkolab/" rel="dct:source">https://github.com/APorkolab/</a>.

---

---

# Rotomatch - a párosítós játék Angular-ban v.1.0.0 - dokumentáció

## 1. A feladatkiírás

Az eredeti feladat a következő volt (angol nyelven):

> A feladatod egy egyszerű kártyapárosítós játék megalkotása,
> olyasféléé, amelyben a bátyád/húgod/legjobb barátod mindig csalt,
> amikor kicsi voltál. Ha emlékeztetőre van szükséged, íme, hogyan kell
> működnie:
>
> 1.  Adj a felhasználó kezébe páros számú kártyát, képpel lefelé.
> 2.  Amikor a felhasználó rákattint egy kártyára, "fordítsd meg", és fedd fel a rejtett képet.
> 3.  Amikor két kártya van felfedve:
>
>     1.  Ha a kártyák azonosak, távolítsa el őket a játékból.
>     2.  Ha nem egyeznek, fordítsd vissza őket.
>
> 4.  A játék akkor ér véget, ha az összes kártyát eltávolítottuk.
>
> A teljes pontszám megszerzéséhez az alkalmazásodnak az alábbi
> követelmények mindegyikét is teljesítenie kell:
>
> - Reagálónak kell lennie.
> - Legyen az alkalmazásnak egy céloldala, amely elmagyarázza a szabályokat, és egy külön képernyő a tényleges játékhoz.
> - Elvárjuk, hogy legyen SPA.
> - Lehetővé tegye a felhasználó számára, hogy egynél több játékot játszhasson az oldal újratöltése nélkül.
> - Lehetővé tegye a felhasználó számára, hogy beállíthassa a kártyák számát egy új játék előtt (min. 3, max. 10 pár).
> - Mutasson a felhasználónak egy lépésszámlálót, amely minden második kártyadobás után növekszik.
> - Lehetővé teszi a felhasználó számára, hogy az oldal újratöltése után folytassa a korábban játszott játékot.
>
> Csatoltunk néhány eszközt és egy alapvető felhasználói felület
> tervezési sémát; valósítsa meg ezeket a lehető legpontosabban. Ettől
> eltekintve használjon bármilyen keretrendszert. Ez a te projekted.
> Csak valósítsd meg.
>
> Egy működő játékot kell szállítanod, amelyet végig tudunk játszani a
> végéig, különben nem tudjuk értékelni a pályázatodat. Nem kell
> tökéletesnek lennie, de nem tartalmazhat játékromboló hibákat.
>
> A pályázatodat egy GitHub linken keresztül várjuk. _Kérjük,
> rendszeresen, legalább minden egyes funkció után commitolj, amíg
> dolgozol._
>
> Öt órád van, mostantól kezdve.

## 2. Verziótörténet

Felhasznált technológiák: Angular 14 és Bootstrap 5, egyéb NPM könyvtárak (a pontos listát lásd a _package.json_ fájlban).

### v.1.0.0 (2022-11-01)

- A pakli mérete most már választható,
- A játékállást a localstorage-ba menti a program, ha a felhasználó valamelyik másik oldalra lép, majd folytatni akarja az játszmát, a program vissza is állítja az állást (jelenleg tilva van az újratöltés utáni visszaállítás, de ez kiiktatható).
- Megfelelő útvonalválasztás (routing) kidolgozása.
- Design kiíráshoz hűbb kialakítása.
- Hibajavítás (az 'any' teljes kiiktatása).
- Reszponzivitási hibák kijavítása.
- Függvényekbe sorolás ésszerűsítése és kártya szervizének kialakítása.
- JSON helyett - a good practice-nek megfelelően - Kártya modellben tároljuk az adatokat.
- Háttérkép (_köszönet a csodás fényképért **vedanti**nak: https://www.pexels.com/photo/gray-pavement-245250/_).
- **Felhasznált időkeret:** _körülbelül 16 óra_

### v.0.0.9 (2022-01-19)

- A feladat első megvalósítása.
- Alapvető működés és játékmechnanika megírása.
- Részbeni reszponzivitás megvalósítása.
- **Felhasznált időkeret:** _5 óra_

#### A verzió kiértékelése:

> "A feladat megvalósítása közben több feature implementálása sem
> történt meg vagy hibásan lett megvalósítva, ilyen pl.:
>
> - Deck választó
>
> - Játék állapot mentése (localStorage használata pl.)
>
> A UI szépen lett megvalósítva, többé kevésbé követte a feladatban
> elvártakat és igazodott a mintaként küldött felülethez, emellett a
> csatolt anyagokat is felhasználta és a reszponzív megjelenés is
> támogatott volt (itt néhol voltak elcsúszó elemek).
>
> A választott keretrendszer (Angular) ugyan jó döntés volt a feladat
> megoldására, viszont a routing teljes mellőzése nagyon bad practice.
> Emiatt egyetlen fő komponensbe lett összezsúfolva az összes page.
>
> A styling ugyan Sass-t használt viszont az implementációban egyáltalán
> nem voltak kihasználva az adottságait, gondolok itt pl.: nesting.
>
> Ugyan a TypeScript használata megvalósult viszont rengeteg helyen volt
> any illetve sok helyen hiányoztak call signiture-ök emellett nincsenek
> interface-ek, enum-ok használva."

## 3. Jogi információk

<a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons Licenc" style="border-width:0" src="https://i.creativecommons.org/l/by/4.0/88x31.png" /></a><br />Ezen <span xmlns:dct="http://purl.org/dc/terms/" href="http://purl.org/dc/dcmitype/InteractiveResource" rel="dct:type">Mű</span> szerzője <a xmlns:cc="http://creativecommons.org/ns#" href="https://aporkolab.com" property="cc:attributionName" rel="cc:attributionURL">Dr. Porkoláb Ádám</a>, és a <a rel="license" href="http://creativecommons.org/licenses/by/4.0/">Creative Commons Nevezd meg! 4.0 Nemzetközi Licenc</a> feltételeinek megfelelően felhasználható.<br />Based on a work at <a xmlns:dct="http://purl.org/dc/terms/" href="https://github.com/APorkolab/" rel="dct:source">https://github.com/APorkolab/</a>.
