import React from 'react'

function CandidateCard({ candidate, onVote, disabled, showVoteCount = false }) {
  return (
    <div className="candidate-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{flex: 1}}>
          <div className="candidate-name">{candidate.name}</div>
          <div className="candidate-meta">ID #{candidate.id}</div>
        </div>
        {showVoteCount && (
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:700,fontSize:20}}>{candidate.voteCount ?? 0}</div>
            <div className="muted" style={{fontSize:12}}>votes</div>
          </div>
        )}
      </div>

      <div className="form-row" style={{marginTop:6}}>
        <button className="vote-btn" disabled={disabled} onClick={() => onVote && onVote(candidate.id)}>Vote</button>
      </div>
    </div>
  )
}

export default CandidateCard
