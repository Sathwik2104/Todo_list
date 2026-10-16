/**
 * To-Do Task Manager - Frontend Controller
 * Communicates with Django REST APIs with zero-reload dynamic updates.
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        category: 'accepted', // Default to Accepted Tasks matching the mockup
        status: 'all',
        priority: 'all',
        date: '',
        search: '',
        page: 1,
        rowsPerPage: 10,
        tasks: [],
        filteredTasks: [],
        stats: {},
        activeTaskId: null,
    };

    // DOM Elements - Tabs & Filters
    const tabButtons = document.querySelectorAll('.tab-btn');
    const dateFilterInput = document.getElementById('dateFilterInput');
    const dateDisplayLabel = document.getElementById('dateDisplayLabel');
    const statusFilterSelect = document.getElementById('statusFilterSelect');
    const priorityFilterSelect = document.getElementById('priorityFilterSelect');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const globalSearchInput = document.getElementById('globalSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    // DOM Elements - Table & Overdue Banner
    const tasksTableBody = document.getElementById('tasksTableBody');
    const emptyState = document.getElementById('emptyState');
    const overdueRibbon = document.getElementById('overdueRibbon');
    const overdueRibbonText = document.getElementById('overdueRibbonText');
    const viewOverdueBtn = document.getElementById('viewOverdueBtn');

    // DOM Elements - Pagination
    const rowsPerPageSelect = document.getElementById('rowsPerPageSelect');
    const paginationRange = document.getElementById('paginationRange');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    // DOM Elements - Modals
    const createTaskModal = document.getElementById('createTaskModal');
    const editTaskModal = document.getElementById('editTaskModal');
    const viewTaskModal = document.getElementById('viewTaskModal');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');

    // DOM Elements - Modal Forms & Buttons
    const openCreateModalBtn = document.getElementById('openCreateModalBtn');
    const emptyCreateBtn = document.getElementById('emptyCreateBtn');
    const createTaskForm = document.getElementById('createTaskForm');
    const editTaskForm = document.getElementById('editTaskForm');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const detailEditBtn = document.getElementById('detailEditBtn');
    const toastContainer = document.getElementById('toastContainer');
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // Tab count badges
    const countAssigned = document.getElementById('countAssigned');
    const countAccepted = document.getElementById('countAccepted');
    const countReview = document.getElementById('countReview');
    const countAll = document.getElementById('countAll');

    // Initialize
    init();

    function init() {
        // Set today's date in create form by default
        const todayStr = new Date().toISOString().split('T')[0];
        const assignedDateEl = document.getElementById('createAssignedDate');
        if (assignedDateEl) assignedDateEl.value = todayStr;

        setupEventListeners();
        fetchStats();
        fetchTasks();
    }

    // ==========================================
    // API Calls
    // ==========================================

    async function fetchTasks() {
        try {
            const params = new URLSearchParams();
            if (state.category && state.category !== 'all') {
                params.append('category', state.category);
            }
            if (state.status && state.status !== 'all') {
                params.append('status', state.status);
            }
            if (state.priority && state.priority !== 'all') {
                params.append('priority', state.priority);
            }
            if (state.date) {
                params.append('date', state.date);
            }
            if (state.search) {
                params.append('search', state.search);
            }

            const res = await fetch(`/api/tasks/?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                state.tasks = data.tasks;
                renderTable();
            } else {
                showToast(data.error || 'Failed to fetch tasks', 'error');
            }
        } catch (err) {
            console.error('Fetch tasks error:', err);
            showToast('Unable to connect to server.', 'error');
        }
    }

    async function fetchStats() {
        try {
            const res = await fetch('/api/tasks/stats/');
            const data = await res.json();
            if (data.success && data.stats) {
                state.stats = data.stats;
                updateStatsUI(data.stats);
            }
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    }

    async function createTask(payload) {
        try {
            const res = await fetch('/api/tasks/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                closeModals();
                createTaskForm.reset();
                showToast('Task created successfully!', 'success');
                fetchStats();
                fetchTasks();
            } else {
                showToast(data.error || 'Failed to create task.', 'error');
                const titleErr = document.getElementById('createTitleError');
                if (titleErr && data.error) {
                    titleErr.textContent = data.error;
                    titleErr.classList.add('active');
                }
            }
        } catch (err) {
            console.error('Create task error:', err);
            showToast('Network error while saving task.', 'error');
        }
    }

    async function updateTask(id, payload) {
        try {
            const res = await fetch(`/api/tasks/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                closeModals();
                showToast('Task updated successfully!', 'success');
                fetchStats();
                fetchTasks();
            } else {
                showToast(data.error || 'Failed to update task.', 'error');
            }
        } catch (err) {
            console.error('Update task error:', err);
            showToast('Network error while updating task.', 'error');
        }
    }

    async function deleteTask(id) {
        try {
            const res = await fetch(`/api/tasks/${id}/`, {
                method: 'DELETE',
            });
            const data = await res.json();

            if (res.ok && data.success) {
                closeModals();
                showToast('Task deleted successfully!', 'info');
                fetchStats();
                fetchTasks();
            } else {
                showToast(data.error || 'Failed to delete task.', 'error');
            }
        } catch (err) {
            console.error('Delete task error:', err);
            showToast('Network error while deleting task.', 'error');
        }
    }

    // ==========================================
    // UI Rendering
    // ==========================================

    function updateStatsUI(stats) {
        if (countAssigned) countAssigned.textContent = stats.assigned || 0;
        if (countAccepted) countAccepted.textContent = stats.accepted || 0;
        if (countReview) countReview.textContent = stats.review || 0;
        if (countAll) countAll.textContent = stats.total || 0;

        // Notification badge
        const notifBadge = document.getElementById('notificationBadge');
        if (notifBadge) {
            notifBadge.textContent = stats.overdue || (stats.pending || 0);
        }

        // Overdue banner
        if (stats.overdue > 0) {
            overdueRibbon.style.display = 'flex';
            overdueRibbonText.textContent = `You have ${stats.overdue} overdue task${stats.overdue > 1 ? 's' : ''} past their due date.`;
        } else {
            overdueRibbon.style.display = 'none';
        }
    }

    function renderTable() {
        tasksTableBody.innerHTML = '';

        if (!state.tasks || state.tasks.length === 0) {
            emptyState.style.display = 'flex';
            document.getElementById('tasksTable').style.display = 'none';
            paginationRange.textContent = '0-0 of 0';
            prevPageBtn.disabled = true;
            nextPageBtn.disabled = true;
            return;
        }

        emptyState.style.display = 'none';
        document.getElementById('tasksTable').style.display = 'table';

        // Pagination slicing
        const total = state.tasks.length;
        const startIndex = (state.page - 1) * state.rowsPerPage;
        const endIndex = Math.min(startIndex + state.rowsPerPage, total);
        const pageTasks = state.tasks.slice(startIndex, endIndex);

        paginationRange.textContent = `${total === 0 ? 0 : startIndex + 1}-${endIndex} of ${total}`;
        prevPageBtn.disabled = state.page <= 1;
        nextPageBtn.disabled = endIndex >= total;

        pageTasks.forEach(task => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', task.id);

            // Priority Badge Class
            const priorityClass = `badge-priority-${task.priority}`;

            // Status Badge Class
            const statusClass = `badge-status-${task.status}`;

            // Overdue Pill
            const overdueBadge = task.is_overdue
                ? `<span class="overdue-tag" title="Past due date!">Overdue</span>`
                : '';

            // Status Toggle Icon & Tooltip
            const isCompleted = task.status === 'completed';
            const toggleIconSvg = isCompleted
                ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
                : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;

            tr.innerHTML = `
                <td class="task-title-cell">
                    <span class="task-title-text">${escapeHtml(task.title)}</span>
                    ${task.description ? `<span class="task-desc-preview">${escapeHtml(task.description)}</span>` : ''}
                </td>
                <td>
                    <span class="badge ${priorityClass}">${escapeHtml(task.priority_display)}</span>
                </td>
                <td>
                    <span class="badge ${statusClass}">${escapeHtml(task.status_display)}</span>
                </td>
                <td>
                    <span class="creator-name">${escapeHtml(task.created_by || 'Maia')}</span>
                </td>
                <td>
                    <span class="date-text">${task.assigned_date || '—'}</span>
                </td>
                <td>
                    <span class="date-text">${task.due_date || '—'}</span>
                    ${overdueBadge}
                </td>
                <td class="actions-cell">
                    <button class="action-icon-btn btn-toggle-status" title="${isCompleted ? 'Mark Pending' : 'Mark Completed'}" data-action="toggle" data-id="${task.id}">
                        ${toggleIconSvg}
                    </button>
                    <button class="action-icon-btn btn-view" title="View Details" data-action="view" data-id="${task.id}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    </button>
                    <button class="action-icon-btn btn-edit" title="Edit Task" data-action="edit" data-id="${task.id}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                    </button>
                    <button class="action-icon-btn btn-delete" title="Delete Task" data-action="delete" data-id="${task.id}">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </td>
            `;

            tasksTableBody.appendChild(tr);
        });
    }

    // ==========================================
    // Event Listeners & Modals
    // ==========================================

    function setupEventListeners() {
        // Tab switching (Assigned, Accepted, Review, All)
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.category = btn.getAttribute('data-category');
                state.page = 1;
                fetchTasks();
            });
        });

        // Filter button
        applyFilterBtn.addEventListener('click', () => {
            state.status = statusFilterSelect.value;
            state.priority = priorityFilterSelect.value;
            state.date = dateFilterInput.value;
            state.page = 1;
            fetchTasks();
        });

        // Date Picker display update
        dateFilterInput.addEventListener('change', () => {
            if (dateFilterInput.value) {
                const parts = dateFilterInput.value.split('-');
                dateDisplayLabel.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
            } else {
                dateDisplayLabel.textContent = 'Choose Date';
            }
        });

        // Reset Filter
        resetFilterBtn.addEventListener('click', () => {
            dateFilterInput.value = '';
            dateDisplayLabel.textContent = 'Choose Date';
            statusFilterSelect.value = 'all';
            priorityFilterSelect.value = 'all';
            globalSearchInput.value = '';
            clearSearchBtn.style.display = 'none';

            state.status = 'all';
            state.priority = 'all';
            state.date = '';
            state.search = '';
            state.page = 1;
            fetchTasks();
        });

        // Search Input (Live debounced)
        let debounceTimer;
        globalSearchInput.addEventListener('input', () => {
            const val = globalSearchInput.value.trim();
            clearSearchBtn.style.display = val ? 'block' : 'none';
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                state.search = val;
                state.page = 1;
                fetchTasks();
            }, 300);
        });

        clearSearchBtn.addEventListener('click', () => {
            globalSearchInput.value = '';
            clearSearchBtn.style.display = 'none';
            state.search = '';
            state.page = 1;
            fetchTasks();
        });

        // Overdue banner link
        viewOverdueBtn.addEventListener('click', () => {
            // Switch to All tab and filter overdue tasks
            state.category = 'all';
            tabButtons.forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-category') === 'all');
            });
            state.status = 'pending';
            statusFilterSelect.value = 'pending';
            fetchTasks();
        });

        // Rows per page
        rowsPerPageSelect.addEventListener('change', () => {
            state.rowsPerPage = parseInt(rowsPerPageSelect.value, 10);
            state.page = 1;
            renderTable();
        });

        // Pagination buttons
        prevPageBtn.addEventListener('click', () => {
            if (state.page > 1) {
                state.page--;
                renderTable();
            }
        });

        nextPageBtn.addEventListener('click', () => {
            if (state.page * state.rowsPerPage < state.tasks.length) {
                state.page++;
                renderTable();
            }
        });

        // Table Action Delegations
        tasksTableBody.addEventListener('click', e => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const action = btn.getAttribute('data-action');
            const id = parseInt(btn.getAttribute('data-id'), 10);
            const task = state.tasks.find(t => t.id === id);

            if (!task) return;

            if (action === 'toggle') {
                const nextStatus = task.status === 'completed' ? 'in_progress' : 'completed';
                updateTask(task.id, { status: nextStatus });
            } else if (action === 'view') {
                openViewModal(task);
            } else if (action === 'edit') {
                openEditModal(task);
            } else if (action === 'delete') {
                openDeleteModal(task);
            }
        });

        // Open Create Modal
        openCreateModalBtn.addEventListener('click', () => {
            createTaskForm.reset();
            const titleErr = document.getElementById('createTitleError');
            if (titleErr) titleErr.classList.remove('active');
            
            // Sync category with current tab
            const categorySelect = document.getElementById('createCategory');
            if (categorySelect && ['assigned', 'accepted', 'review'].includes(state.category)) {
                categorySelect.value = state.category;
            }

            const todayStr = new Date().toISOString().split('T')[0];
            const assignedDateEl = document.getElementById('createAssignedDate');
            if (assignedDateEl) assignedDateEl.value = todayStr;

            openModal(createTaskModal);
        });

        emptyCreateBtn.addEventListener('click', () => {
            openCreateModalBtn.click();
        });

        // Create Task Form Submit
        createTaskForm.addEventListener('submit', e => {
            e.preventDefault();
            const title = document.getElementById('createTitle').value.trim();
            const titleErr = document.getElementById('createTitleError');

            if (!title) {
                if (titleErr) {
                    titleErr.textContent = 'Please enter a task title.';
                    titleErr.classList.add('active');
                }
                return;
            }
            if (titleErr) titleErr.classList.remove('active');

            const payload = {
                title: title,
                description: document.getElementById('createDescription').value.trim(),
                category: document.getElementById('createCategory').value,
                priority: document.getElementById('createPriority').value,
                status: document.getElementById('createStatus').value,
                created_by: document.getElementById('createCreator').value.trim() || 'Maia',
                assigned_date: document.getElementById('createAssignedDate').value || null,
                due_date: document.getElementById('createDueDate').value || null,
            };

            createTask(payload);
        });

        // Edit Task Form Submit
        editTaskForm.addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('editTaskId').value;
            const title = document.getElementById('editTitle').value.trim();
            const titleErr = document.getElementById('editTitleError');

            if (!title) {
                if (titleErr) {
                    titleErr.textContent = 'Task title cannot be blank.';
                    titleErr.classList.add('active');
                }
                return;
            }
            if (titleErr) titleErr.classList.remove('active');

            const payload = {
                title: title,
                description: document.getElementById('editDescription').value.trim(),
                category: document.getElementById('editCategory').value,
                priority: document.getElementById('editPriority').value,
                status: document.getElementById('editStatus').value,
                created_by: document.getElementById('editCreator').value.trim(),
                assigned_date: document.getElementById('editAssignedDate').value || null,
                due_date: document.getElementById('editDueDate').value || null,
            };

            updateTask(id, payload);
        });

        // Delete Confirm
        confirmDeleteBtn.addEventListener('click', () => {
            if (state.activeTaskId) {
                deleteTask(state.activeTaskId);
            }
        });

        // Detail Edit button
        detailEditBtn.addEventListener('click', () => {
            closeModals();
            if (state.activeTaskId) {
                const task = state.tasks.find(t => t.id === state.activeTaskId);
                if (task) openEditModal(task);
            }
        });

        // Modal Close Triggers
        document.querySelectorAll('[data-close-modal]').forEach(el => {
            el.addEventListener('click', closeModals);
        });

        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', e => {
                if (e.target === modal) closeModals();
            });
        });

        // Dark Theme Toggle
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            showToast(`Switched to ${isDark ? 'Dark' : 'Light'} Mode`, 'info');
        });

        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    // Modal Helpers
    function openModal(modalEl) {
        modalEl.classList.add('open');
    }

    function closeModals() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('open'));
        state.activeTaskId = null;
    }

    function openEditModal(task) {
        state.activeTaskId = task.id;
        document.getElementById('editTaskId').value = task.id;
        document.getElementById('editTitle').value = task.title;
        document.getElementById('editDescription').value = task.description || '';
        document.getElementById('editCategory').value = task.category;
        document.getElementById('editPriority').value = task.priority;
        document.getElementById('editStatus').value = task.status;
        document.getElementById('editCreator').value = task.created_by || 'Maia';
        document.getElementById('editAssignedDate').value = task.assigned_date_iso || '';
        document.getElementById('editDueDate').value = task.due_date_iso || '';

        const titleErr = document.getElementById('editTitleError');
        if (titleErr) titleErr.classList.remove('active');

        openModal(editTaskModal);
    }

    function openViewModal(task) {
        state.activeTaskId = task.id;
        document.getElementById('detailTitle').textContent = task.title;
        document.getElementById('detailDescription').textContent = task.description || 'No description provided.';
        
        const prioBadge = document.getElementById('detailPriorityBadge');
        prioBadge.className = `badge badge-priority-${task.priority}`;
        prioBadge.textContent = task.priority_display;

        const statusBadge = document.getElementById('detailStatusBadge');
        statusBadge.className = `badge badge-status-${task.status}`;
        statusBadge.textContent = task.status_display;

        document.getElementById('detailCategoryBadge').textContent = task.category_display;
        document.getElementById('detailCreator').textContent = task.created_by || 'Maia';
        document.getElementById('detailAssignedDate').textContent = task.assigned_date || '—';
        document.getElementById('detailDueDate').textContent = task.due_date || '—';
        document.getElementById('detailOverdue').textContent = task.is_overdue ? '⚠️ Overdue' : 'On track';

        openModal(viewTaskModal);
    }

    function openDeleteModal(task) {
        state.activeTaskId = task.id;
        document.getElementById('deleteTaskTitlePreview').textContent = task.title;
        openModal(deleteConfirmModal);
    }

    // Toast Notifications
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
