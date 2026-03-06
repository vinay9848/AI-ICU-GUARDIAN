import { createContext, useContext, useState, useEffect, useRef } from 'react';

const DemoContext = createContext({ demo: false, toggle: () => {} });
export const useDemo = () => useContext(DemoContext);

const NAMES = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh', 'Ananya Das', 'Ravi Mehta', 'Kavitha Nair'];
const UNITS = ['MICU', 'SICU', 'CCU', 'NICU', 'PICU'];
const ADMISSION = ['EMERGENCY', 'ELECTIVE', 'URGENT'];

function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function drift(current, target, speed = 0.3) {
  return current + (target - current) * speed * (0.5 + Math.random());
}

function computeStatus(v) {
  if ((v.heart_rate > 130 || v.heart_rate < 40) ||
      (v.spo2 < 90) ||
      (v.respiration_rate > 30 || v.respiration_rate < 8)) return 'critical';
  if ((v.heart_rate > 100) || (v.spo2 < 94) ||
      (v.respiration_rate > 20) || (v.bp_systolic > 160 || v.bp_systolic < 90)) return 'monitoring';
  return 'stable';
}

function initPatient(id) {
  const isCritical = Math.random() < 0.15;
  const isMonitoring = Math.random() < 0.3;
  return {
    heart_rate: isCritical ? randInt(135, 160) : isMonitoring ? randInt(100, 120) : randInt(65, 90),
    bp_systolic: isCritical ? randInt(165, 200) : randInt(110, 140),
    bp_diastolic: randInt(60, 90),
    spo2: isCritical ? rand(82, 89) : isMonitoring ? rand(91, 94) : rand(95, 100),
    temperature: rand(36.2, isCritical ? 39.5 : 37.5),
    glucose: randInt(70, isCritical ? 250 : 140),
    respiration_rate: isCritical ? randInt(31, 40) : isMonitoring ? randInt(20, 28) : randInt(12, 20),
  };
}

function tickVitals(prev) {
  // Occasionally trigger random event
  const event = Math.random();
  let target = { ...prev };

  if (event < 0.02) {
    // Spike to critical
    target.heart_rate = randInt(135, 170);
    target.spo2 = rand(80, 88);
    target.respiration_rate = randInt(32, 42);
  } else if (event < 0.05) {
    // Recovery
    target.heart_rate = randInt(65, 85);
    target.spo2 = rand(96, 99);
    target.respiration_rate = randInt(14, 18);
  }

  return {
    heart_rate: clamp(Math.round(drift(prev.heart_rate, target.heart_rate) + rand(-2, 2)), 30, 180),
    bp_systolic: clamp(Math.round(drift(prev.bp_systolic, target.bp_systolic) + rand(-3, 3)), 60, 220),
    bp_diastolic: clamp(Math.round(drift(prev.bp_diastolic, target.bp_diastolic) + rand(-2, 2)), 40, 120),
    spo2: clamp(parseFloat(drift(prev.spo2, target.spo2, 0.2).toFixed(1) * 1 + rand(-0.3, 0.3)), 75, 100),
    temperature: clamp(parseFloat((drift(prev.temperature, target.temperature, 0.1) + rand(-0.05, 0.05)).toFixed(1)), 35, 41),
    glucose: clamp(Math.round(drift(prev.glucose, target.glucose, 0.1) + rand(-3, 3)), 50, 300),
    respiration_rate: clamp(Math.round(drift(prev.respiration_rate, target.respiration_rate) + rand(-1, 1)), 6, 45),
  };
}

export function DemoProvider({ children }) {
  const [demo, setDemo] = useState(false);
  const [patients, setPatients] = useState([]);
  const [vitalsHistory, setVitalsHistory] = useState({});
  const vitalsRef = useRef({});

  // Initialize demo data
  useEffect(() => {
    if (!demo) return;

    const initial = {};
    const history = {};
    const pats = NAMES.map((name, i) => {
      const id = i + 1;
      const v = initPatient(id);
      initial[id] = v;
      // Generate 30 historical readings
      const readings = [];
      let prev = { ...v };
      for (let j = 0; j < 30; j++) {
        prev = tickVitals(prev);
        readings.push({
          ...prev,
          timestamp: new Date(Date.now() - (30 - j) * 60000).toISOString(),
        });
      }
      history[id] = readings;

      return {
        patient_id: id,
        stay_id: id,
        hadm_id: id,
        name,
        age: randInt(25, 85),
        gender: Math.random() < 0.5 ? 'M' : 'F',
        care_unit: UNITS[randInt(0, UNITS.length - 1)],
        los_days: parseFloat(rand(0.5, 14).toFixed(1)),
        status: computeStatus(v),
        risk_score: 0,
        last_vitals: { ...v, timestamp: new Date().toISOString() },
        admission_type: ADMISSION[randInt(0, ADMISSION.length - 1)],
        hospital_expire_flag: 0,
        last_careunit: UNITS[0],
        intime: '', outtime: '',
      };
    });

    vitalsRef.current = initial;
    setVitalsHistory(history);
    setPatients(pats);
  }, [demo]);

  // Tick every second
  useEffect(() => {
    if (!demo) return;

    const interval = setInterval(() => {
      const now = new Date();
      const updated = { ...vitalsRef.current };

      setPatients(prev => prev.map(p => {
        const id = p.patient_id;
        const oldV = updated[id] || initPatient(id);
        const newV = tickVitals(oldV);
        updated[id] = newV;

        const reading = { ...newV, timestamp: now.toISOString() };
        setVitalsHistory(h => ({
          ...h,
          [id]: [...(h[id] || []).slice(-59), reading],
        }));

        const status = computeStatus(newV);
        const riskScore = status === 'critical' ? rand(0.7, 0.95) :
                          status === 'monitoring' ? rand(0.35, 0.65) : rand(0.05, 0.3);

        return {
          ...p,
          status,
          risk_score: parseFloat(riskScore.toFixed(2)),
          last_vitals: reading,
        };
      }));

      vitalsRef.current = updated;
    }, 1000);

    return () => clearInterval(interval);
  }, [demo]);

  const toggle = () => setDemo(d => !d);

  return (
    <DemoContext.Provider value={{ demo, toggle, patients, vitalsHistory }}>
      {children}
    </DemoContext.Provider>
  );
}
