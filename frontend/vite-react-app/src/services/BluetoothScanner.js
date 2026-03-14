class BluetoothScanner {
  constructor() {
    this.device = null;
    this.devices = {}; // name -> { rssiHistory, lastSeenTime, avgRSSI }
    this.isScanning = false;
    
    // Callbacks
    this.onDevicesUpdate = null; // (devicesMap) => {}
    this.onDeviceLost = null; // (name) => {}
    
    this.lossTimeout = null;
    this._boundHandleAdvertisement = this.handleAdvertisement.bind(this);
  }

  async startScan() {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth API is not supported in this browser. Please use Chrome for Android and enable experimental web platform features.");
    }

    try {
      this.device = await navigator.bluetooth.requestLEScan({
        acceptAllAdvertisements: true
      });

      navigator.bluetooth.addEventListener('advertisementreceived', this._boundHandleAdvertisement);
      this.isScanning = true;
      console.log('Started BLE Scan');
      this.startLossMonitor();
    } catch (error) {
      console.error('Error starting BLE scan:', error);
      if (error.message.toLowerCase().includes('adapter not available')) {
         throw new Error("Bluetooth adapter not available. Ensure Bluetooth AND Location services are turned ON for Chrome, then reload.");
      }
      throw error;
    }
  }

  stopScan() {
    if (this.isScanning) {
      navigator.bluetooth.removeEventListener('advertisementreceived', this._boundHandleAdvertisement);
      this.isScanning = false;
      this.devices = {};
      if (this.lossTimeout) clearInterval(this.lossTimeout);
      console.log('Stopped BLE Scan');
    }
  }

  handleAdvertisement(event) {
    const rawName = event.name || event.device.name || "";
    const name = rawName.toUpperCase();
    
    if (name) {
      const now = Date.now();
      const rssi = event.rssi;

      if (!this.devices[name]) {
        this.devices[name] = { rssiHistory: [], lastSeenTime: now, avgRSSI: 0 };
      }

      const device = this.devices[name];
      device.lastSeenTime = now;
      device.rssiHistory.push(rssi);
      
      if (device.rssiHistory.length > 10) {
        device.rssiHistory.shift();
      }

      device.avgRSSI = device.rssiHistory.reduce((a, b) => a + b, 0) / device.rssiHistory.length;

      if (this.onDevicesUpdate) {
        this.onDevicesUpdate(this.devices);
      }
    }
  }

  startLossMonitor() {
    if (this.lossTimeout) clearInterval(this.lossTimeout);
    
    this.lossTimeout = setInterval(() => {
      const now = Date.now();
      let changed = false;

      Object.keys(this.devices).forEach(name => {
        if (now - this.devices[name].lastSeenTime > 10000) {
          delete this.devices[name];
          changed = true;
          if (this.onDeviceLost) {
            this.onDeviceLost(name);
          }
        }
      });

      if (changed && this.onDevicesUpdate) {
        this.onDevicesUpdate(this.devices);
      }
    }, 1000);
  }
}

const scanner = new BluetoothScanner();
export default scanner;
