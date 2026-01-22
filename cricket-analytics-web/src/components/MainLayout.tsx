import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { Mail, Sparkles } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header with Connect Button */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                Like this? Let's work together
              </span>
              <a
                href="mailto:vinay.bale@gmail.com?subject=Cricket%20Analytics%20-%20Let's%20Connect"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold text-sm hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
              >
                <Mail className="w-4 h-4" />
                Connect with Me
              </a>
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
