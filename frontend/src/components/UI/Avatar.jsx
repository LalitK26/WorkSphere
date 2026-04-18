import { useState } from 'react';
import { getFullImageUrl } from '../../utils/imageUrl';

/**
 * Avatar component that displays a profile picture or initials fallback
 * @param {string} profilePictureUrl - URL of the profile picture
 * @param {string} fullName - Full name of the person (e.g., "Ashitosh Patil")
 * @param {string} name - Alternative name prop (fallback if fullName not provided)
 * @param {string} size - Size class (e.g., "w-8 h-8", "w-10 h-10", "w-16 h-16")
 * @param {string} className - Additional CSS classes
 * @param {string} alt - Alt text for the image
 */
const Avatar = ({ 
  profilePictureUrl, 
  fullName, 
  name, 
  size = 'w-10 h-10',
  className = '',
  alt = '',
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);

  // Use fullName or name, whichever is available
  const displayName = fullName || name || '';
  
  // Generate initials from the name
  const getInitials = (nameStr) => {
    if (!nameStr || !nameStr.trim()) return '?';
    
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    
    if (parts.length === 1) {
      // Only one name - use first letter
      return parts[0].charAt(0).toUpperCase();
    }
    
    // Multiple names - use first letter of first name and first letter of last name
    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  };

  const initials = getInitials(displayName);
  // Convert relative URL to full URL in production
  const fullImageUrl = getFullImageUrl(profilePictureUrl);
  const hasValidImage = fullImageUrl && !imageError;

  // Generate a consistent background color based on the name
  const getBackgroundColor = (nameStr) => {
    if (!nameStr) return 'bg-gray-500';
    
    // Simple hash function to generate consistent color
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate a color from the hash (using a palette of nice colors)
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-red-500',
      'bg-cyan-500',
      'bg-amber-500',
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const bgColor = getBackgroundColor(displayName);

  return (
    <div 
      className={`${size} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}
      style={{
        fontSize: 'clamp(0.5rem, 2.5rem, 2rem)'
      }}
      {...props}
    >
      {hasValidImage ? (
        <img
          src={fullImageUrl}
          alt={alt || displayName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div 
          className={`w-full h-full ${bgColor} flex items-center justify-center text-white font-semibold leading-none select-none`}
          style={{ 
            fontSize: 'clamp(0.5rem, 0.4em, 2rem)',
            lineHeight: '1',
            letterSpacing: '0'
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
};

export default Avatar;

