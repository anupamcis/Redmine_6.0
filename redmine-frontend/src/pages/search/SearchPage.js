import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { search, getProjects } from '../../api/redmineAdapter';
import { Search, FileText, GitBranch, Folder, MessageSquare, CheckCircle2, X } from 'lucide-react';
import Card from '../../components/ui/Card';

const CONTENT_TYPES = [
  { key: 'issues', label: 'Tasks', icon: CheckCircle2 },
  { key: 'news', label: 'News', icon: FileText },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'old_documents', label: 'Old Documents', icon: Folder },
  { key: 'changesets', label: 'Changesets', icon: GitBranch },
  { key: 'wiki_pages', label: 'Wiki pages', icon: FileText },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'boards', label: 'Boards', icon: MessageSquare },
  { key: 'files', label: 'Files', icon: Folder, mapsTo: 'documents' } // Maps to "documents" in Redmine
];

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useSelector(state => state.auth.user);
  const currentProject = useSelector(state => state.projects.currentProject);
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [allWords, setAllWords] = useState(searchParams.get('all_words') !== '0');
  const [titlesOnly, setTitlesOnly] = useState(searchParams.get('titles_only') === '1');
  const [attachments, setAttachments] = useState(searchParams.get('attachments') || '0');
  const [openIssues, setOpenIssues] = useState(searchParams.get('open_issues') === '1');
  const [selectedTypes, setSelectedTypes] = useState(() => {
    const typesParam = searchParams.get('types');
    if (typesParam) {
      const types = typesParam.split(',').filter(Boolean);
      // Map "files" to "documents" since Redmine doesn't have a separate "files" type
      return types.map(t => t === 'files' ? 'documents' : t).filter((v, i, a) => a.indexOf(v) === i);
    }
    return ['issues', 'documents', 'old_documents', 'changesets'];
  });
  const [scope, setScope] = useState(searchParams.get('scope') || (currentProject?.identifier || ''));
  const [showOptions, setShowOptions] = useState(searchParams.get('options') === '1');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [resultCount, setResultCount] = useState(0);
  const [resultCountByType, setResultCountByType] = useState({});
  const [allProjects, setAllProjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 25;
  
  const searchInputRef = useRef(null);

  // Load projects for scope dropdown
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projects = await getProjects({ membershipOnly: true, skipIssueCounts: true, skipMemberships: true });
        setAllProjects(projects || []);
      } catch (err) {
        console.warn('[SearchPage] Failed to load projects:', err);
      }
    };
    if (currentUser) {
      loadProjects();
    }
  }, [currentUser]);

  // Perform search function
  const performSearch = useCallback(async () => {
    const searchQuery = query.trim();
    if (!searchQuery) {
      setResults([]);
      setResultCount(0);
      setResultCountByType({});
      return;
    }

    setLoading(true);
    try {
      const offset = (currentPage - 1) * resultsPerPage;
      
      // Build search options
      const searchOptions = {
        q: searchQuery,
        all_words: allWords,
        titles_only: titlesOnly,
        attachments: attachments,
        open_issues: openIssues,
        limit: resultsPerPage,
        offset: offset
      };
      
      // Handle scope: if empty, don't pass it (global search)
      // If it's a project identifier, pass it as scope
      if (scope && scope.trim()) {
        searchOptions.scope = scope;
      }
      
      // Add content types if any are selected
      // Map "files" to "documents" since Redmine doesn't have a separate "files" type
      // If no types selected, don't pass types param - Redmine will search all available types
      if (selectedTypes.length > 0) {
        // Map "files" to "documents" and remove duplicates
        let mappedTypes = selectedTypes
          .map(t => {
            const typeConfig = CONTENT_TYPES.find(ct => ct.key === t);
            return typeConfig?.mapsTo || t;
          })
          .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
        
        // IMPORTANT: When searching attachments (attachments=1 or attachments='only'),
        // we need to include "issues" because files are commonly attached to issues.
        // If user is searching attachments but hasn't selected "issues", add it automatically
        // to ensure we find attachments on issues (which is the most common case).
        if (attachments !== '0' && !mappedTypes.includes('issues')) {
          console.log('[SearchPage] Adding "issues" to search types because attachments are being searched and issues can have attachments');
          mappedTypes.push('issues');
          // Remove duplicates again after adding issues
          mappedTypes = [...new Set(mappedTypes)];
        }
        
        searchOptions.types = mappedTypes;
        console.log('[SearchPage] Final mapped types for search:', mappedTypes, 'from selected:', selectedTypes);
        console.log('[SearchPage] Attachments setting:', attachments);
      } else {
        // No types selected - Redmine will search all types
        // But if searching attachments, we should still ensure issues is included
        if (attachments !== '0') {
          console.log('[SearchPage] No types selected but searching attachments - will search all types (including issues with attachments)');
        }
      }
      // Note: If selectedTypes is empty, we don't pass types param, which means Redmine searches all types
      
      console.log('[SearchPage] Search options:', searchOptions);
      
      const data = await search(searchOptions);
      
      console.log('[SearchPage] Search response:', data);
      
      // Redmine API returns: { results: [...], total_count: ..., offset: ..., limit: ... }
      // OR: { results: [...], _meta: { total_count, offset, limit } }
      // The results array contains objects with: id, title, type, url, description, datetime
      let resultsArray = [];
      let totalCount = 0;
      
      console.log('[SearchPage] Raw API response:', data);
      
      if (Array.isArray(data)) {
        // If data is directly an array (unlikely but handle it)
        resultsArray = data;
        totalCount = data.length;
        console.warn('[SearchPage] Received array instead of object, this is unexpected');
      } else if (data && typeof data === 'object') {
        // Standard format: { results: [...], total_count: ..., offset: ..., limit: ... }
        // OR: { results: [...], _meta: { total_count, offset, limit } }
        resultsArray = Array.isArray(data.results) ? data.results : [];
        
        // Check for both formats
        if (data.total_count !== undefined) {
          // Direct format: { results: [], total_count: 0, offset: 0, limit: 25 }
          totalCount = data.total_count;
        } else if (data._meta && data._meta.total_count !== undefined) {
          // Nested format: { results: [], _meta: { total_count: 0, ... } }
          totalCount = data._meta.total_count;
        } else {
          // Fallback to array length
          totalCount = resultsArray.length;
        }
      } else {
        console.error('[SearchPage] Unexpected response format:', typeof data, data);
        resultsArray = [];
        totalCount = 0;
      }
      
      console.log('[SearchPage] Parsed results array:', resultsArray);
      console.log('[SearchPage] Total count:', totalCount);
      console.log('[SearchPage] Results count:', resultsArray.length);
      
      setResults(resultsArray);
      setResultCount(totalCount);
      
      // Calculate result_count_by_type from results (API doesn't include it)
      const countByType = {};
      resultsArray.forEach(result => {
        const type = result.type || result.event_type;
        if (type) {
          countByType[type] = (countByType[type] || 0) + 1;
        }
      });
      console.log('[SearchPage] Count by type:', countByType);
      setResultCountByType(countByType);
      
      if (resultsArray.length === 0 && totalCount === 0) {
        console.warn('[SearchPage] No results found for query:', searchQuery);
        console.warn('[SearchPage] Search was performed with:', {
          query: searchQuery,
          scope: searchOptions.scope,
          types: searchOptions.types,
          attachments: searchOptions.attachments,
          all_words: searchOptions.all_words,
          titles_only: searchOptions.titles_only
        });
        // Don't set error for empty results - that's a valid response
        // setError('No results found. Try adjusting your search criteria.');
      }
      
      // Clear any previous errors on successful search
      setError(null);
    } catch (err) {
      console.error('[SearchPage] Search error:', err);
      setResults([]);
      setResultCount(0);
      setResultCountByType({});
    } finally {
      setLoading(false);
    }
  }, [query, allWords, titlesOnly, attachments, openIssues, selectedTypes, scope, currentPage]);

  // Initialize from URL params on mount
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
    }
    const urlPage = parseInt(searchParams.get('page'), 10);
    if (urlPage && urlPage > 0) {
      setCurrentPage(urlPage);
    }
    const urlScope = searchParams.get('scope');
    if (urlScope !== null) {
      setScope(urlScope);
    }
    const urlTypes = searchParams.get('types');
    if (urlTypes) {
      // Keep "files" in selectedTypes for UI, but it will be mapped to "documents" when searching
      const typesArray = urlTypes.split(',').filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
      setSelectedTypes(typesArray);
    }
    const urlAllWords = searchParams.get('all_words');
    if (urlAllWords !== null) {
      setAllWords(urlAllWords !== '0');
    }
    const urlTitlesOnly = searchParams.get('titles_only');
    if (urlTitlesOnly !== null) {
      setTitlesOnly(urlTitlesOnly === '1');
    }
    const urlAttachments = searchParams.get('attachments');
    if (urlAttachments !== null) {
      setAttachments(urlAttachments);
    }
    const urlOpenIssues = searchParams.get('open_issues');
    if (urlOpenIssues !== null) {
      setOpenIssues(urlOpenIssues === '1');
    }
  }, []);

  // Track if we've done the initial search
  const hasSearchedRef = useRef(false);
  
  // Perform search when query exists and filters are ready
  useEffect(() => {
    // Only search if we have a query
    if (query.trim()) {
      // On first mount with a query, wait a bit for all state to be initialized
      if (!hasSearchedRef.current) {
        hasSearchedRef.current = true;
        const timer = setTimeout(() => {
          console.log('[SearchPage] Initial search after mount with query:', query);
          performSearch();
        }, 500);
        return () => clearTimeout(timer);
      } else {
        // Subsequent searches (filter changes)
        console.log('[SearchPage] Search triggered by filter change');
        performSearch();
      }
    } else {
      setResults([]);
      setResultCount(0);
      setResultCountByType({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, allWords, titlesOnly, attachments, openIssues, selectedTypes, scope, currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (!allWords) params.set('all_words', '0');
    if (titlesOnly) params.set('titles_only', '1');
    if (attachments !== '0') params.set('attachments', attachments);
    if (openIssues) params.set('open_issues', '1');
    if (selectedTypes.length > 0) params.set('types', selectedTypes.join(','));
    if (scope) params.set('scope', scope);
    if (showOptions) params.set('options', '1');
    setSearchParams(params);
    if (query.trim()) {
      performSearch();
    }
  };


  const toggleType = (typeKey) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeKey)) {
        return prev.filter(t => t !== typeKey);
      } else {
        return [...prev, typeKey];
      }
    });
  };

  const selectAllTypes = () => {
    setSelectedTypes(CONTENT_TYPES.map(t => t.key));
  };

  const clearAllTypes = () => {
    setSelectedTypes([]);
  };

  const handleResultClick = (result) => {
    // Navigate to the result URL
    const resultUrl = result.url || result.event_url;
    if (resultUrl) {
      // Extract project identifier and path from URL
      const urlMatch = resultUrl.match(/\/projects\/([^\/]+)(.*)/);
      if (urlMatch) {
        const projectId = urlMatch[1];
        const path = urlMatch[2] || '';
        navigate(`/projects/${projectId}${path}`);
      } else if (resultUrl.startsWith('/')) {
        // Relative path - navigate directly
        navigate(resultUrl);
      } else {
        // Absolute URL - use window.location
        window.location.href = resultUrl;
      }
    } else if (result.type === 'issues' && result.id) {
      // Fallback: if it's an issue, try to navigate to it
      const projectId = scope || currentProject?.identifier;
      if (projectId) {
        navigate(`/projects/${projectId}/tasks/${result.id}`);
      }
    }
  };

  const highlightText = (text, tokens) => {
    if (!text || !tokens || tokens.length === 0) return text;
    let highlighted = text;
    tokens.forEach(token => {
      const regex = new RegExp(`(${token})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });
    return { __html: highlighted };
  };

  const totalPages = Math.ceil(resultCount / resultsPerPage);

  return (
    <div className="flex-1 min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-3xl font-bold text-[var(--theme-text)] mb-6">Search</h1>

        <form onSubmit={handleSearch} className="mb-6">
          <Card>
            <div className="space-y-4">
              {/* Search Input and Project Scope */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[300px]">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter search query..."
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-primary)]/20 bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  />
                </div>
                <div className="w-64">
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                  >
                    <option value="">All Projects</option>
                    {allProjects.map(project => (
                      <option key={project.identifier} value={project.identifier}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allWords}
                    onChange={(e) => setAllWords(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                  />
                  <span className="text-sm text-[var(--theme-text)]">All words</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={titlesOnly}
                    onChange={(e) => setTitlesOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                  />
                  <span className="text-sm text-[var(--theme-text)]">Search titles only</span>
                </label>
              </div>

              {/* Content Type Filters */}
              <div className="border-t border-[var(--theme-border)] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[var(--theme-text)]">Content Types</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllTypes}
                      className="text-xs text-[var(--theme-primary)] hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-[var(--theme-textSecondary)]">|</span>
                    <button
                      type="button"
                      onClick={clearAllTypes}
                      className="text-xs text-[var(--theme-primary)] hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {CONTENT_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = selectedTypes.includes(type.key);
                    return (
                      <label
                        key={type.key}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                            : 'border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-cardBg)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleType(type.key)}
                          className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                        />
                        <Icon size={14} className={isSelected ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-textSecondary)]'} />
                        <span className={`text-sm ${isSelected ? 'text-[var(--theme-text)] font-medium' : 'text-[var(--theme-textSecondary)]'}`}>
                          {type.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Options Section */}
              <div className="border-t border-[var(--theme-border)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowOptions(!showOptions)}
                  className="flex items-center gap-2 text-sm font-semibold text-[var(--theme-text)] hover:text-[var(--theme-primary)] transition-colors"
                >
                  <span>{showOptions ? '▼' : '▶'}</span>
                  <span>Options</span>
                </button>
                {showOptions && (
                  <div className="mt-3 space-y-3 pl-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openIssues}
                        onChange={(e) => setOpenIssues(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                      />
                      <span className="text-sm text-[var(--theme-text)]">Open tasks only</span>
                    </label>
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-[var(--theme-textSecondary)] mb-2">Attachments</div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="attachments"
                          value="0"
                          checked={attachments === '0'}
                          onChange={(e) => setAttachments(e.target.value)}
                          className="w-4 h-4 border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                        />
                        <span className="text-sm text-[var(--theme-text)]">Do not search attachments</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="attachments"
                          value="1"
                          checked={attachments === '1'}
                          onChange={(e) => setAttachments(e.target.value)}
                          className="w-4 h-4 border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                        />
                        <span className="text-sm text-[var(--theme-text)]">Search attachment filenames and descriptions</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="attachments"
                          value="only"
                          checked={attachments === 'only'}
                          onChange={(e) => setAttachments(e.target.value)}
                          className="w-4 h-4 border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                        />
                        <span className="text-sm text-[var(--theme-text)]">Search attachments only</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Search size={16} />
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          </Card>
        </form>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-500 bg-red-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-500">
                <X size={20} />
                <span className="font-medium">Search Error</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 text-sm text-red-400">{error}</p>
          </Card>
        )}

        {/* Results */}
        {query && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                <span className="ml-3 text-[var(--theme-textSecondary)]">Searching...</span>
              </div>
            ) : resultCount > 0 ? (
              <>
                {/* Result Counts */}
                {Object.keys(resultCountByType).length > 1 && (
                  <div className="mb-4 flex items-center gap-4 text-sm text-[var(--theme-textSecondary)]">
                    {Object.entries(resultCountByType).map(([type, count]) => (
                      <span key={type}>
                        {CONTENT_TYPES.find(t => t.key === type)?.label || type}: {count}
                      </span>
                    ))}
                  </div>
                )}

                <h2 className="text-xl font-semibold text-[var(--theme-text)] mb-4">
                  Results ({resultCount})
                </h2>

                <Card>
                  <div className="space-y-4">
                    {results.map((result, index) => {
                      // Handle both API format (result.type, result.title) and legacy format (result.event_type, result.event_title)
                      const resultType = result.type || result.event_type;
                      const resultTitle = result.title || result.event_title;
                      const resultDescription = result.description || result.event_description;
                      const resultUrl = result.url || result.event_url;
                      const resultDatetime = result.datetime || result.event_datetime;
                      const resultProject = result.project;
                      
                      const typeConfig = CONTENT_TYPES.find(t => t.key === resultType) || { label: resultType, icon: FileText };
                      const Icon = typeConfig.icon;
                      
                      return (
                        <div
                          key={result.id || index}
                          onClick={() => handleResultClick({ ...result, event_url: resultUrl })}
                          className="p-4 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-surface)] cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <Icon size={18} className="text-[var(--theme-primary)] mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              {resultProject && resultProject !== scope && (
                                <span className="text-xs text-[var(--theme-textSecondary)] mb-1 block">
                                  {resultProject}
                                </span>
                              )}
                              <h3
                                className="text-base font-medium text-[var(--theme-text)] mb-1"
                                dangerouslySetInnerHTML={highlightText(resultTitle || '', [query])}
                              />
                              {resultDescription && (
                                <p
                                  className="text-sm text-[var(--theme-textSecondary)] mb-2 line-clamp-2"
                                  dangerouslySetInnerHTML={highlightText(resultDescription, [query])}
                                />
                              )}
                              <div className="text-xs text-[var(--theme-textSecondary)]">
                                {resultDatetime && new Date(resultDatetime).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        const newPage = Math.max(1, currentPage - 1);
                        setCurrentPage(newPage);
                        const params = new URLSearchParams(searchParams);
                        if (newPage > 1) {
                          params.set('page', String(newPage));
                        } else {
                          params.delete('page');
                        }
                        setSearchParams(params);
                      }}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-[var(--theme-textSecondary)]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => {
                        const newPage = Math.min(totalPages, currentPage + 1);
                        setCurrentPage(newPage);
                        const params = new URLSearchParams(searchParams);
                        params.set('page', String(newPage));
                        setSearchParams(params);
                      }}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <div className="text-center py-12 text-[var(--theme-textSecondary)]">
                  <Search size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No results found for "{query}"</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
