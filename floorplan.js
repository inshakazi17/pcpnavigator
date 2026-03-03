import { useRef, useEffect, useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from './ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

const roomTypeColors = {
  'lab': '#3b82f6',
  'classroom': '#22c55e',
  'office': '#8b5cf6',
  'staff-room': '#f59e0b',
  'washroom': '#64748b',
  'seminar-hall': '#ec4899',
  'drawing-hall': '#06b6d4',
  'sports': '#ef4444',
  'common-room': '#84cc16',
  'learning-center': '#f97316',
  'default': '#94a3b8'
};

const directionArrows = {
  'forward': '↑',
  'back': '↓',
  'left': '←',
  'right': '→',
  'stairs-up': '⬆',
  'stairs-down': '⬇',
  'arrive': '🎯'
};

export function FloorPlan({ wings, rooms, favorites, onToggleFavorite }) {
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const {
    selectedWing,
    selectedFloor,
    setSelectedFloor,
    selectedRoom,
    setSelectedRoom,
    isNavigating,
    navigationPath,
    currentStepIndex
  } = useNavigation();

  const floorRooms = rooms.filter(
    r => r.wing_id === selectedWing?.id && r.floor === selectedFloor
  );

  useEffect(() => {
    const updateSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setCanvasSize({
          width: Math.max(container.offsetWidth - 40, 600),
          height: Math.max(container.offsetHeight - 100, 400)
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    drawFloorPlan();
  }, [floorRooms, selectedRoom, isNavigating, navigationPath, currentStepIndex, canvasSize]);

  const drawFloorPlan = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw corridor
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, canvas.height / 2 - 30, canvas.width, 60);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, canvas.height / 2 - 30, canvas.width, 60);
    ctx.fillStyle = '#92400e';
    ctx.font = '14px Public Sans';
    ctx.textAlign = 'center';
    ctx.fillText('CORRIDOR', canvas.width / 2, canvas.height / 2 + 5);

    // Draw rooms
    floorRooms.forEach((room) => {
      const isSelected = selectedRoom?.id === room.id;
      const isFavorite = favorites.some(f => f.room_id === room.id);
      const color = roomTypeColors[room.room_type] || roomTypeColors.default;

      // Room background
      ctx.fillStyle = isSelected ? color : `${color}33`;
      ctx.fillRect(room.x, room.y, room.width, room.height);

      // Room border
      ctx.strokeStyle = isSelected ? '#0f172a' : color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(room.x, room.y, room.width, room.height);

      // Room name
      ctx.fillStyle = isSelected ? '#ffffff' : '#0f172a';
      ctx.font = `bold 12px Space Grotesk`;
      ctx.textAlign = 'center';
      const lines = wrapText(ctx, room.name, room.width - 10);
      lines.forEach((line, i) => {
        ctx.fillText(line, room.x + room.width / 2, room.y + 20 + i * 14);
      });

      // Room number
      ctx.fillStyle = isSelected ? '#e2e8f0' : '#64748b';
      ctx.font = '10px Public Sans';
      ctx.fillText(room.room_number, room.x + room.width / 2, room.y + room.height - 8);

      // Favorite indicator
      if (isFavorite) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '16px sans-serif';
        ctx.fillText('♥', room.x + room.width - 12, room.y + 16);
      }
    });

    // Draw navigation path and arrows
    if (isNavigating && navigationPath) {
      const currentStep = navigationPath.steps[currentStepIndex];

      // Draw path line
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();

      navigationPath.steps.forEach((step, index) => {
        if (step.floor === selectedFloor) {
          if (index === 0) {
            ctx.moveTo(step.x, step.y);
          } else {
            ctx.lineTo(step.x, step.y);
          }
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw animated arrow at current step
      if (currentStep && currentStep.floor === selectedFloor) {
        drawAnimatedArrow(ctx, currentStep.x, currentStep.y, currentStep.direction);
      }
    }

    // Draw stairs indicators
    drawStairs(ctx, 30, canvas.height / 2 - 60, 'UP');
    drawStairs(ctx, canvas.width - 70, canvas.height / 2 - 60, 'DN');
  };

  const drawAnimatedArrow = (ctx, x, y, direction) => {
    const time = Date.now() / 500;
    const pulse = Math.sin(time) * 5;

    ctx.save();
    ctx.translate(x, y);

    // Glow effect
    ctx.shadowColor = '#ea580c';
    ctx.shadowBlur = 15 + pulse;

    // Arrow background circle
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(0, 0, 20 + pulse/2, 0, Math.PI * 2);
    ctx.fill();

    // Arrow symbol
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(directionArrows[direction] || '→', 0, 0);

    ctx.restore();

    // Request next frame for animation
    if (isNavigating) {
      requestAnimationFrame(() => drawFloorPlan());
    }
  };

  const drawStairs = (ctx, x, y, label) => {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x, y, 40, 40);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 40, 40);

    // Stairs lines
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 10 + i * 8);
      ctx.lineTo(x + 35, y + 10 + i * 8);
      ctx.stroke();
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px Public Sans';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + 20, y + 52);
  };

  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    lines.push(currentLine);
    return lines.slice(0, 2);
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedRoom = floorRooms.find(room =>
      x >= room.x && x <= room.x + room.width &&
      y >= room.y && y <= room.y + room.height
    );

    if (clickedRoom) {
      setSelectedRoom(clickedRoom);
    } else {
      setSelectedRoom(null);
    }
  };

  const maxFloor = selectedWing ? Math.max(...selectedWing.floors) : 0;
  const minFloor = selectedWing ? Math.min(...selectedWing.floors) : 0;

  return (
    <div className="floor-plan-container" data-testid="floor-plan">
      {/* Floor selector */}
      <div className="floor-selector glass">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedFloor(Math.min(selectedFloor + 1, maxFloor))}
          disabled={selectedFloor >= maxFloor}
          className="p-2"
          data-testid="floor-up"
        >
          <ChevronUp size={20} />
        </Button>
        <div className="floor-indicator">
          <span className="floor-number">{selectedFloor}</span>
          <span className="floor-label">Floor</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedFloor(Math.max(selectedFloor - 1, minFloor))}
          disabled={selectedFloor <= minFloor}
          className="p-2"
          data-testid="floor-down"
        >
          <ChevronDown size={20} />
        </Button>
      </div>

      {/* Wing info */}
      <div className="wing-info glass">
        <h2 className="wing-name">{selectedWing?.name}</h2>
        <p className="wing-dept">{selectedWing?.department}</p>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleCanvasClick}
        className="floor-canvas"
        data-testid="floor-canvas"
      />

      {/* Legend */}
      <div className="floor-legend glass">
        <h4>Room Types</h4>
        <div className="legend-items">
          {Object.entries(roomTypeColors).slice(0, -1).map(([type, color]) => (
            <div key={type} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: color }} />
              <span>{type.replace('-', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
