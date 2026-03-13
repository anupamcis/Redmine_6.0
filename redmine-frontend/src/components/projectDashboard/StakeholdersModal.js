import React from 'react';
import Modal from '../ui/Modal';
import { Users } from 'lucide-react';

export default function StakeholdersModal({ isOpen, onClose, members = [] }) {
  console.log('[StakeholdersModal] Received members:', members);
  
  // Group members by their roles/designations
  // Each member has a single role (from Redmine memberships structure)
  const groupedByRole = {};
  
  members.forEach(member => {
    // Handle both old format (roles array) and new format (single role)
    let roleName = 'Members'; // Default group
    
    if (member.role && member.role.name) {
      // New format: single role object
      roleName = member.role.name;
    } else if (member.roles && Array.isArray(member.roles) && member.roles.length > 0) {
      // Old format: roles array (for backward compatibility)
      roleName = member.roles[0].name || member.roles[0] || 'Members';
    }
    
    if (!groupedByRole[roleName]) {
      groupedByRole[roleName] = [];
    }
    
    // Avoid duplicates by checking id and name
    const exists = groupedByRole[roleName].find(m => 
      m.id === member.id && m.name === member.name
    );
    
    if (!exists) {
      groupedByRole[roleName].push(member);
    }
  });

  // Sort roles alphabetically, but keep "Members" at the end if it exists
  const sortedRoles = Object.keys(groupedByRole).sort((a, b) => {
    if (a === 'Members') return 1;
    if (b === 'Members') return -1;
    return a.localeCompare(b);
  });
  
  console.log('[StakeholdersModal] Grouped by role:', groupedByRole);

  // Format name to show initials (e.g., "Anjali D." from "Anjali Doe")
  const formatName = (fullName) => {
    if (!fullName) return 'Unknown';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    // Return "FirstName LastInitial."
    return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Members">
      <div className="space-y-6">
        {sortedRoles.length === 0 ? (
          <div className="text-center py-8 text-[var(--theme-textSecondary)]">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No members found</p>
          </div>
        ) : (
          sortedRoles.map(role => {
            const roleMembers = groupedByRole[role];
            return (
              <div key={role} className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--theme-text)] mb-2">
                  {role}:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {roleMembers.map((member, index) => (
                    <span
                      key={`${role}-${member.id}-${index}`}
                      className="text-sm text-[var(--theme-textSecondary)]"
                    >
                      {formatName(member.name)}
                      {index < roleMembers.length - 1 && ','}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

