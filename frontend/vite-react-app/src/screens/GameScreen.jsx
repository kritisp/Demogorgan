import React, { useState, useEffect, useRef } from 'react';
import Radar from '../components/Radar';
import AlertBanner from '../components/AlertBanner';
import PlayerList from '../components/PlayerList';
import bluetoothScanner from '../services/BluetoothScanner';
import socketService from '../services/SocketService';

const GameScreen = ({ appState }) => {
  const [rssi, setRssi] = useState(null);
  const [radarState, setRadarState] = useState('SEARCHING');
  const [alertMsg, setAlertMsg] = useState('Scan for Demogorgon Beacon to begin.');
  const [alertType, setAlertType] = useState('info');
  const [votingTarget, setVotingTarget] = useState(null);
  const [detectedDevices, setDetectedDevices] = useState({});
  const [isScanning, setIsScanning] = useState(false);

  // Refs for stable state access in scanner callbacks (stale closure prevention)
  const stateRef = useRef(appState);
  const radarStateRef = useRef(radarState);
  const autoKillTimers = useRef({});
  const proximityEmitTimer = useRef(null);
  const lostTimeoutRef = useRef(null);

  // Always keep refs in sync
  useEffect(() => { stateRef.current = appState; }, [appState]);
  useEffect(() => { radarStateRef.current = radarState; }, [radarState]);

  useEffect(() => {
    return () => {
      bluetoothScanner.stopScan();
      if (lostTimeoutRef.current) clearTimeout(lostTimeoutRef.current);
    };
  }, []);

  const processProximity = (avgRSSI) => {
    const isActuallyClose = avgRSSI > -55; // ~70cm BLE range
    if (!proximityEmitTimer.current) {
      if (socketService.socket) {
        socketService.socket.emit('proximity_update', { isClose: isActuallyClose });
      }
      proximityEmitTimer.current = setTimeout(() => { proximityEmitTimer.current = null; }, 1000);
    }

    if (isActuallyClose) {
      if (radarStateRef.current !== 'CAPTURING') {
        setRadarState('CAPTURING');
        setAlertMsg("!!! DANGER: DEMOGORGON FEEDING !!!");
        setAlertType('danger');
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      }
    } else if (avgRSSI > -58) {
      if (radarStateRef.current !== 'DANGER') {
        setRadarState('DANGER');
        setAlertMsg("DANGER: DEMOGORGON VERY CLOSE");
        setAlertType('danger');
        if ('vibrate' in navigator) navigator.vibrate(200);
      }
    } else if (avgRSSI > -65) {
      if (radarStateRef.current !== 'NEARBY') {
        setRadarState('NEARBY');
        setAlertMsg("⚠ DEMOGORGON NEARBY");
        setAlertType('warning');
        if ('vibrate' in navigator) navigator.vibrate(100);
      }
    } else if (avgRSSI > -72) {
      if (radarStateRef.current !== 'DETECTED') {
        setRadarState('DETECTED');
        setAlertMsg("Weak signal detected...");
        setAlertType('info');
      }
    } else {
      if (radarStateRef.current !== 'SEARCHING_SIGNAL') {
        setRadarState('SEARCHING_SIGNAL');
        setAlertMsg("Searching for signals...");
        setAlertType('info');
      }
    }
  };

  useEffect(() => {
    if (!isScanning) return;

    bluetoothScanner.onDevicesUpdate = (devices) => {
      // Always read FRESH state from refs — no stale closures
      const { players, role, demogorgonId } = stateRef.current;
      const enrichedDevices = {};

      const monsterPlayer = players.find(p => p.id === demogorgonId);
      const monsterBeaconName = monsterPlayer?.beaconName?.toUpperCase();

      Object.keys(devices).forEach(advName => {
        const deviceData = { ...devices[advName] };
        const upperAdvName = advName.toUpperCase().trim();

        // Match player via Beacon Name
        const matchingPlayer = players.find(p => (p.beaconName || "").toUpperCase().trim() === upperAdvName);

        if (matchingPlayer) {
          deviceData.playerId = matchingPlayer.id;
          deviceData.playerName = matchingPlayer.name;
          if (matchingPlayer.captured) deviceData.isDead = true;

          // Don't show yourself on your own radar
          const isSelf = (matchingPlayer.id === socketService.socket?.id);

          if (!isSelf) {
            // Agents only process proximity for the Demogorgon beacon
            if (role === 'AGENT' && matchingPlayer.id === demogorgonId) {
              setRssi(deviceData.avgRSSI);
              processProximity(deviceData.avgRSSI);
              if (lostTimeoutRef.current) { clearTimeout(lostTimeoutRef.current); lostTimeoutRef.current = null; }
            }
            enrichedDevices[advName] = deviceData;
          }
        }
      });

      if (Object.keys(enrichedDevices).length > 0) {
        console.log(`[Radar Callback] Rendering ${Object.keys(enrichedDevices).length} dots for ${role}`);
      }

      // Demogorgon proximity auto-kill logic
      if (role === 'DEMOGORGON') {
        const now = Date.now();
        Object.entries(enrichedDevices).forEach(([advName, data]) => {
          if (!data.isDead && data.avgRSSI > -55) { // ~70cm kill range
            if (!autoKillTimers.current[advName]) {
              autoKillTimers.current[advName] = now;
            } else if (now - autoKillTimers.current[advName] > 500) {
              console.log("[Auto-Kill] Triggering devour for:", data.playerName, "beacon:", advName);
              socketService.devourPlayer(advName); // pass the BLE beacon name
              delete autoKillTimers.current[advName];
            }
          } else {
            delete autoKillTimers.current[advName];
          }
        });
      }

      setDetectedDevices(enrichedDevices);

      // Agent loses demon signal
      if (role === 'AGENT' && monsterBeaconName && !devices[monsterBeaconName] && !lostTimeoutRef.current) {
        setRssi(null);
        setRadarState('SEARCHING');
      }
    };
  }, [isScanning]);

  const handleStartScan = async () => {
    try {
      await bluetoothScanner.startScan();
      setIsScanning(true);
      setAlertMsg("GRANTING ACCESS... RADAR STARTING.");
      setAlertType("success");
    } catch (err) {
      setAlertMsg("Error: " + err.message);
      setAlertType("danger");
    }
  };

  const handleIdentify = () => {
    if (window.confirm("Report a body and start an identification vote?")) {
      socketService.initiateVote();
    }
  };

  const role = appState.role;
  const status = appState.status;

  // --- VOTING PHASE ---
  if (status === 'VOTING') {
    return (
      <div className="panel">
        <h2 style={{ color: 'var(--accent-red)', textAlign: 'center' }}>IDENTIFICATION PHASE</h2>
        <AlertBanner type="warning" message="An Agent reported a body. Discuss and vote for the Demogorgon." />
        <PlayerList
          players={appState.players.filter(p => !p.captured && p.id !== socketService.socket?.id)}
          onVote={(id) => { setVotingTarget(id); socketService.submitVote(id); }}
          votingTarget={votingTarget}
          isVotingContext={true}
        />
      </div>
    );
  }

  // --- DEMOGORGON SCREEN ---
  if (role === 'DEMOGORGON') {
    // Nearby living agents the Demogorgon can manually BANISH
    const nearbyTargets = Object.entries(detectedDevices).filter(
      ([, data]) => !data.isDead && data.avgRSSI > -65
    );

    return (
      <div className="panel" style={{ textAlign: 'center' }}>
        <h1 style={{ color: 'var(--accent-red)', fontSize: '1.5rem' }}>YOU ARE THE DEMOGORGON 👹</h1>
        <Radar devices={detectedDevices} role={role} demogorgonId={appState.demogorgonId} />

        <div style={{ margin: '1rem 0' }}>
          {!isScanning ? (
            <button className="primary" onClick={handleStartScan} style={{ width: '100%', padding: '1rem' }}>
              START HUNTING 🔴
            </button>
          ) : (
            <p style={{ color: 'var(--accent-green)', fontFamily: 'Orbitron', fontSize: '0.85rem' }}>
              🩸 HUNTING... Auto-kill triggers at &lt;0.5s proximity
            </p>
          )}
        </div>

        {/* BANISH buttons — one per nearby living agent */}
        {nearbyTargets.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ color: '#ff4444', fontWeight: 'bold', marginBottom: '0.5rem' }}>⚡ TARGETS IN RANGE — BANISH NOW:</p>
            {nearbyTargets.map(([advName, data]) => (
              <button
                key={advName}
                onClick={() => {
                  console.log("[Manual Banish] Devouring:", advName);
                  socketService.devourPlayer(advName);
                }}
                style={{
                  width: '100%',
                  padding: '1rem',
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, #7f0000, #ff0000)',
                  color: '#fff',
                  fontFamily: 'Orbitron',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  border: '2px solid #ff4444',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textShadow: '0 0 10px red',
                  boxShadow: '0 0 20px rgba(255,0,0,0.5)',
                  animation: 'pulse-red 1s infinite'
                }}
              >
                💀 BANISH: {data.playerName || advName}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <PlayerList players={appState.players} />
        </div>
      </div>
    );
  }

  // --- CAPTURED SCREEN ---
  if (appState.captured) {
    return (
      <div className="panel" style={{ textAlign: 'center', background: '#3b0a0a' }}>
        <h1 style={{ color: 'red', fontSize: '3rem' }}>💀 CAPTURED 💀</h1>
        <p>You have been consumed by the Demogorgon.</p>
        <PlayerList players={appState.players} />
      </div>
    );
  }

  // --- AGENT SCREEN ---
  return (
    <div style={{ width: '100%', padding: '0.5rem' }}>
      <AlertBanner type={alertType} message={alertMsg} />
      <Radar devices={detectedDevices} state={radarState} role={role} demogorgonId={appState.demogorgonId} />

      <div style={{ marginTop: '1rem' }}>
        {!isScanning ? (
          <button className="primary" onClick={handleStartScan} style={{ width: '100%', padding: '1.5rem' }}>
            GRANT BLE &amp; START RADAR
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
            <button
              className="primary"
              onClick={() => socketService.reportBody()}
              style={{ padding: '1.2rem', background: '#3b82f6' }}
              disabled={!Object.values(detectedDevices).some(d => d.isDead && d.avgRSSI > -65)}
            >
              📢 REPORT BODY 📢
            </button>
            <button onClick={handleIdentify} style={{ padding: '1rem' }}>
              ❓ IDENTIFY MONSTER ❓
            </button>
          </div>
        )}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <PlayerList players={appState.players} />
      </div>
    </div>
  );
};

export default GameScreen;
