export interface SignupStep1Data {
  businessName: string;
  businessType: string;
  contactPersonName: string;
  businessEmail: string;
  businessMobile: string;
  password: string;
  confirmPassword: string;
}

export interface SignupStep1Props {
  onNext: (data: SignupStep1Data) => void;
  onNavigateToLogin: () => void;
}

export interface SignupStep2Props {
    step1Data: SignupStep1Data;
    onSuccess: () => void;
}