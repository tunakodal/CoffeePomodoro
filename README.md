# Coffee Pomodoro

A simple focus timer with a built-in task list. Set your focus and break durations, manage tasks, and track your sessions in one place. A coffee cup image empties as the focus time runs down.

Live demo: https://tunakodal.github.io/CoffeePomodoro/

## Features

- Focus and break timer with configurable durations (Start, Pause, Restart, Apply)
- Coffee cup image that changes as the session progresses
- Task list: add and manage tasks alongside the timer
- Tab title shows the current mode and remaining time
- Timer settings and tasks are saved in the browser (localStorage)

## Repository Structure

```
.
├── index.html   page markup
├── styles.css   styling
├── app.js       timer, task list and persistence logic
├── assets/      coffee progress images and favicon
└── README.md
```

## Usage

No build step or dependencies. Open `index.html` in a browser, or use the live demo above. The project is published with GitHub Pages, so the files are kept in the repository root.
