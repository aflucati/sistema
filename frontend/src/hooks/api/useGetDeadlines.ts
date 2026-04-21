import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';

interface DeadlineFilters {
  startDate?: string;
  endDate?: string;
  modal?: string;
  geography?: string;
  cd?: string;
}

export const useGetDeadlines = (filters?: DeadlineFilters, enabled = true) => {
  return useQuery({
    queryKey: ['deadlines', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.modal) params.append('modal', filters.modal);
      if (filters?.geography) params.append('geography', filters.geography);
      if (filters?.cd) params.append('cd', filters.cd);

      const response = await apiClient.get(`/db/query?${params.toString()}`);
      return response.data;
    },
    enabled,
  });
};
