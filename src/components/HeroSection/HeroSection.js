import React from 'react';
import ProductCallout from '../ProductCallout/ProductCallout';
import './HeroSection.css';

const HeroSection = () => {
  return (
    <section className="hero-section">
      <div className="hero-container">
        {/* Painel Esquerdo - Conteúdo Textual */}
        <div className="hero-left">
          <h1 className="hero-title">MEN'S</h1>
          <h2 className="hero-subtitle">Sportswear</h2>
          <p className="hero-description">
            Here you will find high-quality men's clothing in a wide range Currently, 
            there is a 40% discount on each product.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary">Start Shopping</button>
            <button className="btn btn-secondary">
              Choose Category
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 4L13 10L7 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Painel Direito - Imagem e Produtos */}
        <div className="hero-right">
          <div className="hero-image-container">
            {/* Placeholder para a imagem do atleta - será substituído por imagem real */}
            <div className="hero-image-placeholder">
              <div className="athlete-silhouette"></div>
            </div>
            
            {/* Product Callouts */}
            <ProductCallout 
              productName="Nike T-Shorts" 
              price="110" 
              position="shoulder"
            />
            <ProductCallout 
              productName="Nike Shorts" 
              price="89" 
              position="thigh"
            />
            <ProductCallout 
              productName="Nike Sneakers" 
              price="360" 
              position="foot"
            />

            {/* Indicadores de Navegação */}
            <div className="hero-indicators">
              <div className="indicator indicator--active"></div>
              <div className="indicator"></div>
              <div className="indicator"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
