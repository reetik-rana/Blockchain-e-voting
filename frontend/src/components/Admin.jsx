import React, { useEffect, useState } from 'react'
import Web3 from 'web3'
import { TransactionStatus } from './LoadingSpinner'

function Admin({ account, contractInfo, onActionSuccess, networkMismatch, selectedAddress }) {
  const [owner, setOwner] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [candidateName, setCandidateName] = useState('')
  const [voterAddress, setVoterAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [txStatus, setTxStatus] = useState(null) // 'pending', 'success', 'error'
  const [txHash, setTxHash] = useState(null)
  const [txError, setTxError] = useState(null)

  useEffect(() => {
    async function loadOwner() {
      try {
        if (!contractInfo || networkMismatch) {
          console.log('[Admin] No contract info or network mismatch', { contractInfo, networkMismatch })
          return
        }
        // prefer wallet provider for tx, but fall back to HTTP for read
        const web3 = window.ethereum ? new Web3(window.ethereum) : new Web3('http://127.0.0.1:7545')
        const contractAddr = selectedAddress || contractInfo.address
        console.log('[Admin] Loading owner from contract:', contractAddr)
        const election = new web3.eth.Contract(contractInfo.abi, contractAddr)
        const o = await election.methods.owner().call()
        console.log('[Admin] Contract owner:', o)
        console.log('[Admin] Current account:', account)
        console.log('[Admin] Owner match:', account && o && account.toLowerCase() === o.toLowerCase())
        setOwner(o)
        setIsOwner(account && o && account.toLowerCase() === o.toLowerCase())
      } catch (e) {
        console.error('[Admin] Error loading owner:', e)
      }
    }
    loadOwner()
  }, [contractInfo, account, networkMismatch, selectedAddress])

  async function addCandidate() {
    const name = candidateName.trim()
    if (!name) {
      setNote('Enter a candidate name')
      return
    }
    // Prevent Ethereum addresses from being used as candidate names
    if (/^0x[a-fA-F0-9]{40}$/.test(name)) {
      setNote('Candidate name cannot be an Ethereum address')
      return
    }
    if (name.length > 100) {
      setNote('Candidate name is too long (max 100 characters)')
      return
    }
    try {
      setBusy(true)
      setTxStatus('pending')
      setTxHash(null)
      setTxError(null)
      setNote('')
      
      const web3 = new Web3(window.ethereum)
      const contractAddr = selectedAddress || contractInfo.address
      const election = new web3.eth.Contract(contractInfo.abi, contractAddr)
      
      const receipt = await election.methods.addCandidate(candidateName.trim()).send({ from: account })
      
      setTxHash(receipt.transactionHash)
      setTxStatus('success')
      setCandidateName('')
      setNote('Candidate added successfully!')
      
      setTimeout(() => {
        setTxStatus(null)
        onActionSuccess && onActionSuccess()
      }, 3000)
    } catch (e) {
      const errorMsg = e.message || String(e)
      setTxStatus('error')
      setTxError(errorMsg)
      setNote('Failed to add candidate')
      console.error('[Admin] Add candidate error:', e)
    } finally {
      setBusy(false)
    }
  }

  async function registerVoter() {
    const voterAddr = voterAddress.trim()
    if (!voterAddr) {
      setNote('Enter a wallet address to register')
      return
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(voterAddr)) {
      setNote('Invalid Ethereum address format')
      return
    }
    try {
      setBusy(true)
      setTxStatus('pending')
      setTxHash(null)
      setTxError(null)
      setNote('')
      
      const web3 = new Web3(window.ethereum)
      const contractAddr = selectedAddress || contractInfo.address
      const election = new web3.eth.Contract(contractInfo.abi, contractAddr)
      
      const receipt = await election.methods.registerVoter(voterAddr).send({ from: account })
      
      setTxHash(receipt.transactionHash)
      setTxStatus('success')
      setVoterAddress('')
      setNote('Voter registered successfully!')
      
      setTimeout(() => {
        setTxStatus(null)
        onActionSuccess && onActionSuccess()
      }, 3000)
    } catch (e) {
      const errorMsg = e.message || String(e)
      setTxStatus('error')
      setTxError(errorMsg)
      setNote('Failed to register voter')
      console.error('[Admin] Register voter error:', e)
    } finally {
      setBusy(false)
    }
  }

  if (!contractInfo || networkMismatch) return null

  return (
    <div className="card" style={{marginTop:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3 style={{margin:0}}>Admin</h3>
        {owner && (
          <div className="muted" style={{fontSize:12}}>
            Owner: <span className="mono text-clip" title={owner}>{owner}</span>
          </div>
        )}
      </div>
      {!isOwner ? (
        <div className="muted" style={{marginTop:8,fontSize:13}}>
          Connect with the contract owner wallet to manage candidates and registrations.
        </div>
      ) : (
        <>
          {txStatus && <div style={{marginBottom:12}}><TransactionStatus status={txStatus} hash={txHash} error={txError} /></div>}
          
          <div style={{display:'grid',gap:10,marginTop:10}}>
            <div>
              <label className="muted" style={{fontSize:13}}>Add candidate</label>
              <div style={{display:'flex',gap:8,marginTop:6}}>
                <input type="text" placeholder="Candidate name" value={candidateName} onChange={e=>setCandidateName(e.target.value)} style={{flex:1}} disabled={busy} />
                <button className="vote-btn" onClick={addCandidate} disabled={busy}>{busy ? 'Adding...' : 'Add'}</button>
              </div>
            </div>
            <div>
              <label className="muted" style={{fontSize:13}}>Register voter</label>
              <div style={{display:'flex',gap:8,marginTop:6}}>
                <input type="text" placeholder="0x..." value={voterAddress} onChange={e=>setVoterAddress(e.target.value)} style={{flex:1}} disabled={busy} />
                <button className="vote-btn" onClick={registerVoter} disabled={busy}>{busy ? 'Registering...' : 'Register'}</button>
              </div>
            </div>
          </div>
          {note && !txStatus && <div className="muted" style={{marginTop:8,fontSize:13}}>{note}</div>}
        </>
      )}
    </div>
  )
}

export default Admin
