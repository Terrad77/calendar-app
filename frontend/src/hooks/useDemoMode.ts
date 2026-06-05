import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../API/axiosInstance';
import type { AppConfig } from '../types';

const fetchAppConfig = async (): Promise<AppConfig> => {
  const { data } = await axiosInstance.get<AppConfig>('/api/config');
  return data;
};

export const useDemoMode = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['app-config'],
    queryFn: fetchAppConfig,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    isDemoMode: data?.isDemoMode ?? false,
    isLoading,
  };
};
