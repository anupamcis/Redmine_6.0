import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Inbox,
  ClipboardList,
  MessageSquare,
  Users,
  Plus,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Calendar,
  TableProperties,
  Star,
  Folder,
  Search,
  X,
  Mail,
  Settings,
  BarChart3,
  Server
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getUnreadCount } from '../../api/dailyStatusAdapter';
import { setUnreadCount } from '../../store/dailyStatusSlice';
import { readJson } from '../../utils/localStorageHelpers';
import { fetchProjects, fetchProjectMemberships } from '../../api/redmineIssues';
import Modal from '../ui/Modal';
import { cachedApiCall } from '../../utils/apiCache';

const NavItem = ({ icon: Icon, label, to, badge, onClick }) => {
  const location = useLocation();
  const isActiveRoute = location.pathname === to;
  
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => {
        const active = isActive || isActiveRoute;
        return `
          h-10 px-3 rounded-xl text-sm flex items-center gap-3 transition-all duration-300 group relative overflow-hidden
          ${active
            ? 'bg-gradient-to-r from-[var(--theme-primary)]/10 via-[var(--theme-primary)]/5 to-[var(--theme-accent)]/10 text-[var(--theme-primary)] font-semibold shadow-sm' 
            : 'text-[var(--theme-text)] hover:bg-gradient-to-r hover:from-[var(--theme-surface)] hover:to-[var(--theme-surface2)]'
          }
        `;
      }}
    >
      <div className={`
        absolute inset-0 bg-gradient-to-r from-[var(--theme-primary)]/5 to-[var(--theme-accent)]/5 opacity-0 transition-opacity duration-300
        ${isActiveRoute ? 'opacity-100' : 'group-hover:opacity-100'}
      `}></div>
      <Icon 
        size={18} 
        className={`
          relative z-10 transition-all duration-300
          ${isActiveRoute
            ? 'text-[var(--theme-primary)] scale-110' 
            : 'text-[var(--theme-textSecondary)] group-hover:text-[var(--theme-primary)] group-hover:scale-110'
          }
        `}
      />
      {label && <span className="relative z-10 flex-1">{label}</span>}
      {badge && (
        <span 
          className="relative z-10 px-2 py-0.5 rounded-full text-[var(--theme-primary)] text-xs font-medium"
          style={{ background: `linear-gradient(to right, var(--theme-primary)/20, var(--theme-accent)/20)` }}
        >
          {badge}
        </span>
      )}
      {isActiveRoute && (
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full shadow-lg"
          style={{ background: `linear-gradient(to bottom, var(--theme-primary), var(--theme-primaryDark), var(--theme-accent))` }}
        ></div>
      )}
    </NavLink>
  );
};

const SubNavItem = ({ icon: Icon, label, badge, onClick, active = false }) => (
  <button 
    onClick={onClick}
    className={`group h-9 px-3 rounded-lg text-sm flex items-center gap-3 transition-all duration-300 w-full text-left relative overflow-hidden ${
      active
        ? 'bg-gradient-to-r from-[var(--theme-primary)]/15 to-[var(--theme-accent)]/10 text-[var(--theme-text)] border border-[var(--theme-primary)]/30 shadow-sm'
        : 'text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]'
    }`}
  >
    <div className={`absolute inset-0 bg-gradient-to-r from-[var(--theme-primary)]/10 to-transparent transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
    <Icon 
      size={16} 
      className={`relative z-10 transition-all duration-300 ${
        active
          ? 'text-[var(--theme-primary)] scale-110'
          : 'text-[var(--theme-textSecondary)] group-hover:text-[var(--theme-primary)] group-hover:scale-110'
      }`} 
    />
    <span className={`relative z-10 flex-1 transition-colors ${active ? 'text-[var(--theme-text)] font-medium' : 'group-hover:text-[var(--theme-text)]'}`}>
      {label}
    </span>
    {badge && (
      <span 
        className="relative z-10 px-1.5 py-0.5 rounded-full text-[var(--theme-accent)] text-xs font-medium"
        style={{ background: `linear-gradient(to right, var(--theme-accent)/20, var(--theme-primary)/20)` }}
      >
        {badge}
      </span>
    )}
  </button>
);

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between mb-3 px-1 group"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-[var(--theme-textSecondary)] group-hover:text-[var(--theme-primary)] transition-colors" />}
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--theme-textSecondary)] group-hover:text-[var(--theme-text)] transition-colors">
            {title}
          </div>
        </div>
        <ChevronDown 
          size={14} 
          className={`text-[var(--theme-textSecondary)] transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`
        space-y-1 transition-all duration-500 ease-in-out
        ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
      `}>
        {children}
      </div>
    </div>
  );
};

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const sidebarCollapsed = useSelector(state => state.ui.sidebarCollapsed);
  const [spacesOpen, setSpacesOpen] = useState(true);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const projectSelectorRef = useRef(null);
  const location = useLocation();
  const unreadCount = useSelector(state => state.dailyStatus.unreadCount);
  const projects = useSelector(state => state.projects.projects);
  const currentProject = useSelector(state => state.projects.currentProject);
  const [favoriteProjects, setFavoriteProjects] = useState([]);
  const [favoriteProjectsData, setFavoriteProjectsData] = useState([]);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const FAVORITES_KEY = 'favoriteProjects';
  
  // Load favorite projects from localStorage
  useEffect(() => {
    const favorites = readJson(FAVORITES_KEY, []);
    setFavoriteProjects(favorites);
    
    // Load favorite projects data asynchronously (non-blocking)
    const loadFavoriteProjects = async () => {
      if (favorites.length === 0) {
        setFavoriteProjectsData([]);
        return;
      }
      
      try {
        // Use cached API call to avoid repeated fetches
        const allProjects = await cachedApiCall('all_projects', () => 
          fetchProjects({ limit: 100 })
        );
        
        // Filter to only favorite projects (up to 5)
        const favoritesData = favorites
          .slice(0, 5) // Max 5 favorites
          .map(favId => {
            return allProjects.find(p => 
              (p.identifier || String(p.id)) === favId
            );
          })
          .filter(Boolean); // Remove undefined entries
        
        setFavoriteProjectsData(favoritesData);
      } catch (error) {
        console.error('[Sidebar] Error loading favorite projects:', error);
        setFavoriteProjectsData([]);
      }
    };
    
    // Load asynchronously without blocking
    loadFavoriteProjects();
  }, [projects]);
  
  // Listen for storage changes to update favorites when they change in other tabs/components
  useEffect(() => {
    const loadFavoriteProjectsData = async (favorites) => {
      if (favorites.length === 0) {
        setFavoriteProjectsData([]);
        return;
      }
      
      try {
        // Use cached API call
        const allProjects = await cachedApiCall('all_projects', () => 
          fetchProjects({ limit: 100 })
        );
        
        const favoritesData = favorites
          .slice(0, 5)
          .map(favId => {
            return allProjects.find(p => 
              (p.identifier || String(p.id)) === favId
            );
          })
          .filter(Boolean);
        
        setFavoriteProjectsData(favoritesData);
      } catch (error) {
        console.error('[Sidebar] Error loading favorite projects:', error);
        setFavoriteProjectsData([]);
      }
    };
    
    const handleStorageChange = (e) => {
      if (e.key === FAVORITES_KEY) {
        const favorites = readJson(FAVORITES_KEY, []);
        setFavoriteProjects(favorites);
        loadFavoriteProjectsData(favorites);
      }
    };
    
    const handleFavoritesUpdated = (e) => {
      const favorites = readJson(FAVORITES_KEY, []);
      setFavoriteProjects(favorites);
      loadFavoriteProjectsData(favorites);
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener('favoritesUpdated', handleFavoritesUpdated);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdated);
    };
  }, [projects]);

  // Close project selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (projectSelectorRef.current && !projectSelectorRef.current.contains(event.target)) {
        setProjectSelectorOpen(false);
      }
    };

    if (projectSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [projectSelectorOpen]);
  
  // Extract project ID from URL or use current project
  const getProjectId = () => {
    // Check if we're on a project route
    const projectMatch = location.pathname.match(/\/projects\/([^\/]+)/);
    if (projectMatch) {
      return projectMatch[1];
    }
    // Only use current project from Redux if we're actually on a project-related page
    // Don't fallback to first project or default - this causes unwanted selection
    if (currentProject && currentProject.identifier && location.pathname.includes('/projects/')) {
      return currentProject.identifier;
    }
    // Return null if not on a project route
    return null;
  };
  
  const projectId = getProjectId();
  
  // Get project name from current project or projects list
  const getProjectName = () => {
    // Check if we're on a project route
    const projectMatch = location.pathname.match(/\/projects\/([^\/]+)/);
    const isOnProjectRoute = Boolean(projectMatch);
    
    if (!isOnProjectRoute) {
      return 'Spaces';
    }
    
    // Helper to extract project name from project object
    const getProjectNameFromObject = (project) => {
      if (!project) return null;
      return project.name || project.project_name || project.title || null;
    };
    
    // First try current project from Redux
    const currentProjectName = getProjectNameFromObject(currentProject);
    if (currentProjectName) {
      return currentProjectName;
    }
    
    // Then try to find in projects list by identifier
    if (projects && Array.isArray(projects) && projectId) {
      const project = projects.find(p => 
        p.identifier === projectId || 
        p.id === projectId ||
        String(p.id) === String(projectId)
      );
      const projectName = getProjectNameFromObject(project);
      if (projectName) {
        return projectName;
      }
    }
    
    // If we're on a project route but can't find the name, use identifier (formatted)
    if (projectId) {
      return projectId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Fallback to "Spaces"
    return 'Spaces';
  };
  
  const projectName = getProjectName();

  // openMembersModal defined above – remove duplicate

  const openMembersModal = async () => {
    if (!projectId) return;
    setMembersModalOpen(true);
    setMembersLoading(true);
    setMembersError(null);
    try {
      const memberships = await fetchProjectMemberships(projectId);
      const mapped = (memberships || [])
        .map((m) => {
          if (!m.user) return null;
          const roleNames = Array.isArray(m.roles) ? m.roles.map((r) => r.name).filter(Boolean) : [];
          return {
            id: m.user.id,
            name: m.user.name,
            roles: roleNames
          };
        })
        .filter(Boolean);
      setMembers(mapped);
    } catch (err) {
      console.error('[Sidebar] Failed to load project members:', err);
      setMembersError(err.message || 'Failed to load members');
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };
  const projectBasePath = projectId ? `/projects/${projectId}` : null;
  const isProjectPage = (suffix = '') => {
    if (!projectBasePath) return false;
    const target = `${projectBasePath}${suffix}`;
    if (!suffix) {
      return location.pathname === target || location.pathname === `${target}/`;
    }
    return location.pathname.startsWith(target);
  };
  
  // Fetch unread count on mount and when project changes
  useEffect(() => {
    if (!projectId) return;
    
    const fetchUnreadCount = async () => {
      try {
        const count = await getUnreadCount(projectId);
        dispatch(setUnreadCount(count));
      } catch (error) {
        console.error('[Sidebar] Error fetching unread count:', error);
        dispatch(setUnreadCount(0));
      }
    };
    
    fetchUnreadCount();
    
    // Refresh unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [projectId, dispatch]);

  const collapsedAside = (
    <aside 
      className="w-16 shrink-0 border-r border-[var(--theme-border)] h-screen fixed left-0 top-14 overflow-y-auto theme-transition"
      style={{ backgroundColor: 'var(--theme-sidebarBg)' }}
    >
      <div className="p-2 space-y-2">
        <NavItem to="/" icon={Home} label="" />
        <NavItem 
          to={projectId ? `/projects/${projectId}/daily_statuses` : '#'} 
          icon={Inbox} 
          label="" 
          badge={unreadCount > 0 ? unreadCount.toString() : null} 
        />
        <NavItem 
          to={projectId ? `/projects/${projectId}/tasks` : '#'} 
          icon={ClipboardList} 
          label="" 
        />
        <NavItem to="#" icon={MessageSquare} label="" badge="12" />
      </div>
    </aside>
  );

  const expandedAside = (
    <aside 
      className="w-64 shrink-0 border-r border-[var(--theme-border)] h-[calc(100vh-3.5rem)] fixed left-0 top-14 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out theme-transition"
      style={{ backgroundColor: 'var(--theme-sidebarBg)' }}
    >
      <div className="p-4 space-y-6 pb-6">
        {/* Home Section */}
        <div>
          <div className="space-y-1">
            <NavItem to="/" icon={Home} label="Home" />
            <NavItem 
              to="/tasks" 
              icon={ClipboardList} 
              label="My Tasks" 
            />
            <NavItem 
              to="/services" 
              icon={Server} 
              label="Services" 
            />
          </div>
        </div>

        {/* Favorites Section */}
        <CollapsibleSection title="Favorites" icon={Star} defaultOpen={true}>
          {favoriteProjectsData.length > 0 ? (
            <div className="space-y-1">
              {favoriteProjectsData.map((project) => {
                const projectIdentifier = project.identifier || project.id;
                const projectName = project.name || project.project_name || project.title || projectIdentifier;
                const isActive = projectId === projectIdentifier;
                
                return (
                  <button
                    key={project.id || projectIdentifier}
                    onClick={() => navigate(`/projects/${projectIdentifier}`)}
                    className={`h-9 px-3 rounded-lg text-sm flex items-center gap-3 transition-all duration-300 hover:bg-[var(--theme-surface)] w-full text-left group relative overflow-hidden ${
                      isActive ? 'bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20' : ''
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <Star 
                      size={16} 
                      className={`relative z-10 transition-all duration-300 ${
                        isActive 
                          ? 'text-[var(--theme-primary)] fill-[var(--theme-primary)]' 
                          : 'text-yellow-500 fill-yellow-500 group-hover:text-orange-500 group-hover:scale-110'
                      }`} 
                    />
                    <span className={`relative z-10 flex-1 truncate ${
                      isActive 
                        ? 'text-[var(--theme-primary)] font-medium' 
                        : 'text-[var(--theme-text)] group-hover:text-[var(--theme-text)]'
                    }`}>
                      {projectName}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <button className="h-9 px-3 rounded-lg text-sm flex items-center gap-3 transition-all duration-300 hover:bg-[var(--theme-surface)] w-full text-left group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Star size={16} className="relative z-10 text-yellow-500 group-hover:text-orange-500 group-hover:scale-110 transition-all duration-300" />
              <span className="relative z-10 flex-1 text-[var(--theme-textSecondary)] group-hover:text-[var(--theme-text)]">No favorite projects</span>
            </button>
          )}
        </CollapsibleSection>

        {/* Project Workspaces Section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--theme-textSecondary)]">Project Workspaces</div>
            <button className="h-6 w-6 grid place-items-center rounded-md hover:bg-[var(--theme-surface)] text-[var(--theme-primary)] transition-all duration-200 hover:scale-110">
              <Plus size={14} />
            </button>
          </div>
          
          <div className="space-y-2">
            {projectName && projectName !== 'Spaces' && (
              <div 
                className={`rounded-xl p-3 border shadow-sm hover:shadow-md transition-all duration-300 ${
                  location.pathname.includes('/projects/') ? 'bg-gradient-to-r from-[var(--theme-primary)]/10 to-[var(--theme-accent)]/10 border-[var(--theme-primary)]/20' : ''
                }`}
                style={{ 
                  borderColor: location.pathname.includes('/projects/') ? 'var(--theme-primary)/20' : 'var(--theme-border)'
                }}
              >
                <button
                  onClick={() => setSpacesOpen(!spacesOpen)}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown 
                      size={16} 
                      className="text-[var(--theme-primary)] transition-transform duration-300"
                      style={{ transform: spacesOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    />
                    <span className="text-sm font-semibold text-[var(--theme-text)] truncate max-w-[180px]">{projectName}</span>
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  </div>
                </button>
                
                <div className={`
                  pl-5 space-y-1 transition-all duration-500 ease-in-out
                  ${spacesOpen ? 'opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
                `}>
                  <SubNavItem 
                    icon={LayoutGrid} 
                    label="Overview" 
                    active={isProjectPage('')}
                    onClick={() => projectId && navigate(`/projects/${projectId}`)}
                  />
                  <SubNavItem 
                    icon={Inbox} 
                    label="Inbox" 
                    badge={unreadCount > 0 ? unreadCount.toString() : null}
                    active={isProjectPage('/daily_statuses')}
                    onClick={() => projectId && navigate(`/projects/${projectId}/daily_statuses`)}
                  />
                  <SubNavItem 
                    icon={Mail} 
                    label="Untracked Mail" 
                    active={isProjectPage('/untracked_mails')}
                    onClick={() => projectId && navigate(`/projects/${projectId}/untracked_mails`)}
                  />
                  <SubNavItem 
                    icon={ClipboardList} 
                    label="Tasks" 
                    active={isProjectPage('/tasks')}
                    onClick={() => projectId && navigate(`/projects/${projectId}/tasks`)}
                  />
                  <SubNavItem 
                    icon={TableProperties} 
                    label="Kanban" 
                    active={isProjectPage('/kanban')}
                    onClick={() => projectId && navigate(`/projects/${projectId}/kanban`)}
                  />
                  <SubNavItem 
                    icon={TableProperties} 
                    label="Gantt Chart" 
                    active={isProjectPage('/gantt')}
                    onClick={() => projectId && navigate(`/projects/${projectId}/gantt`)}
                  />
                  <SubNavItem 
                    icon={Calendar} 
                    label="Calendar" 
                    active={isProjectPage('/calendar')}
                    onClick={() => projectId && navigate(`/projects/${projectId}/calendar`)}
                  />
                  <SubNavItem
                    icon={Folder}
                    label="Documents"
                    active={isProjectPage('/dmsf')}
                    onClick={() => projectId && navigate(`/projects/${projectId}/dmsf`)}
                  />
                  <SubNavItem
                    icon={Users}
                    label="Members"
                    active={isProjectPage('/members')}
                    onClick={() => projectId && navigate(`/projects/${projectId}/members`)}
                  />
                  <SubNavItem 
                    icon={BarChart3} 
                    label="Reports" 
                    active={isProjectPage('/reports')}
                    onClick={() => {
                      const pid = getProjectId();
                      const pname = getProjectName();
                      if (pid || pname) navigate(`/projects/${pid || pname}/reports`);
                    }}
                  />
                  <SubNavItem
                    icon={Settings}
                    label="Settings"
                    active={isProjectPage('/settings')}
                    onClick={() => projectId && navigate(`/projects/${projectId}/settings`)}
                  />
                </div>
              </div>
            )}
            
            {/* Select Project Searchable Dropdown */}
            <div className="relative" ref={projectSelectorRef}>
              <div 
                className="h-9 px-3 rounded-lg text-sm flex items-center gap-2 transition-all duration-300 border border-dashed border-[var(--theme-border)] hover:border-[var(--theme-primary)]/50 relative overflow-hidden bg-[var(--theme-cardBg)]"
                onClick={() => setProjectSelectorOpen(true)}
              >
                <Search size={14} className="text-[var(--theme-textSecondary)] flex-shrink-0" />
                <input
                  type="text"
                  value={projectSearchQuery}
                  onChange={(e) => {
                    setProjectSearchQuery(e.target.value);
                    setProjectSelectorOpen(true);
                  }}
                  onFocus={() => setProjectSelectorOpen(true)}
                  placeholder="Select any project"
                  className="flex-1 bg-transparent border-0 outline-0 text-[var(--theme-text)] placeholder:text-[var(--theme-textSecondary)] text-sm"
                />
                {projectSearchQuery && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectSearchQuery('');
                    }}
                    className="p-1 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)] flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {projectSelectorOpen && projects && projects.length > 0 && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-lg z-20">
                  <div className="p-2 space-y-1">
                    {projects
                      .filter((project) => {
                        // Filter to only active projects (status = 1)
                        if (project.status !== 1 && project.status !== '1') {
                          return false;
                        }
                        // Filter by search query
                        if (projectSearchQuery.trim()) {
                          const query = projectSearchQuery.toLowerCase();
                          const projectName = (project.name || project.project_name || project.title || project.identifier || '').toLowerCase();
                          const projectIdentifier = (project.identifier || project.id || '').toLowerCase();
                          return projectName.includes(query) || projectIdentifier.includes(query);
                        }
                        return true;
                      })
                      .map((project) => {
                        const projectIdentifier = project.identifier || project.id;
                        const projectName = project.name || project.project_name || project.title || projectIdentifier;
                        const isActive = projectId === projectIdentifier;
                        
                        return (
                          <button
                            key={project.id || projectIdentifier}
                            onClick={() => {
                              navigate(`/projects/${projectIdentifier}`);
                              setProjectSelectorOpen(false);
                              setProjectSearchQuery('');
                            }}
                            className={`w-full h-8 px-3 rounded-lg text-sm flex items-center gap-2 transition-all duration-300 hover:bg-[var(--theme-surface)] text-left ${
                              isActive ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] font-medium' : 'text-[var(--theme-text)]'
                            }`}
                          >
                            <Folder size={14} />
                            <span className="flex-1 truncate">{projectName}</span>
                          </button>
                        );
                      })}
                    {projects.filter((project) => {
                      if (project.status !== 1 && project.status !== '1') return false;
                      if (projectSearchQuery.trim()) {
                        const query = projectSearchQuery.toLowerCase();
                        const projectName = (project.name || project.project_name || project.title || project.identifier || '').toLowerCase();
                        const projectIdentifier = (project.identifier || project.id || '').toLowerCase();
                        return projectName.includes(query) || projectIdentifier.includes(query);
                      }
                      return true;
                    }).length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-[var(--theme-textSecondary)]">
                        {projectSearchQuery ? 'No projects found' : 'No active projects'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {sidebarCollapsed ? collapsedAside : expandedAside}

      <Modal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        title="Project Members"
      >
        {membersLoading ? (
          <div className="py-6 text-center text-[var(--theme-textSecondary)] text-sm">
            Loading members…
          </div>
        ) : membersError ? (
          <div className="py-6 text-center text-red-500 text-sm">{membersError}</div>
        ) : members.length === 0 ? (
          <div className="py-6 text-center text-[var(--theme-textSecondary)] text-sm">
            No members found for this project.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-auto custom-scroll text-sm">
            {members.map((member) => {
              const roleLabel =
                Array.isArray(member.roles) && member.roles.length
                  ? member.roles.join(', ')
                  : 'Member';
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/60 px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-[var(--theme-text)]">{member.name}</div>
                    <div className="text-xs text-[var(--theme-textSecondary)]">
                      {roleLabel}
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Chat feature coming soon"
                    onClick={() => alert('Chat feature coming soon.')}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--theme-border)] px-3 py-1 text-xs text-[var(--theme-textSecondary)] cursor-not-allowed"
                  >
                    <MessageSquare size={14} />
                    <span>Chat (soon)</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
}
