const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  roleName: { type: String, required: true, unique: true },
});

module.exports = mongoose.models.Role || mongoose.model('Role', roleSchema);
