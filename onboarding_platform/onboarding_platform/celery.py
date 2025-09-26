import os
from celery import Celery
import eventlet

eventlet.monkey_patch()

# Then, your usual Celery configuration code follows...
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'onboarding_platform.settings')

app = Celery('onboarding_platform')

app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()