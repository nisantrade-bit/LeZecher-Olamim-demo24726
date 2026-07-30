import { Deceased } from '../types';
import { findYahrzeitGregorianDate, gimatriya, HEBREW_MONTHS_HE } from './hebrewDate';
import { getTorahPortionDetails } from './torahPortionHelper';

export function generateStandaloneHtmlString(deceased: Deceased, lang: string = 'he'): string {
  const currentYear = new Date().getFullYear();
  const gregDate = findYahrzeitGregorianDate(deceased.day, deceased.month, currentYear);
  const parsha = getTorahPortionDetails('', '');
  const dateFormatted = gregDate ? gregDate.toLocaleDateString(lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const parentRelation = deceased.gender === 'female' 
    ? (deceased.fatherName ? `בת ${deceased.fatherName}` : '') + (deceased.motherName ? ` ו${deceased.motherName}` : '')
    : (deceased.fatherName ? `בן ${deceased.fatherName}` : '') + (deceased.motherName ? ` ו${deceased.motherName}` : '');

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🕯️ לזכר עולמים - ${deceased.name} ז״ל</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #070b12;
      color: #f3f4f6;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      padding: 24px 12px;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .container {
      max-width: 720px;
      width: 100%;
      background: #0f172a;
      border: 1px solid rgba(200, 169, 110, 0.4);
      border-radius: 24px;
      padding: 32px 24px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.7);
      text-align: center;
      position: relative;
    }
    .badge {
      display: inline-block;
      padding: 6px 18px;
      background: rgba(200, 169, 110, 0.15);
      border: 1px solid rgba(200, 169, 110, 0.4);
      color: #c8a96e;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 32px;
      color: #ffffff;
      margin-bottom: 8px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .parent-relation {
      color: #c8a96e;
      font-size: 19px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .dates-box {
      background: #1e293b;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 20px;
      margin: 24px 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .date-item h4 {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .date-item p {
      font-size: 17px;
      color: #f1f5f9;
      font-weight: 700;
    }
    .candle-section {
      background: rgba(217, 119, 6, 0.08);
      border: 1px solid rgba(217, 119, 6, 0.25);
      border-radius: 18px;
      padding: 24px;
      margin: 24px 0;
    }
    .candle-btn {
      background: linear-gradient(135deg, #d97706, #b45309);
      color: #fff;
      border: none;
      padding: 16px 32px;
      font-size: 17px;
      font-weight: 700;
      border-radius: 16px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(217, 119, 6, 0.4);
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .candle-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(217, 119, 6, 0.6);
    }
    .lit-candle {
      font-size: 56px;
      margin-bottom: 12px;
      animation: pulse 2s infinite ease-in-out;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px #f59e0b); }
      50% { transform: scale(1.1); filter: drop-shadow(0 0 24px #f59e0b); }
    }
    .notes-box {
      background: rgba(200, 169, 110, 0.08);
      border-right: 4px solid #c8a96e;
      padding: 18px;
      border-radius: 12px;
      text-align: right;
      margin: 24px 0;
      color: #e2e8f0;
      font-size: 15px;
      line-height: 1.7;
    }
    .footer {
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-size: 13px;
      color: #94a3b8;
    }
    .shalom {
      font-size: 22px;
      color: #c8a96e;
      font-weight: 700;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">🕯️ דף הנצחה וזיכרון עצמאי</div>
    <h1>${deceased.name} ז״ל</h1>
    ${parentRelation ? `<div class="parent-relation">${parentRelation}</div>` : ''}

    <div class="candle-section">
      <div id="candleVisual" class="lit-candle">🕯️</div>
      <button id="lightBtn" class="candle-btn" onclick="lightCandle()">
        🔥 הדלק נר נשמה לזכרו/ה (<span id="countVal">1</span>)
      </button>
    </div>

    <div class="dates-box">
      <div class="date-item">
        <h4>תאריך פטירה עברי</h4>
        <p>${gimatriya(deceased.day)} ב${deceased.month}</p>
      </div>
      <div class="date-item">
        <h4>יום האזכרה הקרוב</h4>
        <p>${dateFormatted || 'לא הוגדר'}</p>
      </div>
      ${parsha ? `
      <div class="date-item">
        <h4>שבת עליה לתורה</h4>
        <p>פרשת ${parsha.nameHe}</p>
      </div>` : ''}
    </div>

    ${deceased.notes ? `<div class="notes-box"><strong>סיפור חיים ומקום קבורה:</strong><br>${deceased.notes.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="shalom">ת.נ.צ.ב.ה</div>

    <div class="footer">
      מודעת הנצחה זו נשמרה כקובץ HTML עצמאי - נפתח בכל מכשיר וטלפון ללא צורך בחיבור לרשת
    </div>
  </div>

  <script>
    let count = parseInt(localStorage.getItem('memorial_candle_' + '${deceased.id}') || '1', 10);
    document.getElementById('countVal').innerText = count;

    function lightCandle() {
      count++;
      localStorage.setItem('memorial_candle_' + '${deceased.id}', count.toString());
      document.getElementById('countVal').innerText = count;
      alert('🕯️ תזכה/י למצוות! הנר הודלק בהצלחה לעילוי נשמת ${deceased.name} ז״ל');
    }
  </script>
</body>
</html>`;
}

export function downloadStandaloneMemorialHtml(deceased: Deceased, lang: string = 'he') {
  try {
    const htmlContent = generateStandaloneHtmlString(deceased, lang);
    const fileName = `memorial_${deceased.id}.html`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    
    if (typeof window !== 'undefined' && (window as any).navigator?.msSaveOrOpenBlob) {
      (window as any).navigator.msSaveOrOpenBlob(blob, fileName);
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('Error downloading HTML file:', err);
    // Fallback: Data URL
    try {
      const htmlContent = generateStandaloneHtmlString(deceased, lang);
      const encoded = encodeURIComponent(htmlContent);
      const dataUri = `data:text/html;charset=utf-8,${encoded}`;
      const newWin = window.open(dataUri, '_blank');
      if (!newWin) {
        alert('יש לאפשר חלונות קופצים (Popups) בדפדפן כדי להוריד או לצפות בקובץ הזיכרון.');
      }
    } catch (e) {
      alert('אירעה שגיאה בהורדת הקובץ.');
    }
  }
}

export async function shareStandaloneMemorialHtmlFile(deceased: Deceased, lang: string = 'he') {
  try {
    const htmlContent = generateStandaloneHtmlString(deceased, lang);
    const fileName = `memorial_${deceased.id}.html`;
    const file = new File([htmlContent], fileName, { type: 'text/html' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `🕯️ מודעת זיכרון והנצחה - ${deceased.name} ז״ל`,
        text: `מודעת זיכרון והנצחה לעילוי נשמת ${deceased.name} ז״ל. פתחו את הקובץ המצורף לצפייה במודעה והדלקת נר נשמה.`,
        files: [file]
      });
      return true;
    }
  } catch (e) {
    console.log('User cancelled share or share file not supported:', e);
  }

  // Fallback: download file
  downloadStandaloneMemorialHtml(deceased, lang);
  return false;
}

