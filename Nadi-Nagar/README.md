# Nadi-Nagar: Urban Resilience Grid

Nadi-Nagar is a full-stack prototype based on the submitted concept deck. It turns simulated municipal buses, garbage trucks, water tankers, and pipe sensors into a live urban digital twin for detecting road stress, pipe leaks, flood risk, and traffic entropy before failures become emergencies.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI + WebSocket stream
- ML code: lightweight Python inference models in `backend/ml_models.py`
- Dummy sensors: GPS fleet and acoustic pipe simulator in `backend/simulator.py`
- Map layer: Google Maps JavaScript API when `VITE_GOOGLE_MAPS_API_KEY` is present, with a built-in fallback map.

## Run Locally

Backend:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

To enable real Google Maps, create `frontend/.env.local`:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Restart the Vite frontend after adding the key.

## API Highlights

- `GET /api/snapshot` returns the full current city twin state.
- `GET /api/vehicles` returns live GPS dummy sensor fleets.
- `GET /api/incidents` returns cross-validated alerts.
- `GET /api/public-board` returns public SLA transparency records.
- `WS /ws/stream` streams the full state once per second.

## Included Demo Intelligence

- Edge surface model for photogrammetry-style road dip and crack risk.
- Acoustic stress model for pipe leaks and drain blockage.
- LSTM-style recurrent flood forecaster with memory across ticks.
- Behavioral traffic guardrail model for braking and lane discipline entropy.
- Digital twin correlator that cross-validates surface, pipe, weather, and dispatch context.
- Moving rain cells, flood-prone road zones, traffic jam predictions, and live fleet sensor counts.
