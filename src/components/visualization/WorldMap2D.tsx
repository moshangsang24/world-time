import React, { useRef, useEffect } from 'react';
import { useSunPosition } from '@hooks/useSunPosition';
import { useTimeState } from '@hooks/useTimeState';
import type { CityTimeData } from '@/types/time';

interface WorldMap2DProps {
  cities: CityTimeData[];
  onCityClick?: (cityId: string) => void;
  selectedCity?: string | null;
}

export const WorldMap2D: React.FC<WorldMap2DProps> = ({
  cities,
  onCityClick,
  selectedCity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { sunPosition } = useSunPosition();
  const { formattedBeijingTime } = useTimeState();
  
  // 将经纬度转换为2D地图坐标
  const latLngToMapCoords = (lat: number, lng: number, width: number, height: number) => {
    // 使用等距圆柱投影
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  // 简化的世界地图数据
  const worldMapData = [
    // 北美洲 - 更详细的轮廓
    { name: 'North America', color: '#22c55e', regions: [
      { lat: 72, lng: -120, width: 50, height: 40 }, // 加拿大北部
      { lat: 60, lng: -110, width: 80, height: 30 }, // 加拿大
      { lat: 50, lng: -125, width: 60, height: 25 }, // 加拿大西部
      { lat: 45, lng: -75, width: 50, height: 20 },  // 加拿大东部/美国北部
      { lat: 35, lng: -100, width: 60, height: 25 }, // 美国
      { lat: 25, lng: -110, width: 40, height: 15 }, // 墨西哥北部
      { lat: 15, lng: -95, width: 30, height: 20 },  // 墨西哥/中美洲
    ]},
    
    // 南美洲
    { name: 'South America', color: '#3b82f6', regions: [
      { lat: 10, lng: -70, width: 25, height: 15 },  // 委内瑞拉/圭亚那
      { lat: -5, lng: -65, width: 40, height: 30 },  // 巴西北部
      { lat: -15, lng: -60, width: 35, height: 25 }, // 巴西中部
      { lat: -25, lng: -65, width: 30, height: 20 }, // 阿根廷/巴西南部
      { lat: -35, lng: -70, width: 20, height: 15 }, // 阿根廷南部
      { lat: -45, lng: -70, width: 15, height: 10 }, // 巴塔哥尼亚
    ]},
    
    // 欧洲
    { name: 'Europe', color: '#f59e0b', regions: [
      { lat: 70, lng: 25, width: 20, height: 8 },   // 斯堪的纳维亚北部
      { lat: 62, lng: 15, width: 30, height: 12 },  // 斯堪的纳维亚
      { lat: 55, lng: 10, width: 35, height: 15 },  // 北欧/波罗的海
      { lat: 50, lng: 5, width: 40, height: 15 },   // 西欧/中欧
      { lat: 45, lng: 15, width: 35, height: 12 },  // 东南欧
      { lat: 38, lng: 0, width: 45, height: 12 },   // 南欧/地中海
    ]},
    
    // 非洲
    { name: 'Africa', color: '#ef4444', regions: [
      { lat: 35, lng: 10, width: 30, height: 15 },  // 北非
      { lat: 20, lng: 15, width: 35, height: 20 },  // 西非/萨哈拉
      { lat: 10, lng: 25, width: 40, height: 15 },  // 中非
      { lat: 0, lng: 20, width: 45, height: 20 },   // 赤道非洲
      { lat: -15, lng: 25, width: 40, height: 20 }, // 南部非洲
      { lat: -30, lng: 20, width: 30, height: 15 }, // 南非
    ]},
    
    // 亚洲
    { name: 'Asia', color: '#8b5cf6', regions: [
      { lat: 75, lng: 100, width: 80, height: 15 }, // 西伯利亚北部
      { lat: 65, lng: 60, width: 120, height: 20 }, // 西伯利亚
      { lat: 55, lng: 80, width: 100, height: 15 }, // 中西伯利亚/蒙古
      { lat: 45, lng: 75, width: 90, height: 15 },  // 中亚/哈萨克斯坦
      { lat: 35, lng: 70, width: 80, height: 20 },  // 中东/南亚北部
      { lat: 25, lng: 80, width: 70, height: 15 },  // 印度/东南亚
      { lat: 15, lng: 100, width: 50, height: 20 }, // 东南亚
      { lat: 40, lng: 110, width: 45, height: 20 }, // 中国
      { lat: 35, lng: 135, width: 15, height: 15 }, // 日本
    ]},
    
    // 大洋洲
    { name: 'Oceania', color: '#06b6d4', regions: [
      { lat: -25, lng: 140, width: 35, height: 20 }, // 澳大利亚
      { lat: -42, lng: 170, width: 15, height: 8 },  // 新西兰
    ]},
  ];

  // 绘制地图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 设置画布尺寸
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制海洋背景
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, height);
    oceanGradient.addColorStop(0, '#1e40af');
    oceanGradient.addColorStop(0.5, '#1e3a8a');
    oceanGradient.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, width, height);

    // 绘制经纬线网格
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    // 经线
    for (let lng = -180; lng <= 180; lng += 30) {
      const x = ((lng + 180) / 360) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // 纬线
    for (let lat = -90; lat <= 90; lat += 30) {
      const y = ((90 - lat) / 180) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 绘制昼夜分界线和阴影
    const sunLng = sunPosition.longitude;
    const nightStartLng = sunLng - 90;
    const nightEndLng = sunLng + 90;
    
    // 创建夜晚渐变
    const nightGradient = ctx.createLinearGradient(
      ((nightStartLng + 180) / 360) * width, 0,
      ((nightEndLng + 180) / 360) * width, 0
    );
    nightGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
    nightGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
    nightGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    
    ctx.fillStyle = nightGradient;
    ctx.fillRect(((nightStartLng + 180) / 360) * width, 0, 
                 ((nightEndLng - nightStartLng) / 360) * width, height);

    // 绘制太阳光线
    const sunCoords = latLngToMapCoords(0, sunLng, width, height);
    
    // 太阳光晕
    const sunGradient = ctx.createRadialGradient(
      sunCoords.x, sunCoords.y, 0,
      sunCoords.x, sunCoords.y, 100
    );
    sunGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    sunGradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.3)');
    sunGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    
    ctx.fillStyle = sunGradient;
    ctx.fillRect(sunCoords.x - 100, sunCoords.y - 100, 200, 200);

    // 绘制放射状光线
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2;
    
    for (let angle = 0; angle < 360; angle += 20) {
      const radian = (angle * Math.PI) / 180;
      const endX = sunCoords.x + Math.cos(radian) * 150;
      const endY = sunCoords.y + Math.sin(radian) * 150;
      
      ctx.beginPath();
      ctx.moveTo(sunCoords.x, sunCoords.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // 绘制大陆
    worldMapData.forEach(continent => {
      ctx.fillStyle = continent.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      
      continent.regions.forEach(region => {
        const coords = latLngToMapCoords(region.lat, region.lng, width, height);
        const regionWidth = (region.width / 360) * width;
        const regionHeight = (region.height / 180) * height;
        
        ctx.fillRect(coords.x, coords.y, regionWidth, regionHeight);
        ctx.strokeRect(coords.x, coords.y, regionWidth, regionHeight);
      });
    });

    // 绘制太阳位置
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sunCoords.x, sunCoords.y, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // 绘制城市标记
    cities.forEach(city => {
      const coords = latLngToMapCoords(city.latitude, city.longitude, width, height);
      const isSelected = selectedCity === city.id;
      
      // 城市光点效果
      if (city.isDaytime) {
        const cityGradient = ctx.createRadialGradient(
          coords.x, coords.y, 0,
          coords.x, coords.y, 8
        );
        cityGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        cityGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = cityGradient;
        ctx.fillRect(coords.x - 8, coords.y - 8, 16, 16);
      }
      
      // 城市圆点
      ctx.fillStyle = city.isDaytime ? '#ffd700' : '#ff6b6b';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = isSelected ? 3 : 1;
      
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, isSelected ? 6 : 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      // 选中城市的脉冲效果
      if (isSelected) {
        ctx.strokeStyle = city.isDaytime ? '#ffd700' : '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 12, 0, 2 * Math.PI);
        ctx.stroke();
      }
      
      // 城市标签
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(city.name, coords.x, coords.y - 15);
      ctx.fillText(city.name, coords.x, coords.y - 15);
    });

  }, [cities, sunPosition, selectedCity]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onCityClick) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // 检查点击的是否为城市
    cities.forEach(city => {
      const coords = latLngToMapCoords(city.latitude, city.longitude, rect.width, rect.height);
      const distance = Math.sqrt((x - coords.x) ** 2 + (y - coords.y) ** 2);
      
      if (distance < 20) { // 20px 的点击范围
        onCityClick(city.id);
      }
    });
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
        style={{ background: 'transparent' }}
      />
      
      {/* 信息面板 */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white rounded-lg p-3">
        <div className="text-sm space-y-1">
          <div className="flex items-center">
            <span className="text-yellow-400">☀️</span>
            <span className="ml-2">太阳位置: {sunPosition.longitude.toFixed(1)}°</span>
          </div>
          <div className="flex items-center">
            <span className="text-blue-400">🌍</span>
            <span className="ml-2">北京时间: {formattedBeijingTime.time}</span>
          </div>
          <div className="text-xs text-gray-300 mt-2">
            实时世界地图 • 昼夜分布可视化
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white rounded-lg p-3">
        <div className="text-xs space-y-1">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
            <span>白天城市</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
            <span>夜晚城市</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2 border-2 border-white"></div>
            <span>太阳位置</span>
          </div>
        </div>
      </div>

      {/* 控制说明 */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white rounded-lg p-2 text-xs">
        <div>🖱️ 点击城市查看详情</div>
        <div>⚡ 滚轮控制时间变化</div>
        <div>🌍 实时显示全球昼夜分布</div>
      </div>
    </div>
  );
};