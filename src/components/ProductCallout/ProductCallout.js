import React from 'react';
import './ProductCallout.css';

const ProductCallout = ({ productName, price, position }) => {
  return (
    <div className={`product-callout product-callout--${position}`}>
      <div className="product-callout-content">
        <h3 className="product-callout-name">{productName}</h3>
        <p className="product-callout-price">${price}</p>
      </div>
      <button className="product-callout-button">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 3V13M3 8H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

export default ProductCallout;
