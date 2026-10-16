from django.urls import path
from . import views

urlpatterns = [
    path('', views.index_view, name='index'),
    path('api/tasks/', views.task_list_create, name='task_list_create'),
    path('api/tasks/<int:pk>/', views.task_detail, name='task_detail'),
    path('api/tasks/stats/', views.task_stats, name='task_stats'),
    path('api/tasks/seed/', views.seed_demo_data, name='seed_demo_data'),
]
