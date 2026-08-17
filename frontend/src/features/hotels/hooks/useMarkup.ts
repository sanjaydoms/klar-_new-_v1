import { useState, useEffect, useMemo } from 'react';
import { getMyMarkups } from '@/api/markup.api';
import { config } from '@/config/env.config';
import { getItemWithTTL } from '@/utils/localStorageWithTTL';

export const useMarkup = (serviceType: string = 'HOTELS') => {
  const [markups, setMarkups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Only fetch markups if they are enabled in the environment and a token exists
    const token = getItemWithTTL('token') || localStorage.getItem('authToken');
    if (!config.enableMarkups || !token) return;

    const fetchMarkups = async () => {
      setIsLoading(true);
      try {
        const response = await getMyMarkups(serviceType);
        // Axios returns response.data.
        // Our backend returns { success: true, data: [...] }
        const payload = response.data;
        if (payload && payload.data) {
          setMarkups(payload.data);
        } else if (Array.isArray(payload)) {
          setMarkups(payload);
        } else {
          setMarkups(payload?.services || []);
        }
      } catch (error) {
        console.error('Error fetching markups:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkups();
  }, [serviceType]);

  const calculateMarkup = useMemo(
    () => (basePrice: number) => {
      if (!config.enableMarkups) return 0;

      const services = Array.isArray(markups) ? markups : (markups as any)?.services || [];
      const item = services.find((m: any) => {
        const type = (m.serviceType || '').toUpperCase();
        const target = (serviceType || '').toUpperCase();
        return (
          type === target ||
          (target === 'HOTEL' && type === 'HOTELS') ||
          (target === 'HOTELS' && type === 'HOTEL')
        );
      });

      if (!item) return 0;

      if (item.percentageMarkup) {
        return (basePrice * item.percentageMarkup) / 100;
      }

      return item.fixedMarkup || 0;
    },
    [markups, serviceType],
  );

  const applyMarkup = useMemo(
    () => (basePrice: number | string) => {
      if (!config.enableMarkups) return basePrice;

      const numPrice = Number(basePrice);
      if (isNaN(numPrice)) return basePrice;

      const markup = calculateMarkup(numPrice);
      return numPrice + markup;
    },
    [calculateMarkup],
  );

  return {
    markups,
    calculateMarkup,
    applyMarkup,
    isLoading,
  };
};
