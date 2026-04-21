import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api';

interface CalculateDeadlinesPayload {
  file?: File;
  routes?: Array<{
    modal: string;
    geography: string;
    commercialLocation: string;
    events: Array<{
      day: number;
      hourCut: number;
      deliveryDay: number;
    }>;
  }>;
}

export const useCalculateDeadlines = () => {
  return useMutation({
    mutationFn: async (payload: CalculateDeadlinesPayload) => {
      if (payload.file) {
        const formData = new FormData();
        formData.append('file', payload.file);

        const response = await apiClient.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      } else if (payload.routes) {
        const response = await apiClient.post('/calculate', {
          routes: payload.routes,
        });
        return response.data;
      }
      throw new Error('Nenhum dado fornecido');
    },
  });
};
