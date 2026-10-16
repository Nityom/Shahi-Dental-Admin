'use client';

import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/adminuser';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((user) => {
        if (mounted) setIsAdmin((user?.role || 'admin') === 'admin');
      })
      .catch(() => {
        if (mounted) setIsAdmin(false);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { isAdmin, loading };
}
