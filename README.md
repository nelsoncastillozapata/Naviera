# SaaS de Gestión Naviera (MERN)

Proyecto inicial para un SaaS de gestión de reservas de transporte marítimo usando la información en `Datos/GES_NMAG_P2_22102024_31122025_C.csv`.

## Arquitectura

- `backend/`: API REST con Node.js, Express y MongoDB.
- `frontend/`: UI con React + Vite.
- `Datos/`: datos fuente en CSV.

## Pasos rápidos

1. Instalar dependencias:
   - `cd backend && npm install`
   - `cd frontend && npm install`
2. Configurar MongoDB local en `backend/.env.example`.
3. Cargar datos:
   - `cd backend && npm run import-data`
4. Iniciar backend:
   - `cd backend && npm run dev`
5. Iniciar frontend:
   - `cd frontend && npm run dev`

## Endpoints principales

- `GET /api/reservations`
- `GET /api/reservations/:id`
- `POST /api/reservations`

## Frontend

- Lista de reservas
- Buscador básico por cliente o estado

## Nota

Los datos del CSV se importan desde `Datos/GES_NMAG_P2_22102024_31122025_C.csv`.
