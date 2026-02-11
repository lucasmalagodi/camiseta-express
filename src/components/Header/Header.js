import React from 'react';
import './Header.css';
import logo from '@/assets/logo.svg';

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        {/* Logo */}
        <div className="logo">
          <img src={logo} alt="Logo" />
        </div>

        {/* Navegação */}
        <nav className="nav">
          <a href="#home" className="nav-link">HOME</a>
          <a href="#colection" className="nav-link">COLEÇÃO</a>
        </nav>

        {/* Ícones de Utilidade */}
        <div className="header-icons">
          <button className="icon-button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 5H4M4 5H6M4 5V3M4 5V7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M2 10H4M4 10H6M4 10V8M4 10V12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M2 15H4M4 15H6M4 15V13M4 15V17" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="icon-button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="9" r="6" stroke="white" strokeWidth="2"/>
              <path d="M15 15L12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="icon-button cart-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 7H15L14 13H6L5 7Z" stroke="white" strokeWidth="2" fill="none"/>
              <circle cx="8" cy="16" r="1" fill="white"/>
              <circle cx="13" cy="16" r="1" fill="white"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
