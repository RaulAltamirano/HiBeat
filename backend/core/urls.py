from django.urls import path
from rest_framework.routers import DefaultRouter
from .qobuz_views import QobuzDownloadViewSet

router = DefaultRouter()
router.register(r'qobuz', QobuzDownloadViewSet, basename='qobuz')

urlpatterns = [
    path('', include(router.urls)),
]
