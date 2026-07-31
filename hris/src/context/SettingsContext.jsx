import React, { createContext, useContext, useState, useEffect } from 'react';

export const SettingsCtx = createContext(null);
export const useSettings = () => useContext(SettingsCtx);

export const DEFAULT_SETTINGS = {
  companyName: "PS Company", fiscalStart: "1", workHours: "8", workDays: "5",
  clockInWindow: "30", lateThreshold: "15",
  leaveTypes: [{ id: 1, name: "ลากิจ", daysPerYear: 6, paid: true }, { id: 2, name: "ลาป่วย", daysPerYear: 30, paid: true }, { id: 3, name: "ลาพักร้อน", daysPerYear: 10, paid: true }],
  taxMethod: "progressive", ssoRate: "5", ssoBaseCap: "15000", otRate: "1.5",
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/settings/config');
        if (res.ok) {
          const dataRes = await res.json();
          const dbConfig = dataRes.data;
          if (dbConfig) {
            setSettingsState(prev => ({
              ...prev,
              ...dbConfig,
              lateThreshold: dbConfig.lateThresholdMins.toString()
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load DB settings", err);
      }
    };
    fetchSettings();
  }, []);

  const setSettings = async (newSettings) => {
    setSettingsState(newSettings);
    // Optional: Could also PUT to backend if it's system config
    try {
      const token = localStorage.getItem('hris_token');
      if (token && newSettings.companyLat !== undefined) {
        await fetch('http://localhost:3000/api/settings/config', {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyLat: newSettings.companyLat,
            companyLng: newSettings.companyLng,
            allowedRadiusM: newSettings.allowedRadiusM,
            lateThresholdMins: newSettings.lateThreshold ? parseInt(newSettings.lateThreshold) : undefined
          })
        });
      }
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <SettingsCtx.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsCtx.Provider>
  );
};
