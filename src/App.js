import React from 'react';
import Header from './components/Header/Header';
import HeroSection from './components/HeroSection/HeroSection';
// import PurchaseNotification from './components/PurchaseNotification/PurchaseNotification';
import './styles/global.css';

function App() {
  return (
    <div className="App">
      <Header />
      <HeroSection />
    </div>
  );
}

export default App;
