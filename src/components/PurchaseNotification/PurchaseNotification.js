import React, { useState } from 'react';
import './PurchaseNotification.css';

const PurchaseNotification = ({ productName, price, location, timeAgo, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="purchase-notification">
      <div className="purchase-notification-image">
        <div className="product-image-placeholder">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="8" fill="#80B3FF" opacity="0.3"/>
            <path d="M15 15L20 10L25 15M20 10V30" stroke="#80B3FF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div className="purchase-notification-content">
        <h4 className="purchase-product-name">{productName}</h4>
        <p className="purchase-price">${price}</p>
        <span className="purchase-status">PURCHASED</span>
        <p className="purchase-location">{timeAgo} from {location}</p>
      </div>
      <button className="purchase-notification-close" onClick={handleClose}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4L4 12M4 4L12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

export default PurchaseNotification;
