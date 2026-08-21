import React, { useState } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { EvidenceUploads } from '../../types';
import { FileText, Linkedin, Github, Globe, Briefcase, ArrowRight, CheckCircle2 } from 'lucide-react';

interface EvidenceUploadStepProps {
  onComplete: (evidence: EvidenceUploads) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const EvidenceUploadStep: React.FC<EvidenceUploadStepProps> = ({
  onComplete,
  trackEvent,
}) => {
  const [resumeFileName, setResumeFileName] = useState<string | undefined>(undefined);
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [gitHubUrl, setGitHubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [internshipDetails, setInternshipDetails] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFileName(file.name);
      trackEvent('resume_uploaded', { fileName: file.name, size: file.size });
    }
  };

  const handleSubmit = () => {
    trackEvent('evidence_submitted', {
      hasResume: !!resumeFileName,
      hasLinkedIn: !!linkedInUrl,
      hasGitHub: !!gitHubUrl,
      hasPortfolio: !!portfolioUrl,
    });

    onComplete({
      resumeFileName,
      linkedInUrl,
      gitHubUrl,
      portfolioUrl,
      internshipDetails,
    });
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-md mx-auto text-center">
      {/* Qalam Character */}
      <QalamCharacter
        state="ENCOURAGING"
        subtitles="Sharing actual proof like your GitHub, LinkedIn, or Resume helps me give you a much more accurate career readiness score."
      />

      {/* Upload Inputs */}
      <div className="w-full bg-white border border-[#e1e7ef] rounded-2xl p-5 my-4 shadow-sm text-left space-y-4">
        <h3 className="text-xs font-bold text-[#0b111e] uppercase tracking-wider flex items-center justify-between">
          <span>Project & Proof Evidence (Optional)</span>
          <span className="text-[10px] text-[#1f3861] font-mono font-bold">Step 6 of 6</span>
        </h3>

        {/* File Resume Upload Box */}
        <div className="border border-dashed border-[#e1e7ef] hover:border-[#1f3861] rounded-xl p-4 text-center bg-[#f8fafc] transition cursor-pointer relative">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <FileText className="w-6 h-6 text-[#1f3861] mx-auto mb-1" />
          {resumeFileName ? (
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{resumeFileName}</span>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-[#0b111e]">Upload Resume / CV (.pdf)</p>
              <p className="text-[10px] text-[#344256] mt-0.5">Drag & drop or tap to select</p>
            </div>
          )}
        </div>

        {/* LinkedIn & GitHub Links */}
        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] font-medium text-[#344256] flex items-center gap-1.5 mb-1">
              <Linkedin className="w-3.5 h-3.5 text-sky-600" />
              LinkedIn Profile URL
            </label>
            <input
              type="url"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full bg-[#f8fafc] border border-[#e1e7ef] rounded-lg px-3 py-2 text-xs text-[#0b111e] focus:outline-none focus:border-[#1f3861]"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#344256] flex items-center gap-1.5 mb-1">
              <Github className="w-3.5 h-3.5 text-slate-800" />
              GitHub Repository or Profile URL
            </label>
            <input
              type="url"
              value={gitHubUrl}
              onChange={(e) => setGitHubUrl(e.target.value)}
              placeholder="https://github.com/username"
              className="w-full bg-[#f8fafc] border border-[#e1e7ef] rounded-lg px-3 py-2 text-xs text-[#0b111e] focus:outline-none focus:border-[#1f3861]"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#344256] flex items-center gap-1.5 mb-1">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              Live Project / Portfolio URL
            </label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://myportfolio.dev"
              className="w-full bg-[#f8fafc] border border-[#e1e7ef] rounded-lg px-3 py-2 text-xs text-[#0b111e] focus:outline-none focus:border-[#1f3861]"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#344256] flex items-center gap-1.5 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              Internship / Work Experience Brief
            </label>
            <input
              type="text"
              value={internshipDetails}
              onChange={(e) => setInternshipDetails(e.target.value)}
              placeholder="e.g. 2-month SDE Intern at startup building APIs..."
              className="w-full bg-[#f8fafc] border border-[#e1e7ef] rounded-lg px-3 py-2 text-xs text-[#0b111e] focus:outline-none focus:border-[#1f3861]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            onClick={handleSubmit}
            className="w-full py-3 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition"
          >
            <span>Generate My Career Audit Results</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleSubmit}
            className="w-full py-1.5 text-[11px] text-[#344256] hover:text-[#0b111e] transition font-medium"
          >
            Skip for now & generate audit
          </button>
        </div>
      </div>
    </div>
  );
};
