//load the cards from the CSV hider.csv, and parse them into JSON objects

const fs = require('fs');
const csv = require('csv-parser');
const hider_cards = [];



//load hider.csv
fs.createReadStream('hider.csv')
  .pipe(csv())
  .on('data', (row) => {
	hider_cards.push(row);
  })
  .on('end', () => {
	console.log(hider_cards[0]);
	convert_cards(hider_cards);
  });


function convert_cards(hider_cards){
	//parse the cards into JSON objects
	const hider_cards_json = [];
	for (var card of hider_cards) {
	var card_json = {
		"name": card.name,
		"description": card.description,
		"reward": card.reward,
	};
	hider_cards_json.push(card_json);
	}


	//write the JSON objects to a file
	fs.writeFile('hider_cards.json', JSON.stringify(hider_cards_json), (err) => {
		if (err) throw err;
		console.log('hider cards saved to hider_cards.json');
	});
}