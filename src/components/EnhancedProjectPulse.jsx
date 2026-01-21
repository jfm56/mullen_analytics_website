'use client';

export default function EnhancedProjectPulse({ client, projectStatus, tasks, nextCheckIn, dataStatus, allClients }) {
  const getProjectStatusColor = (status) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClientStatusColor = (status) => {
    switch (status) {
      case 'lead': return 'bg-purple-100 text-purple-800';
      case 'prospect': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeTasks = tasks?.filter(task => task.status !== 'done') || [];
  const completedTasks = tasks?.filter(task => task.status === 'done') || [];
  const totalTasks = tasks?.length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Calculate critical metrics
  const overdueTasks = activeTasks?.filter(task => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date();
  }) || [];

  const dueThisWeek = activeTasks?.filter(task => {
    if (!task.due_date) return false;
    const dueDate = new Date(task.due_date);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return dueDate <= weekFromNow && dueDate >= new Date();
  }) || [];

  const criticalTasks = activeTasks?.filter(task => task.priority === 'critical') || [];

  // Calculate revenue metrics from all clients
  const activeClients = allClients?.filter(c => c.client_status === 'active') || [];
  const totalContractValue = activeClients.reduce((sum, c) => sum + (c.contract_value || 0), 0);
  const atRiskClients = allClients?.filter(c => {
    if (!c.health_score) return false;
    return c.health_score < 60;
  }) || [];

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w ago`;
    } else {
      return formatDate(dateString);
    }
  };

  const handleCardClick = (cardType) => {
    switch (cardType) {
      case 'status':
        const timelineSection = document.querySelector('[data-section="project-timeline"]');
        if (timelineSection) timelineSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      
      case 'tasks':
        const tasksSection = document.querySelector('[data-section="tasks"]');
        if (tasksSection) tasksSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      
      case 'checkin':
        const checkInSection = document.getElementById('check-in-section');
        if (checkInSection) checkInSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      
      case 'data':
        const dataSection = document.querySelector('[data-section="data-documents"]');
        if (dataSection) dataSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      
      case 'analytics':
        const analyticsSection = document.querySelector('[data-section="analytics"]');
        if (analyticsSection) analyticsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      
      case 'login':
        if (client?.id) window.open(`/portal?client=${client.id}`, '_blank');
        break;
      
      default:
        break;
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Business Command Center</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Real-time overview
        </div>
      </div>
      
      {/* Top Row - Client Status & Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Client Status */}
        <div 
          onClick={() => handleCardClick('status')}
          className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 cursor-pointer hover:from-purple-100 hover:to-purple-200 transition-all group border border-purple-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Client Status</span>
            <svg className="w-4 h-4 text-purple-500 group-hover:text-purple-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getClientStatusColor(client?.client_status)}`}>
            {client?.client_status || 'prospect'}
          </span>
          <div className="mt-2 text-xs text-purple-600 group-hover:text-purple-800 transition-colors">
            {activeClients.length} active clients
          </div>
        </div>

        {/* Health Score */}
        <div 
          onClick={() => handleCardClick('status')}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 cursor-pointer hover:from-green-100 hover:to-green-200 transition-all group border border-green-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Health Score</span>
            <svg className="w-4 h-4 text-green-500 group-hover:text-green-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getHealthScoreColor(client?.health_score || 0)}`}>
            {client?.health_score || 0}/100
          </div>
          <div className="mt-2 text-xs text-green-600 group-hover:text-green-800 transition-colors">
            {atRiskClients.length} at risk
          </div>
        </div>

        {/* Contract Value */}
        <div 
          onClick={() => handleCardClick('analytics')}
          className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 cursor-pointer hover:from-blue-100 hover:to-blue-200 transition-all group border border-blue-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Contract Value</span>
            <svg className="w-4 h-4 text-blue-500 group-hover:text-blue-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-blue-900">
            {formatCurrency(client?.contract_value)}
          </div>
          <div className="mt-2 text-xs text-blue-600 group-hover:text-blue-800 transition-colors">
            {formatCurrency(totalContractValue)} total
          </div>
        </div>

        {/* Project Phase */}
        <div 
          onClick={() => handleCardClick('status')}
          className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 cursor-pointer hover:from-indigo-100 hover:to-indigo-200 transition-all group border border-indigo-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-700">Project Phase</span>
            <svg className="w-4 h-4 text-indigo-500 group-hover:text-indigo-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="text-sm font-bold text-indigo-900 capitalize">
            {client?.project_phase || 'discovery'}
          </div>
          <div className="mt-2 text-xs text-indigo-600 group-hover:text-indigo-800 transition-colors">
            {formatDate(client?.project_deadline)} deadline
          </div>
        </div>
      </div>

      {/* Bottom Row - Task Intelligence */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Project Status */}
        <div 
          onClick={() => handleCardClick('status')}
          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
          title="Click to edit project timeline"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProjectStatusColor(projectStatus)}`}>
            {projectStatus || 'Not Started'}
          </span>
          <div className="mt-2 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
            Edit →
          </div>
        </div>

        {/* 🔥 Critical Tasks */}
        <div 
          onClick={() => handleCardClick('tasks')}
          className="bg-red-50 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors group border border-red-200"
          title="Critical tasks need immediate attention"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">🔥 Critical</span>
            <svg className="w-4 h-4 text-red-500 group-hover:text-red-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-red-900">{criticalTasks.length}</div>
          <div className="text-xs text-red-600">urgent tasks</div>
          <div className="mt-2 text-xs text-red-500 group-hover:text-red-700 transition-colors">
            Review now →
          </div>
        </div>

        {/* ⏱ Overdue Tasks */}
        <div 
          onClick={() => handleCardClick('tasks')}
          className="bg-orange-50 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors group border border-orange-200"
          title="Overdue tasks need attention"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700">⏱ Overdue</span>
            <svg className="w-4 h-4 text-orange-500 group-hover:text-orange-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-orange-900">{overdueTasks.length}</div>
          <div className="text-xs text-orange-600">past due</div>
          <div className="mt-2 text-xs text-orange-500 group-hover:text-orange-700 transition-colors">
            Catch up →
          </div>
        </div>

        {/* 📅 Due This Week */}
        <div 
          onClick={() => handleCardClick('tasks')}
          className="bg-blue-50 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors group border border-blue-200"
          title="Tasks due this week"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">📅 This Week</span>
            <svg className="w-4 h-4 text-blue-500 group-hover:text-blue-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-blue-900">{dueThisWeek.length}</div>
          <div className="text-xs text-blue-600">upcoming</div>
          <div className="mt-2 text-xs text-blue-500 group-hover:text-blue-700 transition-colors">
            Plan →
          </div>
        </div>

        {/* 📞 Client Follow-ups */}
        <div 
          onClick={() => handleCardClick('checkin')}
          className="bg-purple-50 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors group border border-purple-200"
          title="Client follow-ups needed"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">📞 Follow-ups</span>
            <svg className="w-4 h-4 text-purple-500 group-hover:text-purple-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-purple-900">{atRiskClients.length}</div>
          <div className="text-xs text-purple-600">need contact</div>
          <div className="mt-2 text-xs text-purple-500 group-hover:text-purple-700 transition-colors">
            Schedule →
          </div>
        </div>

        {/* Last Login */}
        <div 
          onClick={() => handleCardClick('login')}
          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
          title="Click to open client portal"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Last Login</span>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <div className={`text-sm font-medium ${
            !client?.last_login ? 'text-gray-500' :
            new Date(client.last_login) > new Date(Date.now() - 24*60*60*1000) ? 'text-green-600' :
            new Date(client.last_login) > new Date(Date.now() - 7*24*60*60*1000) ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {formatRelativeTime(client?.last_login)}
          </div>
          <div className="text-xs text-gray-500">
            {client?.last_login ? formatDate(client.last_login) : 'Never'}
          </div>
          <div className="mt-2 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
            Portal →
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-medium">{activeTasks.length}</span> active tasks • 
            <span className="font-medium ml-1">{overdueTasks.length}</span> overdue • 
            <span className="font-medium ml-1">{criticalTasks.length}</span> critical
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleCardClick('tasks')}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              View All Tasks
            </button>
            <button
              onClick={() => handleCardClick('checkin')}
              className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Schedule Follow-ups
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
