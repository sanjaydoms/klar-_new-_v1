import API from './api';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  profilePhoto?: string;
  businessProfile?: {
    contactPerson: string;
    businessMobile: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  mobile: string;
  roles: string;
  clientType: string;
  status: string;
  verificationStatus: string;
  profilePhoto?: string;
  businessProfile?: {
    contactPerson: string;
    businessMobile: string;
  };
}

export interface ProfileResponse {
  success: boolean;
  message?: string;
  data?: {
    user: UserProfile;
  };
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  mobile: string;
}

export interface MarkupService {
  serviceType: string;
  percentageMarkup: number;
  fixedMarkup: number;
}

export interface CreateMarkupPayload {
  services: MarkupService[];
  appliedTo: string;
}

export interface MarkupServiceResponse {
  serviceType: string;
  percentageMarkup: number;
  fixedMarkup: number;
}

export interface CreateMarkupResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    userId: string;
    __v: number;
    appliedTo: string;
    createdAt: string;
    isActive: boolean;
    services: MarkupServiceResponse[];
    updatedAt: string;
    updatedBy: string;
  };
}

export interface GetMyMarkupResponse {
  success: boolean;
  data: {
    _id: string;
    userId: string;
    appliedTo: string;
    createdAt: string;
    updatedAt: string;
    updatedBy: string;
    isActive: boolean;
    services: MarkupServiceResponse[];
  };
}

export interface WalletResponse {
  success: boolean;
  message?: string;
  data?: {
    balance: number;
    currency: string;
    canUseWallet?: boolean;
    transactions?: any[];
  };
}

/**
 * Get Current User Profile
 * @returns
 */
export const getMyProfile = () => {
  return API.get<ProfileResponse>('/user/auth/me');
};

/**
 * Update User Profile
 * @param payload
 * @returns
 */
export const updateProfile = (payload: UpdateProfilePayload) => {
  return API.put<ProfileResponse>('/user/auth/profile', payload);
};

/**
 * Create/Update Markup Configuration
 * @param payload - Markup configuration payload
 * @returns
 */
export const createMarkup = (payload: CreateMarkupPayload) => {
  return API.post<CreateMarkupResponse>('/user/markup', payload);
};

/**
 * Get My Markup Configuration
 */
export const getMyMarkup = () => {
  return API.get<GetMyMarkupResponse>('/user/markup/my-markup');
};

/**
 * Delete markup by service name
 */
export const deleteMarkupByServiceType = (serviceType: string) => {
  return API.delete(`/user/markup/${serviceType}`);
};

/**
 * Get Markup by Service Name
 * @param serviceType - Type of service (e.g., TOUR_PACKAGES)
 * @returns
 */
export const getMarkupByServiceName = (serviceType: string) => {
  return API.get(`/user/markup/my-markup?serviceType=${serviceType}`);
};

/**
 * Get User Wallet Information
 * @returns Wallet details including balance and transactions
 */
export const getUserWallet = (amount: number) => {
  return API.get<WalletResponse>(`/user/wallet/b2c?amount=${amount}`);
};

/**
 * Update User Profile Name Only (PATCH)
 * @param payload - { fullName: string }
 * @returns
 */
export const updateProfileName = (payload: { fullName: string; mobile?: string }) => {
  return API.patch<ProfileResponse>('/user/auth/profile/update', payload);
};
