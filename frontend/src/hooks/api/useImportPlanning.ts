import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';

interface ImportPlanningPayload {
  file: File;
  adjustmentType: 'FERIADO' | 'PARALISACAO' | 'AJUSTE';
  startDate: string;
  endDate: string;
  observations?: string;
}

export const useImportPlanning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ImportPlanningPayload) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('adjustmentType', payload.adjustmentType);
      formData.append('startDate', payload.startDate);
      formData.append('endDate', payload.endDate);
      if (payload.observations) {
        formData.append('observations', payload.observations);
      }

      const response = await apiClient.post('/db/import-planning', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
};
