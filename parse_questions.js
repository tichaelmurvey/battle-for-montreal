//load the questions from the CSV seeker.csv, and parse them into JSON objects

const fs = require('fs');
const csv = require('csv-parser');
const questions = [];



//load seeker.csv
fs.createReadStream('questions.csv')
  .pipe(csv())
  .on('data', (row) => {
	questions.push(row);
  })
  .on('end', () => {
	console.log(questions[0]);
	convert_questions(questions);
  });


function convert_questions(questions){
	//parse the questions into JSON objects
	const questions_json = [];
	for (var question of questions) {
	var question_json = {
		"name": question.name,
		"description": question.description,
		"method": question.method,
		"time": question.time,
	};
	questions_json.push(question_json);
	}


	//write the JSON objects to a file
	fs.writeFile('questions.json', JSON.stringify(questions_json), (err) => {
		if (err) throw err;
		console.log('Seeker questions saved to questions.json');
	});
}