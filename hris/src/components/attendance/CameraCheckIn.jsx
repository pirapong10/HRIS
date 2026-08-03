import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import api from '../../utils/api';
import { Card, Btn, Badge } from '../common/UI';
import { useToast } from '../common/Toast';
import { C } from '../../utils/theme';

export const CameraCheckIn = ({ clockedIn, clockTime, onStatusChange }) => {
  const { showToast } = useToast();
  const webcamRef = useRef(null);
  
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationError('');
        },
        (err) => {
          setLocationError('ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาอนุญาต Location Permission');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError('เบราว์เซอร์ไม่รองรับ GPS');
    }
  }, []);

  const dataURItoBlob = (dataURI) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleAction = async (type) => {
    if (!location) {
      showToast('รอรับตำแหน่ง GPS สักครู่...', 'warning');
      return;
    }
    
    setIsCheckingIn(true);
    showToast(type === 'in' ? 'กำลังบันทึกเวลาเข้างาน...' : 'กำลังบันทึกเวลาออกงาน...', 'info');

    try {
      let res;
      if (type === 'in') {
        if (!webcamRef.current) {
          throw new Error('กล้องยังไม่พร้อมใช้งาน');
        }
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
          throw new Error('ไม่สามารถถ่ายภาพได้');
        }
        const file = dataURItoBlob(imageSrc);
        const formData = new FormData();
        formData.append('photo', file, `photo_${Date.now()}.jpg`);
        formData.append('lat', location.lat);
        formData.append('lng', location.lng);
  
        res = await api.post('/attendance/check-in', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post('/attendance/clock-out', { lat: location.lat, lng: location.lng });
      }

      showToast(`✅ บันทึกเวลา${type === 'in' ? 'เข้า' : 'ออก'}สำเร็จ`, 'success');
      if (onStatusChange) {
        onStatusChange({
          clockedIn: type === 'in',
          clockTime: type === 'in' ? (res.data.checkInTime || res.data.clockIn) : null
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg === 'OUT_OF_ZONE' || msg.includes('Out of allowed zone')) {
        showToast('❌ คุณอยู่นอกพื้นที่ทำงาน (Out of zone)', 'error');
      } else {
        showToast(`❌ บันทึกเวลาล้มเหลว: ${msg}`, 'error');
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <Card style={{
      marginBottom: 24,
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,244,255,0.9))',
      backdropFilter: 'blur(16px)',
      borderRadius: 20,
      border: '1px solid rgba(226, 232, 240, 0.8)',
      boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
      padding: 24
    }}>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Left: Camera Studio Frame */}
        <div style={{
          flex: '1 1 320px',
          minWidth: 300,
          height: 260,
          borderRadius: 16,
          overflow: 'hidden',
          background: '#0B0F19',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          border: '2px solid rgba(59, 130, 246, 0.3)'
        }}>
          {!clockedIn ? (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user", aspectRatio: 4/3 }}
                mirrored={true}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Face Guide Oval Overlay */}
              <div style={{
                position: 'absolute',
                width: 140,
                height: 180,
                borderRadius: '50%',
                border: '2px dashed rgba(59, 130, 246, 0.8)',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 10 }}>
                  จัดตำแหน่งใบหน้า
                </div>
              </div>
              <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 20 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>LIVE CAMERA</span>
              </div>
            </>
          ) : (
            <div style={{ color: '#fff', textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8, filter: 'drop-shadow(0 4px 12px rgba(16, 185, 129, 0.4))' }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>ตอกบัตรเข้างานแล้ว</div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>สแกนใบหน้าและบันทึกพิกัดสำเร็จ</div>
            </div>
          )}
        </div>

        {/* Right: Real-time Live Clock & Controls */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#F8FAFC', borderRadius: 16, padding: '16px 20px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>⏱️ เวลาปัจจุบัน (Local Time)</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, background: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>REALTIME</span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: C.brand, lineHeight: 1.1, fontFamily: 'monospace', letterSpacing: '-1px' }}>
              {currentTime.toLocaleTimeString('th-TH')}
            </div>
            <div style={{ fontSize: 14, color: C.text, fontWeight: 500, marginTop: 4 }}>
              📅 {currentTime.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F1F5F9', padding: '10px 16px', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📍</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>สถานะพิกัด GPS Geofence:</span>
            </div>
            {location ? (
              <Badge label="🟢 ในเขตพื้นที่บริษัท" bg={C.successLight} color={C.success} />
            ) : locationError ? (
              <Badge label={`🔴 ${locationError}`} bg={C.dangerLight} color={C.danger} />
            ) : (
              <Badge label="🟡 กำลังระบุพิกัด..." bg={C.warningLight} color={C.warning} />
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clockedIn ? (
              <Btn 
                variant="danger" 
                size="lg" 
                disabled={isCheckingIn || !location} 
                onClick={() => handleAction('out')}
                style={{ width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 700, display: 'flex', justifyContent: 'center', borderRadius: 12 }}
              >
                {isCheckingIn ? 'กำลังประมวลผล...' : '🚪 บันทึกเวลาออกงาน (Check-Out)'}
              </Btn>
            ) : (
              <Btn 
                size="lg" 
                disabled={isCheckingIn || !location || locationError} 
                onClick={() => handleAction('in')}
                style={{ width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 700, display: 'flex', justifyContent: 'center', borderRadius: 12, background: 'linear-gradient(135deg, #1A56DB, #4F46E5)' }}
              >
                {isCheckingIn ? 'กำลังประมวลผล...' : '📸 ถ่ายภาพ & ตอกบัตรเข้างาน (Check-In)'}
              </Btn>
            )}
            {clockedIn && clockTime && (
              <div style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 2 }}>
                ⏰ เวลาตอกบัตรเข้างานวันนี้: <span style={{ fontWeight: 700, color: C.brand }}>{typeof clockTime === 'string' ? clockTime : new Date(clockTime).toLocaleTimeString('th-TH')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
