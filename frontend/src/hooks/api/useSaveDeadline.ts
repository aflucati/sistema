import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';

interface SaveDeadlinePayload {
  validityType: 'PADRAO' | 'PONTUAL';
  startDate: string;
  endDate: string;
  observations?: string;
  data: unknown;
}

export const useSaveDeadline = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SaveDeadlinePayload) => {
      const response = await apiClient.post('/db/save-current', payload);
      return response.data;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas para refresh
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
};
