'use client';

import React, { useState } from 'react';
import { RotateCcw, Baby, User } from 'lucide-react';

export interface ToothInfo {
  id: string; // e.g. "18", "11", "21", "46", "1A"
  number: number | string;
  toothName: string; // e.g. "Tooth 6", "Tooth A"
  displayName: string; // e.g. "16 - Tooth 6"
  name: string; // e.g. "Upper Right First Molar (Tooth 6)"
  category: 'Incisor' | 'Canine' | 'Premolar' | 'Molar';
  categoryCode: 'I' | 'C' | 'P' | 'M';
  color: string; // text/badge color
  bgColor: string;
  jaw: 'Upper' | 'Lower';
  side: 'Right' | 'Left';
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  width: number;
  height: number;
  rotation: number;
}

// 32 Permanent Teeth (1-8 in each quadrant)
export const PERMANENT_TEETH: ToothInfo[] = [
  // Upper Jaw - Patient Right (Quadrant 1)
  { id: '18', number: 18, toothName: 'Tooth 8', displayName: '18 - Tooth 8', name: 'Upper Right Third Molar (Tooth 8)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Right', x: 136, y: 310, labelX: 72, labelY: 310, width: 34, height: 32, rotation: -90 },
  { id: '17', number: 17, toothName: 'Tooth 7', displayName: '17 - Tooth 7', name: 'Upper Right Second Molar (Tooth 7)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Right', x: 138, y: 258, labelX: 76, labelY: 258, width: 33, height: 31, rotation: -85 },
  { id: '16', number: 16, toothName: 'Tooth 6', displayName: '16 - Tooth 6', name: 'Upper Right First Molar (Tooth 6)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Right', x: 144, y: 206, labelX: 82, labelY: 206, width: 33, height: 31, rotation: -75 },
  { id: '15', number: 15, toothName: 'Tooth 5', displayName: '15 - Tooth 5', name: 'Upper Right Second Premolar (Tooth 5)', category: 'Premolar', categoryCode: 'P', color: '#7e22ce', bgColor: '#f3e8ff', jaw: 'Upper', side: 'Right', x: 156, y: 158, labelX: 96, labelY: 146, width: 28, height: 26, rotation: -60 },
  { id: '14', number: 14, toothName: 'Tooth 4', displayName: '14 - Tooth 4', name: 'Upper Right First Premolar (Tooth 4)', category: 'Premolar', categoryCode: 'P', color: '#7e22ce', bgColor: '#f3e8ff', jaw: 'Upper', side: 'Right', x: 174, y: 120, labelX: 116, labelY: 94, width: 28, height: 26, rotation: -45 },
  { id: '13', number: 13, toothName: 'Tooth 3', displayName: '13 - Tooth 3', name: 'Upper Right Canine (Tooth 3)', category: 'Canine', categoryCode: 'C', color: '#15803d', bgColor: '#dcfce7', jaw: 'Upper', side: 'Right', x: 198, y: 88, labelX: 154, labelY: 46, width: 26, height: 26, rotation: -30 },
  { id: '12', number: 12, toothName: 'Tooth 2', displayName: '12 - Tooth 2', name: 'Upper Right Lateral Incisor (Tooth 2)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Upper', side: 'Right', x: 228, y: 68, labelX: 206, labelY: 12, width: 24, height: 26, rotation: -15 },
  { id: '11', number: 11, toothName: 'Tooth 1', displayName: '11 - Tooth 1', name: 'Upper Right Central Incisor (Tooth 1)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Upper', side: 'Right', x: 258, y: 60, labelX: 254, labelY: 0, width: 26, height: 28, rotation: -4 },

  // Upper Jaw - Patient Left (Quadrant 2)
  { id: '21', number: 21, toothName: 'Tooth 1', displayName: '21 - Tooth 1', name: 'Upper Left Central Incisor (Tooth 1)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Upper', side: 'Left', x: 290, y: 60, labelX: 296, labelY: 0, width: 26, height: 28, rotation: 4 },
  { id: '22', number: 22, toothName: 'Tooth 2', displayName: '22 - Tooth 2', name: 'Upper Left Lateral Incisor (Tooth 2)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Upper', side: 'Left', x: 320, y: 68, labelX: 344, labelY: 12, width: 24, height: 26, rotation: 15 },
  { id: '23', number: 23, toothName: 'Tooth 3', displayName: '23 - Tooth 3', name: 'Upper Left Canine (Tooth 3)', category: 'Canine', categoryCode: 'C', color: '#15803d', bgColor: '#dcfce7', jaw: 'Upper', side: 'Left', x: 350, y: 88, labelX: 396, labelY: 46, width: 26, height: 26, rotation: 30 },
  { id: '24', number: 24, toothName: 'Tooth 4', displayName: '24 - Tooth 4', name: 'Upper Left First Premolar (Tooth 4)', category: 'Premolar', categoryCode: 'P', color: '#7e22ce', bgColor: '#f3e8ff', jaw: 'Upper', side: 'Left', x: 374, y: 120, labelX: 434, labelY: 94, width: 28, height: 26, rotation: 45 },
  { id: '25', number: 25, toothName: 'Tooth 5', displayName: '25 - Tooth 5', name: 'Upper Left Second Premolar (Tooth 5)', category: 'Premolar', categoryCode: 'P', color: '#7e22ce', bgColor: '#f3e8ff', jaw: 'Upper', side: 'Left', x: 392, y: 158, labelX: 454, labelY: 146, width: 28, height: 26, rotation: 60 },
  { id: '26', number: 26, toothName: 'Tooth 6', displayName: '26 - Tooth 6', name: 'Upper Left First Molar (Tooth 6)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Left', x: 404, y: 206, labelX: 468, labelY: 206, width: 33, height: 31, rotation: 75 },
  { id: '27', number: 27, toothName: 'Tooth 7', displayName: '27 - Tooth 7', name: 'Upper Left Second Molar (Tooth 7)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Left', x: 410, y: 258, labelX: 474, labelY: 258, width: 33, height: 31, rotation: 85 },
  { id: '28', number: 28, toothName: 'Tooth 8', displayName: '28 - Tooth 8', name: 'Upper Left Third Molar (Tooth 8)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Left', x: 412, y: 310, labelX: 478, labelY: 310, width: 34, height: 32, rotation: 90 },

  // Lower Jaw - Patient Right (Quadrant 4)
  { id: '48', number: 48, toothName: 'Tooth 8', displayName: '48 - Tooth 8', name: 'Lower Right Third Molar (Tooth 8)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Right', x: 136, y: 440, labelX: 72, labelY: 440, width: 34, height: 32, rotation: 90 },
  { id: '47', number: 47, toothName: 'Tooth 7', displayName: '47 - Tooth 7', name: 'Lower Right Second Molar (Tooth 7)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Right', x: 138, y: 492, labelX: 76, labelY: 492, width: 33, height: 31, rotation: 85 },
  { id: '46', number: 46, toothName: 'Tooth 6', displayName: '46 - Tooth 6', name: 'Lower Right First Molar (Tooth 6)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Right', x: 144, y: 544, labelX: 82, labelY: 544, width: 33, height: 31, rotation: 75 },
  { id: '45', number: 45, toothName: 'Tooth 5', displayName: '45 - Tooth 5', name: 'Lower Right Second Premolar (Tooth 5)', category: 'Premolar', categoryCode: 'P', color: '#7e22ce', bgColor: '#f3e8ff', jaw: 'Lower', side: 'Right', x: 156, y: 592, labelX: 96, labelY: 604, width: 28, height: 26, rotation: 60 },
  { id: '44', number: 44, toothName: 'Tooth 4', displayName: '44 - Tooth 4', name: 'Lower Right First Premolar (Tooth 4)', category: 'Premolar', categoryCode: 'P', color: '#7e22ce', bgColor: '#f3e8ff', jaw: 'Lower', side: 'Right', x: 174, y: 630, labelX: 116, labelY: 656, width: 28, height: 26, rotation: 45 },
  { id: '43', number: 43, toothName: 'Tooth 3', displayName: '43 - Tooth 3', name: 'Lower Right Canine (Tooth 3)', category: 'Canine', categoryCode: 'C', color: '#15803d', bgColor: '#dcfce7', jaw: 'Lower', side: 'Right', x: 198, y: 662, labelX: 154, labelY: 704, width: 26, height: 26, rotation: 30 },
  { id: '42', number: 42, toothName: 'Tooth 2', displayName: '42 - Tooth 2', name: 'Lower Right Lateral Incisor (Tooth 2)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Lower', side: 'Right', x: 228, y: 682, labelX: 206, labelY: 738, width: 24, height: 26, rotation: 15 },
  { id: '41', number: 41, toothName: 'Tooth 1', displayName: '41 - Tooth 1', name: 'Lower Right Central Incisor (Tooth 1)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Lower', side: 'Right', x: 258, y: 690, labelX: 254, labelY: 750, width: 25, height: 26, rotation: 4 },

  // Lower Jaw - Patient Left (Quadrant 3)
  { id: '31', number: 31, toothName: 'Tooth 1', displayName: '31 - Tooth 1', name: 'Lower Left Central Incisor (Tooth 1)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Lower', side: 'Left', x: 290, y: 690, labelX: 296, labelY: 750, width: 25, height: 26, rotation: -4 },
  { id: '32', number: 32, toothName: 'Tooth 2', displayName: '32 - Tooth 2', name: 'Lower Left Lateral Incisor (Tooth 2)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Lower', side: 'Left', x: 320, y: 682, labelX: 344, labelY: 738, width: 24, height: 26, rotation: -15 },
  { id: '33', number: 33, toothName: 'Tooth 3', displayName: '33 - Tooth 3', name: 'Lower Left Canine (Tooth 3)', category: 'Canine', categoryCode: 'C', color: '#15803d', bgColor: '#dcfce7', jaw: 'Lower', side: 'Left', x: 350, y: 662, labelX: 396, labelY: 704, width: 26, height: 26, rotation: -30 },
  { id: '34', number: 34, toothName: 'Tooth 4', displayName: '34 - Tooth 4', name: 'Lower Left First Premolar (Tooth 4)', category: 'Premolar', categoryCode: 'P', color: '#7e22ce', bgColor: '#f3e8ff', jaw: 'Lower', side: 'Left', x: 374, y: 630, labelX: 434, labelY: 656, width: 28, height: 26, rotation: -45 },
  { id: '35', number: 35, toothName: 'Tooth 5', displayName: '35 - Tooth 5', name: 'Lower Left Second Premolar (Tooth 5)', category: 'Premolar', categoryCode: 'P', color: '#7e22ce', bgColor: '#f3e8ff', jaw: 'Lower', side: 'Left', x: 392, y: 592, labelX: 454, labelY: 604, width: 28, height: 26, rotation: -60 },
  { id: '36', number: 36, toothName: 'Tooth 6', displayName: '36 - Tooth 6', name: 'Lower Left First Molar (Tooth 6)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Left', x: 404, y: 544, labelX: 468, labelY: 544, width: 33, height: 31, rotation: -75 },
  { id: '37', number: 37, toothName: 'Tooth 7', displayName: '37 - Tooth 7', name: 'Lower Left Second Molar (Tooth 7)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Left', x: 410, y: 492, labelX: 474, labelY: 492, width: 33, height: 31, rotation: -85 },
  { id: '38', number: 38, toothName: 'Tooth 8', displayName: '38 - Tooth 8', name: 'Lower Left Third Molar (Tooth 8)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Left', x: 412, y: 440, labelX: 478, labelY: 440, width: 34, height: 32, rotation: -90 },
];

// 20 Deciduous / Primary Milk Teeth (A to E in each quadrant)
export const DECIDUOUS_TEETH: ToothInfo[] = [
  // Upper Jaw - Patient Right (Quadrant 1)
  { id: '1E', number: '1E', toothName: 'Tooth E', displayName: '1E - Tooth E', name: 'Upper Right Second Molar (Tooth E)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Right', x: 150, y: 220, labelX: 82, labelY: 220, width: 32, height: 30, rotation: -75 },
  { id: '1D', number: '1D', toothName: 'Tooth D', displayName: '1D - Tooth D', name: 'Upper Right First Molar (Tooth D)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Right', x: 168, y: 160, labelX: 104, labelY: 150, width: 30, height: 28, rotation: -60 },
  { id: '1C', number: '1C', toothName: 'Tooth C', displayName: '1C - Tooth C', name: 'Upper Right Canine (Tooth C)', category: 'Canine', categoryCode: 'C', color: '#15803d', bgColor: '#dcfce7', jaw: 'Upper', side: 'Right', x: 196, y: 110, labelX: 144, labelY: 68, width: 26, height: 26, rotation: -35 },
  { id: '1B', number: '1B', toothName: 'Tooth B', displayName: '1B - Tooth B', name: 'Upper Right Lateral Incisor (Tooth B)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Upper', side: 'Right', x: 228, y: 78, labelX: 202, labelY: 18, width: 24, height: 26, rotation: -18 },
  { id: '1A', number: '1A', toothName: 'Tooth A', displayName: '1A - Tooth A', name: 'Upper Right Central Incisor (Tooth A)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Upper', side: 'Right', x: 258, y: 68, labelX: 254, labelY: 4, width: 25, height: 28, rotation: -4 },

  // Upper Jaw - Patient Left (Quadrant 2)
  { id: '2A', number: '2A', toothName: 'Tooth A', displayName: '2A - Tooth A', name: 'Upper Left Central Incisor (Tooth A)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Upper', side: 'Left', x: 290, y: 68, labelX: 296, labelY: 4, width: 25, height: 28, rotation: 4 },
  { id: '2B', number: '2B', toothName: 'Tooth B', displayName: '2B - Tooth B', name: 'Upper Left Lateral Incisor (Tooth B)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Upper', side: 'Left', x: 320, y: 78, labelX: 348, labelY: 18, width: 24, height: 26, rotation: 18 },
  { id: '2C', number: '2C', toothName: 'Tooth C', displayName: '2C - Tooth C', name: 'Upper Left Canine (Tooth C)', category: 'Canine', categoryCode: 'C', color: '#15803d', bgColor: '#dcfce7', jaw: 'Upper', side: 'Left', x: 352, y: 110, labelX: 406, labelY: 68, width: 26, height: 26, rotation: 35 },
  { id: '2D', number: '2D', toothName: 'Tooth D', displayName: '2D - Tooth D', name: 'Upper Left First Molar (Tooth D)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Left', x: 380, y: 160, labelX: 446, labelY: 150, width: 30, height: 28, rotation: 60 },
  { id: '2E', number: '2E', toothName: 'Tooth E', displayName: '2E - Tooth E', name: 'Upper Left Second Molar (Tooth E)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Upper', side: 'Left', x: 398, y: 220, labelX: 468, labelY: 220, width: 32, height: 30, rotation: 75 },

  // Lower Jaw - Patient Right (Quadrant 4)
  { id: '4E', number: '4E', toothName: 'Tooth E', displayName: '4E - Tooth E', name: 'Lower Right Second Molar (Tooth E)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Right', x: 150, y: 530, labelX: 82, labelY: 530, width: 32, height: 30, rotation: 75 },
  { id: '4D', number: '4D', toothName: 'Tooth D', displayName: '4D - Tooth D', name: 'Lower Right First Molar (Tooth D)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Right', x: 168, y: 590, labelX: 104, labelY: 600, width: 30, height: 28, rotation: 60 },
  { id: '4C', number: '4C', toothName: 'Tooth C', displayName: '4C - Tooth C', name: 'Lower Right Canine (Tooth C)', category: 'Canine', categoryCode: 'C', color: '#15803d', bgColor: '#dcfce7', jaw: 'Lower', side: 'Right', x: 196, y: 640, labelX: 144, labelY: 682, width: 26, height: 26, rotation: 35 },
  { id: '4B', number: '4B', toothName: 'Tooth B', displayName: '4B - Tooth B', name: 'Lower Right Lateral Incisor (Tooth B)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Lower', side: 'Right', x: 228, y: 672, labelX: 202, labelY: 732, width: 24, height: 26, rotation: 18 },
  { id: '4A', number: '4A', toothName: 'Tooth A', displayName: '4A - Tooth A', name: 'Lower Right Central Incisor (Tooth A)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Lower', side: 'Right', x: 258, y: 682, labelX: 254, labelY: 746, width: 25, height: 28, rotation: 4 },

  // Lower Jaw - Patient Left (Quadrant 3)
  { id: '3A', number: '3A', toothName: 'Tooth A', displayName: '3A - Tooth A', name: 'Lower Left Central Incisor (Tooth A)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Lower', side: 'Left', x: 290, y: 682, labelX: 296, labelY: 746, width: 25, height: 28, rotation: -4 },
  { id: '3B', number: '3B', toothName: 'Tooth B', displayName: '3B - Tooth B', name: 'Lower Left Lateral Incisor (Tooth B)', category: 'Incisor', categoryCode: 'I', color: '#b45309', bgColor: '#fef3c7', jaw: 'Lower', side: 'Left', x: 320, y: 672, labelX: 348, labelY: 732, width: 24, height: 26, rotation: -18 },
  { id: '3C', number: '3C', toothName: 'Tooth C', displayName: '3C - Tooth C', name: 'Lower Left Canine (Tooth C)', category: 'Canine', categoryCode: 'C', color: '#15803d', bgColor: '#dcfce7', jaw: 'Lower', side: 'Left', x: 352, y: 640, labelX: 406, labelY: 682, width: 26, height: 26, rotation: -35 },
  { id: '3D', number: '3D', toothName: 'Tooth D', displayName: '3D - Tooth D', name: 'Lower Left First Molar (Tooth D)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Left', x: 380, y: 590, labelX: 446, labelY: 600, width: 30, height: 28, rotation: -60 },
  { id: '3E', number: '3E', toothName: 'Tooth E', displayName: '3E - Tooth E', name: 'Lower Left Second Molar (Tooth E)', category: 'Molar', categoryCode: 'M', color: '#1d4ed8', bgColor: '#dbeafe', jaw: 'Lower', side: 'Left', x: 398, y: 530, labelX: 468, labelY: 530, width: 32, height: 30, rotation: -75 },
];

export interface DiagnosedTooth {
  id: number | string;
  disease: string;
  category?: string;
}

interface DentalArchOdontogramProps {
  selectedTeethNumbers: string[];
  onToggleTooth: (toothId: string) => void;
  onSelectMultiple: (teethIds: string[]) => void;
  onClearSelection: () => void;
  diagnosedTeeth?: DiagnosedTooth[];
  onRemoveDiagnosedTooth?: (toothId: number | string) => void;
}

export default function DentalArchOdontogram({
  selectedTeethNumbers,
  onToggleTooth,
  onSelectMultiple,
  onClearSelection,
  diagnosedTeeth = [],
  onRemoveDiagnosedTooth: _onRemoveDiagnosedTooth,
}: DentalArchOdontogramProps) {
  const [dentitionType, setDentitionType] = useState<'PERMANENT' | 'DECIDUOUS'>('PERMANENT');
  const [hoveredTooth, setHoveredTooth] = useState<ToothInfo | null>(null);

  const activeTeethList = dentitionType === 'PERMANENT' ? PERMANENT_TEETH : DECIDUOUS_TEETH;

  // Map of diagnoses per tooth ID / number
  const diagnosisMap = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const dt of diagnosedTeeth) {
      const key = dt.id.toString();
      const list = map.get(key) || [];
      list.push(dt.disease);
      map.set(key, list);
    }
    return map;
  }, [diagnosedTeeth]);

  const selectUpperArch = () => {
    const upperIds = activeTeethList.filter((t) => t.jaw === 'Upper').map((t) => t.id);
    onSelectMultiple(upperIds);
  };

  const selectLowerArch = () => {
    const lowerIds = activeTeethList.filter((t) => t.jaw === 'Lower').map((t) => t.id);
    onSelectMultiple(lowerIds);
  };

  const selectAllTeeth = () => {
    onSelectMultiple(activeTeethList.map((t) => t.id));
  };

  // Helper to get formatted name of a tooth from ID
  const getToothBadgeName = (id: string) => {
    const found = [...PERMANENT_TEETH, ...DECIDUOUS_TEETH].find((t) => t.id === id);
    return found ? `${found.id} - ${found.toothName}` : id;
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col items-center p-4 sm:p-6">
      {/* Top Controls Toolbar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {/* Dentition Switcher: Permanent (1-8) vs Milk Teeth (A-E) */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setDentitionType('PERMANENT')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                dentitionType === 'PERMANENT'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User size={13} />
              Permanent (1-8)
            </button>
            <button
              type="button"
              onClick={() => setDentitionType('DECIDUOUS')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                dentitionType === 'DECIDUOUS'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Baby size={13} />
              Milk Teeth (A-E)
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={selectUpperArch}
            className="px-2.5 py-1.5 rounded-lg font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition"
          >
            Upper Arch
          </button>
          <button
            type="button"
            onClick={selectLowerArch}
            className="px-2.5 py-1.5 rounded-lg font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition"
          >
            Lower Arch
          </button>
          <button
            type="button"
            onClick={selectAllTeeth}
            className="px-2.5 py-1.5 rounded-lg font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition"
          >
            Select All
          </button>
          {selectedTeethNumbers.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="px-2.5 py-1.5 rounded-lg font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 transition flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Clear ({selectedTeethNumbers.length})
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full max-w-[560px] aspect-[580/830] select-none flex items-center justify-center my-2">
        <svg
          viewBox="-15 -35 580 830"
          className="w-full h-full drop-shadow-sm"
          style={{ maxHeight: '720px' }}
        >
          <defs>
            {/* Upper Jaw Gum & Palate Gradients */}
            <radialGradient id="palateGrad" cx="50%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#f39c9c" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#cf4a4a" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#7a1c1c" stopOpacity="0.95" />
            </radialGradient>

            <linearGradient id="upperGumArchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a32828" />
              <stop offset="85%" stopColor="#801b1b" />
              <stop offset="100%" stopColor="#4f0e0e" />
            </linearGradient>

            {/* Lower Jaw Gum & Floor Gradients */}
            <radialGradient id="tongueGrad" cx="50%" cy="55%" r="55%">
              <stop offset="0%" stopColor="#f39c9c" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#cf4a4a" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#7a1c1c" stopOpacity="0.95" />
            </radialGradient>

            <linearGradient id="lowerGumArchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4f0e0e" />
              <stop offset="15%" stopColor="#801b1b" />
              <stop offset="100%" stopColor="#a32828" />
            </linearGradient>

            {/* Tooth Enamel Gradients */}
            <radialGradient id="enamelGrad" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="65%" stopColor="#f7f7f0" />
              <stop offset="100%" stopColor="#d6d6c8" />
            </radialGradient>

            <radialGradient id="selectedToothGrad" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#eff6ff" />
              <stop offset="70%" stopColor="#bfdbfe" />
              <stop offset="100%" stopColor="#60a5fa" />
            </radialGradient>

            <filter id="toothGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#2563eb" floodOpacity="0.6" />
            </filter>

            <filter id="softShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Frame Background border */}
          <rect
            x="-10"
            y="-30"
            width="570"
            height="818"
            rx="22"
            fill="#ffffff"
            stroke="#bae6fd"
            strokeWidth="3"
          />

          {/* =====================================================================
              UPPER JAW (Palate & Maxillary Arch)
             ===================================================================== */}
          <g id="upper-jaw-group">
            <path
              d="M 112 360 C 105 180, 150 40, 275 36 C 400 40, 445 180, 438 360 C 390 380, 160 380, 112 360 Z"
              fill="url(#upperGumArchGrad)"
              filter="url(#softShadow)"
            />

            <path
              d="M 160 340 C 150 200, 190 85, 275 80 C 360 85, 400 200, 390 340 C 350 355, 200 355, 160 340 Z"
              fill="url(#palateGrad)"
            />

            <path
              d="M 275 90 L 275 320"
              stroke="#6b1515"
              strokeWidth="2.5"
              strokeDasharray="4,2"
              opacity="0.35"
            />
          </g>

          {/* Horizontal Midline Arch Separator */}
          <line
            x1="-8"
            y1="375"
            x2="558"
            y2="375"
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />

          {/* =====================================================================
              LOWER JAW (Mandibular Arch & Tongue floor)
             ===================================================================== */}
          <g id="lower-jaw-group">
            <path
              d="M 112 390 C 105 570, 150 710, 275 714 C 400 710, 445 570, 438 390 C 390 370, 160 370, 112 390 Z"
              fill="url(#lowerGumArchGrad)"
              filter="url(#softShadow)"
            />

            <path
              d="M 160 410 C 150 550, 190 665, 275 670 C 360 665, 400 550, 390 410 C 350 395, 200 395, 160 410 Z"
              fill="url(#tongueGrad)"
            />
          </g>

          {/* =====================================================================
              ANATOMICAL TEETH ELEMENTS
             ===================================================================== */}
          {activeTeethList.map((tooth) => {
            const isSelected = selectedTeethNumbers.includes(tooth.id);
            const isHovered = hoveredTooth?.id === tooth.id;
            const diagnoses = diagnosisMap.get(tooth.id) || diagnosisMap.get(tooth.number.toString());
            const hasDiagnosis = diagnoses && diagnoses.length > 0;

            return (
              <g
                key={tooth.id}
                className="cursor-pointer transition-all duration-150"
                onClick={() => onToggleTooth(tooth.id)}
                onMouseEnter={() => setHoveredTooth(tooth)}
                onMouseLeave={() => setHoveredTooth(null)}
              >
                {/* Click Target Hitbox (larger than tooth) */}
                <circle
                  cx={tooth.x}
                  cy={tooth.y}
                  r="25"
                  fill="transparent"
                />

                {/* Tooth Shape Transformation */}
                <g
                  transform={`translate(${tooth.x}, ${tooth.y}) rotate(${tooth.rotation})`}
                  filter={isSelected ? 'url(#toothGlow)' : 'url(#softShadow)'}
                >
                  {/* Outer selection ring if selected */}
                  {isSelected && (
                    <rect
                      x={-tooth.width / 2 - 3}
                      y={-tooth.height / 2 - 3}
                      width={tooth.width + 6}
                      height={tooth.height + 6}
                      rx={tooth.category === 'Molar' ? 8 : tooth.category === 'Premolar' ? 6 : 4}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                      className="animate-pulse"
                    />
                  )}

                  {/* Main Tooth Body */}
                  <rect
                    x={-tooth.width / 2}
                    y={-tooth.height / 2}
                    width={tooth.width}
                    height={tooth.height}
                    rx={tooth.category === 'Molar' ? 6 : tooth.category === 'Premolar' ? 5 : 4}
                    fill={isSelected ? 'url(#selectedToothGrad)' : 'url(#enamelGrad)'}
                    stroke={
                      isSelected
                        ? '#1d4ed8'
                        : isHovered
                        ? '#3b82f6'
                        : hasDiagnosis
                        ? '#dc2626'
                        : '#94a3b8'
                    }
                    strokeWidth={isSelected ? '2.5' : isHovered ? '2' : hasDiagnosis ? '2' : '1.2'}
                  />

                  {/* Anatomical Grooves */}
                  {tooth.category === 'Molar' && (
                    <g stroke="#94a3b8" strokeWidth="1" opacity="0.6">
                      <line x1={-tooth.width / 3} y1="0" x2={tooth.width / 3} y2="0" />
                      <line x1="0" y1={-tooth.height / 3} x2="0" y2={tooth.height / 3} />
                      <circle cx="0" cy="0" r="1.5" fill="#64748b" />
                    </g>
                  )}

                  {tooth.category === 'Premolar' && (
                    <g stroke="#94a3b8" strokeWidth="1" opacity="0.6">
                      <line x1={-tooth.width / 4} y1="0" x2={tooth.width / 4} y2="0" />
                      <circle cx="0" cy="0" r="1.2" fill="#64748b" />
                    </g>
                  )}

                  {tooth.category === 'Canine' && (
                    <polygon
                      points={`0,${-tooth.height / 4} 3,${tooth.height / 4} -3,${tooth.height / 4}`}
                      fill="#cbd5e1"
                      opacity="0.4"
                    />
                  )}

                  {tooth.category === 'Incisor' && (
                    <line
                      x1={-tooth.width / 3}
                      y1={tooth.jaw === 'Upper' ? -tooth.height / 3 : tooth.height / 3}
                      x2={tooth.width / 3}
                      y2={tooth.jaw === 'Upper' ? -tooth.height / 3 : tooth.height / 3}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  )}
                </g>

                {/* Number Badge Label: Shows FDI Number + Dropdown Name (e.g. 16 \n Tooth 6) completely outside mouth */}
                <text
                  x={tooth.labelX}
                  textAnchor="middle"
                  className="transition-colors pointer-events-none select-none"
                >
                  <tspan
                    x={tooth.labelX}
                    y={tooth.labelY - 6}
                    fontSize="13"
                    fontWeight={isSelected || isHovered ? '800' : '700'}
                    fill={isSelected ? '#2563eb' : tooth.color}
                  >
                    {tooth.id}
                  </tspan>
                  <tspan
                    x={tooth.labelX}
                    y={tooth.labelY + 8}
                    fontSize="9.5"
                    fontWeight="700"
                    fill={isSelected ? '#1d4ed8' : '#64748b'}
                  >
                    {tooth.toothName}
                  </tspan>
                </text>

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <circle
                    cx={tooth.x}
                    cy={tooth.y}
                    r="8"
                    fill="#2563eb"
                  />
                )}
                {isSelected && (
                  <path
                    d={`M ${tooth.x - 3.5} ${tooth.y} L ${tooth.x - 1} ${tooth.y + 2.5} L ${tooth.x + 3.5} ${tooth.y - 2}`}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Has Diagnosis Red Dot indicator */}
                {hasDiagnosis && !isSelected && (
                  <circle
                    cx={tooth.x + tooth.width / 3}
                    cy={tooth.y - tooth.height / 3}
                    r="4.5"
                    fill="#dc2626"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                  />
                )}
              </g>
            );
          })}

          {/* =====================================================================
              ANATOMICAL ANNOTATIONS & LABELS
             ===================================================================== */}
          <text
            x="14"
            y="368"
            fontSize="13"
            fontWeight="800"
            fill="#334155"
            textAnchor="middle"
          >
            Right
          </text>
          <text
            x="14"
            y="386"
            fontSize="13"
            fontWeight="800"
            fill="#334155"
            textAnchor="middle"
          >
            Side
          </text>

          <text
            x="536"
            y="368"
            fontSize="13"
            fontWeight="800"
            fill="#334155"
            textAnchor="middle"
          >
            Left
          </text>
          <text
            x="536"
            y="386"
            fontSize="13"
            fontWeight="800"
            fill="#334155"
            textAnchor="middle"
          >
            Side
          </text>

          <text
            x="538"
            y="-8"
            fontSize="13"
            fontWeight="800"
            fill="#475569"
            textAnchor="end"
          >
            Upper jaw
          </text>

          <text
            x="538"
            y="760"
            fontSize="13"
            fontWeight="800"
            fill="#475569"
            textAnchor="end"
          >
            Lower jaw
          </text>
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredTooth && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-900/95 text-white text-xs px-3 py-2 rounded-xl shadow-xl backdrop-blur-sm border border-slate-700 space-y-0.5"
            style={{
              left: `${((hoveredTooth.x - (-15)) / 580) * 100}%`,
              top: `${((hoveredTooth.y - (-35)) / 830) * 100}%`,
              transform: 'translate(-50%, -130%)',
            }}
          >
            <div className="font-bold flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: hoveredTooth.color }}
              />
              {hoveredTooth.displayName}
            </div>
            <div className="text-[11px] text-slate-300">{hoveredTooth.name}</div>
            <div className="text-[10px] text-slate-400 capitalize">
              {hoveredTooth.jaw} Jaw • {hoveredTooth.side} Side • {hoveredTooth.category}
            </div>
            {(diagnosisMap.has(hoveredTooth.id) || diagnosisMap.has(hoveredTooth.number.toString())) && (
              <div className="text-[11px] text-rose-300 font-semibold pt-0.5 border-t border-slate-700 mt-1">
                ⚠️ Diagnosis: {(diagnosisMap.get(hoveredTooth.id) || diagnosisMap.get(hoveredTooth.number.toString()))?.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Color Legend Bar (Outside SVG Canvas to prevent any overlapping) */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold">
        <span className="flex items-center gap-1.5 text-amber-800">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
          I - Incisors (1, 2 / A, B)
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1.5 text-emerald-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          C - Canines (3 / C)
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1.5 text-purple-800">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
          P - Premolars (4, 5)
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1.5 text-emerald-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
          M - Molars (6, 7, 8 / D, E)
        </span>
      </div>

      {/* Selected Teeth Summary Bar with exact dropdown name (e.g. 16 - Tooth 6) */}
      <div className="w-full mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700">Selected Teeth:</span>
          {selectedTeethNumbers.length === 0 ? (
            <span className="text-xs text-slate-400 italic">None (click teeth on the arch above)</span>
          ) : (
            selectedTeethNumbers.map((id) => (
              <span
                key={id}
                onClick={() => onToggleTooth(id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 cursor-pointer hover:bg-rose-100 hover:text-rose-700 transition shadow-sm"
                title="Click to remove from selection"
              >
                {getToothBadgeName(id)}
                <span className="text-[11px] font-extrabold ml-0.5">&times;</span>
              </span>
            ))
          )}
        </div>

        {selectedTeethNumbers.length > 0 && (
          <span className="text-xs font-semibold text-emerald-700">
            {selectedTeethNumbers.length} tooth{selectedTeethNumbers.length > 1 ? 's' : ''} ready for diagnosis
          </span>
        )}
      </div>
    </div>
  );
}
