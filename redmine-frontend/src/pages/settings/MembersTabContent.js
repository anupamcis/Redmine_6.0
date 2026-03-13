import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getProjectSettings,
  createProjectMember,
  updateProjectMember,
  deleteProjectMember,
  changeProjectManager,
  changeClientPOC,
  autocompleteUsers
} from '../../api/projectSettingsAdapter';
import { Plus, Edit2, Trash2, UserPlus, X, Save } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function MembersTabContent({ projectId }) {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const restoring = useSelector(state => state.auth.restoring);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [memberSuffixes, setMemberSuffixes] = useState([]);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({ role_ids: [], master_department_id: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ user_ids: [], role_ids: [], master_department_id: '' });
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState(null); // 'user' or 'client'
  const [clientForm, setClientForm] = useState({
    login: '',
    firstname: '',
    lastname: '',
    mail: '',
    language: 'en',
    company_id: '',
    password: '',
    password_confirmation: '',
    generate_password: false,
    must_change_passwd: false,
    mail_notification: 'only_my_events',
    time_zone: '',
    client_role_ids: []
  });
  const [languages, setLanguages] = useState([]);
  const [timeZones, setTimeZones] = useState([]); // Array of {value, label} objects
  const [clientRoles, setClientRoles] = useState([]);
  const [projectCompany, setProjectCompany] = useState(null);
  const [creatingClient, setCreatingClient] = useState(false);

  useEffect(() => {
    if (!projectId || !isAuthenticated || restoring) return;
    loadMembers();
    // Load client form data (languages, timezones) when component mounts
    loadClientFormData();
  }, [projectId, isAuthenticated, restoring]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjectSettings(projectId, 'members');
      setMembers(data.members || []);
      
      // Load roles and member suffixes if available in the response
      if (data.roles) {
        setRoles(data.roles);
        // Update client roles when roles are loaded
        setClientRoles(data.roles.filter(r => r.name.startsWith('Client')));
      }
      if (data.member_suffixes) setMemberSuffixes(data.member_suffixes);
      
      // Load project company from response
      if (data.project_company) {
        setProjectCompany(data.project_company);
        setClientForm(prev => ({ ...prev, company_id: data.project_company.id }));
      } else if (!projectCompany) {
        // Fallback: try to load from project API
        loadClientFormData();
      }
    } catch (err) {
      console.error('[MembersTabContent] Error loading members:', err);
      setError(err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePM = async (memberId) => {
    if (!window.confirm('Are you sure, do you want to update project manager?')) return;
    try {
      await changeProjectManager(projectId, memberId);
      await loadMembers();
    } catch (err) {
      console.error('[MembersTabContent] Error changing PM:', err);
      setError(err.message || 'Failed to change project manager');
    }
  };

  const handleChangeClientPOC = async (memberId) => {
    if (!window.confirm('Are you sure, do you want to update client POC?')) return;
    try {
      await changeClientPOC(projectId, memberId);
      await loadMembers();
    } catch (err) {
      console.error('[MembersTabContent] Error changing client POC:', err);
      setError(err.message || 'Failed to change client POC');
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member.id);
    setEditForm({
      role_ids: member.roles.map(r => r.id),
      master_department_id: member.master_department_id && member.master_department_id > 0 
        ? member.master_department_id.toString() 
        : (member.member_suffix_name ? 
            (memberSuffixes.find(s => s.name === member.member_suffix_name)?.id || '') : '')
    });
  };

  const handleSaveEdit = async () => {
    try {
      await updateProjectMember(editingMember, editForm);
      setEditingMember(null);
      setEditForm({ role_ids: [], master_department_id: '' });
      await loadMembers();
    } catch (err) {
      console.error('[MembersTabContent] Error updating member:', err);
      setError(err.message || 'Failed to update member');
    }
  };

  const handleDelete = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await deleteProjectMember(memberId);
      await loadMembers();
    } catch (err) {
      console.error('[MembersTabContent] Error deleting member:', err);
      setError(err.message || 'Failed to delete member');
    }
  };

  const handleAddMember = async () => {
    if (addForm.user_ids.length === 0 || addForm.role_ids.length === 0) {
      setError('Please select at least one user/client and at least one role');
      return;
    }
    try {
      // Create members for each selected user
      for (const userId of addForm.user_ids) {
        await createProjectMember(projectId, {
          user_id: userId,
          role_ids: addForm.role_ids,
          master_department_id: addForm.master_department_id || null
        });
      }
      setShowAddModal(false);
      setAddForm({ user_ids: [], role_ids: [], master_department_id: '' });
      setUserSearchQuery('');
      setUsers([]);
      setClients([]);
      setSelectedUserType(null);
      await loadMembers();
    } catch (err) {
      console.error('[MembersTabContent] Error adding member:', err);
      setError(err.message || 'Failed to add member');
    }
  };

  const handleUserSearch = async (query) => {
    setUserSearchQuery(query);
    if (query.length < 2) {
      setUsers([]);
      setClients([]);
      setSelectedUserType(null);
      return;
    }
    try {
      const results = await autocompleteUsers(projectId, query);
      setUsers(results.users || []);
      setClients(results.clients || []);
    } catch (err) {
      console.error('[MembersTabContent] Error searching users:', err);
      setUsers([]);
      setClients([]);
    }
  };

  const handleUserToggle = (userId, isClient = false) => {
    setAddForm(prev => {
      const currentUserIds = prev.user_ids;
      const isCurrentlySelected = currentUserIds.includes(userId);
      
      // If unselecting, just remove it
      if (isCurrentlySelected) {
        const newUserIds = currentUserIds.filter(id => id !== userId);
        const hasUsers = users.some(u => newUserIds.includes(u.id));
        const hasClients = clients.some(c => newUserIds.includes(c.id));
        
        if (hasUsers && hasClients) {
          setSelectedUserType(null);
        } else if (hasUsers) {
          setSelectedUserType('user');
        } else if (hasClients) {
          setSelectedUserType('client');
        } else {
          setSelectedUserType(null);
        }
        
        return {
          ...prev,
          user_ids: newUserIds,
          role_ids: []
        };
      }
      
      // If selecting, check if we're trying to mix users and clients
      const hasUsers = users.some(u => currentUserIds.includes(u.id));
      const hasClients = clients.some(c => currentUserIds.includes(c.id));
      
      // Prevent mixing users and clients
      if (isClient && hasUsers) {
        alert('Cannot mix Users and Clients. Please deselect Users first.');
        return prev;
      }
      if (!isClient && hasClients) {
        alert('Cannot mix Users and Clients. Please deselect Clients first.');
        return prev;
      }
      
      // Add the new selection
      const newUserIds = [...currentUserIds, userId];
      
      // Update selected type
      if (isClient) {
        setSelectedUserType('client');
      } else {
        setSelectedUserType('user');
      }
      
      // Clear roles when selection changes
      return {
        ...prev,
        user_ids: newUserIds,
        role_ids: []
      };
    });
  };

  // Get filtered roles based on selection
  const getFilteredRoles = () => {
    if (!selectedUserType) return roles;
    
    if (selectedUserType === 'client') {
      // Show only roles starting with "Client"
      return roles.filter(r => r.name.startsWith('Client'));
    } else {
      // Show roles that don't start with "Client" and exclude specific management roles
      const excludedRoles = [
        'CIS - DM',
        'CIS - PM',
        'CIS - TL',
        'User Management',
        'CIS - Management',
        'CIS - IT Manager',
        'CIS CXOs'
      ];
      return roles.filter(r => 
        !r.name.startsWith('Client') && 
        !excludedRoles.includes(r.name)
      );
    }
  };

  // Get filtered roles for editing based on member type
  const getFilteredRolesForEdit = (member) => {
    if (!member) {
      // Default: show non-client roles excluding management roles
      const excludedRoles = [
        'CIS - DM',
        'CIS - PM',
        'CIS - TL',
        'User Management',
        'CIS - Management',
        'CIS - IT Manager',
        'CIS CXOs'
      ];
      return roles.filter(r => 
        !r.name.startsWith('Client') && 
        !excludedRoles.includes(r.name)
      );
    }

    // Check if member is a client (has any role starting with "Client")
    const isClient = member.roles && member.roles.some(r => r.name && r.name.startsWith('Client'));

    if (isClient) {
      // Show only client roles
      return roles.filter(r => r.name.startsWith('Client'));
    } else {
      // Show non-client roles excluding management roles
      const excludedRoles = [
        'CIS - DM',
        'CIS - PM',
        'CIS - TL',
        'User Management',
        'CIS - Management',
        'CIS - IT Manager',
        'CIS CXOs'
      ];
      return roles.filter(r => 
        !r.name.startsWith('Client') && 
        !excludedRoles.includes(r.name)
      );
    }
  };

  const loadClientFormData = async () => {
    try {
      // Load project company info
      const { getAuthHeader } = await import('../../api/redmineAdapter');
      const authHeaders = getAuthHeader();
      
      const projectRes = await fetch(`/projects/${projectId}.json`, {
        headers: {
          'Accept': 'application/json',
          ...authHeaders
        },
        credentials: 'include'
      });
      if (projectRes.ok) {
        const projData = await projectRes.json();
        if (projData.project) {
          // Try different possible company field names
          const company = projData.project.company;
          
          if (company) {
            // If company is an object with id and name
            if (typeof company === 'object' && company.id) {
              setProjectCompany(company);
              setClientForm(prev => ({ ...prev, company_id: company.id }));
            } 
            // If company is just an ID, fetch company details
            else if (typeof company === 'number' || typeof company === 'string') {
              const companyRes = await fetch(`/companies/${company}.json`, {
                headers: {
                  'Accept': 'application/json',
                  ...authHeaders
                },
                credentials: 'include'
              });
              if (companyRes.ok) {
                const companyData = await companyRes.json();
                if (companyData.company) {
                  setProjectCompany(companyData.company);
                  setClientForm(prev => ({ ...prev, company_id: companyData.company.id }));
                }
              }
            }
          }
        }
      }
      
      // Load languages and time zones from Redmine API
      const userNewRes = await fetch('/users/new.json', {
        headers: {
          'Accept': 'application/json',
          ...authHeaders
        },
        credentials: 'include'
      });
      
      if (userNewRes.ok) {
        const data = await userNewRes.json();
        console.log('[MembersTabContent] Languages and timezones data:', data);
        if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
          console.log('[MembersTabContent] Setting languages:', data.languages.length, 'items');
          setLanguages(data.languages);
        } else {
          console.warn('[MembersTabContent] No languages in response or empty array');
        }
        if (data.time_zones && Array.isArray(data.time_zones) && data.time_zones.length > 0) {
          console.log('[MembersTabContent] Setting timezones:', data.time_zones.length, 'items');
          // Time zones come as array of {value, label} objects
          // Store them as objects so we can display label but use value
          setTimeZones(data.time_zones);
        } else {
          console.warn('[MembersTabContent] No timezones in response or empty array');
        }
      } else {
        const errorText = await userNewRes.text().catch(() => '');
        console.error('[MembersTabContent] Failed to load languages/timezones:', userNewRes.status, userNewRes.statusText, errorText);
        // Fallback to default languages if API fails
        setLanguages([
          { value: 'en', label: 'English' },
          { value: 'es', label: 'Spanish' },
          { value: 'fr', label: 'French' },
          { value: 'de', label: 'German' },
          { value: 'it', label: 'Italian' },
          { value: 'pt', label: 'Portuguese' },
          { value: 'ru', label: 'Russian' },
          { value: 'ja', label: 'Japanese' },
          { value: 'zh', label: 'Chinese' }
        ]);
        // Fallback time zones (as objects with value and label)
        setTimeZones([
          { value: 'UTC', label: 'UTC' },
          { value: 'America/New_York', label: 'America/New_York' },
          { value: 'America/Chicago', label: 'America/Chicago' },
          { value: 'America/Denver', label: 'America/Denver' },
          { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
          { value: 'Europe/London', label: 'Europe/London' },
          { value: 'Europe/Paris', label: 'Europe/Paris' },
          { value: 'Europe/Berlin', label: 'Europe/Berlin' },
          { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
          { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
          { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
          { value: 'Australia/Sydney', label: 'Australia/Sydney' },
          { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo' },
          { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg' }
        ]);
      }
    } catch (err) {
      console.error('[MembersTabContent] Error loading client form data:', err);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    
    if (!clientForm.generate_password && (!clientForm.password || !clientForm.password_confirmation)) {
      setError('Password and confirmation are required');
      return;
    }
    
    if (!clientForm.generate_password && clientForm.password !== clientForm.password_confirmation) {
      setError('Password and confirmation do not match');
      return;
    }
    
    if (!clientForm.generate_password && clientForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setCreatingClient(true);
      setError(null);
      
      const { getAuthHeader } = await import('../../api/redmineAdapter');
      const authHeaders = getAuthHeader();
      
      const userData = {
        user: {
          login: clientForm.login,
          firstname: clientForm.firstname,
          lastname: clientForm.lastname,
          mail: clientForm.mail,
          language: clientForm.language,
          company_id: clientForm.company_id,
          password: clientForm.generate_password ? '' : clientForm.password,
          password_confirmation: clientForm.generate_password ? '' : clientForm.password_confirmation,
          generate_password: clientForm.generate_password,
          must_change_passwd: clientForm.must_change_passwd,
          mail_notification: clientForm.mail_notification,
          time_zone: clientForm.time_zone || null
        }
      };
      
      const res = await fetch('/users.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create client: ${text || res.statusText}`);
      }
      
      const newUser = await res.json();
      
      // If client roles are selected, add the user as a member with those roles
      if (clientForm.client_role_ids.length > 0 && newUser.user && newUser.user.id) {
        await createProjectMember(projectId, {
          user_id: newUser.user.id,
          role_ids: clientForm.client_role_ids
        });
      }
      
      setShowAddClientModal(false);
      setClientForm({
        login: '',
        firstname: '',
        lastname: '',
        mail: '',
        language: 'en',
        company_id: projectCompany?.id || '',
        password: '',
        password_confirmation: '',
        generate_password: false,
        must_change_passwd: false,
        mail_notification: 'only_my_events',
        time_zone: '',
        client_role_ids: []
      });
      
      await loadMembers();
    } catch (err) {
      console.error('[MembersTabContent] Error creating client:', err);
      setError(err.message || 'Failed to create client');
    } finally {
      setCreatingClient(false);
    }
  };

  if (!isAuthenticated || restoring) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-[var(--theme-textSecondary)] text-sm">Loading...</div>
      </div>
    );
  }

  // Find current PM
  const currentPM = members.find(m => m.is_project_manager);
  const currentPOC = members.find(m => m.is_client_poc);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[var(--theme-text)]">Members</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddClientModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            <UserPlus size={16} />
            Add New Client
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            New member
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-500 flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)] mb-3" />
          <div className="text-[var(--theme-textSecondary)] text-sm">Loading members…</div>
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-[var(--theme-textSecondary)] text-sm">
          No members found
        </div>
      ) : (
        <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider w-24">Change PM</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">User / Group</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Roles</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider">Member Suffix Name</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider w-24">Client POC</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--theme-textSecondary)] text-xs uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border)]">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-[var(--theme-surface)] transition-colors">
                    {/* Change PM */}
                    <td className="px-4 py-2">
                      {member.can_change_pm ? (
                        <input
                          type="radio"
                          name="project_manager"
                          checked={member.is_project_manager}
                          onChange={() => handleChangePM(member.id)}
                          className="cursor-pointer"
                        />
                      ) : (
                        <span className="text-[var(--theme-textSecondary)]">—</span>
                      )}
                    </td>

                    {/* User / Group */}
                    <td className="px-4 py-2 text-[var(--theme-text)]">
                      {member.user_name}
                    </td>

                    {/* Roles */}
                    <td className="px-4 py-3">
                      {editingMember === member.id ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {getFilteredRolesForEdit(member).map((role) => (
                              <label key={role.id} className="flex items-center gap-1.5 text-xs">
                                <input
                                  type="checkbox"
                                  checked={editForm.role_ids.includes(role.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditForm(prev => ({
                                        ...prev,
                                        role_ids: [...prev.role_ids, role.id]
                                      }));
                                    } else {
                                      setEditForm(prev => ({
                                        ...prev,
                                        role_ids: prev.role_ids.filter(id => id !== role.id)
                                      }));
                                    }
                                  }}
                                  className="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                                />
                                <span className="text-[var(--theme-text)]">{role.name}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={handleSaveEdit}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--theme-primary)] text-white text-xs hover:opacity-90 transition-opacity"
                            >
                              <Save size={12} />
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingMember(null);
                                setEditForm({ role_ids: [], master_department_id: '' });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] text-xs hover:bg-[var(--theme-surface)] transition-colors"
                            >
                              <X size={12} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--theme-text)]">{member.roles_display}</span>
                      )}
                    </td>

                    {/* Member Suffix Name */}
                    <td className="px-4 py-3 text-[var(--theme-textSecondary)]">
                      {editingMember === member.id ? (
                        <select
                          value={editForm.master_department_id}
                          onChange={(e) => setEditForm({ ...editForm, master_department_id: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        >
                          <option value="">select member suffix...</option>
                          {memberSuffixes.map((suffix) => (
                            <option key={suffix.id} value={suffix.id}>
                              {suffix.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        member.member_suffix_name || '—'
                      )}
                    </td>

                    {/* Client POC */}
                    <td className="px-4 py-3">
                      {member.can_be_client_poc ? (
                        <input
                          type="radio"
                          name="client_poc"
                          checked={member.is_client_poc}
                          onChange={() => handleChangeClientPOC(member.id)}
                          className="cursor-pointer text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                        />
                      ) : (
                        <span className="text-[var(--theme-textSecondary)]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingMember !== member.id && (
                          <>
                            <button
                              onClick={() => handleEdit(member)}
                              className="p-2 rounded-lg hover:bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            {member.deletable && (
                              <button
                                onClick={() => handleDelete(member.id)}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setAddForm({ user_ids: [], role_ids: [], master_department_id: '' });
          setUserSearchQuery('');
          setUsers([]);
          setClients([]);
          setSelectedUserType(null);
        }}
        title="New member"
      >
        <div className="space-y-5">
          {/* Search Instructions */}
          <div>
            <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
              Search by user name, user email or company name:
            </label>
            <p className="text-xs text-red-500 mb-2">
              (If more than one user found with the same name than take mouse over user name and verify user with full name and email id. IN PMS2 preferred by to search user is by email id for adding a user as member into the project)
            </p>
            <div className="relative">
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 pl-10 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-[var(--theme-textSecondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Users Section */}
          {users.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="text-sm font-semibold text-[var(--theme-text)]">Users</h3>
              </div>
              <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]">
                {users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.user_ids.includes(user.id)}
                      onChange={() => handleUserToggle(user.id, false)}
                      className="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                    />
                    <span 
                      className="text-sm text-[var(--theme-text)]"
                      title={user.email || ''}
                    >
                      {user.name}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--theme-textSecondary)] mt-1">
                ({addForm.user_ids.filter(id => users.some(u => u.id === id)).length}-{users.length}/{users.length})
              </p>
            </div>
          )}

          {/* Clients Section */}
          {clients.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-2">Clients</h3>
              <div className="flex flex-wrap gap-3 p-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]">
                {clients.map((client) => (
                  <label key={client.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.user_ids.includes(client.id)}
                      onChange={() => handleUserToggle(client.id, true)}
                      className="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                    />
                    <span 
                      className="text-sm text-[var(--theme-text)]"
                      title={client.company_name || ''}
                    >
                      {client.name}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--theme-textSecondary)] mt-1">
                ({addForm.user_ids.filter(id => clients.some(c => c.id === id)).length}-{clients.length}/{clients.length})
              </p>
            </div>
          )}

          {/* Roles Section - Only show when users/clients are selected */}
          {addForm.user_ids.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-[var(--theme-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h3 className="text-sm font-semibold text-[var(--theme-text)]">Roles</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] max-h-60 overflow-y-auto">
                {getFilteredRoles().map((role) => (
                  <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addForm.role_ids.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAddForm(prev => ({
                            ...prev,
                            role_ids: [...prev.role_ids, role.id]
                          }));
                        } else {
                          setAddForm(prev => ({
                            ...prev,
                            role_ids: prev.role_ids.filter(id => id !== role.id)
                          }));
                        }
                      }}
                      className="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                    />
                    <span className="text-sm text-[var(--theme-text)]">{role.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Member Suffix Dropdown */}
          {memberSuffixes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                Member Suffix(Optional)
              </label>
              <select
                value={addForm.master_department_id}
                onChange={(e) => setAddForm({ ...addForm, master_department_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              >
                <option value="">select member suffix...</option>
                {memberSuffixes.map((suffix) => (
                  <option key={suffix.id} value={suffix.id}>
                    {suffix.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--theme-border)]">
            <button
              onClick={() => {
                setShowAddModal(false);
                setAddForm({ user_ids: [], role_ids: [], master_department_id: '' });
                setUserSearchQuery('');
                setUsers([]);
                setClients([]);
                setSelectedUserType(null);
              }}
              className="px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMember}
              className="px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white hover:opacity-90 transition-opacity"
            >
              Add
            </button>
          </div>
        </div>
      </Modal>

      {/* Add New Client Modal */}
      <Modal
        isOpen={showAddClientModal}
        onClose={() => {
          setShowAddClientModal(false);
          setClientForm({
            login: '',
            firstname: '',
            lastname: '',
            mail: '',
            language: 'en',
            company_id: projectCompany?.id || '',
            password: '',
            password_confirmation: '',
            generate_password: false,
            must_change_passwd: false,
            mail_notification: 'only_my_events',
            time_zone: '',
            client_role_ids: []
          });
        }}
        title="New client"
        size="lg"
      >
        <form onSubmit={handleCreateClient} className="space-y-5">
          {/* Information Section */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-3">Information</h3>
            <div className="space-y-4">
              {/* Login */}
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientForm.login}
                  onChange={(e) => setClientForm({ ...clientForm, login: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  required
                />
              </div>

              {/* First name */}
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientForm.firstname}
                  onChange={(e) => setClientForm({ ...clientForm, firstname: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  required
                />
              </div>

              {/* Last name */}
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientForm.lastname}
                  onChange={(e) => setClientForm({ ...clientForm, lastname: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={clientForm.mail}
                  onChange={(e) => setClientForm({ ...clientForm, mail: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  required
                />
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  Language
                </label>
                <select
                  value={clientForm.language}
                  onChange={(e) => setClientForm({ ...clientForm, language: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                >
                  {languages.length > 0 ? (
                    languages.map((lang) => (
                      <option key={lang.value || lang} value={lang.value || lang}>
                        {lang.label || lang}
                      </option>
                    ))
                  ) : (
                    <option value="en">English</option>
                  )}
                </select>
              </div>

              {/* Company (Display only) */}
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <div className="px-3 py-2 text-sm text-[var(--theme-text)]">
                  {projectCompany?.name || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Authentication Section */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-3">Authentication</h3>
            <div className="space-y-4">
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={clientForm.password}
                  onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  required={!clientForm.generate_password}
                  disabled={clientForm.generate_password}
                />
                <p className="mt-1 text-xs text-[var(--theme-textSecondary)]">
                  Must be at least 6 characters long.
                </p>
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">
                  Confirmation <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={clientForm.password_confirmation}
                  onChange={(e) => setClientForm({ ...clientForm, password_confirmation: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  required={!clientForm.generate_password}
                  disabled={clientForm.generate_password}
                />
              </div>

              {/* Generate password */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="generate_password"
                  checked={clientForm.generate_password}
                  onChange={(e) => {
                    setClientForm({
                      ...clientForm,
                      generate_password: e.target.checked,
                      password: e.target.checked ? '' : clientForm.password,
                      password_confirmation: e.target.checked ? '' : clientForm.password_confirmation
                    });
                  }}
                  className="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                />
                <label htmlFor="generate_password" className="text-sm text-[var(--theme-text)] cursor-pointer">
                  Generate password
                </label>
              </div>

              {/* Must change password at next logon */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="must_change_passwd"
                  checked={clientForm.must_change_passwd}
                  onChange={(e) => setClientForm({ ...clientForm, must_change_passwd: e.target.checked })}
                  className="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                />
                <label htmlFor="must_change_passwd" className="text-sm text-[var(--theme-text)] cursor-pointer">
                  Must change password at next logon
                </label>
              </div>
            </div>
          </div>

          {/* Email notifications Section */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-3">Email notifications</h3>
            <div>
              <select
                value={clientForm.mail_notification}
                onChange={(e) => setClientForm({ ...clientForm, mail_notification: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              >
                <option value="all">All events on all my projects</option>
                <option value="selected">Only for things I watch or I'm involved in</option>
                <option value="only_my_events">Only for things I watch</option>
                <option value="only_assigned">Only for things I am assigned to</option>
                <option value="only_owner">Only for things I am the owner of</option>
                <option value="none">No events</option>
              </select>
            </div>
          </div>

          {/* Time zone Section */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-3">Time zone</h3>
            <div>
              <select
                value={clientForm.time_zone}
                onChange={(e) => setClientForm({ ...clientForm, time_zone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              >
                <option value="">Select time zone</option>
                {timeZones.length > 0 ? (
                  timeZones.map((tz) => {
                    const tzValue = typeof tz === 'object' ? tz.value : tz;
                    const tzLabel = typeof tz === 'object' ? tz.label : tz;
                    return (
                      <option key={tzValue} value={tzValue}>
                        {tzLabel}
                      </option>
                    );
                  })
                ) : (
                  <option value="">Loading time zones...</option>
                )}
              </select>
            </div>
          </div>

          {/* Client Roles Section */}
          {clientRoles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-3">Client Roles</h3>
              <div className="space-y-2">
                {clientRoles.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`client_role_${role.id}`}
                      checked={clientForm.client_role_ids.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setClientForm({
                            ...clientForm,
                            client_role_ids: [...clientForm.client_role_ids, role.id]
                          });
                        } else {
                          setClientForm({
                            ...clientForm,
                            client_role_ids: clientForm.client_role_ids.filter(id => id !== role.id)
                          });
                        }
                      }}
                      className="rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                    />
                    <label htmlFor={`client_role_${role.id}`} className="text-sm text-[var(--theme-text)] cursor-pointer">
                      {role.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--theme-border)]">
            <button
              type="button"
              onClick={() => {
                setShowAddClientModal(false);
                setClientForm({
                  login: '',
                  firstname: '',
                  lastname: '',
                  mail: '',
                  language: 'en',
                  company_id: projectCompany?.id || '',
                  password: '',
                  password_confirmation: '',
                  generate_password: false,
                  must_change_passwd: false,
                  mail_notification: 'only_my_events',
                  time_zone: '',
                  client_role_ids: []
                });
              }}
              className="px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingClient}
              className="px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingClient ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

