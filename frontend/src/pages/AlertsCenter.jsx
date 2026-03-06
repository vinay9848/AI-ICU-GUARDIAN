import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import { useVoiceAlerts } from '../hooks/useVoiceAlerts';
import { useDeadManSwitch } from '../hooks/useDeadManSwitch';
import { useAlertNotifications } from '../hooks/useAlertNotifications';
import {
  addAlertContact as apiAddContact,
  removeAlertContact as apiRemoveContact,
  alertCheckin as apiCheckin,
  getEscalations,
  getAlertHistory as apiGetHistory,
} from '../api/client';

const ROLES = [
  { value: 'family', label: 'Family Member' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'head_nurse', label: 'Head Nurse' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'department_head', label: 'Department Head' },
];

export default function AlertsCenter() {
  const { patients } = usePatients(5000);
  const voice = useVoiceAlerts(patients);
  const deadMan = useDeadManSwitch(patients);
  const notifs = useAlertNotifications(patients);
  const [activeTab, setActiveTab] = useState('escalations');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [contactForm, setContactForm] = useState({ name: '', role: 'family', phone: '', email: '' });
  const [serverEscalations, setServerEscalations] = useState([]);

  // Fetch server escalations periodically
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getEscalations();
        setServerEscalations(res.data);
      } catch (e) { /* ignore */ }
    };
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAddContact = async () => {
    if (!selectedPatient || !contactForm.name) return;
    const pid = parseInt(selectedPatient);
    // Always save locally first, then try backend
    notifs.addContact(pid, contactForm);
    setContactForm({ name: '', role: 'family', phone: '', email: '' });
    try {
      await apiAddContact(pid, contactForm);
    } catch (e) {
      console.error('Backend contact save failed (saved locally):', e);
    }
  };

  const handleCheckin = async (patientId) => {
    try {
      await apiCheckin(patientId);
      deadMan.checkin(patientId);
    } catch (e) {
      console.error('Checkin failed:', e);
    }
  };

  const escalationEntries = Object.entries(deadMan.escalations);
  const criticalPatients = patients.filter(p => p.status === 'critical');

  const TABS = [
    { id: 'escalations', label: 'Dead Man\'s Switch', count: escalationEntries.length },
    { id: 'contacts', label: 'Contact Management', count: Object.values(notifs.contacts).flat().length },
    { id: 'history', label: 'Alert History', count: notifs.history.length },
    { id: 'settings', label: 'Settings', count: null },
  ];

  return (
    <div>
      <Link to="/" className="text-medical-blue hover:underline text-sm mb-4 inline-flex items-center gap-1">
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-text">Alert Command Center</h1>
          <p className="text-sm text-gray-500 dark:text-dark-muted">Voice alerts, escalation protocols & contact management</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Voice toggle */}
          <button
            onClick={voice.toggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              voice.enabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-dark-border'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {voice.enabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.788l4.015-3.346A.75.75 0 0111.75 6v12a.75.75 0 01-1.235.574L6.5 15.212H4.253a.75.75 0 01-.75-.75v-4.924a.75.75 0 01.75-.75H6.5z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-3.933A.75.75 0 0112.75 5v14a.75.75 0 01-1.28.53L6.72 15.75H4.51a.75.75 0 01-.75-.75v-6a.75.75 0 01.75-.75h2.21z" />
              )}
            </svg>
            {voice.enabled ? 'Voice ON' : 'Voice OFF'}
          </button>
          <button
            onClick={voice.testVoice}
            className="px-3 py-2 rounded-lg text-sm bg-medical-blue text-white hover:bg-blue-700 transition-colors"
          >
            Test Voice
          </button>
        </div>
      </div>

      {/* Live Status Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatusCard
          label="Critical Patients"
          value={criticalPatients.length}
          color="text-red-600"
          bgColor="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
        />
        <StatusCard
          label="Active Escalations"
          value={escalationEntries.length}
          color="text-orange-600"
          bgColor="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
        />
        <StatusCard
          label="Contacts Registered"
          value={Object.values(notifs.contacts).flat().length}
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        />
        <StatusCard
          label="Alerts Sent (24h)"
          value={notifs.history.length}
          color="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-medical-blue text-white shadow-sm'
                : 'bg-white dark:bg-dark-card text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-dark-border'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'escalations' && (
        <EscalationsTab
          escalations={deadMan.escalations}
          serverEscalations={serverEscalations}
          criticalPatients={criticalPatients}
          onCheckin={handleCheckin}
        />
      )}
      {activeTab === 'contacts' && (
        <ContactsTab
          patients={patients}
          contacts={notifs.contacts}
          selectedPatient={selectedPatient}
          setSelectedPatient={setSelectedPatient}
          contactForm={contactForm}
          setContactForm={setContactForm}
          onAddContact={handleAddContact}
          onRemoveContact={notifs.removeContact}
        />
      )}
      {activeTab === 'history' && (
        <HistoryTab history={notifs.history} onClear={notifs.clearHistory} />
      )}
      {activeTab === 'settings' && (
        <SettingsTab voice={voice} permissionGranted={notifs.permissionGranted} />
      )}
    </div>
  );
}

function StatusCard({ label, value, color, bgColor }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${bgColor}`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-600 dark:text-dark-muted mt-1">{label}</p>
    </div>
  );
}

function EscalationsTab({ escalations, criticalPatients, onCheckin }) {
  const entries = Object.entries(escalations);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-5 transition-colors">
        <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text mb-1">Dead Man's Switch Protocol</h2>
        <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">
          Critical patients require regular check-ins. If no check-in occurs, alerts automatically escalate.
        </p>

        {/* Escalation rules */}
        <div className="flex flex-wrap gap-3 mb-6">
          <EscalationBadge minutes={5} level="Warning" color="yellow" action="Nurse reminded" />
          <span className="text-gray-400 self-center">→</span>
          <EscalationBadge minutes={10} level="Urgent" color="orange" action="Charge nurse alerted" />
          <span className="text-gray-400 self-center">→</span>
          <EscalationBadge minutes={15} level="Emergency" color="red" action="Doctor & head paged" />
        </div>
      </div>

      {entries.length === 0 && criticalPatients.length === 0 && (
        <div className="text-center py-12 text-gray-400 dark:text-dark-muted">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-medium">All Clear</p>
          <p className="text-sm">No critical patients requiring check-in</p>
        </div>
      )}

      {entries.length === 0 && criticalPatients.length > 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
          <p className="text-green-700 dark:text-green-400 font-medium">All critical patients recently checked</p>
        </div>
      )}

      {entries.map(([pid, esc]) => (
        <div
          key={pid}
          className={`rounded-xl border-2 p-5 transition-all ${
            esc.level === 'emergency' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse' :
            esc.level === 'urgent' ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' :
            'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                  esc.level === 'emergency' ? 'bg-red-600 text-white' :
                  esc.level === 'urgent' ? 'bg-orange-500 text-white' :
                  'bg-yellow-500 text-white'
                }`}>
                  {esc.level}
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-dark-text">
                  {esc.patient?.name || `Patient ${pid}`}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-dark-muted">
                No check-in for <strong>{esc.minutesSince} minutes</strong> — {esc.action}
              </p>
            </div>
            <button
              onClick={() => onCheckin(parseInt(pid))}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              Check In Now
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EscalationBadge({ minutes, level, color, action }) {
  const colorClasses = {
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300',
    orange: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-300',
    red: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300',
  };
  return (
    <div className={`rounded-lg border px-3 py-2 ${colorClasses[color]}`}>
      <p className="text-xs font-bold">{minutes}+ min → {level}</p>
      <p className="text-xs opacity-75">{action}</p>
    </div>
  );
}

function ContactsTab({ patients, contacts, selectedPatient, setSelectedPatient, contactForm, setContactForm, onAddContact, onRemoveContact }) {
  return (
    <div className="space-y-4">
      {/* Add Contact Form */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-5 transition-colors">
        <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text mb-4">Add Emergency Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text text-sm"
          >
            <option value="">Select Patient</option>
            {patients.map(p => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.name || `Patient ${p.patient_id}`} (ICU-{p.patient_id})
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Contact Name"
            value={contactForm.name}
            onChange={(e) => setContactForm(f => ({ ...f, name: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text text-sm"
          />
          <select
            value={contactForm.role}
            onChange={(e) => setContactForm(f => ({ ...f, role: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text text-sm"
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <input
            type="tel"
            placeholder="Phone Number"
            value={contactForm.phone}
            onChange={(e) => setContactForm(f => ({ ...f, phone: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text text-sm"
          />
          <input
            type="email"
            placeholder="Email Address"
            value={contactForm.email}
            onChange={(e) => setContactForm(f => ({ ...f, email: e.target.value }))}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text text-sm"
          />
          <button
            onClick={onAddContact}
            disabled={!selectedPatient || !contactForm.name}
            className="px-4 py-2 bg-medical-blue text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Contact
          </button>
        </div>
      </div>

      {/* Contact List */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-5 transition-colors">
        <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text mb-4">Registered Contacts</h2>
        {Object.keys(contacts).length === 0 ? (
          <p className="text-gray-400 dark:text-dark-muted text-center py-8">No contacts registered yet. Add contacts above to enable alert notifications.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(contacts).map(([pid, contactList]) => (
              contactList.length > 0 && (
                <div key={pid}>
                  <h3 className="text-sm font-bold text-gray-600 dark:text-dark-muted mb-2">
                    {patients.find(p => p.patient_id === parseInt(pid))?.name || `Patient ${pid}`}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {contactList.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-dark-text">{c.name}</p>
                          <p className="text-xs text-gray-500 dark:text-dark-muted">
                            <RoleBadge role={c.role} />
                            {c.phone && ` · ${c.phone}`}
                            {c.email && ` · ${c.email}`}
                          </p>
                        </div>
                        <button
                          onClick={() => onRemoveContact(parseInt(pid), c.id)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const colors = {
    family: 'text-purple-600 dark:text-purple-400',
    nurse: 'text-blue-600 dark:text-blue-400',
    head_nurse: 'text-indigo-600 dark:text-indigo-400',
    doctor: 'text-green-600 dark:text-green-400',
    department_head: 'text-red-600 dark:text-red-400',
  };
  const labels = {
    family: 'Family',
    nurse: 'Nurse',
    head_nurse: 'Head Nurse',
    doctor: 'Doctor',
    department_head: 'Dept. Head',
  };
  return <span className={`font-medium ${colors[role] || ''}`}>{labels[role] || role}</span>;
}

function HistoryTab({ history, onClear }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-5 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text">Alert History</h2>
        {history.length > 0 && (
          <button onClick={onClear} className="text-sm text-red-500 hover:text-red-700">Clear All</button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="text-gray-400 dark:text-dark-muted text-center py-8">No alerts triggered yet. Alerts appear here when patient status changes to critical.</p>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {history.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
                alert.type === 'critical' ? 'bg-red-50 dark:bg-red-900/20' :
                alert.type === 'notification_sent' ? 'bg-blue-50 dark:bg-blue-900/20' :
                'bg-green-50 dark:bg-green-900/20'
              }`}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                alert.type === 'critical' ? 'bg-red-500' :
                alert.type === 'notification_sent' ? 'bg-blue-500' :
                'bg-green-500'
              }`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-dark-text">{alert.message}</p>
                <p className="text-xs text-gray-500 dark:text-dark-muted">
                  {new Date(alert.time).toLocaleString()}
                  {alert.notifiedContacts?.length > 0 && (
                    <span> · Notified: {alert.notifiedContacts.join(', ')}</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ voice, permissionGranted }) {
  return (
    <div className="space-y-4">
      {/* Voice Settings */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-5 transition-colors">
        <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text mb-4">Voice Alert Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-dark-text">Voice Alerts</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted">Browser speaks aloud when a patient goes critical</p>
            </div>
            <button
              onClick={voice.toggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${voice.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${voice.enabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-dark-text">Browser Notifications</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted">Push notifications on mobile & desktop</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              permissionGranted
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {permissionGranted ? 'Enabled' : 'Blocked'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-dark-text">Speech Synthesis</p>
              <p className="text-xs text-gray-500 dark:text-dark-muted">Web Speech API availability</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              'speechSynthesis' in window
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {'speechSynthesis' in window ? 'Available' : 'Not Supported'}
            </span>
          </div>
        </div>
      </div>

      {/* Escalation Protocol */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-5 transition-colors">
        <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text mb-4">Escalation Protocol</h2>
        <p className="text-sm text-gray-500 dark:text-dark-muted mb-4">When no nurse checks on a critical patient:</p>
        <div className="space-y-3">
          <ProtocolStep step={1} time="5 min" action="Warning displayed on dashboard" color="yellow" />
          <ProtocolStep step={2} time="10 min" action="Charge nurse receives urgent alert via browser notification + voice" color="orange" />
          <ProtocolStep step={3} time="15 min" action="Doctor in charge and department head receive emergency page. All registered contacts notified." color="red" />
        </div>
      </div>

      {/* Mobile Guide */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-5 transition-colors">
        <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text mb-4">Mobile Alert Setup</h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-dark-muted">
          <p><strong className="text-gray-800 dark:text-dark-text">Step 1:</strong> Open this site on your phone's browser (Chrome recommended)</p>
          <p><strong className="text-gray-800 dark:text-dark-text">Step 2:</strong> Tap "Allow" when prompted for notifications</p>
          <p><strong className="text-gray-800 dark:text-dark-text">Step 3:</strong> Add to Home Screen for app-like experience</p>
          <p><strong className="text-gray-800 dark:text-dark-text">Step 4:</strong> Keep the tab open — alerts will vibrate and notify even when screen is off</p>
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-blue-700 dark:text-blue-400 text-xs font-medium">
              For family members: Share the site URL and ask them to enable notifications.
              They will receive real-time alerts whenever their loved one's condition changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtocolStep({ step, time, action, color }) {
  const colors = {
    yellow: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    orange: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
    red: 'border-red-400 bg-red-50 dark:bg-red-900/20',
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${colors[color]}`}>
      <span className="text-xs font-bold text-gray-400 mt-0.5">#{step}</span>
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-dark-text">After {time}</p>
        <p className="text-xs text-gray-500 dark:text-dark-muted">{action}</p>
      </div>
    </div>
  );
}
