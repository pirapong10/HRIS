import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export const useEmployees = () => {
  const { user } = useAuth();
  const [emps, setEmps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when search query changes immediately to prevent empty view issues
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Filter state
  const [filterDept, setFilterDept] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees', {
        params: { 
          page, 
          limit, 
          search,
          deptId: filterDept ? Number(filterDept) : undefined,
          type: filterType || undefined,
          status: filterStatus // Send raw value (including '') to allow all status retrieval
        }
      });
      const dataRes = res.data;
      if (dataRes && Array.isArray(dataRes.data)) {
        setEmps(dataRes.data);
        setTotal(dataRes.total || 0);
      } else if (Array.isArray(dataRes)) {
        setEmps(dataRes);
        setTotal(dataRes.length);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filterDept, filterType, filterStatus]);

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user, fetchEmployees]);

  const viewEmployeeDetails = async (empId) => {
    try {
      const res = await api.get(`/employees/${empId}`);
      return res.data;
    } catch (err) {
      return null;
    }
  };

  return { 
    emps, setEmps, loading, error, refetch: fetchEmployees, viewEmployeeDetails, 
    page, setPage, limit, setLimit, total, search: searchQuery, setSearch: setSearchQuery,
    filterDept, setFilterDept, filterType, setFilterType, filterStatus, setFilterStatus
  };
};
