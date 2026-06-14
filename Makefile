# Variables
IMAGE_NAME = calendar-booking
PORT ?= 8080

.PHONY: install compile-api dev-backend dev-frontend lint test-local docker-build docker-run docker-stop docker-logs docker-healthcheck clean

# ==========================================
# 1. Local Development (Without Docker)
# ==========================================

install:
	@echo "Installing dependencies..."
	npm install
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
	cd frontend && npm install
	cd e2e && npm install && npx playwright install chromium

compile-api:
	@echo "Compiling TypeSpec API contract..."
	npx tsp compile .

dev-backend:
	@echo "Starting Django development server..."
	cd backend && .venv/bin/python manage.py runserver 127.0.0.1:8000

dev-frontend:
	@echo "Starting Vite frontend development server..."
	cd frontend && npm run dev

lint:
	@echo "Linting frontend code..."
	cd frontend && npm run lint

test-local:
	@echo "Running Playwright E2E tests against local dev servers..."
	cd e2e && npx playwright test

# ==========================================
# 2. Docker Operations (Production / CI Simulation)
# ==========================================

docker-build:
	@echo "Building Docker image..."
	docker build -t $(IMAGE_NAME) .

docker-run: docker-stop
	@echo "Starting Docker container on port $(PORT)..."
	docker run -d -p $(PORT):$(PORT) -e PORT=$(PORT) --name $(IMAGE_NAME)-container $(IMAGE_NAME)
	@echo "Container started. Run 'make docker-logs' to see logs."

docker-stop:
	@echo "Stopping existing Docker container if running..."
	docker rm -f $(IMAGE_NAME)-container 2>/dev/null || true

docker-logs:
	docker logs -f $(IMAGE_NAME)-container

docker-healthcheck:
	@echo "Querying local container on port $(PORT)..."
	curl -i http://localhost:$(PORT)/api/event-types

# ==========================================
# 3. Utilities
# ==========================================

clean: docker-stop
	@echo "Cleaning temporary files and directories..."
	rm -rf tsp-output
	rm -rf frontend/dist
