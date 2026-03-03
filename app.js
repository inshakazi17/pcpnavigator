import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from './contexts/AuthContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { CampusNavigator } from './pages/CampusNavigator';
import { Toaster } from './components/ui/sonner';
import './App.css';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<CampusNavigator />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;
