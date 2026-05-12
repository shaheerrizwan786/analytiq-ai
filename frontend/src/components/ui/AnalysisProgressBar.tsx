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
  stageMessages?: Record<ProgressStage, string>;
}

const STAGE_CONFIG = {
  google: {
    label: 'Google',
    icon: '🔍',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  tripadvisor: {
    label: 'TripAdvisor',
    icon: '🦉',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  yelp: {
    label: 'Yelp',
    icon: '⭐',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  insights: {
    label: 'Insights',
    icon: '🧠',
    color: 'from-violet-500 to-violet-600',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  complete: {
    label: 'Complete',
    icon: '✓',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
};

export default function AnalysisProgressBar({
  currentStage,
  stageStatuses,
  stageMessages = {},
}: AnalysisProgressBarProps) {
  const stages: ProgressStage[] = ['google', 'tripadvisor', 'yelp'];

  const getStageIndex = (stage: ProgressStage): number => {
    return stages.indexOf(stage);
  };

  const currentIndex = getStageIndex(currentStage);
  const progressPercentage = currentStage === 'complete'
    ? 100
    : ((currentIndex + 1) / stages.length) * 100;

  return (
    <div className="w-full space-y-8">
      {/* Progress bar */}
      <div className="relative pb-20">
        {/* Background track */}
        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          {/* Active progress */}
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Stage indicators */}
        <div className="absolute top-0 left-0 w-full flex justify-between items-start -mt-1">
          {stages.map((stage, index) => {
            const config = STAGE_CONFIG[stage];
            const status = stageStatuses[stage];
            const isActive = currentStage === stage;
            const isCompleted = status === 'completed';
            const isFailed = status === 'failed';
            const isSkipped = status === 'skipped';
            const isPending = status === 'pending';

            return (
              <div
                key={stage}
                className="flex flex-col items-center flex-1 min-w-0 px-2"
              >
                {/* Circle indicator */}
                <div
                  className={`
                    relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg
                    transition-all duration-300 border-2 flex-shrink-0
                    ${isCompleted ? `bg-gradient-to-br ${config.color} border-transparent shadow-lg` : ''}
                    ${isActive ? `${config.bgColor} ${config.borderColor} animate-pulse` : ''}
                    ${isFailed ? 'bg-red-500/10 border-red-500/30' : ''}
                    ${isSkipped ? 'bg-gray-500/10 border-gray-500/30' : ''}
                    ${isPending ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700' : ''}
                  `}
                >
                  {isCompleted && <span className="text-white">✓</span>}
                  {isFailed && <span className="text-red-500 font-bold">✗</span>}
                  {isSkipped && <span className="text-gray-500">−</span>}
                  {(isActive || isPending) && <span>{config.icon}</span>}
                </div>

                {/* Label */}
                <div className="mt-3 text-center w-full">
                  <p
                    className={`
                      text-xs font-medium transition-colors whitespace-nowrap
                      ${isActive ? 'text-violet-600 dark:text-violet-400' : ''}
                      ${isCompleted ? 'text-gray-700 dark:text-gray-300' : ''}
                      ${isFailed ? 'text-red-600 dark:text-red-400' : ''}
                      ${isSkipped ? 'text-gray-500 dark:text-gray-500' : ''}
                      ${isPending ? 'text-gray-400 dark:text-gray-600' : ''}
                    `}
                  >
                    {config.label}
                  </p>
                  <div className="mt-1.5 min-h-[3rem] flex items-start justify-center">
                    {isFailed && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 leading-tight text-center">
                        No page<br />found
                      </p>
                    )}
                    {isSkipped && !isFailed && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 leading-tight">
                        Skipped
                      </p>
                    )}
                    {!isFailed && !isSkipped && stageMessages[stage] && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 leading-tight text-center break-words">
                        {stageMessages[stage]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current status message */}
      {currentStage !== 'complete' && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400 -mt-4">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
          <span>
            {currentStage === 'google' && 'Fetching Google reviews...'}
            {currentStage === 'tripadvisor' && 'Fetching TripAdvisor reviews...'}
            {currentStage === 'yelp' && 'Fetching Yelp reviews...'}
            {currentStage === 'insights' && 'Generating insights...'}
          </span>
        </div>
      )}

      {currentStage === 'complete' && (
        <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 -mt-4">
          <span className="text-lg">✓</span>
          <span className="font-medium">Analysis complete!</span>
        </div>
      )}
    </div>
  );
}
