import React from 'react';
import { MainLayout } from '@components/layout/MainLayout';
import { EarthVisualization } from '@components/visualization/EarthVisualization';

const App: React.FC = () => {
  return (
    <MainLayout>
      <EarthVisualization />
    </MainLayout>
  );
};

export default App;
