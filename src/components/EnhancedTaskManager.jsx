'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function EnhancedTaskManager({ clientId, onTaskUpdate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    linked_project: '',
    estimated_hours: ''
  });

  const filters = [
    { id: 'all', label: 'All Tasks', color: 'gray' },
    { id: 'overdue', label: '🔥 Overdue', color: 'red' },
    { id: 'due_this_week', label: '⏱ This Week', color: 'orange' },
    { id: 'critical', label: '⚠️ Critical', color: 'red' },
    { id: 'deep_work', label: '🧠 Deep Work', color: 'blue' },
    { id: 'client_followup', label: '📞 Client Follow-ups', color: 'purple' }
  ];

  const sortOptions = [
    { id: 'priority', label: 'Priority' },
    { id: 'due_date', label: 'Due Date' },
    { id: 'created_at', label: 'Created' },
    { id: 'status', label: 'Status' }
  ];

  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800',
    blocked: 'bg-red-100 text-red-800'
  };

  useEffect(() => {
    loadTasks();
  }, [clientId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/clients/${clientId}/enhanced-tasks`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTasks = () => {
    let filtered = [...tasks];

    switch (filter) {
      case 'overdue':
        filtered = filtered.filter(task => {
          if (!task.due_date) return false;
          return new Date(task.due_date) < new Date();
        });
        break;
      case 'due_this_week':
        filtered = filtered.filter(task => {
          if (!task.due_date) return false;
          const dueDate = new Date(task.due_date);
          const weekFromNow = new Date();
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          return dueDate <= weekFromNow && dueDate >= new Date();
        });
        break;
      case 'critical':
        filtered = filtered.filter(task => task.priority === 'critical');
        break;
      case 'deep_work':
        filtered = filtered.filter(task => 
          task.priority === 'high' && task.status !== 'done'
        );
        break;
      case 'client_followup':
        filtered = filtered.filter(task => 
          task.title.toLowerCase().includes('follow') || 
          task.title.toLowerCase().includes('client') ||
          task.title.toLowerCase().includes('call')
        );
        break;
    }

    // Sort tasks
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'due_date':
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        case 'created_at':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'status':
          const statusOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        default:
          return 0;
      }
    });

    return filtered;
  };

  const addTask = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/clients/${clientId}/enhanced-tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newTask,
          client_id: clientId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTasks([...tasks, data.task]);
        setNewTask({
          title: '',
          description: '',
          priority: 'medium',
          due_date: '',
          linked_project: '',
          estimated_hours: ''
        });
        setShowAddTask(false);
        onTaskUpdate?.(data.task);
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/clients/${clientId}/enhanced-tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(tasks.map(task => 
          task.id === taskId ? data.task : task
        ));
        onTaskUpdate?.(data.task);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/clients/${clientId}/enhanced-tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        setTasks(tasks.filter(task => task.id !== taskId));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Enhanced Task Manager</h2>
          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            + Add Task
          </button>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex gap-1">
              {filters.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filter === f.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            >
              {sortOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      {showAddTask && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
              <input
                type="number"
                value={newTask.estimated_hours}
                onChange={(e) => setNewTask({...newTask, estimated_hours: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="0"
                step="0.5"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={2}
                placeholder="Task description or notes"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addTask}
              disabled={!newTask.title}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Task
            </button>
            <button
              onClick={() => setShowAddTask(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            {filter === 'all' ? 'No tasks found' : `No ${filters.find(f => f.id === filter)?.label.toLowerCase()} tasks`}
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 pt-1">
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={(e) => updateTaskStatus(task.id, e.target.checked ? 'done' : 'todo')}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium text-gray-900 ${
                        task.status === 'done' ? 'line-through opacity-60' : ''
                      }`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="mt-1 text-xs text-gray-600">{task.description}</p>
                      )}
                      
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span className={`px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${statusColors[task.status]}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${
                            isOverdue(task.due_date) ? 'text-red-600 font-medium' : ''
                          }`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(task.due_date)}
                            {isOverdue(task.due_date) && ' (overdue)'}
                          </span>
                        )}
                        {task.estimated_hours && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {task.estimated_hours}h
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        className="text-xs border rounded px-2 py-1"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                        <option value="blocked">Blocked</option>
                      </select>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
