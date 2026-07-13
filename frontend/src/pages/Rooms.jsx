import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Home, Plus, Settings, Eye, Trash2, CheckCircle, ShieldAlert, ClipboardCheck, Sparkles } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const Rooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  // Asset Edit State (within details modal)
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

  const openDetailsModal = (room) => {
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
    <div className="animate-fade-in">
      <div style={styles.headerRow}>
        <div>
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          {['All', '1', '2', '3'].map((floor) => (
            <button
              key={floor}
              onClick={() => setSelectedFloor(floor)}
              className={`px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                selectedFloor === floor 
                  ? 'bg-[#0b1a52] text-white' 
                  : 'bg-black/5 text-[#475569] hover:bg-black/10'
              }`}
            >
              {floor === 'All' ? 'All Floors' : `Floor ${floor}`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>Available</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0b1a52]"></span>Occupied</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>Service</span>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading rooms grid...</p>
      ) : rooms.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>No rooms configured in the system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-6">
          {rooms
            .filter((room) => {
              if (selectedFloor === 'All') return true;
              const firstDigit = room.roomNumber.replace(/\D/g, '').charAt(0);
              return firstDigit === selectedFloor;
            })
            .map((room) => {
              const currentOccupancy = room.students?.length || 0;
              let cardClass = "";
              let statusText = "";
              let statusClass = "";

              if (room.status === 'AVAILABLE') {
                cardClass = "bg-green-50/60 border border-green-500 text-green-700 hover:bg-green-100/50";
                statusText = "Available";
                statusClass = "text-green-600";
              } else if (room.status === 'FULL') {
                cardClass = "bg-[#0b1a52] border border-[#0b1a52] text-white hover:bg-[#16276b]";
                statusText = "Occupied";
                statusClass = "text-[#0b1a52] font-semibold";
              } else {
                cardClass = "bg-gray-100 border border-gray-300 text-gray-500 hover:bg-gray-200/50";
                statusText = "Service";
                statusClass = "text-gray-400";
              }

              return (
                <div 
                  key={room.id}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div 
                    onClick={() => openDetailsModal(room)}
                    className={`w-full aspect-square rounded-xl flex items-center justify-center font-bold text-lg cursor-pointer transition-all relative group shadow-sm ${cardClass}`}
                  >
                    <span>{room.roomNumber}</span>
                    
                    {/* Overlay delete button for empty rooms to avoid UI clutter */}
                    {user.role === 'ADMIN' && currentOccupancy === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRoom(room.id);
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500/10 text-red-500 border-none items-center justify-center cursor-pointer hidden group-hover:flex"
                        title="Delete Room"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wide ${statusClass}`}>
                    {statusText}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {/* CREATE ROOM MODAL */}
      <CustomModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Room Record">
        {addError && (
          <div style={styles.modalErrorBanner}>
            <ShieldAlert size={16} />
            <span>{addError}</span>
          </div>
        )}
        <form onSubmit={handleAddSubmit} style={styles.modalForm}>
          <div className="form-group">
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
          <div className="form-group" style={styles.checkboxGroup}>
            <input 
              type="checkbox" 
              id="isAc"
              checked={addForm.isAc}
              onChange={(e) => setAddForm({...addForm, isAc: e.target.checked})}
            />
            <label htmlFor="isAc" style={{ userSelect: 'none', cursor: 'pointer' }}>Equipped with Air Conditioning (AC)</label>
          </div>
          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create Room</button>
          </div>
        </form>
      </CustomModal>

      {/* ROOM DETAILS & ASSET INSPECTION MODAL */}
      <CustomModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        title={`Audit Room ${selectedRoom?.roomNumber} Inventory`}
      >
        <div style={styles.detailsBody}>
          <div style={styles.assetsHeader}>
            <ClipboardCheck size={20} color="var(--accent)" />
            <h4 style={{ color: 'var(--text-primary)' }}>Property Inventory Ledger</h4>
          </div>
          
          <p style={styles.assetInstruction}>
            Warden can inspect room items (beds, tables, fans) and flag maintenance issues.
          </p>

          <div style={styles.assetsList}>
            {assetsList.map((asset, index) => (
              <div key={index} style={styles.assetItem}>
                <span style={styles.assetName}>{asset.name}</span>
                <div style={styles.assetStatusBtns}>
                  <button 
                    type="button"
                    style={{
                      ...styles.assetStatusBtn,
                      ...asset.status === 'Good' || asset.status === 'Working' ? styles.assetStatusGoodActive : {}
                    }}
                    onClick={() => handleUpdateAssetStatus(index, 'Good')}
                    disabled={user.role !== 'ADMIN'}
                  >
                    Working
                  </button>
                  <button 
                    type="button"
                    style={{
                      ...styles.assetStatusBtn,
                      ...asset.status === 'Damaged' || asset.status === 'Broken' ? styles.assetStatusBadActive : {}
                    }}
                    onClick={() => handleUpdateAssetStatus(index, 'Broken')}
                    disabled={user.role !== 'ADMIN'}
                  >
                    Damaged
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsDetailsModalOpen(false)}>
              {user.role === 'ADMIN' ? 'Cancel' : 'Close'}
            </button>
            {user.role === 'ADMIN' && (
              <button 
                type="button" 
                className="btn-primary" 
                onClick={saveAssetsChanges}
                disabled={isUpdatingAssets}
              >
                {isUpdatingAssets ? 'Saving...' : 'Save Audit Checklist'}
              </button>
            )}
          </div>
        </div>
      </CustomModal>
    </div>
  );
};

const styles = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  roomsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  roomCard: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  blockName: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--danger)',
    cursor: 'pointer',
    opacity: 0.6,
    transition: 'opacity 0.2s ease',
  },
  roomNumRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '0.25rem',
  },
  roomNumber: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  sharingMeta: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '1rem',
  },
  occupancyBarContainer: {
    height: '6px',
    background: 'rgba(0,0,0,0.03)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.35rem',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: '4px',
  },
  occupancyTextRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginBottom: '1rem',
  },
  occupantsArea: {
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.25rem',
  },
  vacantLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  avatarsRow: {
    display: 'flex',
    alignItems: 'center',
  },
  avatarMini: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.75rem',
    border: '2px solid #ffffff',
    marginRight: '-6px',
    boxShadow: 'var(--shadow-sm)',
  },
  cardActions: {
    marginTop: 'auto',
  },
  inspectBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '0.5rem',
    fontSize: '0.8rem',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  modalErrorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    color: 'var(--danger)',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
  detailsBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  assetsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  assetInstruction: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '1.25rem',
  },
  assetsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: 'rgba(0,0,0,0.015)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    padding: '1rem',
  },
  assetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
    paddingBottom: '0.5rem',
  },
  assetName: {
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  assetStatusBtns: {
    display: 'flex',
    gap: '0.25rem',
  },
  assetStatusBtn: {
    background: 'rgba(0,0,0,0.02)',
    border: '1px solid var(--border-color)',
    padding: '0.25rem 0.6rem',
    fontSize: '0.75rem',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    transition: 'all 0.2s ease',
  },
  assetStatusGoodActive: {
    background: 'var(--success-bg)',
    color: 'var(--success)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  assetStatusBadActive: {
    background: 'var(--danger-bg)',
    color: 'var(--danger)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  }
};

// CSS styles injection
const addRoomsPageStyles = () => {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    .room-card-del-hover:hover {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(styleEl);
};
addRoomsPageStyles();

export default Rooms;
