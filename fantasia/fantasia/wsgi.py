"""
WSGI config for fantasia project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import sys

from django.core.wsgi import get_wsgi_application

# Ensure the outer project directory is on sys.path for Vercel
# Current file: <repo>/fantasia/fantasia/wsgi.py
# We need to add <repo>/fantasia to sys.path so `fantasia.settings` resolves
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.append(project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fantasia.settings')

application = get_wsgi_application()
app = application
