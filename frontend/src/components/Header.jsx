import React from 'react'
import { useNavigate } from 'react-router-dom'

function Header({ account, onConnect, user, onLogout, contractInfo, ownerAddress, networkMismatch, selectedAddress }) {
  const navigate = useNavigate()
  return (
    <div>
      <header className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}> 
      <div className="brand">
        <div className="logo">EV</div>
        <div>
          <div className="title">E‑Voting Prototype</div>
          <div className="subtitle">Ethereum · IPFS · zk‑ready</div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        {user ? (
          // Logged in: show masked account + logout
          <>
            <div className="user-info" style={{fontSize:13}}>
              <span className="muted">Account</span>
              <div style={{fontWeight:600}}>{account ? `${account.slice(0,6)}…${account.slice(-4)}` : '—'}</div>
            </div>
            <button
              className="vote-btn"
              style={{background:'#ef4444'}}
              onClick={() => { onLogout && onLogout(); navigate('/'); }}
            >Logout</button>
          </>
        ) : (
          // Not logged in: hide address; allow connect/login actions
          <>
            <button className="vote-btn" onClick={onConnect}>{account ? 'Switch/Connect Wallet' : 'Connect Wallet'}</button>
            <button className="vote-btn" onClick={() => navigate('/')}>Login</button>
          </>
        )}
      </div>
      </header>

      {/* Diagnostics strip - small, non-intrusive */}
      <div style={{display:'flex',gap:12,alignItems:'center',marginTop:8,marginBottom:12,fontSize:12,color:'#374151',flexWrap:'wrap'}}>
        <div className="card" style={{padding:'8px 12px',borderRadius:8,background:'#eff6ff',border:'1px solid #bfdbfe'}}>
          <div className="muted-small">Connected Address</div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div className="mono text-clip" style={{maxWidth:280}} title={account || 'Not connected'}>
              {account || '—'}
            </div>
            {user && user.role === 'admin' && (
              <span style={{padding:'1px 6px',background:'#059669',color:'#fff',borderRadius:999,fontSize:10,fontWeight:700}}>ADMIN</span>
            )}
            {user && user.role === 'voter' && user.verified && (
              <span style={{padding:'1px 6px',background:'#0284c7',color:'#fff',borderRadius:999,fontSize:10,fontWeight:700}}>VOTER</span>
            )}
            {user && user.role === 'voter' && !user.verified && (
              <span style={{padding:'1px 6px',background:'#f59e0b',color:'#fff',borderRadius:999,fontSize:10,fontWeight:700}}>PENDING</span>
            )}
          </div>
        </div>

        <div className="card" style={{padding:'8px 12px',borderRadius:8,background:'#fbfbff'}}>
          <div className="muted-small">Contract Address</div>
          <div className="mono text-clip" style={{maxWidth:280}} title={selectedAddress || (contractInfo && contractInfo.address)}>
            {selectedAddress || (contractInfo && contractInfo.address) || '—'}
          </div>
        </div>

        <div className="card" style={{padding:'8px 12px',borderRadius:8,background:'#fbfbff'}}>
          <div className="muted-small">Network ID</div>
          <div>{networkMismatch ? (
            <span style={{color:'#dc2626'}}>⚠️ {networkMismatch.targetId} (mismatch)</span>
          ) : (contractInfo ? contractInfo.networkId : '—')}</div>
        </div>

        <div className="card" style={{padding:'8px 12px',borderRadius:8,background:'#fbfbff'}}>
          <div className="muted-small">Owner (Admin)</div>
          <div className="mono text-clip" style={{maxWidth:200}} title={ownerAddress}>{ownerAddress || '—'}</div>
        </div>
      </div>
    </div>
  )
}

export default Header
