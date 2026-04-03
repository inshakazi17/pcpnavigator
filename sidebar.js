import { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Map, Navigation, Heart, Search, QrCode, Building2,
  ChevronRight, X, Volume2, VolumeX
} from 'lucide-react';

export function Sidebar({ wings, rooms, favorites, onToggleFavorite, onShowAuth, onShowQRScanner, onWingClick, onRoomClick }) {
  const [activeTab, setActiveTab] = useState('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    selectedWing, setSelectedWing,
    setSelectedFloor, setSelectedRoom,
    voiceEnabled, setVoiceEnabled
  } = useNavigation();
  const { isAuthenticated } = useAuth();

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.room_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoomClick = (room) => {
    const wing = wings.find(w => w.id === room.wing_id);
    setSelectedWing(wing);
    setSelectedFloor(room.floor);
    setSelectedRoom(room);
    if (onRoomClick) {
      onRoomClick(room, wing);
    }
  };

  const favoriteRooms = rooms.filter(r => favorites.some(f => f.room_id === r.id));

  return (
    <div className="sidebar glass shadow-[0_8px_30px_rgb(0,0,0,0.12)]" data-testid="sidebar">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
              <Map size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk' }}>
                Campus Navigator
              </h1>
              <p className="text-sm text-slate-500">Find any room instantly</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={voiceEnabled ? 'text-orange-600' : 'text-slate-400'}
            data-testid="voice-toggle"
          >
            {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </Button>
        </div>

        {/* QR Scanner Button */}
        <Button
          onClick={onShowQRScanner}
          className="w-full mt-4 gap-2 bg-slate-900 hover:bg-slate-800"
          data-testid="qr-scanner-btn"
        >
          <QrCode size={18} />
          Scan QR Code
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search rooms, labs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-slate-50 border-slate-200"
            data-testid="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 p-1 mx-4 mt-2 bg-slate-100 rounded-xl" style={{ width: 'calc(100% - 32px)' }}>
          <TabsTrigger value="explore" className="rounded-lg text-xs gap-1" data-testid="tab-explore">
            <Building2 size={14} />
            Wings
          </TabsTrigger>
          <TabsTrigger value="rooms" className="rounded-lg text-xs gap-1" data-testid="tab-rooms">
            <Navigation size={14} />
            Rooms
          </TabsTrigger>
          <TabsTrigger value="saved" className="rounded-lg text-xs gap-1" data-testid="tab-saved">
            <Heart size={14} />
            Saved
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 mt-2">
          {/* Wings Tab */}
          <TabsContent value="explore" className="m-0 p-4 pt-2">
            <div className="space-y-2">
              {wings.map((wing) => (
                <Card
                  key={wing.id}
                  className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                    selectedWing?.id === wing.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200'
                  }`}
                  onClick={() => {
                    if (onWingClick) {
                      onWingClick(wing);
                    } else {
                      setSelectedWing(wing);
                      setSelectedFloor(wing.floors[0]);
                    }
                  }}
                  data-testid={`wing-${wing.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900" style={{ fontFamily: 'Space Grotesk' }}>
                        {wing.name}
                      </h3>
                      <p className="text-sm text-slate-500">{wing.department}</p>
                      <div className="flex gap-1 mt-2">
                        {wing.floors.map(f => (
                          <Badge key={f} variant="secondary" className="text-xs">
                            F{f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-400" />
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms" className="m-0 p-4 pt-2">
            {searchQuery ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500 mb-2">
                  {filteredRooms.length} results for "{searchQuery}"
                </p>
                {filteredRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    wing={wings.find(w => w.id === room.wing_id)}
                    onClick={() => handleRoomClick(room)}
                    isFavorite={favorites.some(f => f.room_id === room.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {rooms
                  .filter(r => r.wing_id === selectedWing?.id)
                  .map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      wing={selectedWing}
                      onClick={() => handleRoomClick(room)}
                      isFavorite={favorites.some(f => f.room_id === room.id)}
                    />
                  ))}
              </div>
            )}
          </TabsContent>

          {/* Saved Tab */}
          <TabsContent value="saved" className="m-0 p-4 pt-2">
            {isAuthenticated ? (
              favoriteRooms.length > 0 ? (
                <div className="space-y-2">
                  {favoriteRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      wing={wings.find(w => w.id === room.wing_id)}
                      onClick={() => handleRoomClick(room)}
                      isFavorite={true}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Heart}
                  title="No saved rooms"
                  description="Tap the heart icon on any room to save it"
                />
              )
            ) : (
              <EmptyState
                icon={Heart}
                title="Save your favorites"
                description="Sign in to save rooms and access them quickly"
                action={
                  <Button onClick={onShowAuth} className="gap-2 bg-orange-600 hover:bg-orange-700">
                    Sign In
                  </Button>
                }
              />
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function RoomCard({ room, wing, onClick, isFavorite }) {
  const roomTypeColors = {
    'lab': 'bg-blue-100 text-blue-700',
    'classroom': 'bg-green-100 text-green-700',
    'office': 'bg-purple-100 text-purple-700',
    'staff-room': 'bg-amber-100 text-amber-700',
    'default': 'bg-slate-100 text-slate-700'
  };

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-all border-slate-200"
      onClick={onClick}
      data-testid={`room-${room.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-slate-900 truncate">{room.name}</h4>
            {isFavorite && <span className="text-red-500">♥</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={roomTypeColors[room.room_type] || roomTypeColors.default}>
              {room.room_type.replace('-', ' ')}
            </Badge>
            <span className="text-xs text-slate-500">
              {wing?.code}-Wing • Floor {room.floor}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{room.room_number}</p>
        </div>
        <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
      </div>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      <Icon size={48} className="mx-auto text-slate-300 mb-4" />
      <h3 className="font-semibold text-slate-900 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
        {title}
      </h3>
      <p className="text-sm text-slate-500 mb-4">{description}</p>
      {action}
    </div>
  );
}


