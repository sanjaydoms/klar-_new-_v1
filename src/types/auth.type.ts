// ============= EXISTING INTERFACES =============
export interface B2BSignupPayload {
  businessName: string;
  businessType: string;
  contactPerson: string;
  businessEmail: string;
  businessMobile: string;
  password: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  city: string;
  country: string;
  confirmPassword?: string;
}

export interface B2BLoginPayload {
  email: string;
  password: string;
}

export interface B2BAuthResponse {
  user: any;
  token: string | null;
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      businessName: string;
      businessType: string;
      contactPerson: string;
      businessMobile: string;
      status: 'VERIFICATION_PENDING' | 'ACTIVE' | 'BLOCKED' | 'REJECTED' | 'TOO_MANY_ATTEMPTS';
      verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
      pendingReason?: string;
      blockReason?: string;
      rejectedReason?: string;
      createdAt: string;
    };
  };
}

// ============= SIGNUP OTP INTERFACES =============
export interface RequestSignupOTPPayload {
  email: string;
}

export interface RequestSignupOTPResponse {
  success: boolean;
  message: string;
  otp?: string;
}

export interface VerifySignupOTPPayload {
  email: string;
  otp: string;
  businessName: string;
  businessType: string;
  contactPerson: string;
  businessMobile: string;
  password: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  city: string;
  country: string;
}

export interface VerifySignupOTPResponse {
  success: boolean;
  message: string;
  data: {
    status: string;
  };
}

// ============= LOGIN OTP INTERFACES =============
export interface RequestLoginOTPPayload {
  email: string;
  password: string;
}

export interface RequestLoginOTPResponse {
  success: boolean;
  message: string;
  otp?: string; // For testing only
}

export interface VerifyLoginOTPPayload {
  email: string;
  otp: string;
}

export interface VerifyLoginOTPResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      roles: string[];
      clientType: string;
      status: string;
    };
  };
}

// ============= RM (RELATIONSHIP MANAGER) INTERFACES =============
export interface CreateRMPayload {
  memberName: string;
  email: string;
  password: string;
  mobile: string;
  role: string;
}

export interface VerifyCreateRMOTPPayload {
  memberName: string;
  email: string;
  password: string;
  mobile: string;
  role: string;
  otp: string;
}

export interface RMResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    memberName: string;
    email: string;
    mobile: string;
    role: string;
    createdBy: string;
    createdAt: string;
  };
}

export interface UpdateRMPayload {
  memberName?: string;
  email?: string;
  password?: string;
  mobile?: string;
  role?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateRMResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    memberName: string;
    email: string;
    mobile: string;
    role: string;
    updatedBy: string;
    updatedAt: string;
  };
}

export interface RM {
  id: string;
  memberName: string;
  email: string;
  mobile: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  blockReason?: string;
  createdBy:
    | {
        _id: string;
        email: string;
        memberName: string;
      }
    | string;
  createdAt: string;
  updatedAt: string;
}

export interface GetAllRMsResponse {
  success: boolean;
  message: string;
  data: RM[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface GetRMByIdResponse {
  success: boolean;
  message: string;
  data: RM;
}

export interface RMStatsResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    active: number;
    inactive: number;
  };
}

// ============= COMPANY (SUB-COMPANY) INTERFACES =============
export interface CreateCompanyPayload {
  businessName: string;
  businessType: string;
  contactPerson: string;
  businessEmail: string;
  businessMobile: string;
  password: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  city: string;
  country: string;
  limit?: number;
}

export interface VerifyCreateCompanyPayload {
  businessName: string;
  businessType: string;
  contactPerson: string;
  businessEmail: string;
  businessMobile: string;
  password: string;
  gstNumber?: string;
  panNumber?: string;
  address: string;
  city: string;
  country: string;
  otp: string;
  limit?: number;
}

export interface Company {
  id: string;
  email: string;
  mobile: string;
  role: string;
  blockReason?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  limit?: number;
  businessProfile: {
    businessName: string;
    businessType: string;
    contactPerson: string;
    businessEmail: string;
    businessMobile: string;
    gstNumber?: string;
    panNumber?: string;
    address: string;
    city: string;
    country: string;
  };
  verification?: {
    status: string;
    verifiedAt: string;
  };
  createdBy:
    | {
        _id: string;
        email: string;
        memberName: string;
        businessProfile?: {
          businessName: string;
        };
      }
    | string;
  createdAt: string;
  updatedAt: string;
  wallet: {
    id: string;
    balance: number;
    currency: string;
    status: string;
    emailAlerts?: boolean;
    smsAlerts?: boolean;
    limit?: number;
  };
}

export interface GetAllCompaniesResponse {
  success: boolean;
  message: string;
  data: Company[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface GetCompanyByIdResponse {
  success: boolean;
  message: string;
  data: Company;
}

export interface UpdateCompanyPayload {
  businessName?: string;
  businessType?: string;
  contactPerson?: string;
  businessEmail?: string;
  businessMobile?: string;
  password?: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  blockReason?: string;
  limit?: number;
  settlementAmount?: number;
}

export interface UpdateCompanyResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    email: string;
    mobile: string;
    role: string;
    status: string;
    businessProfile: any;
    updatedAt: string;
    wallet: {
      balance: number;
      currency: string;
      status: string;
    };
  };
}

export interface RequestForgotPasswordOTPPayload {
  email: string;
  mobile: string;
}

export interface RequestForgotPasswordOTPResponse {
  success: boolean;
  message: string;
  otp: string;
}

export interface VerifyForgotPasswordOTPPayload {
  email: string;
  otp: string;
}

export interface VerifyForgotPasswordOTPResponse {
  success: boolean;
  message: string;
  resetToken: string;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}
