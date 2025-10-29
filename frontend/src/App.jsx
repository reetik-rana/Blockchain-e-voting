import React, { useEffect, useState } from 'react'
import Web3 from 'web3'
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import Auth from './components/Auth'
import Header from './components/Header'
import CandidateCard from './components/CandidateCard'
import Toast from './components/Toast'
import Admin from './components/Admin'
import Register from './components/Register'

function App() {
  const [account, setAccount] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [user, setUser] = useState(null)
  const [toast, setToast] = useState({ message: '', type: 'info' })
  const [lastVote, setLastVote] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [contractInfo, setContractInfo] = useState(null)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [chainCandidates, setChainCandidates] = useState(null)
  const [networkMismatch, setNetworkMismatch] = useState(null)
  const [isRegisteredOnChain, setIsRegisteredOnChain] = useState(null)
  const [ownerAddress, setOwnerAddress] = useState(null)

  useEffect(() => {
    async function init() {
      if (window.ethereum) {
        try {
          const web3 = new Web3(window.ethereum)
          const accounts = await window.ethereum.request({ method: 'eth_accounts' })
          if (accounts && accounts.length) setAccount(accounts[0])
          // keep in sync with wallet changes
          window.ethereum.on('accountsChanged', (accs) => setAccount(accs[0] || null))
        } catch (err) {
          // ignore
        }
      }
      // load candidates from backend
      try {
        const res = await fetch('http://localhost:3001/candidates')
        const data = await res.json()
        setCandidates(data)
      } catch (e) {
        console.warn('could not fetch candidates', e)
      }

      // load contract info if available
      try {
        const resC = await fetch('http://localhost:3001/contract')
        if (resC.ok) {
          const info = await resC.json()
          setContractInfo(info)
        }
      } catch (e) {
        console.warn('no contract info', e)
      }
    }
    // restore prior session if present
    try {
      const stored = localStorage.getItem('evote_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    init()
  }, [])

  // Load live candidates/counts from chain when contractInfo present
  useEffect(() => {
    async function loadFromChain() {
      if (!contractInfo || !window.ethereum) return
      try {
        const web3 = new Web3(window.ethereum)
        // Determine the correct contract address for the connected network
        const currentId = await web3.eth.net.getId()
        const addrByNet = contractInfo.addressesByNetwork || {}
        const addressForCurrent = addrByNet[currentId]
        let electionAddress = addressForCurrent || contractInfo.address
        if (!addressForCurrent) {
          const targetId = Number(contractInfo.networkId)
          if (currentId !== targetId) {
            setNetworkMismatch({ currentId, targetId })
            setChainCandidates(null)
            return
          }
          setNetworkMismatch(null)
        } else {
          // We have a contract deployed on this network id; proceed without mismatch
          setNetworkMismatch(null)
        }
  const election = new web3.eth.Contract(contractInfo.abi, electionAddress)
  setSelectedAddress(electionAddress)
        const count = await election.methods.candidatesCount().call()
        const list = []
        for (let i = 1; i <= Number(count); i++) {
          const c = await election.methods.getCandidate(i).call()
          list.push({ id: Number(c[0]), name: c[1], voteCount: Number(c[2]) })
        }
        setChainCandidates(list)
        // Load contract owner (for admin auto-detect). Try wallet provider first, then HTTP fallback.
        try {
          const o = await election.methods.owner().call()
          setOwnerAddress(o)
        } catch (_) {
          // fallback: try local HTTP provider against the network-matched address
          try {
            const w3 = new Web3('http://127.0.0.1:7545')
            const nid = await w3.eth.net.getId()
            const addrByNet = contractInfo.addressesByNetwork || {}
            const addrFor = addrByNet[nid] || electionAddress
            const e2 = new w3.eth.Contract(contractInfo.abi, addrFor)
            const o2 = await e2.methods.owner().call()
            setOwnerAddress(o2)
          } catch (_) { setOwnerAddress(null) }
        }
        // Check registration status for current account if present
        if (account) {
          try {
            const reg = await election.methods.registered(account).call()
            setIsRegisteredOnChain(!!reg)
          } catch (e) {
            setIsRegisteredOnChain(null)
          }
        }
      } catch (e) {
        console.warn('failed to read candidates from chain', e)
      }
    }
    loadFromChain()
  }, [contractInfo, lastVote, account])

  const handleConnect = async () => {
    if (!window.ethereum) {
      setToast({ message: 'MetaMask not detected. Please install it to connect.', type: 'error' })
      return
    }
    try {
      // Ask MetaMask to show the account picker so you can switch to/imported admin
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        })
      } catch (_) { /* ignore; not all wallets support this cleanly */ }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAccount(accounts[0])
      setToast({ message: 'Wallet connected', type: 'success' })
    } catch (e) {
      setToast({ message: 'Connection rejected', type: 'error' })
    }
  }

  const handleLogout = () => {
    try { localStorage.removeItem('evote_user') } catch {}
    setUser(null)
    setLastVote(null)
    setToast({ message: 'Logged out', type: 'success' })
  }

  const handleVote = async (candidateId) => {
    if (!account) {
      setToast({ message: 'Connect your wallet first', type: 'error' })
      return
    }
    if (networkMismatch) {
      setToast({ message: `Wrong network: wallet on ${networkMismatch.currentId}, contract on ${networkMismatch.targetId}. Switch network in MetaMask.`, type: 'error' })
      return
    }
    try {
      setSubmitting(true)
      // Small helpers: timeout fetch and local CID fallback so UI never hangs
      const timeoutFetch = (url, options = {}, timeoutMs = 12000) => {
        const ac = new AbortController()
        const t = setTimeout(() => ac.abort(), timeoutMs)
        return fetch(url, { ...options, signal: ac.signal }).finally(() => clearTimeout(t))
      }
      const toHex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
      const computeFakeCid = async (str) => {
        const enc = new TextEncoder()
        const digest = await crypto.subtle.digest('SHA-256', enc.encode(str))
        const hex = toHex(digest)
        return 'Qm' + hex.slice(0, 44)
      }
      // 1) Build vote payload (prototype; not encrypted here)
      const payload = {
        voter: account,
        candidateId,
        ts: Date.now(),
        electionId: 'default'
      }

      // 2) Store on IPFS via backend (with timeout + local fallback)
      let cid = null
      try {
        setToast({ message: 'Uploading vote to IPFS…', type: 'info' })
        const res = await timeoutFetch('http://localhost:3001/ipfs/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error('IPFS upload failed')
        const data = await res.json()
        cid = data.hash // backend returns { hash }
      } catch (ipfsErr) {
        // Fallback: compute deterministic fake CID locally to avoid UI stall
        cid = await computeFakeCid(JSON.stringify(payload))
        setToast({ message: 'IPFS unavailable; using local hash fallback for demo', type: 'warning' })
      }

      // 3) Derive a hash we could send on-chain later (demonstration only)
      const web3 = new Web3(window.ethereum || Web3.givenProvider)
  const voteHash = web3.utils.sha3(JSON.stringify({ cid, candidateId, voter: account }))

      // 4) Optionally call the contract to record the vote on-chain
      if (contractInfo && window.ethereum) {
        const election = new web3.eth.Contract(contractInfo.abi, selectedAddress || contractInfo.address)
        try {
          // Re-check registration if unknown
          if (isRegisteredOnChain === null) {
            try {
              const reg = await election.methods.registered(account).call()
              if (!reg) {
                setToast({ message: 'On-chain voting requires registration. Ask the admin to register your wallet.', type: 'error' })
                return
              }
            } catch {}
          } else if (isRegisteredOnChain === false) {
            setToast({ message: 'On-chain voting requires registration. Ask the admin to register your wallet.', type: 'error' })
            return
          }

          setToast({ message: 'Please confirm the transaction in MetaMask…', type: 'info' })
          let txHash = null
          await new Promise((resolve, reject) => {
            const confirmTimer = setTimeout(() => reject(new Error('No confirmation from wallet. Check MetaMask.')) , 120000)
            election.methods
              .castVote(candidateId, voteHash)
              .send({ from: account, gas: 300000 })
              .on('transactionHash', (hash) => {
                txHash = hash
                clearTimeout(confirmTimer)
                setToast({ message: `Transaction sent: ${hash.slice(0, 10)}…`, type: 'success' })
                resolve(hash)
              })
              .on('error', (err) => { clearTimeout(confirmTimer); reject(err) })
          })
          // Fire-and-forget: try to poll receipt to refresh tallies, but don't fail UX if slow
          try {
            const pollOnce = async (tries = 10) => {
              const r = await web3.eth.getTransactionReceipt(txHash)
              if (r || tries <= 0) return r
              await new Promise(r => setTimeout(r, 1500))
              return pollOnce(tries - 1)
            }
            await pollOnce()
          } catch {}
          setToast({ message: `Vote submitted${cid ? ` (CID: ${cid.slice(0,10)}…)` : ''}. It may take a moment to finalize.`, type: 'success' })
        } catch (txErr) {
          console.error('on-chain vote error', txErr)
          setToast({ message: `On-chain vote failed: ${txErr?.message || txErr}`, type: 'error' })
        }
      } else {
        setToast({ message: `Vote stored on IPFS (CID: ${cid.slice(0,10)}…)`, type: 'success' })
      }
      setLastVote({ cid, voteHash, candidateId })
    } catch (e) {
      console.error('vote error', e)
      setToast({ message: `Vote error: ${e.message || e}`, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const requestSwitchNetwork = async () => {
    // Switch wallet to local Ganache chain (default chainId 1337) instead of artifact networkId.
    if (!window.ethereum) return
    const chainIdHex = '0x539' // 1337 in hex
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] })
      setToast({ message: 'Switched network in wallet', type: 'success' })
      setLastVote({ ...(lastVote || {}), _ts: Date.now() })
    } catch (err) {
      // If the chain is not added to MetaMask, add it
      if (err && err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: 'Ganache Local',
              rpcUrls: ['http://127.0.0.1:7545','http://127.0.0.1:8545'],
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
            }]
          })
          setToast({ message: 'Network added. Try switching again if needed.', type: 'success' })
        } catch (e2) {
          setToast({ message: 'Failed to add network: ' + (e2.message || e2), type: 'error' })
        }
      } else {
        setToast({ message: 'Switch network failed: ' + (err.message || err), type: 'error' })
      }
    }
  }

  // Pages (defined inline to reuse state without prop drilling)
  const LoginPage = () => {
    const navigate = useNavigate()
    const [adminDetected, setAdminDetected] = useState(false)
    const handleLoggedIn = (u) => {
      setUser(u)
      try { localStorage.setItem('evote_user', JSON.stringify(u)) } catch {}
      navigate(`/u/${u.address}`)
    }
    // Detect admin wallet but do not auto-login; show CTA instead
    useEffect(() => {
      if (!user && account && ownerAddress && !networkMismatch) {
        setAdminDetected(account.toLowerCase() === ownerAddress.toLowerCase())
      } else {
        setAdminDetected(false)
      }
    }, [user, account, ownerAddress, networkMismatch])
    return (
      <div className="layout">
        <div>
          {contractInfo && networkMismatch && (
            <div className="card" style={{marginBottom:12, background:'#fff7ed', color:'#9a3412'}}>
              <div>
                Your wallet is connected to network {networkMismatch.currentId}, but the contract is on {networkMismatch.targetId}. Switch networks in MetaMask and then login.
              </div>
              <div style={{marginTop:8}}>
                <button className="vote-btn" onClick={requestSwitchNetwork}>Switch network in MetaMask</button>
              </div>
            </div>
          )}
          {adminDetected && (
            <div className="card" style={{marginBottom:12, background:'#eff6ff', color:'#1e40af', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{padding:'2px 8px', background:'#1d4ed8', color:'#fff', borderRadius:999, fontSize:12, fontWeight:700}}>ADMIN</div>
                <div className="mono text-clip" title={account}>Admin wallet detected: {account}</div>
              </div>
              <button className="vote-btn" onClick={() => handleLoggedIn({ address: account, cid: null })}>Login as Admin</button>
            </div>
          )}
          <Auth onLogin={handleLoggedIn} />
        </div>
      </div>
    )
  }

  const HomePage = () => {
    const { address } = useParams()
    if (!user) {
      const stored = localStorage.getItem('evote_user')
      if (!stored) return <Navigate to="/" replace />
      try { setUser(JSON.parse(stored)) } catch {}
    }
    // Optional guard: address in URL should match logged-in user
    if (user && address && user.address.toLowerCase() !== address.toLowerCase()) {
      return <Navigate to={`/u/${user.address}`} replace />
    }
    return (
      <div className="layout">
        <div>
          <div className="card" style={{marginTop:0}}>
            <div className="muted" style={{fontSize:13,marginBottom:6}}>Session</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr',gap:6}}>
              <div className="mono text-clip" title={account || 'not connected'}><b>Account:</b> {account ?? 'not connected'}</div>
              <div><b>Status:</b> {user ? 'Registered' : 'Guest'}</div>
              {user && <div className="mono text-wrap"><b>CID:</b> {user.cid}</div>}
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h2 style={{margin:0}}>Candidates</h2>
              <div className="muted" style={{fontSize:13}}>{(chainCandidates ? chainCandidates.length : candidates.length)} total</div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="muted" style={{fontSize:13}}>
              {contractInfo ? (networkMismatch ? 'Contract found, but wallet is on a different network' : 'Showing on-chain candidates') : 'Showing backend candidates'}
            </div>
            <button className="vote-btn" style={{background:'#374151'}} onClick={() => setLastVote({ ...lastVote })}>Refresh tally</button>
          </div>
          {contractInfo && networkMismatch && (
            <div className="card" style={{marginTop:12, background:'#fff7ed', color:'#9a3412'}}>
              <div>
                Your wallet is connected to network {networkMismatch.currentId}, but the contract is on {networkMismatch.targetId}. Switch networks in MetaMask and refresh.
              </div>
              <div style={{marginTop:8}}>
                <button className="vote-btn" onClick={requestSwitchNetwork}>Switch network in MetaMask</button>
              </div>
            </div>
          )}
          {contractInfo && !networkMismatch && isRegisteredOnChain === false && (
            <div className="card" style={{marginTop:12, background:'#fef2f2', color:'#7f1d1d'}}>
              This wallet is not registered on-chain. Ask the admin (contract owner) to register you.
            </div>
          )}
          {contractInfo && !networkMismatch && chainCandidates && chainCandidates.length === 0 && (
            <div className="card" style={{marginTop:12, background:'#fff7ed', color:'#9a3412'}}>
              No on-chain candidates yet. Ask the admin to add candidates (Login as Admin on the home page), or redeploy the contracts with seeds.
            </div>
          )}
          <div className="candidate-grid" style={{marginTop:12}}>
            {(chainCandidates || candidates).map(c => (
              <CandidateCard key={c.id} candidate={c} onVote={handleVote} disabled={!account || submitting} />
            ))}
          </div>

          {lastVote && (
            <div className="card" style={{marginTop:16}}>
              <h3 style={{marginTop:0}}>Last vote</h3>
              <div style={{display:'grid',gap:6}}>
                <div><b>Candidate ID:</b> {lastVote.candidateId}</div>
                <div className="mono text-wrap"><b>IPFS CID:</b> {lastVote.cid}</div>
                <div className="mono text-wrap"><b>Derived hash (for chain):</b> {lastVote.voteHash}</div>
              </div>
            </div>
          )}

          {contractInfo && user && ownerAddress && user.address && ownerAddress && (user.address.toLowerCase() === ownerAddress.toLowerCase()) && !networkMismatch && (
            <Admin
              account={account}
              contractInfo={contractInfo}
              selectedAddress={selectedAddress}
              networkMismatch={networkMismatch}
              onActionSuccess={() => setLastVote({ ...lastVote })}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header
          account={account}
          onConnect={handleConnect}
          user={user}
          onLogout={handleLogout}
          contractInfo={contractInfo}
          ownerAddress={ownerAddress}
          networkMismatch={networkMismatch}
          selectedAddress={selectedAddress}
        />

        <div className="hero">
          <div>
            <h1>Secure, transparent e‑voting</h1>
            <p>Sign in with your wallet, register, and cast a verifiable vote. Prototype uses Ethereum + IPFS.</p>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/u/:address" element={<HomePage />} />
        </Routes>

        <div className="footer">© {new Date().getFullYear()} E‑Voting Prototype — for research & demo use</div>

        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      </div>
    </BrowserRouter>
  )
}

export default App
