import * as deviceService from '../services/deviceService.js';

export async function getStatus(req, res) {
  try {
    const status = await deviceService.getDeviceStatus();
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function reconnect(req, res) {
  try {
    const result = await deviceService.reconnectDevice();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function testDevice(req, res) {
  try {
    const result = await deviceService.testDevice();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function capture(req, res) {
  try {
    const result = await deviceService.captureFingerprint();
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function identify(req, res) {
  try {
    const { templateData } = req.body;
    if (!templateData) {
      return res.status(400).json({ error: 'templateData is required' });
    }
    const result = await deviceService.identifyFingerprint(templateData);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export function setSimulator(req, res) {
  const { enabled, ready, busy } = req.body;
  const isEnabled = enabled !== undefined ? !!enabled : (ready !== undefined ? !!ready : false);
  const state = deviceService.setSimulatorState(isEnabled, !!busy);
  return res.json({ success: true, state });
}

