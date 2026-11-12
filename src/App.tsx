import React from 'react';
import { MainLayout } from '@components/layout/MainLayout';
import { EarthVisualization } from '@components/visualization/EarthVisualization';
import { useVisualizationStore } from '@store/visualizationStore';

const App: React.FC = () => {
  const { setSelectedCity } = useVisualizationStore();

  const handleCityClick = (cityId: string) => {
    setSelectedCity(cityId);
    console.log('城市被点击:', cityId);
  };

  return (
    <MainLayout>
      <EarthVisualization onCityClick={handleCityClick} />
    </MainLayout>
  );
};

export default App;