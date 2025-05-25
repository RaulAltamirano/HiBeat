from rest_framework import serializers
from .models import DownloadTask, DownloadHistory

class DownloadTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = DownloadTask
        fields = '__all__'

class DownloadHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DownloadHistory
        fields = '__all__'
