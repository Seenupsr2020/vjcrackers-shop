---

# 🚀 Vercel Deployment Guide (New)

Vercel-லில் உங்களது புராஜெக்ட்-ஐ ஹோஸ்ட் செய்ய இந்த எளிய வழிமுறைகளை பின்பற்றவும்:

## 1. GitHub-பிற்கு கோப்புகளை அனுப்புதல் (Push to GitHub)
உங்களது புராஜெக்ட்-ஐ ஒரு GitHub Repository-யாக பதிவேற்றவும். நான் உருவாக்கிய `api/` ஃபோல்டர் மற்றும் `vercel.json` கோப்புகள் அதில் இருக்கிறதா என்பதை உறுதி செய்து கொள்ளவும்.

## 2. Vercel-லில் புராஜெக்ட்-ஐ இணைத்தல் (Connect to Vercel)
1. [vercel.com](https://vercel.com/) லாகின் செய்யவும்.
2. **"Add New"** > **"Project"** கிளிக் செய்யவும்.
3. உங்களது GitHub Repository-யை **Import** செய்யவும்.

## 3. Environment Variables செட் செய்தல்
Deploy பட்டனை அழுத்துவதற்கு முன்பு, **Environment Variables** பிரிவில் கீழ்க்கண்டவற்றைச் சேர்க்கவும்:
- `TIDB_HOST`
- `TIDB_PORT`: `4000`
- `TIDB_USER`
- `TIDB_PASSWORD`
- `TIDB_DATABASE`
- `NODE_ENV`: `production`

## 4. Deploy செய்தல்
அனைத்தையும் கொடுத்துவிட்டு **Deploy** என்பதை அழுத்தவும். சில நிமிடங்களில் உங்களது தளம் லைவ்-வில் இருக்கும்!

---

# 🚀 SowfiHost Deployment Guide (Original)
[Existing SowfiHost content follows...]
