{
      console.error('Navigation error:', error);
      toast.error('Failed to calculate route');
    } finally {
      setLoading(false);
    }
  };import { useState } from 'react';
    import axios from 'axios';
    import { useNavigation } from '../contexts/NavigationContext';
    import { Button } from './ui/button';
    import { Card } from './ui/card';
    import { Badge } from './ui/badge';
    import { QRCodeSVG } from 'qrcode.react';
    import { toast } from 'sonner';
    import {
      X, Heart, Navigation, MapPin, QrCode, Share2,
      ChevronRight, Building2, Layers
    } from 'lucide-react';

    const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

    const roomTypeColors = {
      'lab': 'bg-blue-500',
      'classroom': 'bg-green-500',
      'office': 'bg-purple-500',
      'staff-room': 'bg-amber-500',
      'washroom': 'bg-slate-500',
      'seminar-hall': 'bg-pink-500',
      'drawing-hall': 'bg-cyan-500',
      'sports': 'bg-red-500',
      'common-room': 'bg-lime-500',
      'learning-center': 'bg-orange-500',
      'default': 'bg-slate-400'
    };

    export function RoomDetail({ room, wing, isFavorite, onToggleFavorite, isAuthenticated, onShowAuth }) {
      const [showQR, setShowQR] = useState(false);
      const [loading, setLoading] = useState(false);
      const { setSelectedRoom, fromRoom, setFromRoom, startNavigation, speak } = useNavigation();

      const handleClose = () => {
        setSelectedRoom(null);
      };

      const handleFavoriteClick = () => {
        if (!isAuthenticated) {
          onShowAuth();
          return;
        }
        onToggleFavorite(room.id);
      };

      const handleSetAsStart = () => {
        setFromRoom(room);
        speak(`${room.name} set as starting point`);
        toast.success('Set as starting point');
      };

      const handleNavigate = async () => {
        if (!fromRoom) {
          toast.error('Please set a starting point first (scan QR or select a room)');
          return;
        }

        if (fromRoom.id === room.id) {
          toast.error('You are already at this location');
          return;
        }

        setLoading(true);
        try {
          const response = await axios.post(`${API_URL}/navigate`, {
            from_room_id: fromRoom.id,
            to_room_id: room.id
          });
          startNavigation(fromRoom, room, response.data);
          handleClose();
        } catch (error) {
          console.error('Navigation error:', error);
          toast.error('Failed to calculate route');
        } finally {
          setLoading(false);
        }
      };

      const handleShare = async () => {
        const shareUrl = `${window.location.origin}?room=${room.id}`;
        if (navigator.share) {
          try {
            await navigator.share({
              title: room.name,
              text: `Find ${room.name} (${room.room_number}) at the campus`,
              url: shareUrl
            });
          } catch (err) {
            // User cancelled
          }
        } else {
          navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied to clipboard');
        }
      };

      return (
        <div className="room-detail-panel glass animate-slide-up" data-testid="room-detail">
          <Card className="p-0 overflow-hidden shadow-xl border-0">
            {/* Header */}
            <div className={`${roomTypeColors[room.room_type] || roomTypeColors.default} p-4 text-white`}>
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-white/20 text-white mb-2">
                    {room.room_type.replace('-', ' ')}
                  </Badge>
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
                    {room.name}
                  </h2>
                  <p className="text-white/80">{room.room_number}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  data-testid="close-room-detail"
                >
                  <X size={20} />
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 size={16} />
                  <span>{wing?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Layers size={16} />
                  <span>Floor {room.floor}</span>
                </div>
              </div>

              {/* From Room Indicator */}
              {fromRoom && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <MapPin size={16} />
                    <span className="text-sm">Starting from: <strong>{fromRoom.name}</strong></span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleFavoriteClick}
                  className={`gap-2 ${isFavorite ? 'text-red-500 border-red-200 bg-red-50' : ''}`}
                  data-testid="favorite-btn"
                >
                  <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                  {isFavorite ? 'Saved' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSetAsStart}
                  className="gap-2"
                  data-testid="set-start-btn"
                >
                  <MapPin size={16} />
                  Set as Start
                </Button>
              </div>

              <Button
                onClick={handleNavigate}
                disabled={loading || !fromRoom || fromRoom.id === room.id}
                className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
                data-testid="navigate-btn"
              >
                <Navigation size={18} />
                {loading ? 'Calculating...' : 'Navigate Here'}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQR(!showQR)}
                  className="gap-2"
                  data-testid="show-qr-btn"
                >
                  <QrCode size={16} />
                  {showQR ? 'Hide QR' : 'Show QR'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="gap-2"
                  data-testid="share-btn"
                >
                  <Share2 size={16} />
                  Share
                </Button>
              </div>

              {/* QR Code */}
              {showQR && (
                <div className="flex flex-col items-center p-4 bg-white rounded-xl border">
                  <QRCodeSVG
                    value={room.qr_code}
                    size={150}
                    level="H"
                    includeMargin
                  />
                  <p className="text-xs text-slate-500 mt-2">Scan to navigate here</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      );
    }
    const handleNavigate = async () => {
        if (!fromRoom) {
          toast.info('Tip: Set a starting point first by scanning a QR code or clicking \"Set as Start\" on a room');
          // For demo, we'll set a default starting point
          setFromRoom({ id: 'a0-1', name: 'Trust Admin Office', room_number: 'A0-1', floor: 0, wing_id: 'a-wing', x: 50, y: 50 });
          toast.success('Default start point set. Click Navigate again.');
          return;
        }

        if (fromRoom.id === room.id) {
          toast.error('You are already at this location');
          return;
        }

        setLoading(true);
        try {
          const response = await axios.post(`${API_URL}/navigate`, {
            from_room_id: fromRoom.id,
            to_room_id: room.id
          });
          startNavigation(fromRoom, room, response.data);
          handleClose();
        } catch (error) {
          toast.error('Failed to calculate navigation path');
        } finally {
          setLoading(false);
        }