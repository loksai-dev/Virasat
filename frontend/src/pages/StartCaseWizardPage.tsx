import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  Mic, 
  Phone, 
  HelpCircle, 
  X, 
  Users, 
  Building2, 
  Lock, 
  Sparkles, 
  Bot, 
  Check, 
  FileCheck2,
  Trash2,
  Volume2
} from 'lucide-react';
import { StatusBadge, LanguageSwitcher } from '@/components';
import { useVirasatStore } from '@/store/useVirasatStore';
import { baseCaseData } from '@/mocks/caseData';
import { basePeople } from '@/mocks/peopleData';

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: 'verifying' | 'verified';
  category: string;
}

export const StartCaseWizardPage: React.FC = () => {
  const navigate = useNavigate();
  const { caseId: paramCaseId } = useParams();
  const { caseId, setCaseId, addToast } = useVirasatStore();

  const activeCaseId = paramCaseId || caseId || baseCaseData.id;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isDirty, setIsDirty] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);

  // Step 1: Uploaded Files State
  const [files, setFiles] = useState<UploadedFile[]>([
    {
      id: 'f-1',
      name: 'GHMC_Death_Certificate_Ramesh_Sharma.pdf',
      size: '1.4 MB',
      type: 'Death Certificate',
      status: 'verified',
      category: 'Primary Required',
    },
  ]);

  // Step 2: Extracted Details State
  const [extractedData, setExtractedData] = useState({
    name: 'Ramesh Sharma',
    dateOfDeath: '14 January 2026',
    placeOfDeath: 'Banjara Hills, Hyderabad, Telangana',
    certificateNumber: 'GHMC/2026/004812',
    age: '68 Years (1958)',
    spouseName: 'Sunita Sharma',
    fatherName: 'Late K. V. Sharma',
    aadhaarLastFour: '7412',
    panNumber: 'ABCPS4819M',
  });
  const [detailsConfirmed, setDetailsConfirmed] = useState(true);

  // Step 3: Consent Toggles State
  const [consentToggles, setConsentToggles] = useState<Record<string, boolean>>({
    'person-1': true, // Sunita
    'person-2': true, // Arjun
    'person-3': true, // Priya
    'person-4': true, // Kamala
  });
  const [termsAgreed, setTermsAgreed] = useState(true);

  // Warn before leaving if wizard data is modified
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && currentStep < 3) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your case registration. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, currentStep]);

  // Handle Mock File Upload with delay verification
  const handleSimulateUpload = (categoryName: string, defaultName: string) => {
    setIsDirty(true);
    const newId = `f-${Date.now()}`;
    const newFile: UploadedFile = {
      id: newId,
      name: defaultName,
      size: '2.1 MB',
      type: categoryName,
      status: 'verifying',
      category: categoryName,
    };

    setFiles((prev) => [...prev, newFile]);

    addToast({
      type: 'info',
      title: 'File Uploaded',
      message: `${defaultName} is undergoing DigiLocker cryptographic validation.`,
      duration: 1500,
    });

    // Simulate short verification delay
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) => (f.id === newId ? { ...f, status: 'verified' } : f))
      );
      addToast({
        type: 'success',
        title: 'Document Verified',
        message: `${defaultName} successfully validated against government registry.`,
      });
    }, 700);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (files.length === 0) {
        addToast({
          type: 'warning',
          title: 'Document Required',
          message: 'Please upload at least the death certificate to continue.',
        });
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      if (!detailsConfirmed) {
        addToast({
          type: 'warning',
          title: 'Confirmation Required',
          message: 'Please verify the extracted details before continuing.',
        });
        return;
      }
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 3) {
      if (!termsAgreed) {
        addToast({
          type: 'warning',
          title: 'Consent Required',
          message: 'Please authorize autonomous agent discovery under DPDP Act.',
        });
        return;
      }
      addToast({
        type: 'success',
        title: 'Case Registration Completed',
        message: 'Launching autonomous agents across integrated financial gateways.',
      });
      // Final Continue goes to /case/:caseId/agents
      navigate(`/case/${activeCaseId}/agents`);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleConsent = (personId: string) => {
    setIsDirty(true);
    setConsentToggles((prev) => ({
      ...prev,
      [personId]: !prev[personId],
    }));
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Wizard Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono">
              CASE {activeCaseId}
            </span>
            <span className="text-xs text-slate-500">New Estate Docket Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight mt-1">
            Start Estate Settlement
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            A gentle 3-step setup to discover assets and organize legal heir claims.
          </p>
        </div>

        {/* Top Actions: Voice Assistant & Language */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setVoiceModalOpen(true);
              setVoiceListening(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-teal-700 hover:bg-teal-50 shadow-xs transition-colors"
          >
            <Mic className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
            <span>Talk to Virasat</span>
          </button>

          <LanguageSwitcher />
        </div>
      </div>

      {/* Progress Stepper Bar (1 Upload, 2 Confirm, 3 Consent) */}
      <div className="bg-white p-4 sm:p-5 rounded-virasat border border-slate-200 shadow-soft">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          {/* Connecting line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
          <div
            className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-teal-500 transition-all duration-300 -z-0"
            style={{
              width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
            }}
          />

          {/* Step 1 Pill */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => setCurrentStep(1)}>
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 1
                  ? 'bg-teal-500 text-white ring-4 ring-teal-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              {currentStep > 1 ? <Check className="w-4 h-4 stroke-[2.5]" /> : '1'}
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep === 1 ? 'text-navy' : currentStep > 1 ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              1. Upload Documents
            </span>
          </div>

          {/* Step 2 Pill */}
          <div
            className="relative z-10 flex flex-col items-center gap-1.5 cursor-pointer"
            onClick={() => currentStep > 1 && setCurrentStep(2)}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 2
                  ? 'bg-teal-500 text-white ring-4 ring-teal-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              {currentStep > 2 ? <Check className="w-4 h-4 stroke-[2.5]" /> : '2'}
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep === 2 ? 'text-navy' : currentStep > 2 ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              2. Confirm Details
            </span>
          </div>

          {/* Step 3 Pill */}
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                currentStep === 3
                  ? 'bg-teal-500 text-white ring-4 ring-teal-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              3
            </div>
            <span
              className={`text-xs font-semibold ${
                currentStep === 3 ? 'text-navy' : 'text-slate-400'
              }`}
            >
              3. Family Consent
            </span>
          </div>
        </div>
      </div>

      {/* Main Wizard Layout: 2 Columns (Form Left, Guidance Panel Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Active Step Screen (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: UPLOAD DOCUMENTS */}
          {currentStep === 1 && (
            <div className="p-6 md:p-8 rounded-virasat bg-white border border-slate-200/90 shadow-soft space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h2 className="text-xl font-serif font-bold text-navy">
                  Upload Death Certificate
                </h2>
                <p className="text-xs text-slate-500">
                  Our system verifies digital municipal seals with DigiLocker instantly.
                </p>
              </div>

              {/* Large Drag-and-Drop Zone */}
              <div
                onClick={() =>
                  handleSimulateUpload('Death Certificate', 'GHMC_Digitally_Signed_Death_Certificate.pdf')
                }
                className="border-2 border-dashed border-teal-400/80 hover:border-teal-500 rounded-2xl p-8 text-center bg-teal-50/20 hover:bg-teal-50/40 transition-all cursor-pointer group space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-100/70 text-teal-700 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform shadow-xs">
                  <Upload className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy group-hover:text-teal-800">
                    Click to browse or drag & drop Death Certificate
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Supports PDF, JPG, PNG up to 15MB • DigiLocker e-Signed accepted
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white border border-teal-200 text-teal-700 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Or Connect with DigiLocker Gateway</span>
                  </span>
                </div>
              </div>

              {/* Smaller Optional Upload Zones */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Optional Supplementary Records (Speeds up discovery)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateUpload('Bank Record', 'SBI_Savings_Passbook_Scan.pdf')
                    }
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-slate-50 text-left transition-all flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                      <div>
                        <div className="font-semibold text-navy">Bank statements & passbooks</div>
                        <div className="text-[10px] text-slate-400">SBI, HDFC, ICICI, etc.</div>
                      </div>
                    </div>
                    <span className="text-xs text-teal-600 font-bold">+</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateUpload('Policy / EPF', 'LIC_Policy_3783_Schedule.pdf')
                    }
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-slate-50 text-left transition-all flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                      <div>
                        <div className="font-semibold text-navy">Insurance bonds & EPF letters</div>
                        <div className="text-[10px] text-slate-400">LIC, EPFO, Mutual Fund folios</div>
                      </div>
                    </div>
                    <span className="text-xs text-teal-600 font-bold">+</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateUpload('Will / Deed', 'Registered_Sale_Deed_Jubilee_Hills.pdf')
                    }
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-slate-50 text-left transition-all flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCheck2 className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                      <div>
                        <div className="font-semibold text-navy">Will / Property Sale Deed</div>
                        <div className="text-[10px] text-slate-400">Flat title, succession notes</div>
                      </div>
                    </div>
                    <span className="text-xs text-teal-600 font-bold">+</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSimulateUpload('ID Proof', 'Family_Aadhaar_PAN_Dossier.pdf')
                    }
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-slate-50 text-left transition-all flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                      <div>
                        <div className="font-semibold text-navy">Legal Heirs ID Proofs</div>
                        <div className="text-[10px] text-slate-400">Aadhaar, PAN of claimants</div>
                      </div>
                    </div>
                    <span className="text-xs text-teal-600 font-bold">+</span>
                  </button>
                </div>
              </div>

              {/* Uploaded File Chips with Green Verified Ticks */}
              {files.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Uploaded Documents ({files.length})
                  </div>

                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-navy truncate">{file.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {file.category} • {file.size}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {file.status === 'verified' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                              <span>Validating...</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            aria-label="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CONFIRM EXTRACTED DETAILS */}
          {currentStep === 2 && (
            <div className="p-6 md:p-8 rounded-virasat bg-white border border-slate-200/90 shadow-soft space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>DigiLocker Cryptographic Seal Valid</span>
                </div>
                <h2 className="text-xl font-serif font-bold text-navy">
                  Confirm Deceased Details
                </h2>
                <p className="text-xs text-slate-500">
                  Extracted automatically from GHMC Death Certificate #{extractedData.certificateNumber}. Please verify for accuracy.
                </p>
              </div>

              {/* Data Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Full Legal Name</label>
                  <input
                    type="text"
                    value={extractedData.name}
                    onChange={(e) => {
                      setIsDirty(true);
                      setExtractedData({ ...extractedData, name: e.target.value });
                    }}
                    className="w-full bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-navy text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Date of Death</label>
                  <input
                    type="text"
                    value={extractedData.dateOfDeath}
                    onChange={(e) => {
                      setIsDirty(true);
                      setExtractedData({ ...extractedData, dateOfDeath: e.target.value });
                    }}
                    className="w-full bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-navy text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Certificate Registration #</label>
                  <input
                    type="text"
                    value={extractedData.certificateNumber}
                    disabled
                    className="w-full bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-navy text-xs cursor-not-allowed"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Place of Death</label>
                  <input
                    type="text"
                    value={extractedData.placeOfDeath}
                    onChange={(e) => {
                      setIsDirty(true);
                      setExtractedData({ ...extractedData, placeOfDeath: e.target.value });
                    }}
                    className="w-full bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-navy text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">PAN Number (Deceased)</label>
                  <input
                    type="text"
                    value={extractedData.panNumber}
                    onChange={(e) => {
                      setIsDirty(true);
                      setExtractedData({ ...extractedData, panNumber: e.target.value });
                    }}
                    className="w-full bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-mono font-bold text-navy text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Surviving Spouse (Nominee)</label>
                  <input
                    type="text"
                    value={extractedData.spouseName}
                    onChange={(e) => {
                      setIsDirty(true);
                      setExtractedData({ ...extractedData, spouseName: e.target.value });
                    }}
                    className="w-full bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-semibold text-navy text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Confirmation Toggle */}
              <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-details"
                  checked={detailsConfirmed}
                  onChange={(e) => setDetailsConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="confirm-details" className="text-xs text-slate-700 cursor-pointer">
                  <strong className="text-navy font-semibold block">
                    I confirm these extracted details match official municipal certificates.
                  </strong>
                  Virasat will use these identifiers to cross-query PAN records, CAMS mutual funds, and EPFO UAN registries.
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: FAMILY CONSENT & DPDP ACT AUTHORIZATION */}
          {currentStep === 3 && (
            <div className="p-6 md:p-8 rounded-virasat bg-white border border-slate-200/90 shadow-soft space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Digital Personal Data Protection (DPDP) Act 2023 Compliant</span>
                </div>
                <h2 className="text-xl font-serif font-bold text-navy">
                  Family Heir Authorization & Consents
                </h2>
                <p className="text-xs text-slate-500">
                  Confirm consent from surviving Class-I legal heirs to authorize autonomous agents to query bank and depository records.
                </p>
              </div>

              {/* Family Members List with Consent Toggles */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Legal Heirs Consent Status
                </label>

                {basePeople.map((person) => {
                  const isChecked = !!consentToggles[person.id];
                  const isClassI = person.legalHeirClass === 'Class-I Heir';

                  return (
                    <div
                      key={person.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                        isChecked
                          ? 'bg-white border-slate-200'
                          : 'bg-slate-50 border-slate-200 opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={person.avatar}
                          alt={person.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-semibold text-navy flex items-center gap-1.5">
                            <span>{person.name}</span>
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({person.relationship})
                            </span>
                            {person.isNominee && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-medium">
                                Nominee
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-teal-700 font-medium">
                            {person.legalHeirClass} • {person.assignedSharePercentage}% Share Entitlement
                          </div>
                        </div>
                      </div>

                      {/* Consent Toggle Button */}
                      {isClassI ? (
                        <button
                          type="button"
                          onClick={() => toggleConsent(person.id)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-300'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>{isChecked ? 'Consent Granted' : 'Pending'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                          Class-II Excluded
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Master DPDP Act Consent Agreement */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-agreed"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="terms-agreed" className="text-xs text-slate-700 cursor-pointer">
                    <strong className="text-navy font-semibold block">
                      Autonomous Folio Discovery & Claims Transmission Authorization
                    </strong>
                    We, the surviving legal heirs, grant authorization to Virasat's autonomous AI agents to query integrated gateways (DigiLocker, CAMS, KFintech, CDSL, EPFO, and Partner Banks) solely for asset discovery and transmission filing on behalf of Case {activeCaseId}.
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons Row */}
          <div className="flex items-center justify-between pt-2">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-navy hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <Link
                to="/demo"
                className="text-xs text-slate-500 hover:text-navy underline"
              >
                Cancel and return to demo selector
              </Link>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-navy hover:bg-navy-light text-white shadow-soft transition-all"
            >
              <span>{currentStep === 3 ? 'Launch Autonomous Agents' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Column: "What we'll do next" Checklist & Care Concierge (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* "What we'll do next" Card */}
          <div className="p-6 rounded-virasat bg-white border border-slate-200/90 shadow-soft space-y-4 text-left">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-serif font-bold text-navy">
                What We'll Do Next
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Item 1 */}
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                    currentStep >= 1
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {currentStep >= 1 ? <Check className="w-3 h-3 stroke-[2.5]" /> : '1'}
                </div>
                <div>
                  <strong className="block text-navy">Municipal Signature Audit</strong>
                  <span className="text-slate-500 text-[11px]">
                    Validate GHMC death certificate hash with Telangana state database.
                  </span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                    currentStep >= 2
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {currentStep >= 2 ? <Check className="w-3 h-3 stroke-[2.5]" /> : '2'}
                </div>
                <div>
                  <strong className="block text-navy">Identity & PAN Cross-Check</strong>
                  <span className="text-slate-500 text-[11px]">
                    Confirm deceased records with Income Tax Dept and DigiLocker KRA.
                  </span>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                    currentStep === 3
                      ? 'bg-teal-500 text-white animate-pulse'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  3
                </div>
                <div>
                  <strong className="block text-navy">Autonomous Mesh Deployment</strong>
                  <span className="text-slate-500 text-[11px]">
                    Dispatch AssetDiscoveryAgent across banks, CAMS, Zerodha, and EPFO.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reassuring Care Message & Specialist Card */}
          <div className="p-6 rounded-virasat bg-gradient-to-br from-teal-50/70 via-white to-amber-50/40 border border-teal-200/80 shadow-soft space-y-4 text-left">
            <div className="text-xs text-slate-600 leading-relaxed italic">
              "You are not alone. We take care of every document with dignity, patience, and bank-grade confidentiality."
            </div>

            <div className="pt-2 border-t border-teal-100 flex items-center gap-3">
              <img
                src={baseCaseData.leadCoordinator.avatar}
                alt={baseCaseData.leadCoordinator.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-teal-500/40 shrink-0"
              />
              <div>
                <div className="text-xs font-semibold text-teal-800">Your Dedicated Care Concierge</div>
                <div className="text-sm font-bold text-navy">{baseCaseData.leadCoordinator.name}</div>
                <a
                  href={`tel:${baseCaseData.leadCoordinator.phone}`}
                  className="text-xs text-slate-500 hover:text-navy flex items-center gap-1 mt-0.5"
                >
                  <Phone className="w-3 h-3 text-teal-600" />
                  <span>{baseCaseData.leadCoordinator.phone}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Assistant Modal ("Talk to Virasat") */}
      {voiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="bg-white rounded-virasat max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-navy">Talk to Virasat</h3>
                  <div className="text-[11px] text-slate-500">Voice Assistance in English, हिंदी, తెలుగు</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoiceModalOpen(false)}
                className="text-slate-400 hover:text-navy p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-navy text-white text-center space-y-3 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-400/40 flex items-center justify-center mx-auto text-teal-300 shadow-glow-teal">
                <Volume2 className="w-8 h-8 text-teal-300 animate-pulse" />
              </div>
              <div className="text-sm font-semibold text-white">
                "Namaste Sunita ji. How can I guide you with uploading your certificates?"
              </div>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                You can speak naturally: "Where do I upload the death certificate?" or "What if I don't have the will?"
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setVoiceModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-navy text-white hover:bg-navy-light"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
