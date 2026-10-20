.PHONY: install check lint typecheck test format format-check build run-frontend

install:
	cd frontend && npm ci

check:
	cd frontend && npm run check

lint:
	cd frontend && npm run lint

typecheck:
	cd frontend && npm run typecheck

test:
	cd frontend && npm test

format:
	cd frontend && npm run format

format-check:
	cd frontend && npm run format:check

build:
	cd frontend && npm run build

run-frontend:
	cd frontend && npm run dev
