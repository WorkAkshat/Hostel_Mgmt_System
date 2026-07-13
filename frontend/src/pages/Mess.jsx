import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Sparkles, Utensils, Star, Edit3, Save, TrendingUp, AlertTriangle, Fingerprint, Calendar, ArrowLeft, CheckCircle } from 'lucide-react';
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

  // Determine current meal dynamically for button text
  const getActiveMealLabel = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) return 'BREAKFAST';
    if (hour >= 11 && hour < 15) return 'LUNCH';
    if (hour >= 16 && hour < 18) return 'SNACKS';
    return 'DINNER';
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Mobile/Desktop Header with Back Navigation */}
      <div className="flex items-center gap-3">
        {user.role === 'STUDENT' && (
          <button onClick={() => navigate('/student/dashboard')} className="bg-transparent border-none text-gray-500 hover:text-gray-900 cursor-pointer p-1 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="page-title text-base lg:text-lg font-bold text-[#0b1a52] leading-none mb-1">
            {user.role === 'ADMIN' ? 'Mess Biometrics & Schedule' : 'Mess Schedule & Dining'}
          </h1>
          <p className="text-[11px] text-gray-400">
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
            {isEditing ? <Save size={18} /> : <Edit3 size={18} />}
            <span>{isEditing ? 'Save Weekly Menu' : 'Update Menu Plan'}</span>
          </button>
        )}
      </div>

      {/* WARDEN ANALYTICS DASHBOARD */}
      {user.role === 'ADMIN' && (
        <div style={styles.wardenAnalyticsGrid}>
          {loadingAnalytics ? (
            <p style={{ gridColumn: 'span 2', textAlign: 'center', padding: '2rem' }}>Loading dining metrics...</p>
          ) : (
            <>
              {/* Today's Dining Turnout */}
              <div className="glass-card" style={styles.analyticsCard}>
                <div style={styles.analyticsHeader}>
                  <TrendingUp size={20} color="var(--accent)" />
                  <h3 style={styles.cardTitle}>Today's Dining Turnout (Biometric)</h3>
                </div>
                <div style={{ height: '220px', marginTop: '1.25rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics?.mealStatsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="name" stroke="var(--text-secondary)" />
                      <YAxis stroke="var(--text-secondary)" />
                      <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                      <Legend />
                      <Bar dataKey="Attended" name="Ate today" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Capacity" name="Total Capacity" fill="rgba(0,0,0,0.04)" stroke="var(--border-color)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Historical Turnout Line Chart */}
              <div className="glass-card" style={styles.analyticsCard}>
                <div style={styles.analyticsHeader}>
                  <TrendingUp size={20} color="var(--success)" />
                  <h3 style={styles.cardTitle}>Mess Turnout Trend (Past 7 Days)</h3>
                </div>
                <div style={{ height: '220px', marginTop: '1.25rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.historyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" />
                      <YAxis stroke="var(--text-secondary)" />
                      <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                      <Line type="monotone" dataKey="Attendance" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', r: 4 }} activeDot={{ r: 6 }} />
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
        <div style={styles.studentGrid}>
          {/* Biometric Terminal Status */}
          <div className="glass-card" style={styles.card}>
            <div style={styles.feedbackHeader}>
              <CheckCircle size={22} color="var(--success)" />
              <h3 style={styles.cardTitle}>Biometric Terminal Registry</h3>
            </div>
            <p style={styles.biometricDesc}>
              Hostel dining hall attendance is registered automatically via the physical biometric terminals installed at the mess entrance.
            </p>
            {myAttendance.length > 0 ? (
              <div className="mt-2 p-3 bg-green-50/50 border border-green-200 text-green-800 rounded-xl text-xs font-semibold">
                Last Terminal Entry: {myAttendance[0].mealType} ({myAttendance[0].date})
              </div>
            ) : (
              <div className="mt-2 p-3 bg-slate-50 border border-slate-200 text-gray-500 rounded-xl text-xs font-medium">
                No mess biometric entries recorded for today yet.
              </div>
            )}
          </div>

          {/* Rating Widget */}
          <div className="glass-card" style={styles.card}>
            <div style={styles.feedbackHeader}>
              <Sparkles size={22} color="var(--warning)" />
              <h3 style={styles.cardTitle}>Daily Food Quality Reviews</h3>
            </div>
            
            {ratedToday ? (
              <p style={styles.ratedThankYou}>
                Thank you! You have logged today's meal reviews. Ratings reset tomorrow.
              </p>
            ) : (
              <div style={styles.ratingsContainer}>
                {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => (
                  <div key={meal} style={styles.ratingRow}>
                    <span style={styles.mealName}>{meal}</span>
                    <div style={styles.starsWrapper}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star 
                          key={star}
                          size={18}
                          color={star <= studentRatings[meal] ? '#f59e0b' : 'var(--text-tertiary)'}
                          style={{ cursor: 'pointer', fill: star <= studentRatings[meal] ? '#f59e0b' : 'none' }}
                          onClick={() => handleStarClick(meal, star)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={styles.submitRatingBtn}
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
      <div className="glass-card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
        <h3 style={styles.cardTitle}>Weekly Meal Menu</h3>
        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Day</th>
                <th>Breakfast (7:30 - 9:00 AM)</th>
                <th>Lunch (12:30 - 2:00 PM)</th>
                <th>Evening Snacks (4:30 - 5:30 PM)</th>
                <th>Dinner (8:00 - 9:30 PM)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(menu).map(day => (
                <tr key={day}>
                  <td><strong>{day}</strong></td>
                  {['Breakfast', 'Lunch', 'Snacks', 'Dinner'].map(meal => (
                    <td key={meal}>
                      {isEditing ? (
                        <input 
                          type="text" 
                          className="form-input"
                          style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                          value={editedMenu[day]?.[meal] || ''}
                          onChange={(e) => handleEditCell(day, meal, e.target.value)}
                        />
                      ) : (
                        <span>{menu[day]?.[meal] || ''}</span>
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
        <div className="glass-card" style={{ padding: '1.5rem', marginTop: '2rem' }}>
          <h3 style={styles.cardTitle}>My Dining Biometric Logs</h3>
          {loadingAttendance ? (
            <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>Loading logs...</p>
          ) : myAttendance.length === 0 ? (
            <p style={styles.emptyText}>No recent dining attendance records.</p>
          ) : (
            <div style={styles.logsList}>
              {myAttendance.map(log => (
                <div key={log.id} style={styles.logItem} className="glass-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Utensils size={16} color="var(--accent)" />
                    <span style={styles.logMeal}>{log.mealType}</span>
                  </div>
                  <span style={styles.logDate}>{log.date}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '600' }}>
                    Verified ({log.verifiedBy.replace('BIOMETRIC_', '')})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  wardenAnalyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem',
  },
  analyticsCard: {
    padding: '1.5rem',
  },
  analyticsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  studentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '2.5rem',
    marginBottom: '2rem',
  },
  card: {
    padding: '1.75rem',
  },
  feedbackHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.75rem',
    marginBottom: '1.25rem',
  },
  biometricDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '1.5rem',
  },
  scanBtn: {
    width: '100%',
    justifyContent: 'center',
    background: 'var(--accent-gradient)',
  },
  ratedThankYou: {
    textAlign: 'center',
    color: 'var(--success)',
    padding: '2.5rem 0',
    fontWeight: '500',
    fontSize: '0.9rem',
  },
  ratingsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  ratingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  starsWrapper: {
    display: 'flex',
    gap: '0.3rem',
  },
  submitRatingBtn: {
    marginTop: '0.5rem',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: 'var(--text-tertiary)',
    padding: '1.5rem 0',
    fontSize: '0.85rem',
  },
  logsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  logItem: {
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
  },
  logMeal: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  logDate: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  }
};

export default Mess;
