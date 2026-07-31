import React from 'react';
import { Modal, Btn } from './UI';
import { C } from '../../utils/theme';

export const ConfirmModal = ({ title, message, confirmLabel = "ยืนยัน",
  confirmVariant = "danger", onConfirm, onClose }) => (
  <Modal title={title} onClose={onClose} width={420}>
    <p style={{ fontSize: 14, color: C.text, margin: '0 0 24px', lineHeight: 1.6 }}>
      {message}
    </p>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
      <Btn variant="ghost" onClick={onClose}>ยกเลิก</Btn>
      <Btn variant={confirmVariant} onClick={() => { onConfirm(); onClose(); }}>
        {confirmLabel}
      </Btn>
    </div>
  </Modal>
);
