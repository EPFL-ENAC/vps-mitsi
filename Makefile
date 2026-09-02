install:
	cd frontend && npm install
	test -f .env || cp .env.example .env

lint:
	npx lefthook run pre-commit --all-files

run-frontend:
	cd frontend && npm run dev
