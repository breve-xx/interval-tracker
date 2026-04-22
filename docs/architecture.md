# Architectural Design: Frontend, Local Storage-Based Application

This application is designed as a single-page, **front-end only** solution. For the initial phase, no backend services or database connections will be required.

**Data Storage:** All data persistence will be managed through the browser's **Local Storage API**.

## Project Structure

The project is organized into two main directories:

1.  **`docs/`**: This folder will contain all technical documentation, guides, and architectural decisions for the project.
2.  **`src/`**: This folder will house all the actual application files and source code.

## Application Components (Inside `src/`)

The `src/` directory will be composed of three main pillars:

### 1. `index.html` (The Entry Point)
*   This file serves as the main structure (the skeleton) of the application.
*   It will link to the necessary CSS and JavaScript bundles.
*   It handles the initial setup and DOM manipulation based on the loaded data.

### 2. `css/` (Styling Layer)
*   This folder will house all Cascading Style Sheets (CSS) files, managing the visual presentation and styling of the application.
*   All styling conventions should be maintained here for clean separation of concerns.

### 3. `js/` (Business Logic Layer)
*   This folder contains all the application's core logic, handling data management, calculations, user interactions, and the predictive algorithms.
*   **Data Persistence**: All read/write operations related to historical records and configuration must utilize `localStorage` to ensure data availability across sessions.
*   **Modularity**: JavaScript files should be highly modular (e.g., using ES modules) to maintain separation of concerns (e.g., `dataService.js`, `predictionEngine.js`, `uiController.js`).

## Data Flow Summary

1.  **Initialization**: `index.html` loads all required JS assets.
2.  **Data Retrieval**: The JS reads initial data from `localStorage` (or initializes an empty structure).
3.  **Interaction**: Users submit data through the UI (managed by `index.html`).
4.  **Processing**: The business logic (in `src/js/`) calculates statistics and predictions.
5.  **Persistence**: The updated data state is saved back to `localStorage`.
6.  **Display**: The UI is updated using the calculated results, while adhering to the styles in `src/css/`.
