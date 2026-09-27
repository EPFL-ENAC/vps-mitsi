install:
	cd frontend && npm install

lint:
	npx lefthook run pre-commit --all-files

run-frontend:
	cd frontend && npm run dev
