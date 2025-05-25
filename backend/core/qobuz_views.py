from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from .models import DownloadTask, DownloadHistory
from .serializers import DownloadTaskSerializer, DownloadHistorySerializer
from .qobuz_dl import QobuzDL
import threading
import os

class QobuzDownloadViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    def download(self, request):
        """Initiate a Qobuz download"""
        data = request.data
        required_fields = ['url', 'quality', 'directory']
        
        if not all(field in data for field in required_fields):
            return Response({
                'error': 'Missing required fields: url, quality, directory'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            # Create download task
            download_task = DownloadTask.objects.create(
                user=request.user,
                item_id=data['url'],
                item_type='url',
                status='DOWNLOADING'
            )
            
            # Initialize QobuzDL
            qobuz_dl = QobuzDL(
                directory=data['directory'],
                quality=data['quality'],
                embed_art=data.get('embed_art', False),
                no_cover=data.get('no_cover', False)
            )
            
            # Start download in a separate thread
            def download_task_runner():
                try:
                    qobuz_dl.handle_url(data['url'])
                    download_task.status = 'COMPLETED'
                    download_task.save()
                    
                    # Create download history
                    DownloadHistory.objects.create(
                        user=request.user,
                        download_task=download_task,
                        download_path=os.path.join(data['directory'], 'downloaded_file')
                    )
                    
                except Exception as e:
                    download_task.status = 'FAILED'
                    download_task.error_message = str(e)
                    download_task.save()
            
            threading.Thread(target=download_task_runner).start()
            
            return Response({
                'message': 'Download initiated successfully',
                'task_id': download_task.id
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    def status(self, request, pk=None):
        """Get download task status"""
        try:
            download_task = DownloadTask.objects.get(id=pk, user=request.user)
            serializer = DownloadTaskSerializer(download_task)
            return Response(serializer.data)
        except DownloadTask.DoesNotExist:
            return Response({
                'error': 'Download task not found'
            }, status=status.HTTP_404_NOT_FOUND)
            
    def history(self, request):
        """Get download history"""
        history = DownloadHistory.objects.filter(user=request.user)
        serializer = DownloadHistorySerializer(history, many=True)
        return Response(serializer.data)
        
    def search(self, request):
        """Search Qobuz content"""
        query = request.query_params.get('q')
        item_type = request.query_params.get('type', 'album')
        
        if not query:
            return Response({
                'error': 'Search query is required'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            qobuz_dl = QobuzDL()
            results = qobuz_dl.search_by_type(query, item_type)
            return Response(results)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
