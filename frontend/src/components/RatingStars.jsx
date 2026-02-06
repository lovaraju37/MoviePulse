import React from 'react';
import { Star } from 'lucide-react';

const RatingStars = ({ rating, size = 14, color = "#00e054" }) => {
    if (!rating || rating <= 0) return null;

    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            {[...Array(fullStars)].map((_, i) => (
                <Star 
                    key={i} 
                    size={size} 
                    fill={color} 
                    color={color} 
                    strokeWidth={0} 
                />
            ))}
            {hasHalf && (
                <span style={{ 
                    color: color, 
                    fontSize: `${Math.max(10, size - 2)}px`, 
                    fontWeight: 'bold', 
                    lineHeight: 1,
                    marginLeft: '1px',
                    fontFamily: 'Arial, sans-serif'
                }}>
                    ½
                </span>
            )}
        </div>
    );
};

export default RatingStars;
