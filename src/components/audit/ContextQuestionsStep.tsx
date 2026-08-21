import React, { useState } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { StudentContext } from '../../types';
import { GraduationCap, Calendar, Building2, BookOpen, ArrowRight } from 'lucide-react';

interface ContextQuestionsStepProps {
  onComplete: (context: StudentContext) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

const DEGREES = ['B.Tech / B.E.', 'M.Tech / M.E.', 'BCA / MCA', 'B.Sc Computer Science', 'Other Degree'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', 'Final Year', 'Graduated'];
const BRANCHES = [
  'Computer Science & Eng (CSE)',
  'Artificial Intelligence & ML',
  'Information Technology (IT)',
  'Electronics & Comm (ECE)',
  'Data Science / Cyber Security',
  'Other Engineering Branch',
];

export const ContextQuestionsStep: React.FC<ContextQuestionsStepProps> = ({
  onComplete,
  trackEvent,
}) => {
  const [subStep, setSubStep] = useState<number>(0);
  const [degree, setDegree] = useState(DEGREES[0]);
  const [year, setYear] = useState(YEARS[2]);
  const [collegeName, setCollegeName] = useState('IIT Bombay / Top Tech Institute');
  const [branch, setBranch] = useState(BRANCHES[0]);

  const handleSelectDegree = (d: string) => {
    setDegree(d);
    trackEvent('context_option_selected', { question: 'degree', value: d });
  };

  const handleSelectYear = (y: string) => {
    setYear(y);
    trackEvent('context_option_selected', { question: 'year', value: y });
  };

  const handleSelectBranch = (b: string) => {
    setBranch(b);
    trackEvent('context_option_selected', { question: 'branch', value: b });
  };

  const handleNext = () => {
    if (subStep < 2) {
      setSubStep(subStep + 1);
    } else {
      trackEvent('context_questions_completed', { degree, year, collegeName, branch });
      onComplete({
        degree,
        year,
        collegeName,
        branch,
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-md mx-auto text-center">
      {/* Qalam Assistant */}
      <QalamCharacter
        state="SPEAKING"
        subtitles={
          subStep === 0
            ? "To help me tailor your career audit, what degree are you currently pursuing?"
            : subStep === 1
            ? "Which academic year are you currently in?"
            : "Great! Which college and branch/department are you in?"
        }
      />

      {/* Interactive Options Cards */}
      <div className="w-full bg-white border border-[#e1e7ef] rounded-2xl p-5 my-4 shadow-sm text-left space-y-4">
        {subStep === 0 && (
          <div>
            <label className="text-xs font-semibold text-[#0b111e] flex items-center gap-1.5 mb-3">
              <GraduationCap className="w-4 h-4 text-[#1f3861]" />
              Degree / Program
            </label>
            <div className="space-y-2">
              {DEGREES.map((d) => (
                <button
                  key={d}
                  onClick={() => handleSelectDegree(d)}
                  className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between ${
                    degree === d
                      ? 'bg-[#e1e7ef] border-[#1f3861] text-[#1f3861] font-bold shadow-xs'
                      : 'bg-[#f8fafc] border-[#e1e7ef] text-[#0b111e] hover:border-[#1f3861]'
                  }`}
                >
                  <span>{d}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      degree === d ? 'border-[#1f3861] bg-[#1f3861]' : 'border-slate-300'
                    }`}
                  >
                    {degree === d && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {subStep === 1 && (
          <div>
            <label className="text-xs font-semibold text-[#0b111e] flex items-center gap-1.5 mb-3">
              <Calendar className="w-4 h-4 text-[#1f3861]" />
              Academic Year
            </label>
            <div className="grid grid-cols-1 gap-2">
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => handleSelectYear(y)}
                  className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between ${
                    year === y
                      ? 'bg-[#e1e7ef] border-[#1f3861] text-[#1f3861] font-bold shadow-xs'
                      : 'bg-[#f8fafc] border-[#e1e7ef] text-[#0b111e] hover:border-[#1f3861]'
                  }`}
                >
                  <span>{y}</span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      year === y ? 'border-[#1f3861] bg-[#1f3861]' : 'border-slate-300'
                    }`}
                  >
                    {year === y && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {subStep === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#0b111e] flex items-center gap-1.5 mb-2">
                <Building2 className="w-3.5 h-3.5 text-[#1f3861]" />
                College / University Name
              </label>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="e.g. IIT Bombay, VIT, SRM, BITS..."
                className="w-full bg-[#f8fafc] border border-[#e1e7ef] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0b111e] focus:outline-none focus:border-[#1f3861] transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#0b111e] flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-[#1f3861]" />
                Branch / Specialization
              </label>
              <div className="space-y-1.5">
                {BRANCHES.map((b) => (
                  <button
                    key={b}
                    onClick={() => handleSelectBranch(b)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between ${
                      branch === b
                        ? 'bg-[#e1e7ef] border-[#1f3861] text-[#1f3861] font-bold'
                        : 'bg-[#f8fafc] border-[#e1e7ef] text-[#0b111e] hover:border-[#1f3861]'
                    }`}
                  >
                    <span>{b}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleNext}
          className="w-full py-3 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition mt-2"
        >
          <span>{subStep === 2 ? 'Confirm Student Context' : 'Next Question'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              subStep === i ? 'w-8 bg-[#1f3861]' : 'w-2 bg-[#e1e7ef]'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
