import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../components/common/Toast';
import { C } from '../utils/theme';

export const PayrollConfig = () => {
  const [components, setComponents] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const employeeTypes = ['fulltime', 'parttime', 'contract'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [compRes, mapRes] = await Promise.all([
        axios.get('http://localhost:3000/api/payroll-components', { withCredentials: true }),
        axios.get('http://localhost:3000/api/payroll-config/mappings', { withCredentials: true })
      ]);
      setComponents(compRes.data || []);
      setMappings(mapRes.data || []);
    } catch (error) {
      console.error(error);
      toast.addToast('Failed to fetch payroll configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (empType, compId) => {
    // Optimistic UI update
    setMappings(prev => {
      const existingIdx = prev.findIndex(m => m.employeeType === empType && m.payrollComponentId === compId);
      if (existingIdx >= 0) {
        return prev.filter((_, i) => i !== existingIdx);
      } else {
        return [...prev, { employeeType: empType, payrollComponentId: compId }];
      }
    });
  };

  const handleSave = async (empType) => {
    try {
      const activeComponentIds = mappings
        .filter(m => m.employeeType === empType)
        .map(m => m.payrollComponentId);

      await axios.post('http://localhost:3000/api/payroll-config/mappings', {
        employeeType: empType,
        componentIds: activeComponentIds
      }, { withCredentials: true });

      toast.addToast(`Configuration for ${empType} saved successfully!`, 'success');
    } catch (error) {
      console.error(error);
      toast.addToast('Failed to save configuration', 'error');
      fetchData(); // rollback
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading configuration...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h2 style={{ marginBottom: 20, color: C.text }}>Employee Type to Payroll Component Mapping</h2>
      
      {employeeTypes.map(empType => (
        <div key={empType} style={{ 
          background: C.surface, 
          padding: 20, 
          borderRadius: 8, 
          marginBottom: 20,
          border: `1px solid ${C.border}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h3 style={{ textTransform: 'capitalize', color: C.text, margin: 0 }}>
              {empType} Employees
            </h3>
            <button 
              onClick={() => handleSave(empType)}
              style={{
                background: C.brand,
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Save Mapping
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {components.map(comp => {
              const isActive = mappings.some(m => m.employeeType === empType && m.payrollComponentId === comp.id);
              return (
                <label key={comp.id} style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 10,
                  padding: 10,
                  background: isActive ? C.brandLight : C.bg,
                  borderRadius: 4,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? C.brand : C.border}`
                }}>
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={() => handleToggle(empType, comp.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ color: C.text, fontSize: 14 }}>{comp.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
