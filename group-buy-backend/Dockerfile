# Node.js LTS sürümünü temel alır
FROM node:20-alpine

# Çalışma dizinini ayarla
WORKDIR /app

# package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm install

# Uygulama kaynak kodunu kopyala
COPY . .

# Prisma Client'ı generate et
# Eğer schema.prisma'nızda "output = "./node_modules/.prisma/client"" ayarı varsa
# bu adım otomatik olarak doğru yere generate edecektir.
RUN npx prisma generate

# Uygulamanın çalışacağı portu belirt
EXPOSE 5000

# Uygulamayı başlat
CMD ["npm", "start"]