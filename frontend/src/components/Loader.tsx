import React from 'react';

export const Loader: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <div style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', border: '3px solid rgba(0,0,0,0.08)', borderTop: '3px solid #c2410c', animation: 'spin 1s linear infinite' }} />
);

export default Loader;
