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
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Left: Camera */}
        <div style={{ flex: '1 1 300px', minWidth: 300, borderRadius: 12, overflow: 'hidden', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 250 }}>
          {!clockedIn ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user", aspectRatio: 4/3 }}
              mirrored={true}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ color: '#fff', textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>บันทึกเวลาเข้างานเรียบร้อยแล้ว</div>
            </div>
          )}
        </div>

        {/* Right: Info & Action */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, color: C.textMuted, fontWeight: 600 }}>เวลาปัจจุบัน</div>
            <div style={{ fontSize: 42, fontWeight: 700, color: C.brand, lineHeight: 1.2, fontFamily: 'monospace' }}>
              {currentTime.toLocaleTimeString('th-TH')}
            </div>
            <div style={{ fontSize: 16, color: C.text }}>
              {currentTime.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>พิกัด GPS:</span>
            {location ? (
              <Badge label="🟢 พร้อมใช้งาน" bg={C.successLight} color={C.success} />
            ) : locationError ? (
              <Badge label={`🔴 ${locationError}`} bg={C.dangerLight} color={C.danger} />
            ) : (
              <Badge label="🟡 กำลังค้นหา..." bg={C.warningLight} color={C.warning} />
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {clockedIn ? (
              <Btn 
                variant="danger" 
                size="lg" 
                disabled={isCheckingIn || !location} 
                onClick={() => handleAction('out')}
                style={{ width: '100%', padding: '16px 0', fontSize: 18, display: 'flex', justifyContent: 'center' }}
              >
                {isCheckingIn ? 'กำลังประมวลผล...' : '📍 บันทึกเวลาออกงาน (Check-Out)'}
              </Btn>
            ) : (
              <Btn 
                size="lg" 
                disabled={isCheckingIn || !location || locationError} 
                onClick={() => handleAction('in')}
                style={{ width: '100%', padding: '16px 0', fontSize: 18, display: 'flex', justifyContent: 'center' }}
              >
                {isCheckingIn ? 'กำลังประมวลผล...' : '📸 Check-In (ลงเวลาเข้างาน)'}
              </Btn>
            )}
            {clockedIn && clockTime && (
              <div style={{ fontSize: 13, color: C.textMuted, textAlign: 'center' }}>
                เข้างานเมื่อ: <span style={{ fontWeight: 600 }}>{typeof clockTime === 'string' ? clockTime : new Date(clockTime).toLocaleTimeString('th-TH')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
