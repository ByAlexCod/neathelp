var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var PropositionSchema = new Schema({
	description: {type: String, required: true},
	hash: {type: String, required: true},
	card: { type: Schema.ObjectId, ref: "Card", required: true },
	user: { type: Schema.ObjectId, ref: "User", required: true },
}, {timestamps: true, toObject: {virtuals: true}});


module.exports = mongoose.model("Proposition", PropositionSchema);