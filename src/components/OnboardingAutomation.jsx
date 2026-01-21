'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function OnboardingAutomation({ clientId, clientType: initialClientType, onOnboardingComplete }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [selectedClientType, setSelectedClientType] = useState(initialClientType || 'EMS');
  const [selectedTasks, setSelectedTasks] = useState({});
  const [taskStatuses, setTaskStatuses] = useState({});

  const clientTypes = [
    { id: 'EMS', label: 'EMS Consulting', description: 'Emergency Medical Services' },
    { id: 'healthcare', label: 'Healthcare Analytics', description: 'Healthcare Data Analytics' },
    { id: 'environmental', label: 'Environmental Consulting', description: 'Environmental Data Analysis' },
    { id: 'general', label: 'General Consulting', description: 'Custom consulting project' }
  ];

  useEffect(() => {
    loadTemplates();
    checkOnboardingStatus();
  }, [clientId]);

  // When template is selected, initialize all tasks as selected
  useEffect(() => {
    if (selectedTemplate?.task_templates) {
      const initialSelected = {};
      const initialStatuses = {};
      selectedTemplate.task_templates.forEach((task, index) => {
        initialSelected[index] = true;
        initialStatuses[index] = 'todo'; // 'todo', 'in_progress', 'done', 'skip'
      });
      setSelectedTasks(initialSelected);
      setTaskStatuses(initialStatuses);
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/onboarding-templates', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Remove duplicates by using a Map with template name as key
        const uniqueTemplates = [];
        const seen = new Set();
        for (const template of (data.templates || [])) {
          if (!seen.has(template.name)) {
            seen.add(template.name);
            uniqueTemplates.push(template);
          }
        }
        setTemplates(uniqueTemplates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/clients/${clientId}/onboarding-status`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOnboardingStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
    }
  };

  const toggleTask = (index) => {
    setSelectedTasks(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const setTaskStatus = (index, status) => {
    setTaskStatuses(prev => ({
      ...prev,
      [index]: status
    }));
    // If marked as done or skip, keep it selected but with that status
    if (status === 'skip') {
      setSelectedTasks(prev => ({
        ...prev,
        [index]: false
      }));
    } else {
      setSelectedTasks(prev => ({
        ...prev,
        [index]: true
      }));
    }
  };

  const createOnboarding = async () => {
    if (!selectedTemplate) return;

    // Filter tasks based on selection and status
    const tasksToCreate = selectedTemplate.task_templates
      .map((task, index) => ({
        ...task,
        status: taskStatuses[index] || 'todo',
        selected: selectedTasks[index]
      }))
      .filter(task => task.selected);

    try {
      setIsCreating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/clients/${clientId}/create-onboarding`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          client_type: selectedClientType,
          tasks: tasksToCreate
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOnboardingStatus({
          completed: true,
          tasks_created: data.tasks_created,
          template_used: data.template_name
        });
        onOnboardingComplete?.(data);
      }
    } catch (error) {
      console.error('Failed to create onboarding:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getFilteredTemplates = () => {
    return templates.filter(template => 
      template.client_type === selectedClientType || 
      template.client_type === 'general'
    );
  };

  const selectedTaskCount = Object.values(selectedTasks).filter(Boolean).length;
  const totalTaskCount = selectedTemplate?.task_templates?.length || 0;

  if (onboardingStatus?.completed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-green-900">Onboarding Complete</h3>
        </div>
        <div className="text-sm text-green-800">
          <p className="mb-2">
            <strong>Template:</strong> {onboardingStatus.template_used}
          </p>
          <p className="mb-2">
            <strong>Tasks Created:</strong> {onboardingStatus.tasks_created}
          </p>
          <p className="text-xs text-green-700">
            The client has been set up with tasks and project phases. You can customize their project plan in the Task Manager.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Client Onboarding</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Customizable setup
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Step 1: Client Type */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
            Select Client Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {clientTypes.map(type => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedClientType(type.id);
                  setSelectedTemplate(null);
                }}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  selectedClientType === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm text-gray-900">{type.label}</div>
                <div className="text-xs text-gray-500">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Template Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">2</span>
            Choose Template
          </h3>
          
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-4">Loading templates...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getFilteredTemplates().map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 border rounded-lg text-left transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {template.task_templates?.length || 0} tasks
                      </p>
                    </div>
                    {selectedTemplate?.id === template.id && (
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Customize Tasks */}
        {selectedTemplate && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">3</span>
              Customize Tasks
              <span className="text-xs text-gray-500 font-normal ml-2">
                ({selectedTaskCount} of {totalTaskCount} selected)
              </span>
            </h3>
            
            <div className="border rounded-lg divide-y">
              {selectedTemplate.task_templates?.map((task, index) => (
                <div 
                  key={index} 
                  className={`p-3 flex items-center gap-3 ${
                    !selectedTasks[index] ? 'bg-gray-50 opacity-60' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedTasks[index] || false}
                    onChange={() => toggleTask(index)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  
                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`text-sm ${!selectedTasks[index] ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </span>
                      {task.estimated_hours && (
                        <span className="text-xs text-gray-400">({task.estimated_hours}h)</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Status Selector */}
                  {selectedTasks[index] && (
                    <select
                      value={taskStatuses[index] || 'todo'}
                      onChange={(e) => setTaskStatus(index, e.target.value)}
                      className="text-xs border rounded px-2 py-1 bg-white"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Already Done</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  const all = {};
                  selectedTemplate.task_templates?.forEach((_, i) => all[i] = true);
                  setSelectedTasks(all);
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => {
                  const none = {};
                  selectedTemplate.task_templates?.forEach((_, i) => none[i] = false);
                  setSelectedTasks(none);
                }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {selectedTemplate 
              ? `${selectedTaskCount} tasks will be created`
              : 'Select a template to continue'
            }
          </div>
          <button
            onClick={createOnboarding}
            disabled={!selectedTemplate || selectedTaskCount === 0 || isCreating}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Create Onboarding
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
