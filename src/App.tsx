import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';

// מנגנון קידוד ופענוח נתונים לתוך ה-URL
const encodeDataToURL = (data: object): string => {
  try {
    const jsonString = JSON.stringify(data);
    return encodeURIComponent(btoa(unescape(encodeURI(jsonString))));
  } catch (error) {
    console.error("Error encoding data", error);
    return "";
  }
};

const decodeDataFromURL = (encodedData: string): any => {
  try {
    const jsonString = decodeURIComponent(escape(atob(decodeURIComponent(encodedData))));
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error decoding data", error);
    return null;
  }
};

interface CardData {
  title: string;
  name: string;
  dates: string;
  description: string;
  quote: string;
}

export default function App() {
  const [cardData, setCardData] = useState<CardData>({
    title: '',
    name: '',
    dates: '',
    description: '',
    quote: ''
  });

  const [shareUrl, setShareUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedCard = params.get('card');
    if (encodedCard) {
      const decoded = decodeDataFromURL(encodedCard);
      if (decoded) {
        setCardData(decoded);
      }
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCardData({
      ...cardData,
      [e.target.name]: e.target.value
    });
  };

  const generateLink = (e: FormEvent) => {
    e.preventDefault();
    const encoded = encodeDataToURL(cardData);
    const fullUrl = `${window.location.origin}${window.location.pathname}?card=${encoded}`;
    setShareUrl(fullUrl);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isViewingMode = new URLSearchParams(window.location.search).has('card');

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>🕯️ דף הנצחה וזיכרון</h1>
      </header>

      {isViewingMode ? (
        <main style={styles.cardDisplay}>
          <h2 style={styles.cardTitle}>{cardData.title || 'לזכר ולעילוי נשמת'}</h2>
          <h1 style={styles.name}>{cardData.name || 'שם פלוני בן פלוני'}</h1>
          <p style={styles.dates}>{cardData.dates}</p>
          <div style={styles.divider}></div>
          <p style={styles.description}>{cardData.description}</p>
          {cardData.quote && (
            <blockquote style={styles.quote}>
              "{cardData.quote}"
            </blockquote>
          )}
          <div style={styles.footerActions}>
            <button 
              onClick={() => window.location.href = window.location.pathname}
              style={styles.buttonSecondary}
            >
              ➕ צור כרטיס הנצחה חדש
            </button>
          </div>
        </main>
      ) : (
        <main style={styles.formContainer}>
          <h2>יצירת כרטיס הנצחה חדש</h2>
          <form onSubmit={generateLink} style={styles.form}>
            <label style={styles.label}>
              כותרת (למשל: לזכר, לעילוי נשמת):
              <input 
                type="text" 
                name="title" 
                value={cardData.title} 
                onChange={handleChange} 
                placeholder="לזכר ולעילוי נשמת..." 
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              שם הנפטר/ת:
              <input 
                type="text" 
                name="name" 
                value={cardData.name} 
                onChange={handleChange} 
                required 
                placeholder="ישראל ישראלי ז״ל" 
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              תאריכים / תאריך פטירה:
              <input 
                type="text" 
                name="dates" 
                value={cardData.dates} 
                onChange={handleChange} 
                placeholder="תשפ״ד - תשפ״ה / 2024" 
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              דברי זיכרון / תיאור:
              <textarea 
                name="description" 
                value={cardData.description} 
                onChange={handleChange} 
                rows={5} 
                placeholder="סיפור חיים, דברים לזכרו..." 
                style={styles.textarea}
              />
            </label>

            <label style={styles.label}>
              ציטוט / פסוק לזכרו:
              <input 
                type="text" 
                name="quote" 
                value={cardData.quote} 
                onChange={handleChange} 
                placeholder="״איש חסד ורב פעלים...״" 
                style={styles.input}
              />
            </label>

            <button type="submit" style={styles.buttonPrimary}>
              🔗 צור קישור לשיתוף
            </button>
          </form>

          {shareUrl && (
            <div style={styles.shareBox}>
              <p><strong>הקישור המוכן לשיתוף:</strong></p>
              <input type="text" readOnly value={shareUrl} style={styles.shareInput} />
              <button onClick={copyToClipboard} style={styles.buttonSuccess}>
                {copied ? '✅ הקישור הועתק!' : '📋 העתק קישור לשיתוף'}
              </button>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '650px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    direction: 'rtl',
    textAlign: 'right',
    color: '#333'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    borderBottom: '2px solid #eee',
    paddingBottom: '10px'
  },
  formContainer: {
    backgroundColor: '#f9f9f9',
    padding: '25px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  input: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '16px'
  },
  textarea: {
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '16px',
    resize: 'vertical'
  },
  buttonPrimary: {
    padding: '12px',
    backgroundColor: '#1b365d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px',
    fontWeight: 'bold'
  },
  buttonSecondary: {
    padding: '10px 18px',
    backgroundColor: '#6c757d',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '20px'
  },
  buttonSuccess: {
    padding: '10px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '15px',
    cursor: 'pointer',
    marginTop: '8px',
    fontWeight: 'bold'
  },
  shareBox: {
    marginTop: '25px',
    padding: '15px',
    backgroundColor: '#e9f5ff',
    borderRadius: '8px',
    border: '1px solid #b8daff',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  shareInput: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '13px',
    direction: 'ltr'
  },
  cardDisplay: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
    border: '1px solid #eaeaea',
    textAlign: 'center'
  },
  cardTitle: {
    color: '#666',
    fontSize: '18px',
    margin: '0 0 10px 0'
  },
  name: {
    color: '#111',
    fontSize: '32px',
    margin: '0 0 10px 0'
  },
  dates: {
    color: '#888',
    fontSize: '16px',
    marginBottom: '20px'
  },
  divider: {
    height: '2px',
    backgroundColor: '#222',
    width: '60px',
    margin: '0 auto 25px auto'
  },
  description: {
    fontSize: '18px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    textAlign: 'right',
    marginBottom: '25px'
  },
  quote: {
    fontStyle: 'italic',
    color: '#555',
    fontSize: '16px',
    borderRight: '3px solid #1b365d',
    paddingRight: '15px',
    margin: '20px 0',
    textAlign: 'right'
  },
  footerActions: {
    marginTop: '30px',
    borderTop: '1px solid #eee',
    paddingTop: '15px'
  }
};
