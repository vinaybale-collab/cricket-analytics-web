import React from 'react';

interface ProjectTileProps {
  title: string;
  description: string;
  date: string;
}

const ProjectTile: React.FC<ProjectTileProps> = ({ title, description, date }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 flex-grow">{description}</p>
      <div className="text-xs text-gray-400 mt-auto">{date}</div>
    </div>
  );
};

export default ProjectTile;
