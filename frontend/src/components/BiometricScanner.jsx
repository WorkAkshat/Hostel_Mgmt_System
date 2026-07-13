import { useState } from 'react';
import api from '../utils/api';
import { Fingerprint, Check, X } from 'lucide-react';

const BiometricScanner = ({ rollNumber, endpoint, bodyExtra = {}, onSuccess, onFailure }) => {
  const [scanState, setScanState] = useState('IDLE'); // 'IDLE' | 'SCANNING' | 'SUCCESS' | 'ERROR'
  const [errorMsg, setErrorMsg] = useState('');

  const triggerScan = async () => {
    if (!rollNumber) {
      setScanState('ERROR');
      setErrorMsg('Biometric Error: No roll number entered or found.');
      if (onFailure) onFailure('No roll number entered or found.');
      return;
    }

    setScanState('SCANNING');
    setErrorMsg('');

    // Simulate biometric match latency (2 seconds)
    setTimeout(async () => {
      try {
        const response = await api(endpoint, {
          method: 'POST',
          body: {
            rollNumber,
            method: 'BIOMETRIC_FINGERPRINT',
            ...bodyExtra
          }
        });

        setScanState('SUCCESS');
        setTimeout(() => {
          if (onSuccess) onSuccess(response);
          setScanState('IDLE');
        }, 1500);

      } catch (error) {
        setScanState('ERROR');
        setErrorMsg(error.message || 'Biometric match failure: Access Denied.');
        if (onFailure) onFailure(error.message || 'Access Denied.');
      }
    }, 2000);
  };

  const resetScanner = () => {
    setScanState('IDLE');
    setErrorMsg('');
  };

  // Determine dynamic ring & background styles for scanner
  const getScannerClasses = () => {
    let base = "w-[120px] h-[120px] rounded-full border-3 border-[var(--border-color)] flex items-center justify-center cursor-pointer relative overflow-hidden bg-black/5 transition-all duration-300 ";
    if (scanState === 'SCANNING') {
      base += "border-[var(--accent)] shadow-[var(--shadow-glow)] biometric-scanner-active";
    } else if (scanState === 'SUCCESS') {
      base += "border-[var(--success)] bg-[var(--success-bg)]";
    } else if (scanState === 'ERROR') {
      base += "border-[var(--danger)] bg-[var(--danger-bg)]";
    }
    return base;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white/10 border border-[var(--border-color)] rounded-[var(--border-radius-md)] w-full max-w-[360px] mx-auto">
      <div 
        onClick={scanState === 'IDLE' || scanState === 'ERROR' ? triggerScan : null}
        className={getScannerClasses()}
      >
        {scanState === 'SCANNING' && <div className="biometric-scan-line"></div>}

        {scanState === 'IDLE' && <Fingerprint size={56} className="text-[var(--text-secondary)]" />}
        {scanState === 'SCANNING' && <Fingerprint size={56} className="text-[var(--accent)]" />}
        {scanState === 'SUCCESS' && <Check size={56} className="text-[var(--success)]" />}
        {scanState === 'ERROR' && <X size={56} className="text-[var(--danger)]" />}
      </div>

      <div className="mt-5 text-center w-full">
        {scanState === 'IDLE' && (
          <p className="text-sm text-[var(--text-secondary)]">Click fingerprint pad to scan biometric</p>
        )}
        {scanState === 'SCANNING' && (
          <p className="text-sm text-[var(--accent)] font-bold">
            Scanning fingerprint template...
          </p>
        )}
        {scanState === 'SUCCESS' && (
          <p className="text-sm text-[var(--success)] font-bold">
            Biometric Match! Access Granted.
          </p>
        )}
        {scanState === 'ERROR' && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm text-[var(--danger)] font-bold">
              Verification Failed
            </p>
            <span className="text-xs text-red-500 mt-0.5 mb-2">{errorMsg}</span>
            <button 
              onClick={resetScanner} 
              className="bg-transparent border border-[var(--border-color)] rounded px-3 py-1 text-xs cursor-pointer text-[var(--text-primary)] transition-all duration-200 hover:bg-black/5"
            >
              Retry Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometricScanner;
