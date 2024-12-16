const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const WebSocket = require('ws');
const http = require('http');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/Find_user', { useNewUrlParser: true, useUnifiedTopology: true });

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User ', userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// WebSocket connection
wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        const { sender, receiver, text } = JSON.parse(message);
        const msg = new Message({ sender, receiver, text });
        await msg.save();

        // Send message to the intended receiver
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.username === receiver) {
                client.send(JSON.stringify({ sender, text }));
            }
        });
    });
});

// User Registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).send('User  registered');
});

// User Login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        res.send('Login successful');
    } else {
        res.status(401).send('Invalid credentials');
    }
});

// Get Users
app.get('/users', async (req, res) => {
    const users = await User.find({}, 'username');
    res.json(users);
});

// Get Messages
app.get('/messages/:user', async (req, res) => {
    const messages = await Message.find({ receiver: req.params.user });
    res.json(messages);
});

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start the server
server.listen(8000, () => {
    console.log('Server is listening on port 6000');
});