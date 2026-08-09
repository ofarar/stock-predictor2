import fs from 'fs';
import path from 'path';

const localesDir = path.resolve('./client/src/locales');
const languages = fs.readdirSync(localesDir);

const translations = {
  en: { app_name: 'StockPredictorAI', description: 'Get the app for a better experience', install: 'Install' },
  tr: { app_name: 'StockPredictorAI', description: 'Daha iyi bir deneyim için uygulamayı indirin', install: 'İndir' },
  de: { app_name: 'StockPredictorAI', description: 'Holen Sie sich die App für ein besseres Erlebnis', install: 'Installieren' },
  es: { app_name: 'StockPredictorAI', description: 'Obtén la aplicación para una mejor experiencia', install: 'Instalar' },
  fr: { app_name: 'StockPredictorAI', description: 'Obtenez l\'application pour une meilleure expérience', install: 'Installer' },
  hi: { app_name: 'StockPredictorAI', description: 'बेहतर अनुभव के लिए ऐप प्राप्त करें', install: 'इंस्टॉल करें' },
  nl: { app_name: 'StockPredictorAI', description: 'Download de app voor een betere ervaring', install: 'Installeren' },
  ru: { app_name: 'StockPredictorAI', description: 'Получите приложение для лучшего опыта', install: 'Установить' },
  zh: { app_name: 'StockPredictorAI', description: '获取应用程序以获得更好的体验', install: '安装' },
  ar: { app_name: 'StockPredictorAI', description: 'احصل على التطبيق لتجربة أفضل', install: 'تثبيت' }
};

for (const lang of languages) {
  const filePath = path.join(localesDir, lang, 'translation.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.smart_banner = translations[lang] || translations['en'];
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${lang}`);
  }
}
