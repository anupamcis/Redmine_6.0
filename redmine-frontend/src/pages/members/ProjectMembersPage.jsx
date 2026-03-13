import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProjectMemberships } from '../../api/redmineIssues';
import { Users, MessageSquare, Loader2, Phone } from 'lucide-react';
import { cachedApiCall } from '../../utils/apiCache';

export default function ProjectMembersPage() {
  const { projectName } = useParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // OPTIMIZED: Load members with caching
  useEffect(() => {
    if (!projectName) return;
    let cancelled = false;

    const loadMembers = async () => {
      setLoading(true);
      setError(null);
      try {
        // OPTIMIZED: Use cached API call for memberships - instant on repeat visits
        const cacheKey = `members_page_${projectName}`;
        const memberships = await cachedApiCall(cacheKey, async () => {
          return await fetchProjectMemberships(projectName);
        });
        
        if (cancelled) return;
        const mapped =
          (memberships || [])
            .map((m) => {
              if (!m.user) return null;
              const roleNames = Array.isArray(m.roles)
                ? m.roles.map((r) => r.name).filter(Boolean)
                : [];
              return {
                id: m.user.id,
                name: m.user.name,
                roles: roleNames
              };
            })
            .filter(Boolean) || [];
        setMembers(mapped);
      } catch (err) {
        if (cancelled) return;
        console.error('[ProjectMembersPage] Failed to load members:', err);
        setError(err.message || 'Failed to load members');
        setMembers([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [projectName]);

  const prettyProjectName = projectName
    ? projectName
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '';

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const sorted = [...members].sort((a, b) => {
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    if (!term) return sorted;
    return sorted.filter((m) => {
      const name = (m.name || '').toLowerCase();
      const roles = Array.isArray(m.roles) ? m.roles.join(' ').toLowerCase() : '';
      return name.includes(term) || roles.includes(term);
    });
  }, [members, search]);

  return (
    <div className="flex-1 min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] px-6 py-4 md:py-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[var(--theme-primary)]/12 border border-[var(--theme-primary)]/25 flex items-center justify-center text-[var(--theme-primary)] shadow-sm">
              <Users size={16} />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[var(--theme-text)] uppercase tracking-wide">
                All People
              </h1>
              {prettyProjectName && (
                <p className="text-[11px] text-[var(--theme-textSecondary)]">
                  Space: {prettyProjectName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar row (search + placeholder filters to resemble ClickUp) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[220px]">
            <div className="h-9 rounded-full border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 flex items-center gap-2 text-xs text-[var(--theme-textSecondary)]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people"
                className="w-full bg-transparent outline-none text-[var(--theme-text)] placeholder:text-[var(--theme-textSecondary)] text-xs"
              />
            </div>
          </div>
        </div>

        {/* Members grid */}
        <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-sm p-4 md:p-5">
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-3 text-[var(--theme-textSecondary)] text-sm">
              <Loader2 size={24} className="animate-spin" />
              <span>Loading members…</span>
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-500">{error}</div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--theme-textSecondary)]">
              No members match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMembers.map((member) => {
                const roleLabel =
                  Array.isArray(member.roles) && member.roles.length
                    ? member.roles.join(', ')
                    : 'Member';
                const initials = member.name
                  ? member.name
                      .split(' ')
                      .map((p) => p.charAt(0).toUpperCase())
                      .slice(0, 2)
                      .join('')
                  : '?';

                return (
                  <div
                    key={member.id}
                    className="flex flex-col rounded-xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-surface)]/80 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Top tile with initials */}
                    <div className="flex-1 min-h-[140px] bg-[var(--theme-surface2)] text-[var(--theme-text)] flex items-center justify-center text-2xl font-semibold">
                      {initials}
                    </div>
                    {/* Bottom info bar */}
                    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--theme-cardBg)]">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[var(--theme-text)] truncate">
                          {member.name}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--theme-textSecondary)] truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{roleLabel}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Call feature coming soon"
                          onClick={() => alert('Call feature coming soon.')}
                          className="w-7 h-7 rounded-full border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-textSecondary)] text-[11px] cursor-not-allowed hover:border-[var(--theme-primary)]/60"
                        >
                          <Phone size={13} />
                        </button>
                        <button
                          type="button"
                          title="Chat feature coming soon"
                          onClick={() => alert('Chat feature coming soon.')}
                          className="w-7 h-7 rounded-full border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-textSecondary)] text-[11px] cursor-not-allowed hover:border-[var(--theme-primary)]/60"
                        >
                          <MessageSquare size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


