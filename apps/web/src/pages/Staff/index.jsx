import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Fingerprint, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Building2, 
  Phone, 
  Mail, 
  Scan,
  RefreshCw
} from 'lucide-react';
import { staffApi, deviceApi } from '../../services/api';

const FINGER_LABELS = [
  'Right Thumb',
  'Right Index',
  'Right Middle',
  'Right Ring',
  'Right Pinky',
  'Left Thumb',
  'Left Index',
  'Left Middle',
  'Left Ring',
  'Left Pinky'
];

export default function StaffPage() {
  const [staffList, setStaffList] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    staff_id: '',
    name: '',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
    phone: '',
    email: ''
  });
  const [modalError, setModalError] = useState('');

  // Fingerprint Enrollment Modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedFingerIndex, setSelectedFingerIndex] = useState(1); // Default Right Index
  const [capturing, setCapturing] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState('');

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await staffApi.getAll({
        search,
        department: departmentFilter !== 'All' ? departmentFilter : undefined
      });
      setStaffList(data);
    } catch (err) {
      console.error('Error fetching staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [departmentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadStaff();
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({
      staff_id: `STF${100 + staffList.length + 1}`,
      name: '',
      department: 'Computer Science & Engineering',
      designation: 'Assistant Professor',
      phone: '',
      email: ''
    });
    setModalError('');
    setShowStaffModal(true);
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFormData({
      staff_id: staff.staff_id,
      name: staff.name,
      department: staff.department,
      designation: staff.designation,
      phone: staff.phone || '',
      email: staff.email || ''
    });
    setModalError('');
    setShowStaffModal(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setModalError('');

    try {
      if (editingStaff) {
        await staffApi.update(editingStaff.id, formData);
      } else {
        await staffApi.create(formData);
      }
      setShowStaffModal(false);
      loadStaff();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save staff member');
    }
  };

  const handleToggleActive = async (staff) => {
    if (window.confirm(`Are you sure you want to ${staff.active ? 'deactivate' : 'activate'} ${staff.name}?`)) {
      try {
        await staffApi.update(staff.id, { active: !staff.active });
        loadStaff();
      } catch (err) {
        alert('Action failed: ' + err.message);
      }
    }
  };

  const openEnrollmentModal = async (staff) => {
    try {
      const fullStaff = await staffApi.getById(staff.id);
      setSelectedStaff(fullStaff);
      setSelectedFingerIndex(1);
      setEnrollMessage('');
      setShowEnrollModal(true);
    } catch (err) {
      alert('Could not fetch staff biometric status');
    }
  };

  const handleCaptureAndEnroll = async () => {
    if (!selectedStaff) return;
    setCapturing(true);
    setEnrollMessage('Please place finger on MFS100 scanner...');

    try {
      const captureResult = await deviceApi.capture();
      if (!captureResult.templateData) {
        throw new Error('Scanner returned no template data');
      }

      await staffApi.enrollFingerprint(selectedStaff.staff_id, {
        finger_index: selectedFingerIndex,
        template_data: captureResult.templateData,
        template_format: captureResult.templateFormat || 'ANSI378'
      });

      setEnrollMessage(`✓ Successfully enrolled ${FINGER_LABELS[selectedFingerIndex]}!`);

      const updated = await staffApi.getById(selectedStaff.id);
      setSelectedStaff(updated);
      loadStaff();
    } catch (err) {
      setEnrollMessage(`Capture failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setCapturing(false);
    }
  };

  const handleRemoveFingerprint = async (fingerIndex) => {
    if (window.confirm(`Remove enrolled fingerprint for ${FINGER_LABELS[fingerIndex]}?`)) {
      try {
        await staffApi.removeFingerprint(selectedStaff.staff_id, fingerIndex);
        const updated = await staffApi.getById(selectedStaff.id);
        setSelectedStaff(updated);
        loadStaff();
      } catch (err) {
        alert('Failed to remove: ' + err.message);
      }
    }
  };

  const departments = [
    'All',
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Electrical & Electronics',
    'Administration',
    'Science & Humanities'
  ];

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage faculty records, profile designations, and biometric fingerprint enrollments
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID or role..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-600 font-medium">Department:</span>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-600 font-medium"
          >
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-center">Fingerprints</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    {loading ? 'Loading staff records...' : 'No staff members found matching criteria.'}
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {staff.staff_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{staff.name}</div>
                      {staff.email && <div className="text-[10px] text-slate-500 font-normal">{staff.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {staff.department}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {staff.designation}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        staff.enrolled_fingerprints > 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <Fingerprint className="w-3.5 h-3.5" />
                        {staff.enrolled_fingerprints || 0} Enrolled
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        staff.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {staff.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEnrollmentModal(staff)}
                          title="Enroll Fingerprint"
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <Fingerprint className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(staff)}
                          title="Edit Profile"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(staff)}
                          title={staff.active ? 'Deactivate' : 'Activate'}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add / Edit Staff */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-800">
            <h3 className="font-bold text-slate-900 text-base mb-4">
              {editingStaff ? `Edit Staff Member — ${editingStaff.staff_id}` : 'Add New Staff Member'}
            </h3>

            {modalError && (
              <div className="mb-4 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Staff ID *</label>
                  <input
                    type="text"
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    required
                    disabled={!!editingStaff}
                    placeholder="e.g. STF108"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Dr. Ramesh Kumar"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  >
                    {departments.filter(d => d !== 'All').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Designation *</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    required
                    placeholder="e.g. Professor & HOD"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Optional"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Optional"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  {editingStaff ? 'Update Staff Member' : 'Save Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fingerprint Biometric Enrollment */}
      {showEnrollModal && selectedStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">FINGERPRINT ENROLLMENT</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedStaff.name} ({selectedStaff.staff_id})
                </p>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Fingerprint className="w-6 h-6" />
              </div>
            </div>

            {/* Finger Selector Grid */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Finger to Enroll or Update:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {FINGER_LABELS.map((label, idx) => {
                  const isEnrolled = selectedStaff.fingerprints?.some(f => f.finger_index === idx);
                  const isSelected = selectedFingerIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedFingerIndex(idx)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold' 
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs">{label}</span>
                      {isEnrolled ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                          <CheckCircle className="w-3.5 h-3.5" /> Enrolled
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Empty</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {enrollMessage && (
              <div className={`p-3 rounded-lg text-xs mb-4 ${
                enrollMessage.startsWith('✓') 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium' 
                  : 'bg-slate-50 border border-slate-200 text-slate-700'
              }`}>
                {enrollMessage}
              </div>
            )}

            {/* Scan and Enroll Actions */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCaptureAndEnroll}
                disabled={capturing}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-600/20 disabled:opacity-50"
              >
                <Scan className={`w-4 h-4 ${capturing ? 'animate-spin' : ''}`} />
                {capturing ? 'Waiting for MFS100 Fingerprint Scan...' : `Capture & Enroll ${FINGER_LABELS[selectedFingerIndex]}`}
              </button>

              {selectedStaff.fingerprints?.some(f => f.finger_index === selectedFingerIndex) && (
                <button
                  type="button"
                  onClick={() => handleRemoveFingerprint(selectedFingerIndex)}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs transition-colors"
                >
                  Delete Enrolled Template for this Finger
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
