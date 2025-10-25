from django.urls import path
from .views import tree

urlpatterns = [
    path('', tree, name='skill_tree'),
]
