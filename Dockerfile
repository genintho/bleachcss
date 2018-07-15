FROM node:8-slim

WORKDIR /myapp

COPY . /myapp
RUN npm install

EXPOSE 3000
CMD [ "npm", "start" ]
