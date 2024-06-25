const express = require("express");
const socketIo = require('socket.io');
const http = require('http');
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
const server = http.createServer(app);
require('dotenv').config();

const frontendurl = process.env.FRONTEND_URL
const io = socketIo(server,{
  cors: {
      origin: frontendurl, // Allow requests from this origin
      methods: ["GET", "POST"]
  }
});

const grouprouter = require("./routers/group")(io); // Pass io to router
const loginsinguprouter = require("./routers/loginsignup");
const connectiondb = require("./mongoose/mongoose");

connectiondb();

app.use("/", grouprouter);
app.use("/", loginsinguprouter);
const messageModel = require("./datamodels/message");
const groupmodel = require('./datamodels/groups');

const jwt = require('jsonwebtoken'); // Add this line to import jwt

io.use((socket, next) => {
    const token = socket.handshake.query.token;
    try {
        const decoded = jwt.verify(token, 'devmamgain43');
       
        socket.userId = decoded.id;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});
const onlineUsers = {}; // Track online users

io.on('connection', (socket) => {
    const userId = socket.userId;
    onlineUsers[userId] = true; // Mark user as online

    // Emit to all clients that this user is online
    io.emit('userStatus', { userId, online: true });

    socket.on('joinGroup', async (groupId) => {
        socket.join(groupId);
        const group = await groupmodel.findById(groupId).populate('members');
        socket.emit('groupMembers', group.members.map(member => ({
            ...member.toObject(),
            online: !!onlineUsers[member._id.toString()]
        })));
    });

    socket.on('disconnect', () => {
        onlineUsers[userId] = false; // Mark user as offline
        setTimeout(() => {
            if (!io.sockets.sockets.size) {
                delete onlineUsers[userId]; // Clean up if the user has disconnected
            }
        }, 30000); // Adjust the timeout as needed

        // Emit to all clients that this user is offline
        io.emit('userStatus', { userId, online: false });

        // Update all groups the user was part of
        for (const roomId of socket.rooms) {
            if (roomId !== socket.id) {
                socket.to(roomId).emit('userStatus', { userId, online: false });
            }
        }
    });

    socket.on('getGroupMembers', async (groupId) => {
        const group = await groupmodel.findById(groupId).populate('members');
        socket.emit('groupMembers', group.members.map(member => ({
            ...member.toObject(),
            online: !!onlineUsers[member._id.toString()]
        })));
    });
    socket.on('message', async ({ groupId, message }) => {
        const newMessage = new messageModel({ groupId, sender: socket.userId, content: message });
        await newMessage.save();
        io.to(groupId).emit('message', newMessage);
    });
    socket.on('getgroups', async () => {
        const groups = await groupmodel.find({});
        io.emit('getgroups', groups);
    });

});

const port = 7000;
server.listen(port, () => {
    console.log("running at ", port);
});
