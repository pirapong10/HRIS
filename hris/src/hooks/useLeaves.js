import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useLeaves = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/leaves?page=1&limit=50", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("hris_token")}` }
      });
      if (!res.ok) throw new Error("Failed to fetch leaves");
      const dataRes = await res.json();
      const data = dataRes.data || dataRes;
      if (Array.isArray(data)) {
        setLeaves(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchLeaves();
    }
  }, [user, fetchLeaves]);

  return { leaves, setLeaves, loading, error, refetch: fetchLeaves };
};
