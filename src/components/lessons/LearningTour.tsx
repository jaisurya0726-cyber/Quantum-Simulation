import React, { useState } from 'react';
import { LESSONS } from '../../data/lessonsData';
import { AppMode } from '../../types';
import { soundEngine } from '../../utils/audio';
import { GraduationCap, ArrowRight, ArrowLeft, RotateCcw, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface LearningTourProps {
  onSelectComponent: (id: string) => void;
  onSwitchMode: (mode: AppMode) => void;
  onExitTour: () => void;
}

export const LearningTour: React.FC<LearningTourProps> = ({
  onSelectComponent,
  onSwitchMode,
  onExitTour,
}) => {
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState<boolean>(false);

  const lesson = LESSONS[currentLessonIndex];

  const handleLessonChange = (newIndex: number) => {
    soundEngine.playClick(900);
    setCurrentLessonIndex(newIndex);
    setSelectedQuizOption(null);
    setShowQuizResult(false);

    const targetLesson = LESSONS[newIndex];
    if (targetLesson.recommendedMode) {
      onSwitchMode(targetLesson.recommendedMode);
    }
    if (targetLesson.targetComponentId) {
      onSelectComponent(targetLesson.targetComponentId);
    }
  };

  const handleSelectQuizOption = (optIdx: number) => {
    soundEngine.playClick(800);
    setSelectedQuizOption(optIdx);
    setShowQuizResult(true);
  };

  return (
    <div id="learning-tour-panel" className="flex flex-col h-full w-full bg-black/40 text-slate-100 border-l border-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-widest text-white uppercase">QUANTUM ACADEMY</h2>
            <p className="text-[9px] font-mono tracking-wider text-cyan-400">Lesson {lesson.id} of {LESSONS.length} • Interactive Guide</p>
          </div>
        </div>

        <button
          onClick={onExitTour}
          className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition-all"
        >
          Exit Tour
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Lesson Progress Bar */}
        <div className="flex items-center gap-1.5">
          {LESSONS.map((l, idx) => (
            <button
              key={l.id}
              onClick={() => handleLessonChange(idx)}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                idx === currentLessonIndex
                  ? 'bg-cyan-400 shadow-[0_0_10px_#06b6d4]'
                  : idx < currentLessonIndex
                  ? 'bg-cyan-700/60'
                  : 'bg-white/10'
              }`}
              title={l.title}
            />
          ))}
        </div>

        {/* Lesson Body */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3.5">
          <div>
            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">LESSON 0{lesson.id}</span>
            <h3 className="text-sm font-bold text-white tracking-wide">{lesson.title}</h3>
            <p className="text-xs text-cyan-300 font-mono mt-0.5">{lesson.subtitle}</p>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2.5">
            {lesson.summary}
          </p>

          {/* Key Bullet Points */}
          <div className="space-y-2 pt-1">
            <h4 className="text-[9px] font-mono tracking-widest font-semibold text-slate-400 uppercase">KEY CONCEPTS</h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {lesson.keyPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0 shadow-[0_0_6px_#06b6d4]" />
                  <span className="leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Hint */}
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-200">
            <span className="font-bold text-cyan-300 block mb-0.5 text-[10px] uppercase tracking-wider">TRY THIS IN 3D:</span>
            {lesson.interactivePrompt}
          </div>

          {/* Interactive Knowledge Quiz Check */}
          {lesson.quiz && (
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2.5 pt-3">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-300">
                <HelpCircle className="w-4 h-4" />
                <span className="text-[10px] tracking-wider uppercase">KNOWLEDGE CHECK</span>
              </div>
              <p className="text-xs text-white">{lesson.quiz.question}</p>

              <div className="space-y-1.5">
                {lesson.quiz.options.map((opt, optIdx) => {
                  const isSelected = selectedQuizOption === optIdx;
                  const isCorrect = optIdx === lesson.quiz?.correctIndex;

                  let optClass = 'border-white/5 bg-white/5 hover:border-white/10 text-slate-300';
                  if (showQuizResult) {
                    if (isCorrect) {
                      optClass = 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200 font-semibold';
                    } else if (isSelected && !isCorrect) {
                      optClass = 'border-rose-500/60 bg-rose-500/10 text-rose-200';
                    }
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectQuizOption(optIdx)}
                      className={`w-full p-2.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${optClass}`}
                    >
                      <span>{opt}</span>
                      {showQuizResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {showQuizResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {showQuizResult && (
                <div className="p-3 rounded-lg bg-black/60 text-[11px] text-slate-300 font-mono border border-white/10 mt-2">
                  <span className="font-bold text-cyan-400 block mb-0.5 uppercase tracking-wider">EXPLANATION:</span>
                  {lesson.quiz.explanation}
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <button
              disabled={currentLessonIndex === 0}
              onClick={() => handleLessonChange(currentLessonIndex - 1)}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono uppercase tracking-wider text-slate-300 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Previous</span>
            </button>

            <button
              onClick={() => handleLessonChange(0)}
              className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              title="Restart tour from Lesson 1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              disabled={currentLessonIndex === LESSONS.length - 1}
              onClick={() => handleLessonChange(currentLessonIndex + 1)}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-xs font-mono uppercase tracking-widest font-bold text-black disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <span>{currentLessonIndex === LESSONS.length - 1 ? 'Tour Completed' : 'Next Lesson'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

