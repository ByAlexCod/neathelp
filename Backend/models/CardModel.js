var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var CardSchema = new Schema({
	title: {type: String, required: true},
	description: {type: String, required: true},
	hash: {type: String, required: true},
	user: { type: Schema.ObjectId, ref: "User", required: true },
},  {timestamps: true});

module.exports = mongoose.model("Card", CardSchema);