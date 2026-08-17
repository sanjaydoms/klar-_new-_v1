export interface Segment {
  from: string;
  to: string;
  date: string;
}

export interface CommonSearchBarProps {
  onSearch: (params: any) => void;
  isLoading?: boolean;
  initialParams?: any;
  className?: string;
}
