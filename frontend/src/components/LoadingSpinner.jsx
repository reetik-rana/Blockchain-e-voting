import React from 'react'

export const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const sizes = {
    small: '16px',
    medium: '24px',
    large: '48px'
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '20px'
    }}>
      <div style={{
        width: sizes[size],
        height: sizes[size],
        border: '3px solid #e5e7eb',
        borderTop: '3px solid #4f46e5',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      {message && <div style={{ fontSize: '14px', color: '#6b7280' }}>{message}</div>}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export const TransactionStatus = ({ status, hash, error }) => {
  if (status === 'pending') {
    return (
      <div className="card" style={{ background: '#eff6ff', border: '1px solid #3b82f6', padding: '16px' }}>
        <LoadingSpinner size="small" message="Transaction pending..." />
        {hash && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', wordBreak: 'break-all' }}>
            Hash: {hash}
          </div>
        )}
      </div>
    )
  }
  
  if (status === 'success') {
    return (
      <div className="card" style={{ background: '#f0fdf4', border: '1px solid #22c55e', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d' }}>
          <span style={{ fontSize: '20px' }}>✓</span>
          <span style={{ fontWeight: 600 }}>Transaction successful!</span>
        </div>
        {hash && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', wordBreak: 'break-all' }}>
            Hash: {hash}
          </div>
        )}
      </div>
    )
  }
  
  if (status === 'error') {
    return (
      <div className="card" style={{ background: '#fef2f2', border: '1px solid #ef4444', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
          <span style={{ fontSize: '20px' }}>✗</span>
          <span style={{ fontWeight: 600 }}>Transaction failed</span>
        </div>
        {error && (
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
            {error}
          </div>
        )}
      </div>
    )
  }
  
  return null
}

export default LoadingSpinner
