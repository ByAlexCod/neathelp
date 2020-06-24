var express = require("express");
const CardController = require("../controllers/CardController");

var router = express.Router();

router.get("/", CardController.cardList);
router.get("/:id", CardController.cardDetail);
router.post("/:id/proposition", CardController.propositionCreate);
router.get("/:id/proposition", CardController.getPropositions);
router.post("/", CardController.cardStore);
router.post("/source", CardController.uploadSource);
router.get("/source/:hash", CardController.getSource);
router.put("/:id", CardController.cardUpdate);
router.delete("/:id", CardController.cardDelete);

module.exports = router;