import json
from datetime import datetime, date
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.db.models import Q
from .models import Task


def index_view(request):
    """Serve the main frontend single-page dashboard."""
    return render(request, 'index.html')


@csrf_exempt
def task_list_create(request):
    """
    GET  /api/tasks/  -> List and filter tasks
    POST /api/tasks/  -> Create a new task
    """
    if request.method == 'GET':
        tasks = Task.objects.all()

        # Category filter (Assigned, Accepted, Review)
        category = request.GET.get('category')
        if category and category.lower() != 'all':
            tasks = tasks.filter(category=category.lower())

        # Status filter
        status = request.GET.get('status')
        if status and status.lower() != 'all':
            tasks = tasks.filter(status=status.lower())

        # Priority filter
        priority = request.GET.get('priority')
        if priority and priority.lower() != 'all':
            tasks = tasks.filter(priority=priority.lower())

        # Date filter (by due date)
        date_str = request.GET.get('date')
        if date_str:
            try:
                filter_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                tasks = tasks.filter(due_date=filter_date)
            except ValueError:
                pass

        # Search filter (title or description or created_by)
        search_query = request.GET.get('search', '').strip()
        if search_query:
            tasks = tasks.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(created_by__icontains=search_query)
            )

        data = [task.to_dict() for task in tasks]
        return JsonResponse({'success': True, 'count': len(data), 'tasks': data})

    elif request.method == 'POST':
        try:
            body = json.loads(request.body.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({'success': False, 'error': 'Invalid JSON in request body.'}, status=400)

        title = body.get('title', '').strip()
        if not title:
            return JsonResponse({'success': False, 'error': 'Task title is required.'}, status=400)

        description = body.get('description', '').strip()
        category = body.get('category', 'accepted').lower()
        if category not in ['assigned', 'accepted', 'review']:
            category = 'accepted'

        priority = body.get('priority', 'high').lower()
        if priority not in ['low', 'medium', 'high']:
            priority = 'high'

        status = body.get('status', 'in_progress').lower()
        if status not in ['pending', 'in_progress', 'completed']:
            status = 'in_progress'

        created_by = body.get('created_by', '').strip() or 'Maia'

        # Parse assigned date
        assigned_date_str = body.get('assigned_date')
        assigned_date = timezone.now().date()
        if assigned_date_str:
            try:
                assigned_date = datetime.strptime(assigned_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        # Parse due date
        due_date = None
        due_date_str = body.get('due_date')
        if due_date_str:
            try:
                due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        task = Task.objects.create(
            title=title,
            description=description,
            category=category,
            priority=priority,
            status=status,
            created_by=created_by,
            assigned_date=assigned_date,
            due_date=due_date,
        )

        return JsonResponse({'success': True, 'task': task.to_dict()}, status=201)

    return HttpResponseNotAllowed(['GET', 'POST'])


@csrf_exempt
def task_detail(request, pk):
    """
    GET    /api/tasks/<id>/  -> Retrieve task
    PUT    /api/tasks/<id>/  -> Full/Partial update
    PATCH  /api/tasks/<id>/  -> Partial update
    DELETE /api/tasks/<id>/  -> Delete task
    """
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return JsonResponse({'success': False, 'error': f'Task with id {pk} not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'success': True, 'task': task.to_dict()})

    elif request.method in ['PUT', 'PATCH']:
        try:
            body = json.loads(request.body.decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({'success': False, 'error': 'Invalid JSON in request body.'}, status=400)

        if 'title' in body:
            title = body['title'].strip()
            if not title:
                return JsonResponse({'success': False, 'error': 'Task title cannot be empty.'}, status=400)
            task.title = title

        if 'description' in body:
            task.description = body['description'].strip()

        if 'category' in body:
            cat = body['category'].lower()
            if cat in ['assigned', 'accepted', 'review']:
                task.category = cat

        if 'priority' in body:
            prio = body['priority'].lower()
            if prio in ['low', 'medium', 'high']:
                task.priority = prio

        if 'status' in body:
            st = body['status'].lower()
            if st in ['pending', 'in_progress', 'completed']:
                task.status = st

        if 'created_by' in body:
            creator = body['created_by'].strip()
            if creator:
                task.created_by = creator

        if 'due_date' in body:
            due_str = body['due_date']
            if due_str:
                try:
                    task.due_date = datetime.strptime(due_str, '%Y-%m-%d').date()
                except ValueError:
                    pass
            else:
                task.due_date = None

        if 'assigned_date' in body:
            assigned_str = body['assigned_date']
            if assigned_str:
                try:
                    task.assigned_date = datetime.strptime(assigned_str, '%Y-%m-%d').date()
                except ValueError:
                    pass

        task.save()
        return JsonResponse({'success': True, 'task': task.to_dict()})

    elif request.method == 'DELETE':
        task_id = task.id
        task.delete()
        return JsonResponse({'success': True, 'message': f'Task {task_id} deleted successfully.'}, status=200)

    return HttpResponseNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE'])


def task_stats(request):
    """
    GET /api/tasks/stats/ -> Returns counts for metrics and tab badges
    """
    total = Task.objects.count()
    assigned_count = Task.objects.filter(category='assigned').count()
    accepted_count = Task.objects.filter(category='accepted').count()
    review_count = Task.objects.filter(category='review').count()
    completed_count = Task.objects.filter(status='completed').count()
    in_progress_count = Task.objects.filter(status='in_progress').count()
    pending_count = Task.objects.filter(status='pending').count()

    today = timezone.now().date()
    overdue_count = Task.objects.filter(due_date__lt=today).exclude(status='completed').count()

    return JsonResponse({
        'success': True,
        'stats': {
            'total': total,
            'assigned': assigned_count,
            'accepted': accepted_count,
            'review': review_count,
            'completed': completed_count,
            'in_progress': in_progress_count,
            'pending': pending_count,
            'overdue': overdue_count,
        }
    })


@csrf_exempt
def seed_demo_data(request):
    
    if Task.objects.exists():
        # Check if already seeded
        if request.GET.get('force') != 'true':
            return JsonResponse({'success': True, 'message': 'Database already has tasks. Use ?force=true to re-seed.'})
        Task.objects.all().delete()

    sample_tasks = [
        {
            'title': 'New test task title',
            'description': 'Finalize user interface components for the new client project dashboard.',
            'category': 'accepted',
            'priority': 'high',
            'status': 'in_progress',
            'created_by': 'Maia',
            'assigned_date': date(2023, 7, 29),
            'due_date': date(2023, 4, 28),
        },
        {
            'title': 'New test task title',
            'description': 'Database schema design and API response optimization for task manager.',
            'category': 'accepted',
            'priority': 'high',
            'status': 'completed',
            'created_by': 'Maia Burjanadze',
            'assigned_date': date(2023, 9, 23),
            'due_date': date(2023, 7, 24),
        },
        {
            'title': 'New test task title',
            'description': 'Audit user permissions and implement security headers on the backend.',
            'category': 'accepted',
            'priority': 'high',
            'status': 'in_progress',
            'created_by': 'Maia',
            'assigned_date': date(2023, 7, 29),
            'due_date': date(2023, 4, 28),
        },
        {
            'title': 'New test task title',
            'description': 'Cross-browser testing across Chrome, Safari, Firefox, and Edge.',
            'category': 'accepted',
            'priority': 'high',
            'status': 'in_progress',
            'created_by': 'Maia',
            'assigned_date': date(2023, 7, 29),
            'due_date': date(2023, 4, 28),
        },
        {
            'title': 'System Architecture Documentation',
            'description': 'Write comprehensive API docs and system architecture diagrams for onboarding.',
            'category': 'assigned',
            'priority': 'medium',
            'status': 'pending',
            'created_by': 'Alex Chen',
            'assigned_date': date(2023, 8, 10),
            'due_date': date(2023, 8, 30),
        },
        {
            'title': 'Frontend Code Review & Linting',
            'description': 'Perform peer review on pull request #42 regarding CSS styling.',
            'category': 'review',
            'priority': 'low',
            'status': 'in_progress',
            'created_by': 'Maia Burjanadze',
            'assigned_date': date(2023, 8, 15),
            'due_date': date(2023, 8, 25),
        },
    ]

    created_instances = []
    for item in sample_tasks:
        t = Task.objects.create(**item)
        created_instances.append(t.to_dict())

    return JsonResponse({'success': True, 'seeded': len(created_instances), 'tasks': created_instances})
