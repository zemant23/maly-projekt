# Použijeme lightweight Node.js image
FROM node:20-alpine

# Pracovní adresář uvnitř kontejneru
WORKDIR /app

# Zkopírujeme package.json (pokud existuje), jinak jen soubory hry
COPY package*.json ./

# Nainstalujeme závislosti (pokud package.json existuje)
RUN if [ -f package.json ]; then npm install --production; fi

# Zkopírujeme všechny soubory projektu
COPY . .

# Port, na kterém server naslouchá (Render ho předá přes env PORT)
EXPOSE 3001

# Spustíme server
CMD ["node", "server.js"]
