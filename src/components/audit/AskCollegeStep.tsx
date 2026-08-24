import React, { useState, useEffect } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { Building2, Search, ArrowRight, Check, Sparkles } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

interface AskCollegeStepProps {
  firstName: string;
  onComplete: (collegeName: string, collegeId: string) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
  onBack?: () => void;
}

interface CollegeOption {
  id: string;
  name: string;
  tier?: string;
}

const FALLBACK_COLLEGES: CollegeOption[] = [
  { id: 'vit_v', name: 'VIT Vellore', tier: 'Tier-1 Deemed' },
  { id: 'iit_b', name: 'IIT Bombay', tier: 'Institute of National Importance' },
  { id: 'iit_d', name: 'IIT Delhi', tier: 'Institute of National Importance' },
  { id: 'bits_p', name: 'BITS Pilani', tier: 'Tier-1 Deemed' },
  { id: 'nit_t', name: 'NIT Trichy', tier: 'NIT' },
  { id: 'srm_c', name: 'SRM Institute of Science and Technology, Chennai', tier: 'Major University' },
  { id: 'anna_u', name: 'Anna University (CEG / MIT), Chennai', tier: 'State Premier' },
  { id: 'bits_h', name: 'BITS Hyderabad', tier: 'Tier-1 Deemed' },
  { id: 'manipal_i', name: 'Manipal Institute of Technology (MIT)', tier: 'Major University' },
  { id: 'dtu_d', name: 'Delhi Technological University (DTU)', tier: 'State Premier' },
  { id: 'coep_p', name: 'COEP Technological University, Pune', tier: 'State Premier' },
  { id: 'pes_b', name: 'PES University, Bengaluru', tier: 'Major University' },
  { id: 'rvce_b', name: 'RV College of Engineering, Bengaluru', tier: 'Autonomous Tier-1' },
  { id: 'msrit_b', name: 'Ramaiah Institute of Technology, Bengaluru', tier: 'Autonomous Tier-1' },
];

const OTHER_COLLEGE: CollegeOption = {
  id: 'other_c',
  name: 'Other College / Institute (Type your college)',
  tier: 'Custom',
};

export const AskCollegeStep: React.FC<AskCollegeStepProps> = ({
  firstName,
  onComplete,
  trackEvent,
}) => {
  const [search, setSearch] = useState('');
  const [colleges, setColleges] = useState<CollegeOption[]>(FALLBACK_COLLEGES);
  const [selectedCollege, setSelectedCollege] = useState<string>('');
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('');
  const [customCollege, setCustomCollege] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const subtitleText = `Which college are you studying in, ${firstName || 'friend'}?`;

  useEffect(() => {
    speakText(subtitleText);
    return () => {
      stopSpeaking();
    };
  }, [firstName]);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/colleges')
      .then((res) => {
        if (!res.ok) throw new Error('Unable to load colleges');
        return res.json();
      })
      .then((payload) => {
        if (!isMounted || !Array.isArray(payload.colleges)) return;
        setColleges(payload.colleges.length > 0 ? payload.colleges : FALLBACK_COLLEGES);
      })
      .catch((err) => {
        console.warn('College catalog fallback in use:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredColleges = colleges.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const visibleColleges = [...filteredColleges, OTHER_COLLEGE];

  const handleSelect = (colName: string, colId: string) => {
    if (colId === 'other_c') {
      setIsCustom(true);
      setSelectedCollege('Other College / Institute');
      setSelectedCollegeId('other_c');
    } else {
      setIsCustom(false);
      setSelectedCollege(colName);
      setSelectedCollegeId(colId);
      setCustomCollege(colName);
    }
  };

  const handleNext = () => {
    const finalCollegeName = isCustom
      ? customCollege.trim() || 'Autonomous Engineering Institute'
      : selectedCollege || customCollege.trim() || 'Autonomous Engineering Institute';
    const finalId = isCustom
      ? `col_${finalCollegeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      : selectedCollegeId || `col_${finalCollegeName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    trackEvent('college_selected', { collegeName: finalCollegeName, collegeId: finalId });
    onComplete(finalCollegeName, finalId);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : 'WELCOME'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 my-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-3.5">
        <div>
          <label className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5 mb-2">
            <Building2 className="w-3.5 h-3.5 text-[#1f3861]" />
            Your College / University
          </label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search e.g. VIT, IIT, SRM, BITS..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3.5 py-2.5 text-xs text-[#0b111e] font-semibold focus:outline-none focus:border-[#1f3861] focus:bg-white transition"
              autoFocus
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {visibleColleges.map((col) => {
            const isSelected = selectedCollege === col.name || (col.id === 'other_c' && isCustom);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => handleSelect(col.name, col.id)}
                className={`w-full p-3 rounded-2xl border text-left text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-[#1f3861] text-[#1f3861] font-bold shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/70 text-[#0b111e] hover:border-slate-300'
                }`}
              >
                <div className="min-w-0">
                  <span className="line-clamp-1">{col.name}</span>
                  {col.tier && col.tier !== 'Custom' && (
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{col.tier}</span>
                  )}
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#1f3861] shrink-0" />}
              </button>
            );
          })}
        </div>

        {isCustom && (
          <div className="pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold text-[#0b111e] block mb-1">
              Type your institute name:
            </label>
            <input
              type="text"
              value={customCollege}
              onChange={(e) => setCustomCollege(e.target.value)}
              placeholder="e.g. Saintgits College of Engineering"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-[#0b111e] font-semibold focus:outline-none focus:border-[#1f3861] focus:bg-white"
              autoFocus
            />
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={!selectedCollege && !customCollege.trim()}
          className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-[0.98] cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Select your campus to contextualize placement hiring patterns.
      </p>
    </div>
  );
};

