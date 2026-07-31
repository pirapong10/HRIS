import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { detectAttendanceStatus } from '../utils/helpers';
import { useSettings } from '../context/SettingsContext';
import api from '../utils/api';

export const useAttendance = (isHR) => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [attData, setAttData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const lateThreshold = settings?.lateThreshold ? parseInt(settings.lateThreshold) : 15;

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance', {
        params: { page, limit, search }
      });
      const dataRes = res.data;
      const data = dataRes.data || dataRes;
      if (Array.isArray(data)) {
        const mapped = data.map(a => ({
          ...a,
          empCode: a.employee?.empCode,
          status: detectAttendanceStatus(a.clockIn, a.shift?.startTime, lateThreshold)
        }));
        setAttData(isHR ? mapped : mapped.filter(a => a.empId === user.empId));
        setTotal(dataRes.total || (isHR ? mapped.length : mapped.filter(a => a.empId === user.empId).length));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isHR, user, lateThreshold, page, limit, search]);

  useEffect(() => {
    if (user) {
      fetchAttendance();
    }
  }, [user, fetchAttendance]);

  return { attData, setAttData, loading, error, refetch: fetchAttendance, page, setPage, limit, setLimit, total, search, setSearch };
};
