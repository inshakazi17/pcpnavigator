import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigation } from '../contexts/NavigationContext';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Building2, Navigation, MapPin, ExternalLink } from 'lucide-react';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const wingColors = {
  'a-wing': '#3b82f6', // Blue - Computer
  'b-wing': '#22c55e', // Green - Civil
  'c-wing': '#f59e0b', // Amber - Automobile
  'd-wing': '#8b5cf6', // Purple - Electronics/IT
  'e-wing': '#ef4444', // Red - Mechanical
};

function createWingIcon(wingId, isSelected) {
  const color = wingColors[wingId] || '#64748b';
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${isSelected ? '44px' : '36px'};
        height: ${isSelected ? '44px' : '36px'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 3px solid white;
        transition: all 0.2s;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
          <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
          <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
          <path d="M10 6h4"/>
          <path d="M10 10h4"/>
          <path d="M10 14h4"/>
          <path d="M10 18h4"/>
        </svg>
      </div>
    `,
    className: 'wing-marker',
    iconSize: [isSelected ? 44 : 36, isSelected ? 44 : 36],
    iconAnchor: [isSelected ? 22 : 18, isSelected ? 22 : 18],
    popupAnchor: [0, -20]
  });
}

function createUserIcon() {
  return L.divIcon({
    html: `
      <div style="
        background-color: #3b82f6;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
        animation: pulse 2s infinite;
      "></div>
    `,
    className: 'user-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export function CampusMap({ campus, wings, onWingClick }) {
  const { selectedWing } = useNavigation();
  const [userLocation, setUserLocation] = useState(null);

  const campusCenter = campus ? [campus.center_lat, campus.center_lng] : [18.6525, 73.7619];

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  useEffect(() => {
    getUserLocation();
  }, []);

  const openGoogleMapsDirections = () => {
    const destination = `${campusCenter[0]},${campusCenter[1]}`;
    let url;
    if (userLocation) {
      url = `https://www.google.com/maps/dir/${userLocation[0]},${userLocation[1]}/${destination}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="campus-map-container" data-testid="campus-map">
      <MapContainer
        center={campusCenter}
        zoom={18}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={campusCenter} zoom={18} />

        {/* Wing markers */}
        {wings.map((wing) => (
          <Marker
            key={wing.id}
            position={[wing.lat, wing.lng]}
            icon={createWingIcon(wing.id, selectedWing?.id === wing.id)}
            eventHandlers={{
              click: () => onWingClick(wing)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk' }}>
                  {wing.name}
                </h3>
                <p className="text-sm text-slate-600">{wing.department}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Floors: {wing.floors.join(', ')}
                </p>
                <Button
                  size="sm"
                  className="w-full mt-2 bg-orange-600 hover:bg-orange-700"
                  onClick={() => onWingClick(wing)}
                >
                  View Floor Plan
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* User location marker */}
        {userLocation && (
          <Marker position={userLocation} icon={createUserIcon()}>
            <Popup>
              <div className="p-2">
                <h4 className="font-semibold">Your Location</h4>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Campus Info Card */}
      <Card className="campus-info-card glass" data-testid="campus-info">
        <div className="p-4">
          <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk' }}>
            {campus?.name || 'Pimpri Chinchwad Polytechnic'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {campus?.address || 'Sector 26, Pradhikaran, Nigdi, Pune'}
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
              onClick={getUserLocation}
            >
              <MapPin size={14} />
              My Location
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700"
              onClick={openGoogleMapsDirections}
            >
              <Navigation size={14} />
              Directions
            </Button>
          </div>
          {campus?.google_maps && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full mt-2 gap-2 text-blue-600"
              onClick={() => window.open(campus.google_maps, '_blank')}
            >
              <ExternalLink size={14} />
              Open in Google Maps
            </Button>
          )}
        </div>
      </Card>

      {/* Legend */}
      <Card className="map-legend glass">
        <div className="p-3">
          <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Wings</h4>
          <div className="space-y-1">
            {wings.map(wing => (
              <div
                key={wing.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-50 p-1 rounded"
                onClick={() => onWingClick(wing)}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: wingColors[wing.id] }}
                />
                <span>{wing.code}-Wing</span>
                <span className="text-slate-400">({wing.department.split(' ')[0]})</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
