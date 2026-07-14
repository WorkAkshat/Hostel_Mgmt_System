import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Home, ShieldAlert, ClipboardCheck, Users, HelpCircle } from 'lucide-react';
import CustomModal from '../components/CustomModal';
import SidePanel from '../components/SidePanel';

const Rooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState('All');

  // Add Room Form state
  const [addForm, setAddForm] = useState({
    roomNumber: '', block: 'Block A', sharingType: 2, isAc: false
  });
  const [addError, setAddError] = useState(null);

  // Asset Edit State (within details panel)
  const [assetsList, setAssetsList] = useState([]);
  const [isUpdatingAssets, setIsUpdatingAssets] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await api('/rooms');
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (location.state?.action === 'add') {
      setIsAddModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);
    try {
      await api('/rooms', {
        method: 'POST',
        body: addForm
      });
      setIsAddModalOpen(false);
      setAddForm({ roomNumber: '', block: 'Block A', sharingType: 2, isAc: false });
      fetchRooms();
    } catch (err) {
      setAddError(err.message || 'Failed to create room');
    }
  };

  const openDetailsPanel = (room) => {
    setSelectedRoom(room);
    try {
      const parsedAssets = JSON.parse(room.assets);
      setAssetsList(parsedAssets);
    } catch (error) {
      setAssetsList([]);
    }
    setIsDetailsModalOpen(true);
  };

  const handleUpdateAssetStatus = (index, newStatus) => {
    const updated = [...assetsList];
    updated[index].status = newStatus;
    setAssetsList(updated);
  };

  const saveAssetsChanges = async () => {
    try {
      setIsUpdatingAssets(true);
      await api(`/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        body: {
          assets: assetsList
        }
      });
      setIsDetailsModalOpen(false);
      fetchRooms();
    } catch (error) {
      alert(error.message || 'Failed to update asset checklists');
    } finally {
      setIsUpdatingAssets(false);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (window.confirm('Are you sure you want to delete this room? This cannot be undone.')) {
      try {
        await api(`/rooms/${id}`, {
          method: 'DELETE'
        });
        fetchRooms();
      } catch (error) {
        alert(error.message || 'Failed to delete room');
      }
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="page-header mb-0 sm:mb-0">
          <h1 className="page-title">Rooms & Inventory Assets</h1>
          <p className="page-subtitle">Inspect rooms sharing status, occupancy blocks, and audit property assets condition.</p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} />
            <span>Create New Room</span>
          </button>
        )}
      </div>

      {/* Floor selection and legend */}
      <div className="glass-card p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {['All', '1', '2', '3'].map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                selectedFloor === floor 
                  ? 'bg-[var(--primary)] text-white shadow-sm' 
                  : 'bg-slate-50 text-slate-500 border border-slate-200/60 hover:bg-slate-100'
              }`}
            >
              {floor === 'All' ? 'All Floors' : `Floor ${floor}`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-5 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Available</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>Full / Occupied</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Service</span>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <div className="spinner"></div>
          <p className="text-slate-400 font-medium text-sm">Loading rooms grid records...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400 font-medium">No rooms configured in the system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {rooms
            .filter((room) => {
              if (selectedFloor === 'All') return true;
              const firstDigit = room.roomNumber.replace(/\D/g, '').charAt(0);
              return firstDigit === selectedFloor;
            })
            .map((room) => {
              const occupiedBeds = room.students?.length || 0;
              const capacity = room.sharingType;
              const progressPercentage = Math.min((occupiedBeds / capacity) * 100, 100);

              let statusText = "Available";
              let statusBadgeClass = "badge-success";

              if (room.status === 'FULL') {
                statusText = "Full";
                statusBadgeClass = "badge-info";
              } else if (room.status === 'MAINTENANCE' || room.status === 'SERVICE') {
                statusText = "Service";
                statusBadgeClass = "badge-danger";
              }

              return (
                <div 
                  key={room.id}
                  className="glass-card p-5 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col gap-4 relative group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
                        <Home size={16} />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-extrabold text-slate-800 leading-tight">Room {room.roomNumber}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{room.block}</span>
                      </div>
                    </div>
                    <span className={`badge ${statusBadgeClass}`}>{statusText}</span>
                  </div>

                  {/* Occupancy Indicator */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Occupancy:</span>
                      <span className="font-bold text-slate-700">{occupiedBeds} / {capacity} Beds</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          occupiedBeds === capacity ? 'bg-indigo-600' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Room Meta - AC equipped */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      room.isAc ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}>
                      {room.isAc ? 'AC Premium' : 'Non-AC Standard'}
                    </span>
                    {user.role === 'ADMIN' && occupiedBeds === 0 && (
                      <button 
                        onClick={() => handleDeleteRoom(room.id)}
                        className="opacity-0 group-hover:opacity-100 absolute top-4 right-4 text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer transition-all"
                        title="Delete Room Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Room occupants list */}
                  <div className="flex flex-col gap-2 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Residents:</span>
                    <div className="flex items-center gap-1.5 h-7">
                      {room.students && room.students.length > 0 ? (
                        <div className="flex items-center">
                          {room.students.map((student, idx) => (
                            <div 
                              key={student.id} 
                              className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[10px] flex items-center justify-center border-2 border-white shadow-sm -mr-2 last:mr-0 cursor-help"
                              title={student.user?.name}
                            >
                              {student.user?.name?.charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No residents assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-[1px] bg-slate-100 mt-2" />

                  {/* Action Button */}
                  <button 
                    onClick={() => openDetailsPanel(room)}
                    className="w-full h-10 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all bg-white"
                  >
                    <ClipboardCheck size={14} />
                    <span>Audit Room Assets</span>
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {/* CREATE ROOM RECORD MODAL */}
      <CustomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Room Record">
        {addError && (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4 animate-fade-in">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{addError}</span>
          </div>
        )}
        <form onSubmit={handleAddSubmit} className="form-grid">
          <div className="form-group full-width">
            <label className="form-label">Room Number</label>
            <input 
              type="text" 
              className="form-input" 
              required
              placeholder="e.g. A-103"
              value={addForm.roomNumber}
              onChange={(e) => setAddForm({...addForm, roomNumber: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Hostel Block</label>
            <select 
              className="form-input"
              value={addForm.block}
              onChange={(e) => setAddForm({...addForm, block: e.target.value})}
            >
              <option value="Block A">Block A (AC Premium)</option>
              <option value="Block B">Block B (Standard Non-AC)</option>
              <option value="Block C">Block C (Girls Wing)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Sharing Capacity</label>
            <select 
              className="form-input"
              value={addForm.sharingType}
              onChange={(e) => setAddForm({...addForm, sharingType: parseInt(e.target.value, 10)})}
            >
              <option value="1">1 (Single Occupancy)</option>
              <option value="2">2 (Double Occupancy)</option>
              <option value="3">3 (Triple Sharing)</option>
            </select>
          </div>
          <div className="flex items-center gap-2.5 mt-2 text-sm text-slate-600 select-none">
            <input 
              type="checkbox" 
              id="isAc"
              checked={addForm.isAc}
              onChange={(e) => setAddForm({...addForm, isAc: e.target.checked})}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isAc" className="cursor-pointer font-medium text-xs text-slate-500 uppercase tracking-wider">Equipped with Air Conditioning (AC)</label>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2 full-width">
            <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create Room</button>
          </div>
        </form>
      </CustomModal>

      {/* ROOM DETAILS & ASSET INSPECTION SIDE PANEL */}
      <SidePanel 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        title={`Audit Room ${selectedRoom?.roomNumber} Inventory`}
      >
        <div className="flex flex-col gap-5 text-left h-full">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
            <ClipboardCheck size={20} className="text-[var(--primary)]" />
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Property Inventory Ledger</h4>
          </div>
          
          <p className="text-xs text-slate-400 font-medium">
            Wardens can inspect room items (beds, tables, fans) and flag maintenance or physical damage issues.
          </p>

          <div className="flex flex-col gap-3.5 bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-grow overflow-y-auto">
            {assetsList.map((asset, index) => (
              <div key={index} className="flex justify-between items-center border-b border-slate-200/50 pb-3 last:border-0 last:pb-0">
                <span className="text-xs font-bold text-slate-700">{asset.name}</span>
                <div className="flex gap-1.5">
                  <button 
                    type="button"
                    className={`h-8 px-3 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                      asset.status === 'Good' || asset.status === 'Working' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                    }`}
                    onClick={() => handleUpdateAssetStatus(index, 'Good')}
                    disabled={user.role !== 'ADMIN'}
                  >
                    Working
                  </button>
                  <button 
                    type="button"
                    className={`h-8 px-3 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                      asset.status === 'Damaged' || asset.status === 'Broken' 
                        ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-sm' 
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                    }`}
                    onClick={() => handleUpdateAssetStatus(index, 'Broken')}
                    disabled={user.role !== 'ADMIN'}
                  >
                    Damaged
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setIsDetailsModalOpen(false)}>
              {user.role === 'ADMIN' ? 'Cancel' : 'Close'}
            </button>
            {user.role === 'ADMIN' && (
              <button 
                type="button" 
                className="btn-primary h-11 px-5" 
                onClick={saveAssetsChanges}
                disabled={isUpdatingAssets}
              >
                {isUpdatingAssets ? 'Saving...' : 'Save Audit Checklist'}
              </button>
            )}
          </div>
        </div>
      </SidePanel>
    </div>
  );
};

export default Rooms;

