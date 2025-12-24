const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
let entries = [];

// NLP-like processing function
function processInput(rawInput) {
  const input = rawInput.toLowerCase();
  
  // Category classification
  let category = 'event';
  if (input.includes('fail') || input.includes('error') || input.includes('overheat') || 
      input.includes('crash') || input.includes('malfunction')) {
    category = 'issue';
  } else if (input.includes('delay') || input.includes('late') || input.includes('postpone')) {
    category = 'delay';
  } else if (input.includes('qa') || input.includes('quality') || input.includes('defect') || 
             input.includes('inspection')) {
    category = 'quality';
  }
  
  // Severity detection
  let severity = 'low';
  if (input.includes('critical') || input.includes('urgent') || input.includes('emergency') || 
      input.includes('severe')) {
    severity = 'high';
  } else if (input.includes('important') || input.includes('significant') || 
             input.includes('major')) {
    severity = 'medium';
  }
  
  // Entity extraction (simple pattern matching)
  const entities = [];
  
  // Extract components
  const componentPatterns = [
    /motor|pcb|board|circuit|sensor|controller|relay|switch|battery|capacitor/gi,
    /version\s+\d+/gi,
    /node\s+[a-z]/gi
  ];
  componentPatterns.forEach(pattern => {
    const matches = rawInput.match(pattern);
    if (matches) entities.push(...matches);
  });
  
  // Extract vendors
  const vendorMatch = rawInput.match(/vendor\s+([a-z0-9]+)/gi);
  if (vendorMatch) entities.push(...vendorMatch);
  
  // Extract numeric metrics
  const extractedMetrics = {};
  
  // Time duration
  const timeMatch = rawInput.match(/(\d+)\s*(hour|minute|day|week)s?/i);
  if (timeMatch) {
    extractedMetrics.duration = `${timeMatch[1]} ${timeMatch[2]}${timeMatch[1] > 1 ? 's' : ''}`;
  }
  
  // Temperature
  const tempMatch = rawInput.match(/(\d+)\s*(degree|°|celsius|fahrenheit)/i);
  if (tempMatch) {
    extractedMetrics.temperature = `${tempMatch[1]}°`;
  }
  
  // Voltage
  const voltageMatch = rawInput.match(/(\d+\.?\d*)\s*(v|volt|voltage)/i);
  if (voltageMatch) {
    extractedMetrics.voltage = `${voltageMatch[1]}V`;
  }
  
  // Count/quantity
  const countMatch = rawInput.match(/(\d+)\s*(unit|piece|item)s?/i);
  if (countMatch) {
    extractedMetrics.quantity = parseInt(countMatch[1]);
  }
  
  return {
    category,
    severity,
    entities: [...new Set(entities)], // Remove duplicates
    extracted_metrics: extractedMetrics
  };
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', entries: entries.length });
});

// Get all entries with optional filtering
app.get('/api/entries', (req, res) => {
  const { category, severity, search } = req.query;
  
  let filtered = entries;
  
  if (category && category !== 'all') {
    filtered = filtered.filter(e => e.category === category);
  }
  
  if (severity) {
    filtered = filtered.filter(e => e.severity === severity);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(e => 
      e.raw_input.toLowerCase().includes(searchLower) ||
      e.entities.some(entity => entity.toLowerCase().includes(searchLower))
    );
  }
  
  // Sort by timestamp (newest first)
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json(filtered);
});

// Get single entry
app.get('/api/entries/:id', (req, res) => {
  const entry = entries.find(e => e.id === req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  res.json(entry);
});

// Create new entry
app.post('/api/entries', (req, res) => {
  const { raw_input } = req.body;
  
  if (!raw_input || typeof raw_input !== 'string' || raw_input.trim().length === 0) {
    return res.status(400).json({ error: 'raw_input is required and must be non-empty string' });
  }
  
  const processed = processInput(raw_input);
  
  const entry = {
    id: uuidv4(),
    raw_input: raw_input.trim(),
    timestamp: new Date().toISOString(),
    ...processed
  };
  
  entries.push(entry);
  
  res.status(201).json(entry);
});

// Delete entry
app.delete('/api/entries/:id', (req, res) => {
  const index = entries.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  
  entries.splice(index, 1);
  res.json({ message: 'Entry deleted' });
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
  const analytics = {
    total: entries.length,
    by_category: {},
    by_severity: {},
    recent_trend: [],
    top_entities: {}
  };
  
  // Count by category
  entries.forEach(e => {
    analytics.by_category[e.category] = (analytics.by_category[e.category] || 0) + 1;
    analytics.by_severity[e.severity] = (analytics.by_severity[e.severity] || 0) + 1;
  });
  
  // Recent trend (last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const count = entries.filter(e => 
      e.timestamp.split('T')[0] === dateStr
    ).length;
    analytics.recent_trend.push({ date: dateStr, count });
  }
  
  // Top entities
  const entityCounts = {};
  entries.forEach(e => {
    e.entities.forEach(entity => {
      entityCounts[entity] = (entityCounts[entity] || 0) + 1;
    });
  });
  
  analytics.top_entities = Object.entries(entityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
  
  res.json(analytics);
});

// Trends endpoint - time-based analysis
app.get('/api/trends', (req, res) => {
  const { days = 30 } = req.query;
  
  const now = new Date();
  const startDate = new Date(now.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);
  
  const filtered = entries.filter(e => new Date(e.timestamp) >= startDate);
  
  const trends = {
    period_days: parseInt(days),
    total_entries: filtered.length,
    avg_per_day: (filtered.length / parseInt(days)).toFixed(2),
    categories: {},
    severities: {}
  };
  
  filtered.forEach(e => {
    trends.categories[e.category] = (trends.categories[e.category] || 0) + 1;
    trends.severities[e.severity] = (trends.severities[e.severity] || 0) + 1;
  });
  
  res.json(trends);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Operations Tracker API running on port ${PORT}`);
  console.log(`📊 Endpoints available:`);
  console.log(`   GET    /api/health`);
  console.log(`   GET    /api/entries`);
  console.log(`   POST   /api/entries`);
  console.log(`   GET    /api/entries/:id`);
  console.log(`   DELETE /api/entries/:id`);
  console.log(`   GET    /api/analytics`);
  console.log(`   GET    /api/trends`);
});