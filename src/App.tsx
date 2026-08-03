import React, { useState, useEffect } from 'react';

// מנגנון תמונת ברירת מחדל אוטומטי
const getProfileImage = (person: any) => {
  if (person?.imageUrl && person.imageUrl.trim() !== "") return person.imageUrl;
  if (person?.photoUrl && person.photoUrl.trim() !== "") return person.photoUrl;
  if (person?.image && person.image.trim() !== "") return person.image;
  return "/icon-192.png"; // תמונת ברירת המחדל אם אין תמונה ב-JSON
};

export const ImageWithFallback = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <img
      src={imgSrc || "/icon-192.png"}
      alt={alt}
      className={className}
      onError={() => {
        // אם התמונה שבורה או הקישור לא עובד - מציג אוטומטית את תמונת ברירת המחדל
        setImgSrc("/icon-192.png");
      }}
    />
  );
};
