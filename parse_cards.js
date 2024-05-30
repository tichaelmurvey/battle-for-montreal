//load the cards from the CSV seeker.csv, and parse them into JSON objects

const fs = require('fs');
const csv = require('csv-parser');
const seeker_cards = [];



//load seeker.csv
fs.createReadStream('seeker.csv')
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
		"method": card.method,
		"rewards" : [
			{
				//if name ends with x[number], remove the number
				"name": card.reward1.replace(/x\d+/, '').trim(),
				//if reward ends with x[number], extract the number
				"number": card.reward1.match(/x\d+/) ? parseInt(card.reward1.match(/x\d+/)[0].slice(1)) : 1
			},
			//if reward2 exists, add it
			card.reward2 ? {
				"name": card.reward2.replace(/x\d+/, '').trim(),
				"number": card.reward2.match(/x\d+/) ? parseInt(card.reward2.match(/x\d+/)[0].slice(1)) : 1
			} : null,
		]
	};
	seeker_cards_json.push(card_json);
	}


	//write the JSON objects to a file
	fs.writeFile('seeker_cards.json', JSON.stringify(seeker_cards_json), (err) => {
		if (err) throw err;
		console.log('Seeker cards saved to seeker_cards.json');
	});
}