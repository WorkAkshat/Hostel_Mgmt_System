import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Sparkles, Utensils, Star, Edit3, Save, TrendingUp, Fingerprint, ArrowLeft, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import CustomModal from '../components/CustomModal';
import BiometricScanner from '../components/BiometricScanner';

const DEFAULT_MENU = {
  Monday: { Breakfast: 'Idli Sambar & Tea', Lunch: 'Rajma Chawal, Roti & Curd', Snacks: 'Samosa & Milk', Dinner: 'Paneer Masala, Tadka Dal & Roti' },
  Tuesday: { Breakfast: 'Poha & Sprouts', Lunch: 'Kadi Pakoda, Rice & Alu Bhujia', Snacks: 'Veg Cutlet & Tea', Dinner: 'Egg Curry / Mushroom, Dal & Roti' },
  Wednesday: { Breakfast: 'Aloo Paratha & Curd', Lunch: 'Chole Bhature & Boondi Raita', Snacks: 'Dry Cake & Tea', Dinner: 'Mix Veg, Yellow Dal & Roti' },
  Thursday: { Breakfast: 'Bread Butter / Jam', Lunch: 'Veg Biryani, Raita & Papad', Snacks: 'Dhokla & Tea', Dinner: 'Kadhai Paneer, Roti & Salad' },
  Friday: { Breakfast: 'Puri Sabzi & Halwa', Lunch: 'Moong Dal Khichdi, Roti & Alu Gobi', Snacks: 'Tea & Biscuits', Dinner: 'Malai Kofta, Dal Fry & Roti' },
  Saturday: { Breakfast: 'Veg Upma & Tea', Lunch: 'Alu Shimla Mirch, Roti & Curd', Snacks: 'Cookies & Milk', Dinner: 'Veg Jalfrezi, Masoor Dal & Roti' },
  Sunday: { Breakfast: 'Masala Dosa & Tea', Lunch: 'Shahi Paneer, Pulao & Naan', Snacks: 'Pav Bhaji', Dinner: 'Chicken Biryani / Paneer, Sweet & Rice' },
};

const Mess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Weekly Menu Plan State
  const [menu, setMenu] = useState(DEFAULT_MENU);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMenu, setEditedMenu] = useState(DEFAULT_MENU);

  // Warden Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Student Attendance logs state
  const [myAttendance, setMyAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  // Biometric Terminal Modal state
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);

  // Student meal rating state (unlocked after biometric check)
  const [studentRatings, setStudentRatings] = useState({
    Breakfast: 0, Lunch: 0, Snacks: 0, Dinner: 0
  });
  const [ratedToday, setRatedToday] = useState(false);

  const fetchMenu = () => {
    const savedMenu = localStorage.getItem('mess_menu');
    if (savedMenu) {
      setMenu(JSON.parse(savedMenu));
      setEditedMenu(JSON.parse(savedMenu));
    }
  };

  const fetchWardenAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const data = await api('/mess/stats');
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching mess analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchStudentAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const logs = await api('/mess/my-attendance');
      setMyAttendance(logs);
      
      // Check if student rated today
      const studentRated = localStorage.getItem(`rated_${user.id}_today`);
      if (studentRated) {
        setRatedToday(true);
      }
    } catch (error) {
      console.error('Error fetching my mess logs:', error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    if (user.role === 'ADMIN') {
      fetchWardenAnalytics();
    } else {
      fetchStudentAttendance();
    }
  }, [user]);

  // Handle Warden menu updates
  const handleSaveMenu = () => {
    setMenu(editedMenu);
    localStorage.setItem('mess_menu', JSON.stringify(editedMenu));
    setIsEditing(false);
    alert('Weekly mess menu updated successfully.');
  };

  const handleEditCell = (day, meal, val) => {
    setEditedMenu(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [meal]: val
      }
    }));
  };

  // Handle Student rating click
  const handleStarClick = (meal, ratingVal) => {
    setStudentRatings(prev => ({
      ...prev,
      [meal]: ratingVal
    }));
  };

  const handleSubmitRatings = () => {
    if (studentRatings.Breakfast === 0 || studentRatings.Lunch === 0 || studentRatings.Snacks === 0 || studentRatings.Dinner === 0) {
      alert('Please rate all 4 meals before submitting.');
      return;
    }

    setRatedToday(true);
    localStorage.setItem(`rated_${user.id}_today`, 'true');
    alert('Thank you! Your ratings have been logged.');
  };

  // Biometric Verify handler
  const handleBiometricSuccess = (data) => {
    alert(data.message || 'Dining entrance verified successfully!');
    setIsBiometricModalOpen(false);
    fetchStudentAttendance();
  };

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        {user.role === 'STUDENT' && (
          <button 
            onClick={() => navigate('/student/dashboard')} 
            className="bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-900 cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h1 className="page-title leading-tight">
            {user.role === 'ADMIN' ? 'Mess Biometrics & Schedule' : 'Mess Schedule & Dining'}
          </h1>
          <p className="page-subtitle mb-0 mt-1">
            {user.role === 'ADMIN' ? 'Inspect the weekly dining menu, verify dining log-ins, and review satisfaction indexes.' :
             'GHMS biometric mess logs and daily satisfaction surveys'}
          </p>
        </div>
        {user.role === 'ADMIN' && (
          <button 
            className="btn-primary ml-auto" 
            onClick={() => {
              if (isEditing) {
                handleSaveMenu();
              } else {
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
            <span>{isEditing ? 'Save Weekly Menu' : 'Update Menu Plan'}</span>
          </button>
        )}
      </div>

      {/* WARDEN ANALYTICS DASHBOARD */}
      {user.role === 'ADMIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-4">
          {loadingAnalytics ? (
            <div className="lg:col-span-2 text-center py-12 text-slate-400 font-medium">Loading dining metrics...</div>
          ) : (
            <>
              {/* Today's Dining Turnout */}
              <div className="glass-card p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={18} className="text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Today's Dining Turnout (Biometric)</h3>
                </div>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.mealStatsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px' }} />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="Attended" name="Ate today" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Capacity" name="Total Capacity" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Historical Turnout Line Chart */}
              <div className="glass-card p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={18} className="text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Mess Turnout Trend (Past 7 Days)</h3>
                </div>
                <div className="w-full h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.historyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="Attendance" name="Verified Attendance" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* STUDENT BIOMETRIC CHECKIN & RATING PANEL */}
      {user.role === 'STUDENT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Biometric Terminal Status */}
          <div className="glass-card p-6 shadow-sm flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <CheckCircle size={20} className="text-emerald-500 shrink-0" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Biometric Terminal Registry</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Hostel dining hall attendance is registered automatically via the physical biometric terminals installed at the mess entrance.
            </p>
            {myAttendance.length > 0 ? (
              <div className="mt-2 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold">
                Last Terminal Entry: {myAttendance[0].mealType} ({myAttendance[0].date})
              </div>
            ) : (
              <div className="mt-2 p-4 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl text-xs font-medium">
                No mess biometric entries recorded for today yet.
              </div>
            )}
            <button 
              onClick={() => setIsBiometricModalOpen(true)}
              className="w-full h-11 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all bg-white"
            >
              <Fingerprint size={14} />
              <span>Simulate Biometric Mess Check-In</span>
            </button>
          </div>

          {/* Rating Widget */}
          <div className="glass-card p-6 shadow-sm flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <Sparkles size={20} className="text-amber-500 shrink-0" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Daily Food Quality Reviews</h3>
            </div>
            
            {ratedToday ? (
              <div className="bg-amber-50/50 border border-amber-100 p-8 rounded-xl text-center text-amber-700 text-xs font-semibold flex items-center justify-center flex-grow">
                Thank you! You have logged today's meal reviews. Ratings reset tomorrow.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 flex-grow">
                {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => (
                  <div key={meal} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600">{meal}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star}
                          size={18}
                          color={star <= studentRatings[meal] ? '#f59e0b' : '#cbd5e1'}
                          style={{ cursor: 'pointer', fill: star <= studentRatings[meal] ? '#f59e0b' : 'none' }}
                          onClick={() => handleStarClick(meal, star)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <button 
                  type="button" 
                  className="btn-primary w-full justify-center mt-2.5"
                  onClick={handleSubmitRatings}
                >
                  Submit Reviews
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weekly Menu Table */}
      <div className="glass-card p-6 shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5">Weekly Meal Menu</h3>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Day</th>
                <th>Breakfast (7:30 - 9:00 AM)</th>
                <th>Lunch (12:30 - 2:00 PM)</th>
                <th>Evening Snacks (4:30 - 5:30 PM)</th>
                <th>Dinner (8:00 - 9:30 PM)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(menu).map(day => (
                <tr key={day}>
                  <td><strong className="font-bold text-slate-800">{day}</strong></td>
                  {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => (
                    <td key={meal}>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="form-input text-xs h-9"
                          value={editedMenu[day]?.[meal] || ''}
                          onChange={(e) => handleEditCell(day, meal, e.target.value)}
                        />
                      ) : (
                        <span className="text-slate-600 font-medium text-xs">{menu[day]?.[meal] || ''}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Personal Dining History Logs */}
      {user.role === 'STUDENT' && (
        <div className="glass-card p-6 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5">My Dining Biometric Logs</h3>
          {loadingAttendance ? (
            <p className="text-slate-400 font-medium text-center py-12 text-sm">Loading logs...</p>
          ) : myAttendance.length === 0 ? (
            <p className="text-slate-400 font-medium text-center py-12 text-sm">No recent dining attendance records.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAttendance.map(log => (
                <div key={log.id} className="p-4 border border-slate-200 rounded-2xl flex justify-between items-center bg-white hover:border-slate-300 transition-all text-xs">
                  <div className="flex items-center gap-2">
                    <Utensils size={14} className="text-slate-400" />
                    <span className="font-bold text-slate-800">{log.mealType}</span>
                  </div>
                  <span className="text-slate-400 font-semibold">{log.date}</span>
                  <span className="text-emerald-600 font-extrabold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BIOMETRIC SIMULATION SCANNER POPUP */}
      <CustomModal isOpen={isBiometricModalOpen} onClose={() => setIsBiometricModalOpen(false)} title="Biometric Gate Terminal">
        <div className="py-2">
          <BiometricScanner 
            rollNumber={user.studentDetails?.rollNumber}
            endpoint="/leaves/biometric-verify"
            onSuccess={handleBiometricSuccess}
          />
        </div>
      </CustomModal>
    </div>
  );
};

export default Mess;

