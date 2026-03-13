import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, HelpCircle, ChevronDown, Menu, Check } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { toggleSidebar } from '../../store/uiSlice';
import { logout } from '../../store/authSlice';
import { clearAuth, getProjects } from '../../api/redmineAdapter';
import { fetchUnreadCount } from '../../store/notificationSlice';
import ThemeSwitcher from './ThemeSwitcher';
import { cachedApiCall } from '../../utils/apiCache';

const RECENTLY_USED_PROJECTS_KEY = 'recentlyUsedProjects';
const MAX_RECENT_PROJECTS = 5;

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarCollapsed = useSelector(state => state.ui.sidebarCollapsed);
  const user = useSelector(state => state.auth.user);
  const unreadCount = useSelector(state => state.notifications?.unreadCount || 0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [allProjects, setAllProjects] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const userMenuRef = useRef(null);
  const projectMenuRef = useRef(null);

  // Fetch unread count on mount and periodically
  // Only fetch if notifications slice exists (graceful degradation)
  useEffect(() => {
    // Check if notification slice is available before fetching
    const hasNotificationSlice = typeof dispatch === 'function';
    if (hasNotificationSlice) {
      dispatch(fetchUnreadCount());
      // Poll less frequently to reduce failed requests
      const interval = setInterval(() => {
        dispatch(fetchUnreadCount());
      }, 120000); // Poll every 2 minutes instead of 30 seconds
      return () => clearInterval(interval);
    }
  }, [dispatch]);

  const rawFirstName = (user?.firstname || user?.name?.split(' ')[0] || user?.login || 'Member').trim();
  const rawLastName = (user?.lastname || user?.name?.split(' ')[1] || '').trim();
  const displayName = rawFirstName
    ? `${rawFirstName} ${rawLastName ? rawLastName.charAt(0).toUpperCase() : ''}`.trim()
    : 'Member';
  const avatarInitial = rawFirstName ? rawFirstName.charAt(0).toUpperCase() : 'M';

  // Get current project from URL
  useEffect(() => {
    const pathMatch = location.pathname.match(/\/projects\/([^\/]+)/);
    if (pathMatch) {
      const projectIdentifier = pathMatch[1];
      // Find project in allProjects or recentProjects
      const found = allProjects.find(p => p.identifier === projectIdentifier) ||
                   recentProjects.find(p => p.identifier === projectIdentifier);
      if (found) {
        setCurrentProject(found);
        // Add to recently used
        addToRecentlyUsed(found);
      }
    } else {
      setCurrentProject(null);
    }
  }, [location.pathname, allProjects, recentProjects]);

  // Load projects and recently used
  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Use cached API call to avoid repeated fetches
        const projects = await cachedApiCall('user_projects', () => 
          getProjects({ membershipOnly: true, skipIssueCounts: true, skipMemberships: true })
        );
        setAllProjects(projects || []);
      } catch (err) {
        console.warn('[Header] Failed to load projects:', err);
      }
    };
    
    const loadRecentlyUsed = () => {
      try {
        const stored = localStorage.getItem(RECENTLY_USED_PROJECTS_KEY);
        if (stored) {
          const recent = JSON.parse(stored);
          setRecentProjects(recent);
        }
      } catch (err) {
        console.warn('[Header] Failed to load recently used projects:', err);
      }
    };

    if (user) {
      loadProjects();
      loadRecentlyUsed();
    }
  }, [user]);

  const addToRecentlyUsed = (project) => {
    try {
      const stored = localStorage.getItem(RECENTLY_USED_PROJECTS_KEY);
      let recent = stored ? JSON.parse(stored) : [];
      // Remove if already exists
      recent = recent.filter(p => p.identifier !== project.identifier);
      // Add to front
      recent.unshift({
        id: project.id,
        name: project.name,
        identifier: project.identifier
      });
      // Keep only MAX_RECENT_PROJECTS
      recent = recent.slice(0, MAX_RECENT_PROJECTS);
      localStorage.setItem(RECENTLY_USED_PROJECTS_KEY, JSON.stringify(recent));
      setRecentProjects(recent);
    } catch (err) {
      console.warn('[Header] Failed to save recently used project:', err);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target)) {
        setShowProjectMenu(false);
        setProjectSearch('');
      }
    }
    if (showUserMenu || showProjectMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu, showProjectMenu]);

  const handleProjectSelect = (project) => {
    setShowProjectMenu(false);
    setProjectSearch('');
    addToRecentlyUsed(project);
    navigate(`/projects/${project.identifier}`);
  };

  const filteredProjects = allProjects.filter(p => 
    !projectSearch || 
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.identifier.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const filteredRecent = recentProjects.filter(p => 
    !projectSearch || 
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.identifier.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const handleProfileAction = (action) => {
    setShowUserMenu(false);
    switch (action) {
      case 'profile':
        navigate('/profile');
        break;
      default:
        break;
    }
  };

  const handleSignOut = () => {
    setShowUserMenu(false);
    clearAuth();
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <header 
      className="h-14 border-b border-[var(--theme-border)] bg-[var(--theme-headerBg)]/95 backdrop-blur-md sticky top-0 z-50 shadow-sm theme-transition"
      style={{ backgroundColor: 'var(--theme-headerBg)' }}
    >
      <div className="h-full px-4 flex items-center gap-3">
        {/* Menu Toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="h-9 w-9 grid place-items-center rounded-lg hover:bg-[var(--theme-surface)] transition-all duration-200 hover:scale-105 text-[var(--theme-textSecondary)]"
        >
          <Menu size={20} />
        </button>

        {/* Project selector dropdown - Redmine style */}
        <div className="relative" ref={projectMenuRef}>
          <button 
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="h-9 px-3 rounded-lg border border-[var(--theme-border)] text-sm font-medium hover:bg-[var(--theme-surface)] transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md group"
          >
            <span 
              className="w-7 h-7 rounded-lg text-white grid place-items-center text-xs font-bold shadow-sm group-hover:scale-110 transition-transform"
              style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-accent))` }}
            >
              {currentProject ? currentProject.name.charAt(0).toUpperCase() : 'P'}
            </span>
            <span className="text-[var(--theme-text)] max-w-[200px] truncate">
              {currentProject ? currentProject.name : 'Select Project'}
            </span>
            <ChevronDown size={16} className="text-[var(--theme-textSecondary)] group-hover:text-[var(--theme-text)] transition-colors" />
          </button>
          
          {showProjectMenu && (
            <div className="absolute left-0 top-12 mt-2 w-80 bg-[var(--theme-cardBg)] rounded-xl shadow-xl border border-[var(--theme-border)] z-50 max-h-[500px] flex flex-col">
              {/* Search input */}
              <div className="p-3 border-b border-[var(--theme-border)]">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)]" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search projects..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-sm text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    autoFocus
                  />
                </div>
              </div>

              {/* Scrollable content */}
              <div className="overflow-y-auto flex-1">
                {/* Recently used */}
                {filteredRecent.length > 0 && (
                  <div className="p-2">
                    <div className="px-3 py-1.5 text-xs font-semibold text-[var(--theme-textSecondary)] uppercase tracking-wide">
                      Recently used
                    </div>
                    {filteredRecent.map((project) => (
                      <button
                        key={project.identifier}
                        onClick={() => handleProjectSelect(project)}
                        className={`w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-[var(--theme-surface)] transition-colors flex items-center gap-2 ${
                          currentProject?.identifier === project.identifier
                            ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]'
                            : 'text-[var(--theme-text)]'
                        }`}
                      >
                        {currentProject?.identifier === project.identifier && (
                          <Check size={14} className="text-[var(--theme-primary)]" />
                        )}
                        <span className={currentProject?.identifier === project.identifier ? 'font-medium' : ''}>
                          {project.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* All Projects */}
                <div className="p-2 border-t border-[var(--theme-border)]">
                  <div className="px-3 py-1.5 text-xs font-semibold text-[var(--theme-textSecondary)] uppercase tracking-wide">
                    All Projects
                  </div>
                  {filteredProjects.length > 0 ? (
                    filteredProjects
                      .filter(project => !recentProjects.some(p => p.identifier === project.identifier))
                      .map((project) => {
                        const isCurrent = currentProject?.identifier === project.identifier;
                        
                        return (
                          <button
                            key={project.identifier}
                            onClick={() => handleProjectSelect(project)}
                            className={`w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-[var(--theme-surface)] transition-colors flex items-center gap-2 ${
                              isCurrent
                                ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]'
                                : 'text-[var(--theme-text)]'
                            }`}
                          >
                            {isCurrent && (
                              <Check size={14} className="text-[var(--theme-primary)]" />
                            )}
                            <span className={isCurrent ? 'font-medium' : ''}>
                              {project.name}
                            </span>
                          </button>
                        );
                      })
                  ) : (
                    <div className="px-3 py-2 text-sm text-[var(--theme-textSecondary)]">
                      {projectSearch ? 'No projects found' : 'No projects available'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Search with focus effects */}
        <div className="flex-1 max-w-2xl">
          <div className={`
            h-10 rounded-xl border transition-all duration-300 px-4 flex items-center gap-3
            ${searchFocused 
              ? 'border-[var(--theme-primary)]/50 bg-[var(--theme-cardBg)] shadow-lg shadow-[var(--theme-primary)]/10 ring-2 ring-[var(--theme-primary)]/20' 
              : 'border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-cardBg)] hover:border-[var(--theme-border)] hover:shadow-md'
            }
          `}>
            <Search 
              size={18} 
              className={`transition-colors duration-200 ${searchFocused ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-textSecondary)]'}`} 
            />
            <input
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  navigate(`/search?q=${encodeURIComponent(e.target.value.trim())}`);
                  setSearchFocused(false);
                }
              }}
              className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--theme-textSecondary)] text-[var(--theme-text)]"
              placeholder="Search"
            />
          </div>
        </div>

        {/* Action buttons with hover effects */}
        <div className="flex items-center gap-1 ml-auto">
          <button 
            onClick={() => navigate('/notifications')}
            className="relative h-9 w-9 grid place-items-center rounded-lg hover:bg-[var(--theme-surface)] transition-all duration-200 hover:scale-110 text-[var(--theme-textSecondary)] group"
          >
            <Bell size={18} className="group-hover:text-[var(--theme-primary)] transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-[var(--theme-headerBg)]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-[var(--theme-surface)] transition-all duration-200 hover:scale-110 text-[var(--theme-textSecondary)] group">
            <HelpCircle size={18} className="group-hover:text-[var(--theme-primary)] transition-colors" />
          </button>

          <ThemeSwitcher />

          {/* User menu with gradient avatar */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="h-9 px-2 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-surface)] transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md group"
            >
              <span 
                className="w-7 h-7 rounded-full text-white grid place-items-center text-xs font-semibold shadow-sm group-hover:scale-110 transition-transform ring-2 ring-[var(--theme-headerBg)]"
                style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-primaryDark), var(--theme-accent))` }}
              >
                {avatarInitial}
              </span>
              <ChevronDown size={14} className="text-[var(--theme-textSecondary)] group-hover:text-[var(--theme-text)] transition-colors" />
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 top-12 mt-2 w-56 bg-[var(--theme-cardBg)] rounded-xl shadow-xl border border-[var(--theme-border)] py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-[var(--theme-border)]">
                  <div className="font-semibold text-sm text-[var(--theme-text)]">{displayName}</div>
                </div>
                <div className="py-1">
                  <button onClick={() => handleProfileAction('profile')} className="w-full px-4 py-2 text-left text-sm text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors">Profile</button>
                </div>
                <div className="border-t border-[var(--theme-border)] pt-1">
                  <button onClick={handleSignOut} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Sign out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
