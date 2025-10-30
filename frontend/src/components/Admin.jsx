import React, { useEffect, useState } from 'react'
import Web3 from 'web3'

function Admin({ account, contractInfo, onActionSuccess, networkMismatch, selectedAddress }) {
  const [owner, setOwner] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const [candidateName, setCandidateName] = useState('')
  const [voterAddress, setVoterAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

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
    if (!candidateName.trim()) {
      setNote('Enter a candidate name')
      return
    }
    try {
      setBusy(true)
      setNote('Submitting transaction…')
      const web3 = new Web3(window.ethereum)
      const contractAddr = selectedAddress || contractInfo.address
      const election = new web3.eth.Contract(contractInfo.abi, contractAddr)
      await election.methods.addCandidate(candidateName.trim()).send({ from: account })
      setCandidateName('')
      setNote('Candidate added')
      onActionSuccess && onActionSuccess()
    } catch (e) {
      setNote('Add candidate failed: ' + (e.message || e))
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
    try {
      setBusy(true)
      setNote('Submitting transaction…')
      const web3 = new Web3(window.ethereum)
      const contractAddr = selectedAddress || contractInfo.address
      const election = new web3.eth.Contract(contractInfo.abi, contractAddr)
      await election.methods.registerVoter(voterAddr).send({ from: account })
      setVoterAddress('')
      setNote('Voter registered')
      onActionSuccess && onActionSuccess()
    } catch (e) {
      setNote('Register voter failed: ' + (e.message || e))
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
          <div style={{display:'grid',gap:10,marginTop:10}}>
            <div>
              <label className="muted" style={{fontSize:13}}>Add candidate</label>
              <div style={{display:'flex',gap:8,marginTop:6}}>
                <input type="text" placeholder="Candidate name" value={candidateName} onChange={e=>setCandidateName(e.target.value)} style={{flex:1}} />
                <button className="vote-btn" onClick={addCandidate} disabled={busy}>Add</button>
              </div>
            </div>
            <div>
              <label className="muted" style={{fontSize:13}}>Register voter</label>
              <div style={{display:'flex',gap:8,marginTop:6}}>
                <input type="text" placeholder="0x..." value={voterAddress} onChange={e=>setVoterAddress(e.target.value)} style={{flex:1}} />
                <button className="vote-btn" onClick={registerVoter} disabled={busy}>Register</button>
              </div>
            </div>
          </div>
          {note && <div className="muted" style={{marginTop:8,fontSize:13}}>{note}</div>}
        </>
      )}
    </div>
  )
}

export default Admin
