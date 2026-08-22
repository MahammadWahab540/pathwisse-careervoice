import { useQuery } from '@tanstack/react-query';
import { getCareerStreams } from '../api/careers';
import type { CareerStreamDto } from '../types/career';

export function useCareerStreams() {
  return useQuery<CareerStreamDto[], Error>({
    queryKey: ['career-streams'],
    queryFn: getCareerStreams,
    staleTime: 5 * 60 * 1000,
  });
}
