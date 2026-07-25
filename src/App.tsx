import React, { useState, useEffect } from 'react';

export default function App() {
  const [cardData, setCardData] = useState({
    title: '',
    name: '',
    dates: '',
    description: '',
    quote: ''
  });

  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedCard = params.get('card');
    if (encodedCard) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(encodedCard)))));
        setCardData(decoded);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCardData({
      ...cardData,
      [e.target.name]: e.target.value
    });
  };

  const generateLink = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jsonString = JSON.stringify(cardData);
      const encoded = encodeURIComponent(btoa(unescape(encodeURI(jsonString))));
      const fullUrl = `${window.location.origin}${window.location.pathname}?card=${encoded}`;
      setShareUrl(fullUrl);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isViewingMode = new URLSearchParams(window.location.search).has('card');

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', direction: 'rtl', textAlign: 'right', color: '#333' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h1>🕯️ דף הנצחה וזיכרון</h1>
      </header>

      {isViewingMode ? (
        <main style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 6px 18px rgba(0,0,0,0.08)', border: '1px solid #eaeaea', textAlign: 'center' }}>
          <h2 style={{ color: '#666', fontSize: '18px', margin: '0 0 10px 0' }}>{cardData.title || 'לזכר ולעילוי נשמת'}</h2>
          <h1 style={{ color: '#111', fontSize: '32px', margin: '0 0 10px 0' }}>{cardData.name || 'שם הנפטר/ת'}</h1>
          <p style={{ color: '#888', fontSize: '16px', marginBottom: '20px' }}>{cardData.dates}</p>
          <div style={{ height: '2px', backgroundColor: '#222', width: '60px', margin: '0 auto 25px auto' }}></div>
          <p style={{ fontSize: '18px', lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: 'right', marginBottom: '25px' }}>{cardData.description}</p>
          {cardData.quote && (
            <blockquote style={{ fontStyle: 'italic', color: '#555', fontSize: '16px', borderRight: '3px solid #1b365d', paddingRight: '15px', margin: '20px 0', textAlign: 'right' }}>
              "{cardData.quote}"
            </blockquote>
          )}
          <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
            <button 
              onClick={() => window.location.href = window.location.pathname}
              style={{ padding: '10px 18px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
            >
              ➕ צור כרטיס הנצחה חדש
            </button>
          </div>
        </main>
      ) : (
        <main style={{ backgroundColor: '#f9f9f9', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2>יצירת כרטיס הנצחה חדש</h2>
          <form onSubmit={generateLink} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              כותרת (למשל: לזכר, לעילוי נשמת):
              <input 
                type="text" 
                name="title" 
                value={cardData.title} 
                onChange={handleChange} 
                placeholder="לזכר ולעילוי נשמת..." 
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              שם הנפטר/ת:
              <input 
                type="text" 
                name="name" 
                value={cardData.name} 
                onChange={handleChange} 
                required 
                placeholder="ישראל ישראלי ז״ל" 
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              תאריכים / תאריך פטירה:
              <input 
                type="text" 
                name="dates" 
                value={cardData.dates} 
                onChange={handleChange} 
                placeholder="תשפ״ד - תשפ״ה / 2024" 
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              דברי זיכרון / תיאור:
              <textarea 
                name="description" 
                value={cardData.description} 
                onChange={handleChange} 
                rows={5} 
                placeholder="סיפור חיים, דברים לזכרו..." 
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px', resize: 'vertical' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              ציטוט / פסוק לזכרו:
              <input 
                type="text" 
                name="quote" 
                value={cardData.quote} 
                onChange={handleChange} 
                placeholder="״איש חסד ורב פעלים...״" 
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px' }}
              />
            </label>

            <button type="submit" style={{ padding: '12px', backgroundColor: '#1b365d', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}>
              🔗 צור קישור לשיתוף
            </button>
          </form>

          {shareUrl && (
            <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#e9f5ff', borderRadius: '8px', border: '1px solid #b8daff', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p><strong>הקישור המוכן לשיתוף:</strong></p>
              <input type="text" readOnly value={shareUrl} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', direction: 'ltr' }} />
              <button onClick={copyToClipboard} style={{ padding: '10px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '15px', cursor: 'pointer', marginTop: '8px', fontWeight: 'bold' }}>
                {copied ? '✅ הקישור הועתק!' : '📋 העתק קישור לשיתוף'}
              </button>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
