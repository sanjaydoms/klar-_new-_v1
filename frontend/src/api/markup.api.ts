import API from './api';

export interface MarkupServiceItem {
  serviceType: string;
  percentageMarkup: number;
  fixedMarkup: number;
}

export interface MarkupResponse {
  success: boolean;
  data: MarkupServiceItem[];
}

export const getMyMarkups = (serviceType?: string) => {
  return API.get<MarkupResponse>(
    `/user/markup/my-markup${serviceType ? `?serviceType=${serviceType}` : ''}`,
  );
};
