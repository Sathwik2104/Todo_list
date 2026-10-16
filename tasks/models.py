from django.db import models
from django.utils import timezone


class Task(models.Model):
    CATEGORY_CHOICES = [
        ('assigned', 'Assigned Tasks'),
        ('accepted', 'Accepted Tasks'),
        ('review', 'Review Tasks'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In progress'),
        ('completed', 'Completed'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='accepted')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='high')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    created_by = models.CharField(max_length=100, default='Maia')
    assigned_date = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.status})"

    def is_overdue(self):
        if self.due_date and self.status != 'completed':
            return self.due_date < timezone.now().date()
        return False

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'category_display': self.get_category_display(),
            'priority': self.priority,
            'priority_display': self.get_priority_display(),
            'status': self.status,
            'status_display': self.get_status_display(),
            'created_by': self.created_by,
            'assigned_date': self.assigned_date.strftime('%d/%m/%Y') if self.assigned_date else '',
            'assigned_date_iso': self.assigned_date.isoformat() if self.assigned_date else '',
            'due_date': self.due_date.strftime('%d/%m/%Y') if self.due_date else '',
            'due_date_iso': self.due_date.isoformat() if self.due_date else '',
            'is_overdue': self.is_overdue(),
            'created_at': self.created_at.isoformat() if self.created_at else '',
            'updated_at': self.updated_at.isoformat() if self.updated_at else '',
        }
