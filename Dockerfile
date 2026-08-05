# =====================================================================
# Combined single-container image for FlowPay (frontend + backend).
# Builds the Spring Boot backend and the React/Vite frontend, then runs
# both inside one container: Nginx serves the frontend on port 80 and
# proxies /api, /swagger-ui, /api-docs to the Spring Boot app running on
# 127.0.0.1:8080 inside the same container.
#
# NOTE: MySQL is NOT included here — point DB_HOST at an external/linked
# MySQL instance (see run command below).
# =====================================================================

# ---- Stage 1: build backend jar ----
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn dependency:go-offline
COPY backend/src/ src/
RUN mvn package -DskipTests

# ---- Stage 2: build frontend static assets ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ---- Stage 3: final runtime image (JRE + Nginx) ----
FROM eclipse-temurin:21-jre-jammy
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=backend-build /app/backend/target/*.jar app.jar
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
COPY docker/nginx.combined.conf /etc/nginx/sites-available/default
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80
ENTRYPOINT ["/start.sh"]
