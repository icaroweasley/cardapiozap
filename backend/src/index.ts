import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/products.routes';
import orderRoutes from './routes/orders.routes';
import menuRoutes from './routes/menu.routes';
import broadcastRoutes from './routes/broadcast.routes';
import adminRoutes from './routes/admin.routes';
import paymentRoutes from './routes/payment.routes';

dotenv.config();

import { resumeAllRunningSessions } from './services/broadcastWorker';

const app = express();
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
export const io = new Server(server, { 
  cors: { origin: '*' } 
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;
    socket.data.merchantId = decoded.merchantId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  if (socket.data.merchantId) {
    socket.join(socket.data.merchantId);
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  resumeAllRunningSessions();
});
