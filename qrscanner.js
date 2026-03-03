import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useNavigation } from '../contexts/NavigationContext';
import { X, QrCode, MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function QRScanner({ onClose }) {
  const [scanning, setScanning] = useState(true);
  const [scannedData, setScannedData] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const scannerRef = useRef(null);
  const { handleQRScan, setFromRoom, speak } = useNavigation();

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (scanning && !showGenerator) {
      initScanner();
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [scanning, showGenerator]);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const initScanner = () => {
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    });

    scanner.render(onScanSuccess, onScanError);
    scannerRef.current = scanner;
  };

  const onScanSuccess = async (decodedText) => {
    setScanning(false);

    try {
      const response = await axios.get(`${API_URL}/rooms/qr/${decodedText}`);
      const { room, wing } = response.data;
      setScannedData({ room, wing });
      handleQRScan(room, wing);
      toast.success(`Located: ${room.name}`);
    } catch (error) {
      toast.error('Invalid QR code or room not found');
      setScanning(true);
    }
  };

  const onScanError = (error) => {
    // Silent - continuous scanning
  };

  const handleSetAsStart = () => {
    if (scannedData?.room) {
      setFromRoom(scannedData.room);
      speak(`${scannedData.room.name} set as starting point`);
      toast.success('Set as starting point');
      onClose();
    }
  };

  const handleNavigateHere = () => {
    if (scannedData?.room) {
      // Navigate to this room from current location
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white rounded-2xl overflow-hidden" data-testid="qr-scanner-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <QrCode size={24} className="text-orange-600" />
            <h2 className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk' }}>
              {showGenerator ? 'Generate QR Code' : 'Scan QR Code'}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {showGenerator ? (
            <div className="space-y-4">
              <select
                className="w-full p-3 border rounded-lg bg-slate-50"
                onChange={(e) => setSelectedRoom(rooms.find(r => r.id === e.target.value))}
                data-testid="qr-room-select"
              >
                <option value="">Select a room...</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.room_number} - {room.name}
                  </option>
                ))}
              </select>

              {selectedRoom && (
                <div className="flex flex-col items-center p-6 bg-white rounded-xl border">
                  <QRCodeSVG
                    value={selectedRoom.qr_code}
                    size={200}
                    level="H"
                    includeMargin
                  />
                  <p className="mt-4 text-center font-medium">{selectedRoom.name}</p>
                  <p className="text-sm text-slate-500">{selectedRoom.room_number}</p>
                  <p className="text-xs text-slate-400 mt-1">Scan to navigate here</p>
                </div>
              )}
            </div>
          ) : scanning ? (
            <div>
              <div id="qr-reader" className="rounded-xl overflow-hidden" />
              <p className="text-center text-sm text-slate-500 mt-4">
                Point camera at room QR code
              </p>
            </div>
          ) : scannedData ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={20} className="text-green-600" />
                  <span className="font-semibold text-green-800">Location Found!</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk' }}>
                  {scannedData.room.name}
                </h3>
                <p className="text-slate-600">{scannedData.room.room_number}</p>
                <p className="text-sm text-slate-500">
                  {scannedData.wing.name} • Floor {scannedData.room.floor}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleSetAsStart}
                  variant="outline"
                  className="gap-2"
                  data-testid="set-start-btn"
                >
                  <MapPin size={16} />
                  Set as Start
                </Button>
                <Button
                  onClick={handleNavigateHere}
                  className="gap-2 bg-orange-600 hover:bg-orange-700"
                  data-testid="navigate-here-btn"
                >
                  <Navigation size={16} />
                  Navigate Here
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setScanning(true);
                  setScannedData(null);
                }}
                className="w-full"
              >
                Scan Another Code
              </Button>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50">
          <Button
            variant="outline"
            onClick={() => setShowGenerator(!showGenerator)}
            className="w-full gap-2"
            data-testid="toggle-generator"
          >
            <QrCode size={16} />
            {showGenerator ? 'Back to Scanner' : 'Generate QR for Room'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
