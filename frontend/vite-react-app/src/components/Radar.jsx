import React, { useEffect, useState } from 'react';
import '../styles/radar.css';

const Radar = ({ devices = {}, state, role, demogorgonId }) => {
  // state: 'SEARCHING' | 'DETECTED' | 'DANGER' | 'CAPTURING'
  // devices: { [name]: { avgRSSI, playerName, isDead, playerId } }

  const [angles, setAngles] = useState({});

  useEffect(() => {
    setAngles(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(devices).forEach(name => {
        if (next[name] === undefined) {
          next[name] = Math.random() * 360;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [devices]);

  const calculatePos = (rssi, angle) => {
    const clampedRssi = Math.max(-100, Math.min(rssi, -40));
    const distancePct = ((clampedRssi + 40) / -60) * 100;
    const radiusPct = distancePct / 2;
    const rad = (angle * Math.PI) / 180;
    return {
      x: 50 + radiusPct * Math.cos(rad),
      y: 50 + radiusPct * Math.sin(rad)
    };
  };

  const isDanger = state === 'DANGER' || state === 'CAPTURING';
  const deviceList = Object.entries(devices);

  return (
    <div className={`radar-container ${isDanger ? 'screen-flash-red' : ''}`}>
      <div className="radar-grid"></div>
      <div className="radar-circles"></div>

      {deviceList.map(([name, data]) => {
        const { x, y } = calculatePos(data.avgRSSI, angles[name] || 0);
        
        const isMeAgent = role === 'AGENT';
        const isDead = data.isDead;
        
        // Agent radar = all blue dots. Demogorgon radar = all red dots.
        const dotColor = isMeAgent ? '#3b82f6' : '#ff0000';
        const pulseClass = isMeAgent ? 'pulse-blue' : 'pulse';

        const dotClass = isDead ? 'dead-dot' : (isMeAgent ? 'agent-dot' : 'demogorgon-dot') + ` ${pulseClass}`;

        return (
          <div
            key={name}
            className={dotClass}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              backgroundColor: isDead ? 'transparent' : dotColor,
              boxShadow: isDead ? 'none' : `0 0 15px ${dotColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isDead ? '22px' : '0px',
              width: isDead ? '24px' : '16px',
              height: isDead ? '24px' : '16px'
            }}
          >
            {isDead ? '❌' : ''}
            <span style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              color: isDead ? '#ff4444' : '#fff',
              textDecoration: isDead ? 'line-through' : 'none',
              textShadow: '2px 2px 4px #000',
              fontWeight: 'bold',
              marginTop: '2px'
            }}>
              {data.playerName || name}
            </span>
          </div>
        );
      })}

      <div className="radar-sweep"></div>

      <div style={{
        position: 'absolute',
        bottom: '10px',
        width: '100%',
        textAlign: 'center',
        color: deviceList.length > 0 ? 'var(--accent-green)' : 'var(--text-secondary)',
        fontFamily: 'Orbitron',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        textShadow: '0 0 5px #000'
      }}>
        {deviceList.length === 0 ? 'SCANNING...' : `TRACKING ${deviceList.length} TARGETS`}
      </div>
    </div>
  );
};

export default Radar;
