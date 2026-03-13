import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { getAuthHeader } from '../../api/redmineAdapter';

function TestAuthPage() {
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const user = useSelector(state => state.auth.user);
  const restoring = useSelector(state => state.auth.restoring);

  useEffect(() => {
    console.log('=== AUTH TEST PAGE ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('restoring:', restoring);
    console.log('user:', user);
    console.log('localStorage redmineCredentials:', localStorage.getItem('redmineCredentials') ? 'Found' : 'Not found');
    console.log('localStorage redmineAuth:', localStorage.getItem('redmineAuth') ? 'Found' : 'Not found');
    console.log('sessionStorage redmineBasic:', sessionStorage.getItem('redmineBasic') ? 'Found' : 'Not found');
    console.log('getAuthHeader():', getAuthHeader());
    console.log('=====================');
  }, [isAuthenticated, user, restoring]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Authentication Test Page</h1>
      <div className="space-y-2">
        <p><strong>isAuthenticated:</strong> {isAuthenticated ? 'true' : 'false'}</p>
        <p><strong>restoring:</strong> {restoring ? 'true' : 'false'}</p>
        <p><strong>user:</strong> {user ? user.login : 'null'}</p>
        <p><strong>localStorage redmineCredentials:</strong> {localStorage.getItem('redmineCredentials') ? 'Found' : 'Not found'}</p>
        <p><strong>localStorage redmineAuth:</strong> {localStorage.getItem('redmineAuth') ? 'Found' : 'Not found'}</p>
        <p><strong>sessionStorage redmineBasic:</strong> {sessionStorage.getItem('redmineBasic') ? 'Found' : 'Not found'}</p>
        <p><strong>Auth Header:</strong> {JSON.stringify(getAuthHeader())}</p>
      </div>
    </div>
  );
}

export default TestAuthPage;

