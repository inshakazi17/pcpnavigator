import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { FloorPlan } from '../components/FloorPlan';
import { CampusMap } from '../components/CampusMap';
import { NavigationPanel } from '../components/NavigationPanel';
import { QRScanner } from '../components/QRScanner';
import { Header } from '../components/Header';
import { AuthModal } from '../components/AuthModal';
import { RoomDetail } from '../components/RoomDetail';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Map, Building2 } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function CampusNavigator() {
  const [wings, setWings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [campus, setCampus] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' for outdoor, 'floor' for indoor
  const { selectedWing, setSelectedWing, selectedRoom, setSelectedFloor, isNavigating } = useNavigation();
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    } else {
      setFavorites([]);
    }
  }, [isAuthenticated, token]);

  const fetchData = async () => {
    try {
      const [campusRes, wingsRes, roomsRes] = await Promise.all([
        axios.get(`${API_URL}/campus`),
        axios.get(`${API_URL}/wings`),
        axios.get(`${API_URL}/rooms`)
      ]);
      setCampus(campusRes.data);
      setWings(wingsRes.data);
      setRooms(roomsRes.data);
      if (wingsRes.data.length > 0 && !selectedWing) {
        setSelectedWing(wingsRes.data[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load campus data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get(`${API_URL}/favorites`);
      setFavorites(response.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const handleToggleFavorite = async (roomId) => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }

    const isFavorite = favorites.some(f => f.room_id === roomId);

    try {
      if (isFavorite) {
        await axios.delete(`${API_URL}/favorites/${roomId}`);
        setFavorites(favorites.filter(f => f.room_id !== roomId));
        toast.success('Removed from favorites');
      } else {
        const response = await axios.post(`${API_URL}/favorites`, { room_id: roomId });
        setFavorites([...favorites, response.data]);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleWingClick = (wing) => {
    setSelectedWing(wing);
    setSelectedFloor(wing.floors[0]);
    setViewMode('floor');
  };

  const handleRoomClick = (room, wing) => {
    setViewMode('floor');
  };

  // Keep floor view when wing changes
  useEffect(() => {
    if (selectedWing && viewMode === 'map') {
      // Don't auto-switch, let user control
    }
  }, [selectedWing]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-orange-600 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading campus map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="campus-nav" data-testid="campus-navigator">
      <div className="map-container">
        {viewMode === 'map' ? (
          <CampusMap
            campus={campus}
            wings={wings}
            onWingClick={handleWingClick}
          />
        ) : (
          <FloorPlan
            wings={wings}
            rooms={rooms}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        <Sidebar
          wings={wings}
          rooms={rooms}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onShowAuth={() => setShowAuth(true)}
          onShowQRScanner={() => setShowQRScanner(true)}
          onWingClick={handleWingClick}
          onRoomClick={handleRoomClick}
        />

        <Header
          onShowAuth={() => setShowAuth(true)}
          onShowQRScanner={() => setShowQRScanner(true)}
        />

        {/* View Mode Toggle */}
        <div className="view-toggle glass" data-testid="view-toggle">
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className={`gap-2 ${viewMode === 'map' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
          >
            <Map size={16} />
            Campus Map
          </Button>
          <Button
            variant={viewMode === 'floor' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('floor')}
            className={`gap-2 ${viewMode === 'floor' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
          >
            <Building2 size={16} />
            Floor Plan
          </Button>
        </div>

        {isNavigating && <NavigationPanel />}
        {selectedRoom && !isNavigating && viewMode === 'floor' && (
          <RoomDetail
            room={selectedRoom}
            wing={selectedWing}
            isFavorite={favorites.some(f => f.room_id === selectedRoom.id)}
            onToggleFavorite={handleToggleFavorite}
            isAuthenticated={isAuthenticated}
            onShowAuth={() => setShowAuth(true)}
          />
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showQRScanner && <QRScanner onClose={() => setShowQRScanner(false)} />}
    </div>
  );
}
