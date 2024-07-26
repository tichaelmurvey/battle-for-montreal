//load the cards from the CSV seeker.csv, and parse them into JSON objects

const fs = require('fs');
const csv = require('csv-parser');
const seeker_cards = [];



//load seeker.csv
fs.createReadStream('battles.csv')
  .pipe(csv())
  .on('data', (row) => {
	seeker_cards.push(row);
  })
  .on('end', () => {
	console.log(seeker_cards[0]);
	convert_cards(seeker_cards);
  });


function convert_cards(seeker_cards){
	//parse the cards into JSON objects
	const seeker_cards_json = [];
	for (var card of seeker_cards) {
	var card_json = {
		"name": card.name,
		"description": card.description,
	};
	seeker_cards_json.push(card_json);
	}
	//write the JSON objects to a file
	fs.writeFile('battle_cards.json', JSON.stringify(seeker_cards_json), (err) => {
		if (err) throw err;
		console.log('Challenge cards saved to seeker_cards.json');
	});
}