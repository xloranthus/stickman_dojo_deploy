# Stickman Dojo

A web-based 2D fighting game featuring a decoupled architecture. The project is split into a pure TypeScript frontend (implementing the MVC pattern) and a Python FastAPI backend for data persistence and statistics.

## Team & Architecture

The project follows a strict separation of concerns, divided among four distinct roles:

* **Frontend - Model (Lóránt):** Core game logic, state management, and physics. Pure TypeScript, no DOM/Canvas dependencies.
* **Frontend - View (Levi):** Canvas rendering, particle systems, and HUD. Reads state from the Model, never modifies it.
* **Frontend - Controller (Roland):** Input handling (keyboard/gamepad), game loop (`requestAnimationFrame`), and match lifecycle management.
* **Backend (Kristóf):** Python/FastAPI server managing match records, persistent data, and the REST API.

## Project Structure & File Responsibilities

```text
stickman_dojo/
├── docker-compose.yml       # Orchestrates the containers, linking backend and frontend networks.
│
├── backend/                 # Workspace: Kristóf (Backend)
│   ├── Dockerfile           # Builds the Python FastAPI environment.
│   ├── requirements.txt     # Python dependencies (fastapi, uvicorn, pydantic).
│   └── main.py              # Contains the REST API endpoints (/matches, /leaderboard) and Pydantic data models.
│
└── frontend/                # Workspace: Levi, Lóránt, Roland (Frontend)
    ├── package.json         # Node dependencies (Vite, TypeScript config).
    └── src/
        ├── types.ts         # SHARED: Common interfaces (e.g., MatchPayload, RoundScores) agreed upon by the whole team.
        ├── eventBus.ts      # SHARED: Event emitter for internal, decoupled frontend communication.
        │
        ├── model/           # Workspace: Lóránt (Model)
        │   ├── Fighter.ts   # Defines pure game state (HP, position, current state). No rendering logic.
        │   └── Physics.ts   # Math and collision detection logic (gravity, platform bounds).
        │
        ├── view/            # Workspace: Levi (View)
        │   ├── FighterRenderer.ts # Reads Fighter data and draws the corresponding frames on the Canvas.
        │   └── HUDRenderer.ts     # Updates DOM elements (Health bars, match timer, winner modals).
        │
        ├── controller/      # Workspace: Roland (Controller)
        │   ├── InputManager.ts  # Captures raw keyboard events and maps them to player inputs.
        │   ├── GameLoop.ts      # The main requestAnimationFrame loop connecting Model updates and View renders.
        │   └── MatchController.ts # Manages round starts, ends, and scoring.
        │
        └── api/             # Frontend-Backend Bridge
            └── BackendApiClient.ts # Sends HTTP POST/GET requests to the Python backend (Kristóf's API).
```

## Getting Started

To run the application use the **docker compose up -d --build** command.

Once the containers are running, you can access the following services:

* **Backend API:** `http://localhost:8000`
* **API Documentation (Swagger UI):** `http://localhost:8000/docs` (Use this to test endpoints)
* **Frontend App:** *(Check your frontend build tool's output, typically `http://localhost:5173` if using Vite)*

## Development Workflow

1. **Shared Contracts:** Frontend and Backend communicate via REST. Always agree on the JSON payloads (e.g., `MatchPayload`) defined in `frontend/src/types.ts` and `backend/main.py` before integration.
2. **Frontend Bus:** The frontend layers communicate internally using an `EventBus` to maintain the decoupled MVC structure.