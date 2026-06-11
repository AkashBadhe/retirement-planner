# Use the official Node.js image as the base image
FROM node:14-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build the React app
RUN npm run build

# Install a lightweight web server to serve the React app
RUN npm install -g serve

# Expose the port the app runs on
EXPOSE 5000

# Command to run the app
CMD ["serve", "-s", "build", "-l", "5000"]