const Card = require("../models/CardModel");
const Proposition = require("../models/PropositionModel");

const { body,validationResult } = require("express-validator");
const { sanitizeBody } = require("express-validator");
const apiResponse = require("../helpers/apiResponse");
const path = require("path");
const auth = require("../middlewares/jwt");
var mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

// Card Schema
function CardData(data) {
	this.id = data._id;
	this.title= data.title;
	this.description = data.description;
	this.hash = data.hash;
	this.createdAt = data.createdAt;
}

/**
 * Card List.
 * 
 * @returns {Object}
 */
exports.cardList = [
	auth,
	function (req, res) {
		try {
			Card.find({user: req.user._id},"_id title description hash createdAt").then((cards)=>{
				if(cards.length > 0){
					return apiResponse.successResponseWithData(res, "Operation success", cards);
				}else{
					return apiResponse.successResponseWithData(res, "Operation success", []);
				}
			});
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

exports.getAnsweredCards = [
	auth,

];

/**
 * Card Detail.
 * 
 * @param {string}      id
 * 
 * @returns {Object}
 */
exports.cardDetail = [
	auth,
	function (req, res) {
		if(!mongoose.Types.ObjectId.isValid(req.params.id)){
			return apiResponse.successResponseWithData(res, "Operation success", {});
		}
		try {
			Card.findOne({_id: req.params.id,user: req.user._id},"_id title description hash createdAt").then((card)=>{                
				if(card !== null){
					let cardData = new CardData(card);
					return apiResponse.successResponseWithData(res, "Operation success", cardData);
				}else{
					return apiResponse.notFoundResponse(res, "No card found", {});
				}
			});
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Card store.
 * 
 * @param {string}      title 
 * @param {string}      description
 * @param {string}      hash
 * 
 * @returns {Object}
 */
exports.cardStore = [
	auth,
	body("title", "Title must not be empty.").isLength({ min: 1 }).trim(),
	body("description", "Description must not be empty.").isLength({ min: 1 }).trim(),
	body("hash", "HASH must not be empty").isLength({ min: 1 }).trim().custom((value) => {
		return Card.findOne({hash : value}).then(card => {
			if (card) {
				return Promise.reject("Card already exist with this HASH no.");
			}
		});
	}),
	sanitizeBody("*").escape(),
	(req, res) => {
		try {
			const errors = validationResult(req);
			var card = new Card(
				{ title: req.body.title,
					user: req.user,
					description: req.body.description,
					hash: req.body.hash
				});

			if (!errors.isEmpty()) {
				return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array());
			}
			else {
				//Save card.
				card.save(function (err) {
					if (err) { return apiResponse.ErrorResponse(res, err); }
					let cardData = new CardData(card);
					return apiResponse.successResponseWithData(res,"Card add Success.", cardData);
				});
			}
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 *
 * @type {(*|(function(...[*]=)))[]}
 */
exports.getPropositions = [
	auth,
	(req, res) => {
		Proposition.find({card: req.params.id}, "_id description hash createdAt").then((propositions) => {
			if(propositions.length > 0){
				return apiResponse.successResponseWithData(res, "Propositions list fetched", propositions);
			} else {
				return apiResponse.successResponseWithData(res, "No proposition fetched");
			}
		});
	}
];


/**
 * Answer to help card creation. Source should already be uploaded
 * @type {(*|ValidationChain)[]}
 */
exports.propositionCreate = [
	auth,
	body("description", "Description must not be empty.").isLength({ min: 10 }).trim(),
	body("hash", "HASH must not be empty").isLength({ min: 1 }).trim().custom((value,{req}) => {
		return Proposition.findOne({hash : value}).then(card => {
			if (card) {
				return Promise.reject("Card already exist with this hash no.");
			}
		});

	}),
	(req, res) => {
		const errors = validationResult(req);
		var proposition = new Proposition(
			{
				card: req.params.id,
				description: req.body.description,
				hash: req.body.hash,
				user: req.user
			});

		if (!errors.isEmpty()) {
			return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array());
		}
		proposition.save(function (err) {
			if (err) { return apiResponse.ErrorResponse(res, err); }
			let propositionData = new CardData(proposition);
			return apiResponse.successResponseWithData(res,"Proposition add Success.", propositionData);
		});

	}
];

/**
 * Card update.
 * 
 * @param {string}      title 
 * @param {string}      description
 * @param {string}      hash
 * 
 * @returns {Object}
 */
exports.cardUpdate = [
	auth,
	body("title", "Title must not be empty.").isLength({ min: 1 }).trim(),
	body("description", "Description must not be empty.").isLength({ min: 1 }).trim(),
	body("hash", "HASH must not be empty").isLength({ min: 1 }).trim().custom((value,{req}) => {
		return Card.findOne({hash : value,user: req.user._id, _id: { "$ne": req.params.id }}).then(card => {
			if (card) {
				return Promise.reject("Card already exist with this hash no.");
			}
		});
	}),
	sanitizeBody("*").escape(),
	(req, res) => {
		try {
			const errors = validationResult(req);
			var card = new Card(
				{
					title: req.body.title,
					description: req.body.description,
					hash: req.body.hash,
					_id:req.params.id
				});

			if (!errors.isEmpty()) {
				return apiResponse.validationErrorWithData(res, "Validation Error.", errors.array());
			}
			else {
				if(!mongoose.Types.ObjectId.isValid(req.params.id)){
					return apiResponse.validationErrorWithData(res, "Invalid Error.", "Invalid ID");
				}else{
					Card.findById(req.params.id, function (err, foundCard) {
						if(foundCard === null){
							return apiResponse.notFoundResponse(res,"Card not exists with this id");
						}else{
							//Check authorized user
							if(foundCard.user.toString() !== req.user._id){
								return apiResponse.unauthorizedResponse(res, "You are not authorized to do this operation.");
							}else{
								//update card.
								Card.findByIdAndUpdate(req.params.id, card, {},function (err) {
									if (err) { 
										return apiResponse.ErrorResponse(res, err); 
									}else{
										let cardData = new CardData(card);
										return apiResponse.successResponseWithData(res,"Card update Success.", cardData);
									}
								});
							}
						}
					});
				}
			}
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];

/**
 * Upload a source zip
 * @type {(*|(function(...[*]=)))[]}
 */
exports.uploadSource = [
	auth,
	function(req, res){
		console.log(req.files.zip);
		const file = req.files.zip;
		if(file.size > 10000000){
			apiResponse.ErrorResponse(res, "Source cannot be bigger than 10mo");
		} else if (!file.name.endsWith(".zip")){
			apiResponse.ErrorResponse(res, "Source should be compressed in a zip.");
		}

		file.mv(path.join(process.env.SOURCE_REPOSITORY, file.md5 + ".zip"));
		apiResponse.successResponse(res, "File uploaded");
	}
];

/**
 * Get the zip of a source
 * @type {(*|(function(...[*]=)))[]}
 */
exports.getSource = [
	auth,
	function(req, res){
		res.download(path.join(process.env.SOURCE_REPOSITORY, req.params.hash + ".zip"));
	}
];

/**
 * Card Delete.
 * 
 * @param {string}      id
 * 
 * @returns {Object}
 */
exports.cardDelete = [
	auth,
	function (req, res) {
		if(!mongoose.Types.ObjectId.isValid(req.params.id)){
			return apiResponse.validationErrorWithData(res, "Invalid Error.", "Invalid ID");
		}
		try {
			Card.findById(req.params.id, function (err, foundCard) {
				if(foundCard === null){
					return apiResponse.notFoundResponse(res,"Card not exists with this id");
				}else{
					//Check authorized user
					if(foundCard.user.toString() !== req.user._id){
						return apiResponse.unauthorizedResponse(res, "You are not authorized to do this operation.");
					}else{
						//delete card.
						Card.findByIdAndRemove(req.params.id,function (err) {
							if (err) { 
								return apiResponse.ErrorResponse(res, err); 
							}else{
								return apiResponse.successResponse(res,"Card delete Success.");
							}
						});
					}
				}
			});
		} catch (err) {
			//throw error in json response with status 500. 
			return apiResponse.ErrorResponse(res, err);
		}
	}
];