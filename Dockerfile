FROM node:20-alpine

# יצירת תיקיית האפליקציה
WORKDIR /app

# התקנת תלויות
COPY package*.json ./
RUN npm install

# העתקת קבצי המקור
COPY . .

# בניית האפליקציה
RUN npm run build

# חשיפת פורט
EXPOSE 3000

# הגדרת נפח להרשאות וסשנים
VOLUME /app/auth_info_baileys

# הרצת השרת
CMD ["node", "dist/index.js"]