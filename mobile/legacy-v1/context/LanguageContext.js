import { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';

const LanguageContext = createContext();

const translations = {
  en: {
    // Login Screen
    welcome: 'Welcome back',
    loginSubtitle: 'Sign in to your HP PG account to continue',
    email: 'Email Address',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    signInBtn: 'Sign In',
    orLoginWith: 'or log in with',
    signUpPrompt: "Don't have an account?",
    signUpLink: 'Sign Up',
    otpLoginLink: 'Login with Mobile OTP',
    pwdLoginLink: 'Login with Password',
    getOtpBtn: 'Send OTP Code',
    verifyOtpBtn: 'Verify OTP & Log In',
    phonePlaceholder: 'Enter 10-digit mobile number',
    otpPlaceholder: 'Enter 6-digit OTP code',
    biometricPrompt: 'Please authenticate to log in',
    biometricBtn: 'Biometric Access',

    // Dashboard Profile Tab
    profileTitle: 'Profile Details',
    systemRole: 'System Role',
    userId: 'User ID',
    rollNumber: 'Roll Number',
    phoneNumber: 'Phone Number',
    department: 'Department',
    designation: 'Designation',

    parentDetails: 'Parent details',
    fatherName: "Father's Name",
    motherName: "Mother's Name",
    parentContact: 'Parent Contact',

    emergencyContact: 'Emergency Contact',
    contactName: 'Contact Name',
    relationship: 'Relationship',
    emergencyPhone: 'Emergency Phone',

    idDocs: 'ID Documents & KYC',
    documentType: 'Document Type',
    docAadhaar: 'Aadhaar Card',
    docPan: 'PAN Card',
    kycStatus: 'KYC Status',
    statusVerified: 'VERIFIED',
    statusPending: 'PENDING',
  },
  hi: {
    // Login Screen
    welcome: 'स्वागत हे',
    loginSubtitle: 'जारी रखने के लिए अपने HP PG खाते में साइन इन करें',
    email: 'ईमेल पता',
    password: 'पासवर्ड',
    rememberMe: 'मुझे याद रखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    signInBtn: 'साइन इन करें',
    orLoginWith: 'या इसके साथ लॉगिन करें',
    signUpPrompt: 'खाता नहीं है?',
    signUpLink: 'साइन अप करें',
    otpLoginLink: 'मोबाइल ओटीपी से लॉगिन करें',
    pwdLoginLink: 'पासवर्ड से लॉगिन करें',
    getOtpBtn: 'ओटीपी कोड भेजें',
    verifyOtpBtn: 'ओटीपी सत्यापित करें और लॉगिन करें',
    phonePlaceholder: '10 अंकों का मोबाइल नंबर दर्ज करें',
    otpPlaceholder: '6 अंकों का ओटीपी कोड दर्ज करें',
    biometricPrompt: 'लॉगिन करने के लिए सत्यापित करें',
    biometricBtn: 'बायोमेट्रिक एक्सेस',

    // Dashboard Profile Tab
    profileTitle: 'प्रोफ़ाइल विवरण',
    systemRole: 'सिस्टम भूमिका',
    userId: 'यूज़र आईडी',
    rollNumber: 'रोल नंबर',
    phoneNumber: 'फ़ोन नंबर',
    department: 'विभाग',
    designation: 'पद',

    parentDetails: 'माता-पिता का विवरण',
    fatherName: 'पिता का नाम',
    motherName: 'माता का नाम',
    parentContact: 'अभिभावक संपर्क',

    emergencyContact: 'आपातकालीन संपर्क',
    contactName: 'संपर्क नाम',
    relationship: 'संबंध',
    emergencyPhone: 'आपातकालीन फ़ोन',

    idDocs: 'पहचान दस्तावेज और केवाईसी',
    documentType: 'दस्तावेज़ का प्रकार',
    docAadhaar: 'आधार कार्ड',
    docPan: 'पैन कार्ड',
    kycStatus: 'केवाईसी स्थिति',
    statusVerified: 'सत्यापित',
    statusPending: 'लंबित',
  }
};

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const loadLocale = async () => {
      try {
        const savedLocale = await SecureStore.getItemAsync('locale');
        if (savedLocale && translations[savedLocale]) {
          setLocale(savedLocale);
        }
      } catch (e) {
        console.warn('[LanguageContext] Failed to load saved locale:', e.message);
      }
    };
    loadLocale();
  }, []);

  const changeLanguage = async (newLocale) => {
    if (translations[newLocale]) {
      setLocale(newLocale);
      try {
        await SecureStore.setItemAsync('locale', newLocale);
      } catch (e) {
        console.warn('[LanguageContext] Failed to save locale:', e.message);
      }
    }
  };

  const t = (key) => {
    return translations[locale][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
