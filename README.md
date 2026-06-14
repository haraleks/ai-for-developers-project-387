### Hexlet tests and linter status:
[![Actions Status](https://github.com/haraleks/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/haraleks/ai-for-developers-project-386/actions)

cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py runserver

cd frontend
npm install
npm run dev

cd e2e
npm install
npx playwright install chromium
npx playwright test

ссылка на webapp:
https://ai-for-developers-project-386-uiw7.onrender.com/