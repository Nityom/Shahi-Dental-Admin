// components/TeethChart.tsx
'use client';

import React, { useState } from 'react';

export interface ToothData {
  id: number;
  type: string;
  category: 'Permanent' | 'Deciduous';
}

interface TeethChartProps {
  onTeethSelected: (selectedTeeth: ToothData[]) => void;
}

const TeethChart: React.FC<TeethChartProps> = ({ onTeethSelected }) => {
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  // Tooth type mapping based on FDI system
  const getToothType = (id: number): string => {
    const lastDigit = id % 10;
    
    if (lastDigit === 1) return "Central incisor";
    if (lastDigit === 2) return "Lateral incisor";
    if (lastDigit === 3) return "Canine";
    if (lastDigit === 4) return "First premolar";
    if (lastDigit === 5) return "Second premolar";
    if (lastDigit === 6) return "First molar";
    if (lastDigit === 7) return "Second molar";
    if (lastDigit === 8) return "Third molar";
    return "Unknown";
  };

  // Determine if a tooth is permanent or deciduous
  const getToothCategory = (id: number): 'Permanent' | 'Deciduous' => {
    // Primary/deciduous teeth are usually 51-55, 61-65, 71-75, 81-85
    if ((id >= 51 && id <= 55) || (id >= 61 && id <= 65) || 
        (id >= 71 && id <= 75) || (id >= 81 && id <= 85)) {
      return 'Deciduous';
    }
    return 'Permanent';
  };

  // Get color class based on tooth type/number
  const getToothColorClass = (id: number): string => {
    const lastDigit = id % 10;
    const category = getToothCategory(id);
    
    // Color scheme matching the image
    if (category === 'Permanent') {
      // Central incisors (1)
      if (lastDigit === 1) return "bg-emerald-200 hover:bg-emerald-300";
      
      // Lateral incisors (2)  
      if (lastDigit === 2) return "bg-emerald-200 hover:bg-emerald-300";
      
      // Canines (3)
      if (lastDigit === 3) return "bg-emerald-200 hover:bg-emerald-300";
      
      // First premolars (4)
      if (lastDigit === 4) return "bg-green-200 hover:bg-green-300";
      
      // Second premolars (5)
      if (lastDigit === 5) return "bg-green-200 hover:bg-green-300";
      
      // First molars (6)
      if (lastDigit === 6) return "bg-purple-200 hover:bg-purple-300";
      
      // Second molars (7)
      if (lastDigit === 7) return "bg-yellow-200 hover:bg-yellow-300";
      
      // Third molars (8)
      if (lastDigit === 8) return "bg-orange-200 hover:bg-orange-300";
    } else {
      // Deciduous teeth
      if (lastDigit === 1) return "bg-pink-200 hover:bg-pink-300"; // central incisor
      if (lastDigit === 2) return "bg-pink-200 hover:bg-pink-300"; // lateral incisor
      if (lastDigit === 3) return "bg-pink-200 hover:bg-pink-300"; // canine
      if (lastDigit === 4) return "bg-purple-200 hover:bg-purple-300"; // first molar
      if (lastDigit === 5) return "bg-gray-200 hover:bg-gray-300"; // second molar
    }
    
    return "bg-gray-200 hover:bg-gray-300";
  };

  // Handle tooth selection
  const handleToothClick = (id: number) => {
    setSelectedTeeth(prev => {
      let newSelection;
      
      if (prev.includes(id)) {
        // Remove tooth if already selected
        newSelection = prev.filter(toothId => toothId !== id);
      } else {
        // Add tooth if not already selected
        newSelection = [...prev, id];
      }
      
      // Pass selected teeth data to parent component
      const teethData: ToothData[] = newSelection.map(toothId => ({
        id: toothId,
        type: getToothType(toothId),
        category: getToothCategory(toothId)
      }));
      
      onTeethSelected(teethData);
      return newSelection;
    });
  };

  // Render a tooth with proper styling
  const renderTooth = (id: number) => {
    const isSelected = selectedTeeth.includes(id);
    const colorClass = getToothColorClass(id);
    const category = getToothCategory(id);
    const lastDigit = id % 10;
    
    // Different tooth shapes based on tooth type
    const getToothShape = () => {
      // For permanent teeth
      if (category === 'Permanent') {
        if (lastDigit === 1 || lastDigit === 2) { // incisors
          return (
            <div className="tooth-shape flex flex-col items-center">
              <div className={`w-full h-4 rounded-t-md ${colorClass}`}></div>
              <div className={`w-full h-8 ${colorClass} flex items-center justify-center`}>
                <span className="text-xs font-bold">{id}</span>
              </div>
              <div className={`w-3/4 h-3 ${colorClass} rounded-b-lg`}></div>
            </div>
          );
        } else if (lastDigit === 3) { // canines
          return (
            <div className="tooth-shape flex flex-col items-center">
              <div className={`w-full h-6 rounded-t-full ${colorClass}`}></div>
              <div className={`w-full h-8 ${colorClass} flex items-center justify-center`}>
                <span className="text-xs font-bold">{id}</span>
              </div>
              <div className={`w-3/4 h-3 ${colorClass} rounded-b-lg`}></div>
            </div>
          );
        } else if (lastDigit === 4 || lastDigit === 5) { // premolars
          return (
            <div className="tooth-shape flex flex-col items-center">
              <div className={`w-full h-5 rounded-t-lg ${colorClass} flex flex-row`}>
                <div className="w-1/2 h-full rounded-tl-lg border-r border-white"></div>
                <div className="w-1/2 h-full rounded-tr-lg"></div>
              </div>
              <div className={`w-full h-8 ${colorClass} flex items-center justify-center`}>
                <span className="text-xs font-bold">{id}</span>
              </div>
              <div className={`w-3/4 h-3 ${colorClass} rounded-b-lg`}></div>
            </div>
          );
        } else { // molars
          return (
            <div className="tooth-shape flex flex-col items-center">
              <div className={`w-full h-5 rounded-t-lg ${colorClass} grid grid-cols-2`}>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-white"></div>
                <div></div>
              </div>
              <div className={`w-full h-8 ${colorClass} flex items-center justify-center`}>
                <span className="text-xs font-bold">{id}</span>
              </div>
              <div className={`w-3/4 h-3 ${colorClass} rounded-b-lg`}></div>
            </div>
          );
        }
      } else {
        // For deciduous teeth - simpler shapes
        if (lastDigit <= 3) { // incisors and canines
          return (
            <div className="tooth-shape flex flex-col items-center">
              <div className={`w-full h-4 rounded-t-md ${colorClass}`}></div>
              <div className={`w-full h-6 ${colorClass} flex items-center justify-center`}>
                <span className="text-xs font-bold">{id}</span>
              </div>
              <div className={`w-3/4 h-2 ${colorClass} rounded-b-lg`}></div>
            </div>
          );
        } else { // molars
          return (
            <div className="tooth-shape flex flex-col items-center">
              <div className={`w-full h-4 rounded-t-lg ${colorClass} grid grid-cols-2`}>
                <div className="border-r border-b border-white"></div>
                <div className="border-b border-white"></div>
              </div>
              <div className={`w-full h-6 ${colorClass} flex items-center justify-center`}>
                <span className="text-xs font-bold">{id}</span>
              </div>
              <div className={`w-3/4 h-2 ${colorClass} rounded-b-lg`}></div>
            </div>
          );
        }
      }
    };
    
    return (
      <div 
        key={id}
        className={`tooth-container cursor-pointer transition-all duration-200 ease-in-out w-10 h-16 
          ${isSelected ? 'scale-110 z-20 shadow-lg' : ''}`}
        onClick={() => handleToothClick(id)}
      >
        <div className={`w-full h-full relative ${isSelected ? 'ring-2 ring-emerald-600' : ''}`}>
          {getToothShape()}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h3 className="text-xl font-semibold mb-6 text-center">FDI Tooth Chart</h3>
      
      <div className="relative">
        {/* Quadrant layout with cross line */}
        <div className="relative mb-8">
          {/* Horizontal dividing line */}
          <div className="absolute left-0 right-0 top-1/2 h-1 bg-black z-10"></div>
          
          {/* Vertical dividing line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-black z-10"></div>
          
          {/* Quadrant labels */}
          <div className="absolute top-2 left-4 text-sm font-semibold z-20">1<sup>st</sup> quadrant</div>
          <div className="absolute top-2 right-4 text-sm font-semibold z-20">2<sup>nd</sup> quadrant</div>
          <div className="absolute bottom-2 right-4 text-sm font-semibold z-20">3<sup>rd</sup> quadrant</div>
          <div className="absolute bottom-2 left-4 text-sm font-semibold z-20">4<sup>th</sup> quadrant</div>
          
          {/* Direction labels */}
          <div className="absolute left-0 top-1/2 transform -translate-y-8 text-sm font-semibold z-20">Right</div>
          <div className="absolute right-0 top-1/2 transform -translate-y-8 text-sm font-semibold z-20">Left</div>
          
          <div className="grid grid-cols-2 gap-1">
            {/* Upper jaw section */}
            <div className="col-span-2 grid grid-cols-2 gap-1 mb-8">
              {/* Upper right quadrant - 1st */}
              <div className="pt-12 pb-2 pr-2 pl-4">
                <div className="flex justify-end">
                  <div className="grid grid-cols-8 gap-1">
                    {[18, 17, 16, 15, 14, 13, 12, 11].map(renderTooth)}
                  </div>
                </div>
                
                {/* Upper right deciduous */}
                <div className="flex justify-end mt-4">
                  <div className="grid grid-cols-5 gap-1">
                    {[55, 54, 53, 52, 51].map(renderTooth)}
                  </div>
                </div>
              </div>
              
              {/* Upper left quadrant - 2nd */}
              <div className="pt-12 pb-2 pl-2 pr-4">
                <div className="flex justify-start">
                  <div className="grid grid-cols-8 gap-1">
                    {[21, 22, 23, 24, 25, 26, 27, 28].map(renderTooth)}
                  </div>
                </div>
                
                {/* Upper left deciduous */}
                <div className="flex justify-start mt-4">
                  <div className="grid grid-cols-5 gap-1">
                    {[61, 62, 63, 64, 65].map(renderTooth)}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Lower jaw section */}
            <div className="col-span-2 grid grid-cols-2 gap-1 mt-8">
              {/* Lower right quadrant - 4th */}
              <div className="pt-2 pb-12 pr-2 pl-4">
                {/* Lower right deciduous */}
                <div className="flex justify-end mb-4">
                  <div className="grid grid-cols-5 gap-1">
                    {[85, 84, 83, 82, 81].map(renderTooth)}
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <div className="grid grid-cols-8 gap-1">
                    {[48, 47, 46, 45, 44, 43, 42, 41].map(renderTooth)}
                  </div>
                </div>
              </div>
              
              {/* Lower left quadrant - 3rd */}
              <div className="pt-2 pb-12 pl-2 pr-4">
                {/* Lower left deciduous */}
                <div className="flex justify-start mb-4">
                  <div className="grid grid-cols-5 gap-1">
                    {[71, 72, 73, 74, 75].map(renderTooth)}
                  </div>
                </div>
                
                <div className="flex justify-start">
                  <div className="grid grid-cols-8 gap-1">
                    {[31, 32, 33, 34, 35, 36, 37, 38].map(renderTooth)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tooth type legend */}
        <div className="bg-gray-50 p-4 rounded-lg mt-10">
          <h4 className="font-medium mb-4 text-center">Tooth Type Legend</h4>
          <div className="grid grid-cols-8 border-b border-gray-300 pb-2 mb-2">
            <div className="col-span-1 text-center">
              <div className="bg-emerald-200 w-8 h-8 mx-auto mb-1 flex items-center justify-center">1</div>
              <div className="text-xs">Central incisors</div>
            </div>
            <div className="col-span-1 text-center">
              <div className="bg-emerald-200 w-8 h-8 mx-auto mb-1 flex items-center justify-center">2</div>
              <div className="text-xs">Lateral incisors</div>
            </div>
            <div className="col-span-1 text-center">
              <div className="bg-emerald-200 w-8 h-8 mx-auto mb-1 flex items-center justify-center">3</div>
              <div className="text-xs">Canines</div>
            </div>
            <div className="col-span-1 text-center">
              <div className="bg-green-200 w-8 h-8 mx-auto mb-1 flex items-center justify-center">4</div>
              <div className="text-xs">First premolars</div>
            </div>
            <div className="col-span-1 text-center">
              <div className="bg-green-200 w-8 h-8 mx-auto mb-1 flex items-center justify-center">5</div>
              <div className="text-xs">Second premolars</div>
            </div>
            <div className="col-span-1 text-center">
              <div className="bg-purple-200 w-8 h-8 mx-auto mb-1 flex items-center justify-center">6</div>
              <div className="text-xs">First molars</div>
            </div>
            <div className="col-span-1 text-center">
              <div className="bg-yellow-200 w-8 h-8 mx-auto mb-1 flex items-center justify-center">7</div>
              <div className="text-xs">Second molars</div>
            </div>
            <div className="col-span-1 text-center">
              <div className="bg-orange-200 w-8 h-8 mx-auto mb-1 flex items-center justify-center">8</div>
              <div className="text-xs">Third molars</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="font-medium mb-2">Permanent Teeth</div>
            <div className="font-medium mb-2">Deciduous Teeth</div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-emerald-200 mr-2"></div>
                <span className="text-xs">1-2: Incisors</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-emerald-200 mr-2"></div>
                <span className="text-xs">3: Canines</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-200 mr-2"></div>
                <span className="text-xs">4-5: Premolars</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-200 mr-2"></div>
                <span className="text-xs">6-8: Molars</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-pink-200 mr-2"></div>
                <span className="text-xs">1-3: Incisors & Canines</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-200 mr-2"></div>
                <span className="text-xs">4: First molars</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-200 mr-2"></div>
                <span className="text-xs">5: Second molars</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Selected teeth chips */}
        {selectedTeeth.length > 0 && (
          <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Selected Teeth:</h4>
              <button
                onClick={() => {
                  setSelectedTeeth([]);
                  onTeethSelected([]);
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedTeeth.map(id => (
                <div 
                  key={id} 
                  className="bg-emerald-100 px-3 py-1 rounded-full text-sm flex items-center"
                >
                  <span>
                    {id} ({getToothType(id)})
                  </span>
                  <button 
                    className="ml-2 text-red-500 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToothClick(id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeethChart;