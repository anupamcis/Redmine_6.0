import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSelector } from 'react-redux';

export default function AppShell({ children }) {
  const sidebarCollapsed = useSelector(state => state.ui.sidebarCollapsed);

  return (
    <div 
      className="min-h-screen text-[var(--theme-text)] theme-transition"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      <Header />
      <div className="flex pt-14">
        <Sidebar />
        <main 
          className={`flex-1 transition-all duration-300 ease-in-out p-6`}
          style={{ marginLeft: sidebarCollapsed ? '64px' : '256px' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
