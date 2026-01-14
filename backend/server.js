const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = 5000;
const SECRET_KEY = 'super_secret_key_for_demo';

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());

// --- DATABASE SETUP (SQLite) ---
// Using Sequelize for professional ORM patterns
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // persistent local file
  logging: false
});

// --- MODELS ---
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false }
});

const Task = sequelize.define('Task', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  dueDate: { type: DataTypes.DATEONLY },
  priority: { type: DataTypes.ENUM('Low', 'Medium', 'High'), defaultValue: 'Medium' },
  status: { type: DataTypes.ENUM('Pending', 'In Progress', 'Completed'), defaultValue: 'Pending' }
});

// Relationships
User.hasMany(Task);
Task.belongsTo(User);

// --- AUTH MIDDLEWARE ---
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  
  jwt.verify(token.split(" ")[1], SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = decoded.id;
    next();
  });
};

// --- ROUTES ---

// 1. Auth: Register
app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });
    res.json({ message: 'User created', userId: user.id });
  } catch (err) {
    res.status(400).json({ error: 'Username likely taken' });
  }
});

// 2. Auth: Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ where: { username } });
  
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '2h' });
  res.json({ token, username });
});

// 3. CRUD: Get Tasks (with Filtering)
app.get('/tasks', authenticate, async (req, res) => {
  const { status, priority } = req.query;
  const whereClause = { UserId: req.userId };
  
  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;

  const tasks = await Task.findAll({ where: whereClause });
  res.json(tasks);
});

// 4. CRUD: Create Task
app.post('/tasks', authenticate, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, UserId: req.userId });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. CRUD: Update Task
app.put('/tasks/:id', authenticate, async (req, res) => {
  const task = await Task.findOne({ where: { id: req.params.id, UserId: req.userId } });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  
  await task.update(req.body);
  res.json(task);
});

// 6. CRUD: Delete Task
app.delete('/tasks/:id', authenticate, async (req, res) => {
  const result = await Task.destroy({ where: { id: req.params.id, UserId: req.userId } });
  res.json({ success: !!result });
});

// --- SYNC & START ---
sequelize.sync({ force: false }).then(() => {
  console.log('Database synced');
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});