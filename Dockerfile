# Étape 1 : Build de l'application
FROM node:20-alpine AS build
WORKDIR /app

# Copie et installation
COPY package*.json ./
RUN npm ci

# Copie du reste du code
COPY . .

# Build du projet
RUN npm run build

# Étape 2 : Serveur web avec Nginx
FROM nginx:alpine

# Copie du build React vers Nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]