import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AmbientSoundType, soundService } from '../services/soundService';
import { formatTimerDisplay } from '../utils/dateUtils';

const AMBIENT_OPTIONS: Array<{ id: AmbientSoundType; label: string }> = [
  { id: 'none', label: 'Silent (Off)' },
  { id: 'soft_rain', label: 'Soft Rain' },
  { id: 'warm_drone', label: 'Warm Binaural Drone' },
  { id: 'white_noise', label: 'Filtered White Noise' },
];

export const FocusRoomPage: React.FC = () => {
  const { timer, tasks, subjects } = useApp();
  const navigate = useNavigate();

  // Ambient sound is strictly user-initiated and never autoplays
  const [ambientType, setAmbientType] = useState<AmbientSoundType>(() =>
    soundService.getCurrentSound()
  );
  const [volume, setVolume] = useState<number>(() => soundService.getVolume());

  useEffect(() => {
    return () => {
      // Stop ambient audio when leaving Focus Room
      soundService.stopAmbient();
    };
  }, []);

  const handleSoundSelect = (nextType: AmbientSoundType) => {
    setAmbientType(nextType);
    soundService.startAmbient(nextType);
  };

  const handleVolumeChange = (nextVol: number) => {
    setVolume(nextVol);
    soundService.setVolume(nextVol);
  };

  const selectedTask = tasks.find((t) => t.id === timer.selectedTaskId);
  const selectedSubject = subjects.find((s) => s.id === timer.selectedSubjectId);

  const progressPct =
    timer.totalDurationSeconds > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((timer.totalDurationSeconds - timer.remainingSeconds) /
                timer.totalDurationSeconds) *
                100
            )
          )
        )
      : 0;

  return (
    <div className="min-h-[calc(100vh-8rem)] rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 p-6 sm:p-10 flex flex-col justify-between">
      {/* Top Bar: Minimal Context & Exit Focus Room */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-200">Focus Room</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{timer.mode.replace('_', ' ')}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{progressPct}% elapsed</span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/timer')}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Minimize2 className="h-3.5 w-3.5" />
          <span>Exit Focus Room</span>
        </button>
      </div>

      {/* Center Focal Anchor: Large Countdown & Task/Subject */}
      <div className="my-12 flex flex-col items-center text-center max-w-xl mx-auto w-full">
        <div className="mb-4 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-2">
          <span>
            Subject:{' '}
            <strong className="text-slate-200 font-medium">
              {selectedSubject ? selectedSubject.name : 'General Study'}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Task:{' '}
            <strong className="text-slate-200 font-medium">
              {selectedTask ? selectedTask.title : 'Unassigned Focus Block'}
            </strong>
          </span>
        </div>

        <div
          data-testid="focus-room-countdown"
          className="text-7xl sm:text-8xl md:text-9xl font-bold font-mono tabular-nums tracking-tight text-white select-none"
        >
          {formatTimerDisplay(timer.remainingSeconds)}
        </div>

        {/* Thin Linear Progress Indicator */}
        <div className="mt-8 w-full max-w-md h-1.5 rounded-full bg-slate-900 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Minimal Controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
          {timer.status === 'idle' || timer.status === 'completed' ? (
            <button
              type="button"
              onClick={timer.startTimer}
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Start Session</span>
            </button>
          ) : timer.status === 'running' ? (
            <button
              type="button"
              onClick={timer.pauseTimer}
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors"
            >
              <Pause className="h-4 w-4 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={timer.resumeTimer}
              className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Resume</span>
            </button>
          )}

          <button
            type="button"
            onClick={timer.resetTimer}
            disabled={timer.status === 'idle'}
            className="inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-40 rounded-xl transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Bottom User-Controlled Ambient Sound Bar */}
      <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 mr-1 flex items-center gap-1.5">
            {ambientType === 'none' ? (
              <VolumeX className="h-4 w-4 text-slate-500" />
            ) : (
              <Volume2 className="h-4 w-4 text-blue-400" />
            )}
            <span>Ambient Sound:</span>
          </span>
          {AMBIENT_OPTIONS.map((opt) => {
            const active = ambientType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSoundSelect(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {ambientType !== 'none' && (
          <div className="flex items-center gap-3">
            <label htmlFor="ambient-volume-slider" className="text-xs text-slate-400">
              Volume
            </label>
            <input
              id="ambient-volume-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-28 accent-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};
