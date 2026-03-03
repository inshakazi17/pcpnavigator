import { useNavigation } from '../contexts/NavigationContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import {
  X, ChevronLeft, ChevronRight, Volume2, VolumeX,
  Navigation, MapPin, Clock, Footprints
} from 'lucide-react';

const directionIcons = {
  'forward': '↑',
  'back': '↓',
  'left': '←',
  'right': '→',
  'stairs-up': '⬆️',
  'stairs-down': '⬇️',
  'arrive': '🎯'
};

export function NavigationPanel() {
  const {
    navigationPath,
    currentStepIndex,
    voiceEnabled,
    setVoiceEnabled,
    nextStep,
    prevStep,
    endNavigation,
    speak
  } = useNavigation();

  if (!navigationPath) return null;

  const currentStep = navigationPath.steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / navigationPath.steps.length) * 100;

  const handleRepeatInstruction = () => {
    if (navigationPath.voice_instructions?.[currentStepIndex]) {
      speak(navigationPath.voice_instructions[currentStepIndex]);
    }
  };

  return (
    <div className="navigation-panel glass" data-testid="navigation-panel">
      <Card className="p-4 shadow-xl border-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Navigation size={20} className="text-orange-600" />
            <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk' }}>
              Navigation
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`h-8 w-8 p-0 ${voiceEnabled ? 'text-orange-600' : 'text-slate-400'}`}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={endNavigation}
              className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
              data-testid="end-navigation"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Route Summary */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
          <MapPin size={14} />
          <span className="font-medium">{navigationPath.from_room}</span>
          <span>→</span>
          <span className="font-medium">{navigationPath.to_room}</span>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4 p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Footprints size={16} className="text-orange-600" />
            <span className="text-sm font-medium">{navigationPath.total_distance}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-orange-600" />
            <span className="text-sm font-medium">{navigationPath.estimated_time}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Step {currentStepIndex + 1} of {navigationPath.steps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Step */}
        <div className="p-4 bg-slate-900 rounded-xl text-white mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center text-2xl">
              {directionIcons[currentStep?.direction] || '→'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-lg">{currentStep?.instruction}</p>
              {currentStep?.floor !== undefined && (
                <p className="text-sm text-slate-300">Floor {currentStep.floor}</p>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="flex-1 gap-2"
            data-testid="prev-step"
          >
            <ChevronLeft size={18} />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleRepeatInstruction}
            className="px-3"
            data-testid="repeat-instruction"
          >
            <Volume2 size={18} />
          </Button>
          <Button
            onClick={nextStep}
            disabled={currentStepIndex >= navigationPath.steps.length - 1}
            className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700"
            data-testid="next-step"
          >
            Next
            <ChevronRight size={18} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
