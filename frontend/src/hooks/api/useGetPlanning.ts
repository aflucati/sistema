import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';

interface PlanningFilters {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const useGetPlanning = (filters?: PlanningFilters, enabled = true) => {
  return useQuery({
    queryKey: ['planning', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await apiClient.get(`/db/planning/query?${params.toString()}`);
      return response.data;
    },
    enabled,
  });
};
