'use client';

import { useEffect, useState } from 'react';

export type ProgressStage = 'google' | 'tripadvisor' | 'yelp' | 'insights' | 'complete';
export type StageStatus = 'pending' | 'started' | 'completed' | 'failed' | 'skipped';

interface StageProgress {
  stage: ProgressStage;
  status: StageStatus;
  message?: string;
}

interface AnalysisProgressBarProps {
  currentStage: ProgressStage;
  stageStatuses: Record<ProgressStage, StageStatus>;
  stageMessages?: Partial<Record<ProgressStage, string>>;
}

const STAGE_CONFIG = {
  google: {
    label: 'Google Reviews',
    icon: '🔍',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-100',
    darkColor: 'bg-blue-900/30',
    textColor: 'text-blue-600',
    darkTextColor: 'text-blue-400',
  },
  tripadvisor: {
    label: 'TripAdvisor Reviews',
    icon: '🦉',
    color: 'bg-green-500',
    lightColor: 'bg-green-100',
    darkColor: 'bg-green-900/30',
    textColor: 'text-green-600',
    darkTextColor: 'text-green-400',
  },
  yelp: {
    label: 'Yelp Reviews',
    icon: '⭐',
    color: 'bg-red-500',
    lightColor: 'bg-red-100',
    darkColor: 'bg-red-900/30',
    textColor: 'text-red-600',
    darkTextColor: 'text-red-400',
  },
};

export default function AnalysisProgressBar({
  currentStage,
  stageStatuses,
  stageMessages = {},
}: AnalysisProgressBarProps) {
  const stages: ProgressStage[] = ['google', 'tripadvisor', 'yelp'];

  const getStatusIcon = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'failed':
      case 'skipped':
        return '✗';
      case 'started':
        return '⋯';
      default:
        return '○';
    }
  };

  const getStatusText = (stage: ProgressStage, status: StageStatus) => {
    if (status === 'completed') return 'Completed';
    if (status === 'failed') return 'No page found';
    if (status === 'skipped') return 'Skipped';
    if (status === 'started') return 'Searching...';
    return 'Waiting...';
  };

  const getProgressPercentage = (status: StageStatus) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'started':
        return 50;
      case 'failed':
      case 'skipped':
        return 100;
      default:
        return 0;
    }
  };

  // Check if we're in insights stage
  const isInsightsStage = currentStage === 'insights' || currentStage === 'complete';

  return (
    <div className="w-full space-y-6">
      {/* Individual progress bars for each platform */}
      <div className="space-y-4">
        {stages.map((stage) => {
          const config = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG];
          const status = stageStatuses[stage];
          const progress = getProgressPercentage(status);
          const isActive = status === 'started';
          const isCompleted = status === 'completed';
          const isFailed = status === 'failed' || status === 'skipped';

          return (
            <div key={stage} className="space-y-2">
              {/* Stage header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{config.icon}</span>
                  <span className={`text-sm font-medium ${
                    isCompleted ? 'text-gray-700 dark:text-gray-300' :
                    isActive ? `${config.textColor} dark:${config.darkTextColor}` :
                    isFailed ? 'text-red-600 dark:text-red-400' :
                    'text-gray-500 dark:text-gray-500'
                  }`}>
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${
                    isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                    isActive ? `${config.textColor} dark:${config.darkTextColor}` :
                    isFailed ? 'text-red-600 dark:text-red-400' :
                    'text-gray-400 dark:text-gray-600'
                  }`}>
                    {getStatusText(stage, status)}
                  </span>
                  <span className={`text-sm ${
                    isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                    isFailed ? 'text-red-600 dark:text-red-400' :
                    'text-gray-400 dark:text-gray-600'
                  }`}>
                    {getStatusIcon(status)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    isCompleted ? 'bg-emerald-500' :
                    isFailed ? 'bg-red-500' :
                    config.color
                  } ${isActive ? 'animate-pulse' : ''}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Status message */}
              {stageMessages[stage] && (
                <p className="text-xs text-gray-500 dark:text-gray-500 pl-7">
                  {stageMessages[stage]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall status */}
      {isInsightsStage && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-center gap-2">
            {currentStage === 'insights' && (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                <span className="text-sm text-[var(--accent)] dark:text-[var(--dk-accent2)] font-medium">
                  Generating insights...
                </span>
              </>
            )}
            {currentStage === 'complete' && (
              <>
                <span className="text-lg text-emerald-600 dark:text-emerald-400">✓</span>
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  Analysis complete!
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
