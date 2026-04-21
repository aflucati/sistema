import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api';

interface CompareFilters {
  versionId1?: string;
  versionId2?: string;
}

export const useComparePrazos = (filters?: CompareFilters, enabled = true) => {
  return useQuery({
    queryKey: ['compare', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.versionId1) params.append('versionId1', filters.versionId1);
      if (filters?.versionId2) params.append('versionId2', filters.versionId2);

      const response = await apiClient.get(`/db/compare?${params.toString()}`);
      return response.data;
    },
    enabled,
  });
};
