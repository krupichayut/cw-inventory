import React from 'react';
import { X } from 'lucide-react';

export default function ImagePreviewModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div 
      className="modal-overlay" 
      style={{ zIndex: 9999, backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div 
        className="animate-fade-in" 
        style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }} 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '-20px', 
            right: '-20px', 
            background: 'var(--danger)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 10
          }}
        >
          <X size={24} />
        </button>
        <img 
          src={imageUrl} 
          alt="Preview" 
          style={{ 
            maxWidth: '100%', 
            maxHeight: '85vh', 
            objectFit: 'contain', 
            borderRadius: 'var(--radius-md)', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            border: '4px solid white'
          }} 
        />
      </div>
    </div>
  );
}
