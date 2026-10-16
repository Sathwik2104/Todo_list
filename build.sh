#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files for WhiteNoise
python manage.py collectstatic --no-input

# Apply database migrations
python manage.py migrate

# Auto-seed initial demo tasks if empty
python -c "import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'todo_project.settings'); django.setup(); from tasks.views import seed_demo_data; from django.test import RequestFactory; seed_demo_data(RequestFactory().post('/api/tasks/seed/'))"
