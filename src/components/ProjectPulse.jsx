'use client';

export default function ProjectPulse({ client, projectStatus, tasks, nextCheckIn, dataStatus }) {
  const getProjectStatusColor = (status) => {
    switch (status) {
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDataStatusColor = (status) => {
    switch (status) {
      case 'Waiting': return 'bg-orange-100 text-orange-800';
      case 'Received': return 'bg-blue-100 text-blue-800';
      case 'Updated': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const activeTasks = tasks?.filter(task => task.status !== 'Completed') || [];
  const completedTasks = tasks?.filter(task => task.status === 'Completed') || [];
  const totalTasks = tasks?.length || 0;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else {
      return formatDate(dateString);
    }
  };

  const getLastLoginColor = (lastLogin) => {
    if (!lastLogin) return 'text-gray-500';
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'text-green-600';
    if (diffDays <= 7) return 'text-yellow-600';
    if (diffDays <= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const handleCardClick = (cardType) => {
    switch (cardType) {
      case 'status':
        // Scroll to project timeline section
        const timelineSection = document.querySelector('[data-section="project-timeline"]');
        if (timelineSection) {
          timelineSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      
      case 'tasks':
        // Scroll to tasks section
        const tasksSection = document.querySelector('[data-section="tasks"]');
        if (tasksSection) {
          tasksSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      
      case 'checkin':
        // Scroll to check-in section
        const checkInSection = document.getElementById('check-in-section');
        if (checkInSection) {
          checkInSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      
      case 'data':
        // Scroll to data & documents section
        const dataSection = document.querySelector('[data-section="data-documents"]');
        if (dataSection) {
          dataSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      
      case 'analytics':
        // Scroll to analytics dashboard
        const analyticsSection = document.querySelector('[data-section="analytics"]');
        if (analyticsSection) {
          analyticsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      
      case 'login':
        // Open client portal in new tab
        if (client?.id) {
          window.open(`/portal?client=${client.id}`, '_blank');
        }
        break;
      
      default:
        break;
    }
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Pulse</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Project Status Card */}
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
            Click to edit →
          </div>
        </div>

        {/* % Complete Card */}
        <div 
          onClick={() => handleCardClick('tasks')}
          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
          title="Click to view tasks"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Complete</span>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-gray-900">{completionPercentage}%</div>
          <div className="text-xs text-gray-500">{completedTasks.length}/{totalTasks} tasks</div>
          <div className="mt-2 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
            View tasks →
          </div>
        </div>

        {/* Active Tasks Card */}
        <div 
          onClick={() => handleCardClick('tasks')}
          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
          title="Click to manage tasks"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Active</span>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-lg font-bold text-gray-900">{activeTasks.length}</div>
          <div className="text-xs text-gray-500">tasks pending</div>
          <div className="mt-2 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
            Manage tasks →
          </div>
        </div>

        {/* Next Check-in Card */}
        <div 
          onClick={() => handleCardClick('checkin')}
          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
          title="Click to schedule check-in"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Next Check-in</span>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-sm font-medium text-gray-900">{formatDate(nextCheckIn?.check_in_date)}</div>
          <div className="text-xs text-gray-500">{nextCheckIn?.notes || 'No agenda set'}</div>
          <div className="mt-2 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
            Schedule →
          </div>
        </div>

        {/* Data Status Card */}
        <div 
          onClick={() => handleCardClick('data')}
          className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors group"
          title="Click to manage data & documents"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Data</span>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDataStatusColor(dataStatus)}`}>
            {dataStatus || 'Waiting'}
          </span>
          <div className="mt-2 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
            Manage files →
          </div>
        </div>

        {/* Last Login Card */}
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
          <div className={`text-sm font-medium ${getLastLoginColor(client?.last_login)}`}>
            {formatRelativeTime(client?.last_login)}
          </div>
          <div className="text-xs text-gray-500">
            {client?.last_login ? formatDate(client?.last_login) : 'Never logged in'}
          </div>
          <div className="mt-2 text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
            View portal →
          </div>
        </div>
      </div>
    </div>
  );
}
